import { test,expect,_electron as electron } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { mkdtemp,writeFile,readFile,rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseCsv } from '../../electron/services/csv.js';

test('real desktop bridge: local PDF worker, CSV roundtrip, sandbox and denied navigation',async()=>{
  const temporary=await mkdtemp(path.join(os.tmpdir(),'record-converter-ui-'));
  const source=path.join(temporary,'synthetic.pdf'),destination=path.join(temporary,'export.csv');
  const pdf=await PDFDocument.create();
  for(let index=1;index<=2;index++){
    const page=pdf.addPage();const form=pdf.getForm();
    for(const [n,value] of [[1,'Pessoa Sintética'],[2,'29/02/2000'],[5,'05/04/2015']]){const field=form.createTextField(`900_${n}_Text_SanSerif_${index}`);field.setText(value);field.addToPage(page);}
    for(let n=3;n<=12;n++){if(n===5)continue;const field=form.createCheckBox(`900_${n}_CheckBox_${index}`);field.addToPage(page);if([4,6,10].includes(n))field.check();}
  }
  await writeFile(source,await pdf.save());
  const app=await electron.launch({args:['.'],env:{...process.env,ELECTRON_DISABLE_SECURITY_WARNINGS:'true'}});
  try{
    const page=await app.firstWindow();await expect(page).toHaveTitle('Record Converter');
    await page.waitForFunction(()=>!!window.recordConverter&&document.querySelector('#root').children.length>0);
    expect(await page.evaluate(()=>typeof window.require)).toBe('undefined');
    await app.evaluate(({dialog},source)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[source]});},source);
    const selected=await page.evaluate(()=>window.recordConverter.selectPdfs());expect(selected).toHaveLength(1);
    expect(selected[0]).not.toHaveProperty('path');
    const result=await page.evaluate(ids=>window.recordConverter.start(ids),selected.map(file=>file.id));
    expect(result.records).toHaveLength(1);expect(result.stats.success).toBe(1);expect(result.records[0].cells[21]).toBe('TRUE');
    await app.evaluate(({dialog},destination)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:destination});},destination);
    const save=await page.evaluate(rows=>window.recordConverter.exportCsv(rows),result.records.map(r=>r.cells));expect(save.saved).toBe(true);
    const bytes=await readFile(destination);expect(parseCsv(bytes)).toEqual(result.records.map(r=>r.cells));
    await app.evaluate(({dialog},destination)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[destination]});},destination);
    const imported=await page.evaluate(()=>window.recordConverter.importCsv());expect(imported.rows).toEqual(result.records.map(r=>r.cells));
    const security=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];const p=w.webContents.getLastWebPreferences();return {sandbox:p.sandbox,isolation:p.contextIsolation,node:p.nodeIntegration};});
    expect(security).toEqual({sandbox:true,isolation:true,node:false});
    const response=await page.evaluate(async()=>{try{await fetch('https://example.com');return true;}catch{return false;}});expect(response).toBe(false);
  }finally{await app.close();await rm(temporary,{recursive:true,force:true});}
});
