import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, symlink, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { discoverPdfs, writeVerified } from '../../electron/services/files.js';

describe('filesystem boundaries',()=>{
  it('finds nested uppercase PDFs, skips other files and canonical repeats',async()=>{
    const dir=await mkdtemp(path.join(os.tmpdir(),'record-converter-'));
    try {
      await mkdir(path.join(dir,'a','b'),{recursive:true});
      await writeFile(path.join(dir,'root.PDF'),'synthetic');
      await writeFile(path.join(dir,'a','b','nested.pdf'),'synthetic');
      await writeFile(path.join(dir,'a','ignored.txt'),'synthetic');
      const files=await discoverPdfs([dir,dir,path.join(dir,'root.PDF')]);
      expect(files).toHaveLength(2);
    }finally{await rm(dir,{recursive:true,force:true});}
  });
  it('does not follow directory symlink cycles',async()=>{
    const dir=await mkdtemp(path.join(os.tmpdir(),'record-converter-'));
    try {
      await writeFile(path.join(dir,'file.pdf'),'synthetic');
      await symlink(dir,path.join(dir,'cycle'),process.platform==='win32'?'junction':'dir');
      expect(await discoverPdfs([dir])).toHaveLength(1);
    }finally{await rm(dir,{recursive:true,force:true});}
  });
  it('cancels recursive discovery',async()=>{
    const controller=new AbortController();controller.abort();
    expect(await discoverPdfs([os.tmpdir()],{signal:controller.signal})).toEqual([]);
  });
  it('writes UTF8 bytes and verifies output, including replacement',async()=>{
    const dir=await mkdtemp(path.join(os.tmpdir(),'record-converter-'));const file=path.join(dir,'output.csv');
    try {await writeVerified(file,'São;"texto"\n');expect(await readFile(file,'utf8')).toBe('São;"texto"\n');await writeVerified(file,'replaced');expect(await readFile(file,'utf8')).toBe('replaced');}
    finally{await rm(dir,{recursive:true,force:true});}
  });
});
