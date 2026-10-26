import { lstat, readdir, realpath, readFile, writeFile, rename, unlink, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export async function discoverPdfs(roots, { signal, onFound = () => {}, onWarning = () => {} } = {}) {
  const seen = new Set(), files = [], stack = [...roots];
  while (stack.length && !signal?.aborted) {
    const candidate = stack.pop();
    let stat, canonical;
    try { stat = await lstat(candidate); if (stat.isSymbolicLink()) continue; canonical = await realpath(candidate); } catch { onWarning({name:path.basename(candidate),message:'Não foi possível acessar este arquivo ou pasta.'}); continue; }
    const key = process.platform === 'win32' ? canonical.toLowerCase() : canonical;
    if (seen.has(key)) continue;
    seen.add(key);
    if (stat.isDirectory()) {
      try { for (const entry of await readdir(canonical)) stack.push(path.join(canonical, entry)); } catch { onWarning({name:path.basename(canonical),message:'Não foi possível ler esta pasta; seus arquivos não foram incluídos.'}); }
    } else if (stat.isFile() && path.extname(canonical).toLowerCase() === '.pdf') {
      files.push(canonical); onFound(files.length);
    }
  }
  return files.sort();
}

// Same-directory temporary file + readback before replacing the destination.
export async function writeVerified(destination, content) {
  const bytes = Buffer.from(content, 'utf8');
  await mkdir(path.dirname(destination), {recursive:true});
  const temporary = path.join(path.dirname(destination), `.record-converter-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, bytes, {flag:'wx', mode:0o600});
    if (!(await readFile(temporary)).equals(bytes)) throw new Error('Falha na verificação da gravação.');
    await rename(temporary, destination);
    if (!(await readFile(destination)).equals(bytes)) throw new Error('Falha na verificação do arquivo salvo.');
  } finally { await unlink(temporary).catch(()=>{}); }
  return destination;
}
