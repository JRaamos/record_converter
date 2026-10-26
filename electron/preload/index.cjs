const { contextBridge, ipcRenderer, webUtils } = require('electron');
contextBridge.exposeInMainWorld('recordConverter',Object.freeze({
  selectPdfs:()=>ipcRenderer.invoke('select-pdfs'),
  selectFolder:()=>ipcRenderer.invoke('select-folder'),
  addDroppedFiles:files=>ipcRenderer.invoke('add-dropped',Array.from(files).map(file=>webUtils.getPathForFile(file)).filter(Boolean)),
  importCsv:()=>ipcRenderer.invoke('import-csv'),
  start:ids=>ipcRenderer.invoke('start',ids),
  cancel:()=>ipcRenderer.invoke('cancel'),
  exportCsv:rows=>ipcRenderer.invoke('export-csv',rows),
  revealOutput:()=>ipcRenderer.invoke('reveal-output'),
  onProgress:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('progress',listener);return()=>ipcRenderer.removeListener('progress',listener);}
}));
