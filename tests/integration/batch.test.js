import { describe,it,expect } from 'vitest';
import { processBatch,readPdfWorker } from '../../electron/services/batch.js';
import { makeRecord } from '../../shared/validation.js';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const record=()=>{const r=makeRecord();r.cells[0]='Pessoa';r.cells[2]='Sintética';r.cells[9]='2000-01-01';return r;};
describe('batch',()=>{
  it('isolates errors, reports progress and consolidates duplicate files',async()=>{
    const progress=[];
    const result=await processBatch(['a.pdf','bad.pdf','b.pdf'],{onProgress:s=>progress.push(s),reader:async file=>{if(file==='bad.pdf')throw new Error('Inválido');return [record()];}});
    expect(result.stats).toMatchObject({found:3,processed:3,success:2,failed:1});expect(result.records).toHaveLength(1);expect(result.duplicates).toBe(1);expect(progress.at(-1).processed).toBe(3);
  });
  it('supports cancellation and does not begin remaining files',async()=>{
    const controller=new AbortController();let calls=0;
    const result=await processBatch(Array(100).fill('test.pdf'),{signal:controller.signal,concurrency:1,reader:async()=>{calls++;controller.abort();return [record()];}});
    expect(calls).toBe(1);expect(result.cancelled).toBe(true);expect(result.stats.processed).toBe(1);
  });
  it('limits concurrent readers',async()=>{
    let active=0,max=0;
    await processBatch(Array(20).fill('test.pdf'),{concurrency:2,reader:async()=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,1));active--;return [record()];}});
    expect(max).toBe(2);
  });
  it('terminates worker for an already aborted operation',async()=>{
    const controller=new AbortController();controller.abort();await expect(readPdfWorker('unused.pdf',controller.signal)).rejects.toThrow('Cancelado');
  });
  it('isolates corrupted PDF in a real worker',async()=>{
    const dir=await mkdtemp(path.join(os.tmpdir(),'record-converter-'));const file=path.join(dir,'broken.pdf');
    try{await writeFile(file,'not a pdf');await expect(readPdfWorker(file)).rejects.toThrow();}finally{await rm(dir,{recursive:true,force:true});}
  });
});
