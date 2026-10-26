import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { consolidateRecords } from './consolidate.js';

export function readPdfWorker(file, signal, timeoutMs=60000) {
  return new Promise((resolve,reject)=>{
    if (signal?.aborted) { reject(new Error('Cancelado')); return; }
    const worker = new Worker(new URL('./pdf-worker.js',import.meta.url), {workerData:{path:file,name:path.basename(file)},resourceLimits:{maxOldGenerationSizeMb:256}});
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
      void worker.terminate(); error ? reject(error) : resolve(result);
    };
    const abort = () => finish(new Error('Cancelado'));
    const timer = setTimeout(()=>finish(new Error('O PDF excedeu o tempo de leitura (60 segundos).')),timeoutMs);
    signal?.addEventListener('abort',abort,{once:true});
    worker.once('message',msg=>finish(msg.error?new Error(msg.error):null,msg.records));
    worker.once('error',()=>finish(new Error('Não foi possível processar o PDF.')));
    worker.once('exit',()=>{if (!settled) finish(new Error('O processo de leitura foi interrompido.'));});
  });
}

export async function processBatch(files,{signal,onProgress=()=>{},concurrency=2,reader=readPdfWorker}={}) {
  const stats={found:files.length,processed:0,success:0,failed:0,current:''};
  const recordsByFile = new Array(files.length), errors=[];
  let cursor=0;
  onProgress({...stats});
  await Promise.all(Array.from({length:Math.min(Math.max(concurrency,1),4,files.length)},async()=>{
    while (!signal?.aborted) {
      const index=cursor++;
      if(index>=files.length) break;
      const file=files[index];
      onProgress({...stats,current:path.basename(file)});
      try { recordsByFile[index]=await reader(file,signal); stats.success++; }
      catch(error) { if(signal?.aborted) break; stats.failed++; errors.push({name:path.basename(file),message:error.message}); }
      stats.processed++; onProgress({...stats,current:path.basename(file)});
    }
  }));
  const consolidated=consolidateRecords(recordsByFile.filter(Boolean).flat());
  return {...consolidated,stats,errors,cancelled:!!signal?.aborted};
}
