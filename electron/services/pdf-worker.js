import { parentPort, workerData } from 'node:worker_threads';
import { readFile, stat } from 'node:fs/promises';
import { extractPdf } from './pdf.js';
try {
  if ((await stat(workerData.path)).size > 50 * 1024 * 1024) throw new Error('PDF excede o limite de 50 MB.');
  const records = await extractPdf(await readFile(workerData.path), workerData.name);
  parentPort.postMessage({records});
} catch (error) {
  const safe = /suportado|formul|compat|criptograf|50 MB/i.test(error.message) ? error.message : 'PDF inválido ou não foi possível ler o formulário.';
  parentPort.postMessage({error:safe});
}
