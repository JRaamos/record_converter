import { app, BrowserWindow, dialog, ipcMain, shell, session } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { discoverPdfs, writeVerified } from '../services/files.js';
import { processBatch } from '../services/batch.js';
import { parseCsv, serializeCsv } from '../services/csv.js';
import { validateRecord } from '../../shared/validation.js';
import { selfTest } from '../services/self-test.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dev=!app.isPackaged && process.argv.includes('--dev');
let win, outputPath, controller;
const selected=new Map();
const importedPaths=new Set();
const entry=dev?'http://127.0.0.1:5173':pathToFileURL(path.join(root,'dist/index.html')).href;
const trusted=url=>dev ? new URL(url).origin==='http://127.0.0.1:5173' : url.split('#')[0]===entry;
function handle(channel,fn) {
  ipcMain.handle(channel,async(event,...args)=>{
    if(event.sender!==win.webContents || event.senderFrame!==win.webContents.mainFrame || !trusted(event.senderFrame.url)) throw new Error('Origem não autorizada.');
    try {return await fn(...args);} catch(error) { throw new Error(error.code ? 'Não foi possível acessar ou gravar o arquivo. Verifique as permissões e tente novamente.' : error.message); }
  });
}
function assertIdle(){if(controller) throw new Error('Aguarde ou cancele o processamento atual.');}
async function register(roots){
  assertIdle(); controller=new AbortController();
  try {
    const discoveryWarnings=[];
    win.webContents.send('progress',{found:0,discoveryWarnings});
    const paths=await discoverPdfs(roots,{signal:controller.signal,onWarning:warning=>{discoveryWarnings.push(warning);win.webContents.send('progress',{discoveryWarnings});},onFound:found=>win.webContents.send('progress',{found,processed:0,success:0,failed:0,current:'Localizando PDFs…',discoveryWarnings})});
    return paths.map(file=>{let id=[...selected].find(([,p])=>p===file)?.[0];if(!id){id=randomUUID();selected.set(id,file);}return {id,name:path.basename(file)};});
  } finally { controller=null; }
}
app.whenReady().then(async()=>{
app.setAppUserModelId('tech.febraio.recordconverter');
session.defaultSession.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));
session.defaultSession.setPermissionCheckHandler(()=>false);
if(!dev) session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!['file:','data:','devtools:'].some(protocol=>details.url.startsWith(protocol))}));
win=new BrowserWindow({width:1380,height:900,minWidth:920,minHeight:650,backgroundColor:'#f7f8fa',title:'Record Converter',show:false,autoHideMenuBar:true,webPreferences:{preload:path.join(root,'electron/preload/index.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,spellcheck:false}});
win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
win.webContents.on('will-navigate',(event,url)=>{if(!trusted(url))event.preventDefault();});
win.webContents.on('will-attach-webview',event=>event.preventDefault());
win.on('ready-to-show',()=>win.show());
win.on('close',()=>controller?.abort());
handle('select-pdfs',async()=>{assertIdle();const result=await dialog.showOpenDialog(win,{properties:['openFile','multiSelections'],filters:[{name:'Formulários PDF',extensions:['pdf']}]});return result.canceled?[]:register(result.filePaths);});
handle('select-folder',async()=>{assertIdle();const result=await dialog.showOpenDialog(win,{properties:['openDirectory']});return result.canceled?[]:register(result.filePaths);});
handle('add-dropped',async paths=>{if(!Array.isArray(paths)||paths.length>10000||paths.some(p=>typeof p!=='string'||!path.isAbsolute(p)))throw new Error('Seleção inválida.');return register(paths);});
handle('import-csv',async()=>{
  assertIdle();const result=await dialog.showOpenDialog(win,{properties:['openFile'],filters:[{name:'CSV',extensions:['csv']}]});
  if(result.canceled)return null;
  const file=result.filePaths[0];
  if((await stat(file)).size>50*1024*1024)throw new Error('O CSV excede o limite de 50 MB.');
  const rows=parseCsv(await readFile(file)); importedPaths.add(path.resolve(file));return {rows,name:path.basename(file)};
});
handle('start',async ids=>{
  assertIdle();if(!Array.isArray(ids)||!ids.length||ids.length>20000||ids.some(id=>typeof id!=='string'||!selected.has(id)))throw new Error('Selecione PDFs válidos.');
  controller=new AbortController();
  try{return await processBatch([...new Set(ids)].map(id=>selected.get(id)),{signal:controller.signal,onProgress:progress=>{if(!win.isDestroyed())win.webContents.send('progress',progress);}});}finally{controller=null;}
});
handle('cancel',()=>{controller?.abort();return true;});
handle('export-csv',async rows=>{
  assertIdle();if(!Array.isArray(rows)||!rows.length||rows.length>100000)throw new Error('Nenhum registro válido para exportação.');
  for(const cells of rows){
    if(!Array.isArray(cells)||cells.length!==24||cells.some(c=>typeof c!=='string'||c.length>100000))throw new Error('Estrutura CSV inválida.');
    if(validateRecord({cells,issues:[],conflicts:[]}).some(issue=>issue.critical))throw new Error('Corrija as inconsistências antes de exportar.');
  }
  const content=serializeCsv(rows);
  const result=await dialog.showSaveDialog(win,{title:'Exportar CSV',defaultPath:'publicadores.csv',filters:[{name:'CSV',extensions:['csv']}]});
  if(result.canceled||!result.filePath)return {saved:false};
  const destination=path.extname(result.filePath).toLowerCase()==='.csv'?result.filePath:`${result.filePath}.csv`;
  if(await stat(destination).then(()=>true).catch(error=>{if(error.code==='ENOENT')return false;throw error;})){const consent=await dialog.showMessageBox(win,{type:'warning',buttons:['Cancelar','Substituir original'],defaultId:0,cancelId:0,message:importedPaths.has(path.resolve(destination))?'Substituir o CSV original?':'Substituir o arquivo existente?',detail:'O arquivo de destino será substituído pelos dados revisados.'});if(consent.response!==1)return {saved:false};}
  await writeVerified(destination,content);outputPath=destination;return {saved:true,path:destination};
});
handle('reveal-output',()=>{if(outputPath)shell.showItemInFolder(outputPath);return !!outputPath;});
await win.loadURL(entry);
const smokeIndex=process.argv.indexOf('--smoke-test');
if(smokeIndex>=0){
  const smokePath=process.argv[smokeIndex+1];
  try {
    let ui;
    for(let attempt=0;attempt<100;attempt++){
      ui=await win.webContents.executeJavaScript(`({title:document.title,ready:!!document.querySelector('#root')?.children.length,bridge:typeof window.recordConverter?.selectPdfs==='function',noNode:typeof window.require==='undefined'})`);
      if(ui.ready)break;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    if(!ui.ready||!ui.bridge||!ui.noNode)throw new Error('Renderer smoke test failed');
    const conversion=await selfTest(path.dirname(smokePath));
    await writeFile(smokePath,JSON.stringify({ok:true,ui,conversion,packaged:app.isPackaged,offline:!dev}));app.exit(0);
  } catch {await writeFile(smokePath,JSON.stringify({ok:false}));app.exit(1);}
}
app.on('window-all-closed',()=>app.quit());

}).catch(()=>{console.error('Falha ao inicializar o Record Converter.');app.exit(1);});
