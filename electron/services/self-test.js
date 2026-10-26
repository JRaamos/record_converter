import { PDFDocument } from 'pdf-lib';
import { processBatch } from './batch.js';
import { parseCsv, serializeCsv } from './csv.js';
import { writeVerified } from './files.js';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
export async function selfTest(outputDirectory) {
  const document=await PDFDocument.create(), form=document.getForm();
  for(let n=1;n<=2;n++) {
    const page=document.addPage();
    for(const [id,value] of [[1,'Pessoa Sintética'],[2,'29/02/2000'],[5,'01/03/2018']]) {const f=form.createTextField(`900_${id}_Text_SanSerif_${n}`);f.setText(value);f.addToPage(page);}
    for(const id of [3,4,6,7,8,9,10,11,12]) {const f=form.createCheckBox(`900_${id}_CheckBox_${n}`);f.addToPage(page);if([4,6,10].includes(id))f.check();}
  }
  const pdfPath=path.join(outputDirectory,'record-converter-smoke.pdf');
  let records;
  try {
    await writeFile(pdfPath,await document.save());
    const batch=await processBatch([pdfPath]);
    if(batch.stats.failed||batch.stats.success!==1)throw new Error('Packaged worker failed');
    records=batch.records;
  }finally{await unlink(pdfPath).catch(()=>{});}
  if(records.length!==1||records[0].cells[6]!=='F'||records[0].cells[9]!=='2000-02-29'||records[0].cells[21]!=='TRUE')throw new Error('PDF smoke failed');
  const file=path.join(outputDirectory,'record-converter-smoke.csv');
  try {
    await writeVerified(file,serializeCsv(records.map(r=>r.cells)));
    if(JSON.stringify(parseCsv(await readFile(file)))!==JSON.stringify(records.map(r=>r.cells)))throw new Error('CSV smoke failed');
  }finally{await unlink(file).catch(()=>{});}
  return {pdfPages:2,records:records.length,csvRoundtrip:true,verifiedWrite:true,worker:true};
}
