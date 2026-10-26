/* Verify distribution contents without launching a development environment. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const asar = require('@electron/asar');
const { version } = require('../package.json');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'release');
const archive = path.join(output, 'win-unpacked', 'resources', 'app.asar');
assert.ok(fs.existsSync(archive), 'Packaged app.asar is missing');
const entries = asar.listPackage(archive).map((entry) => entry.replaceAll('\\', '/').replace(/^\//, ''));
for (const file of ['package.json', 'dist/index.html', 'electron/main/index.js', 'electron/preload/index.cjs', 'electron/services/pdf.js', 'electron/services/csv.js', 'shared/schema.js']) {
  assert.ok(entries.includes(file), `Missing runtime file: ${file}`);
}
for (const dependency of ['pdf-lib', 'csv-parse', 'csv-stringify']) {
  assert.ok(entries.includes(`node_modules/${dependency}/package.json`), `Missing runtime dependency: ${dependency}`);
}
for (const forbidden of ['node_modules/vitest/', 'node_modules/@playwright/', 'node_modules/electron-builder/', 'tests/', '.git/', 'private/', '.env']) {
  assert.ok(!entries.some((entry) => entry === forbidden || entry.startsWith(forbidden)), `Unexpected development/private content: ${forbidden}`);
}
assert.ok(!entries.some((entry) => /\.(pdf|csv)$/i.test(entry)), 'PDF/CSV source data must not be distributed');
const packagedManifest = JSON.parse(asar.extractFile(archive, 'package.json').toString('utf8'));
assert.equal(packagedManifest.version, version);
assert.equal(packagedManifest.main, 'electron/main/index.js');
const sums = [];
for (const kind of ['Setup', 'Portable']) {
  const filename = `Record-Converter-${kind}-${version}.exe`;
  const bytes = fs.readFileSync(path.join(output, filename));
  assert.ok(bytes.length > 1024 * 1024, `Executable too small: ${filename}`);
  assert.equal(bytes.subarray(0, 2).toString('ascii'), 'MZ', `Invalid DOS executable signature: ${filename}`);
  const peOffset = bytes.readUInt32LE(0x3c);
  assert.equal(bytes.subarray(peOffset, peOffset + 4).toString('hex'), '50450000', `Invalid PE signature: ${filename}`);
  sums.push(`${crypto.createHash('sha256').update(bytes).digest('hex')}  ${filename}`);
}
fs.writeFileSync(path.join(output, 'SHA256SUMS.txt'), `${sums.join('\n')}\n`, 'utf8');
console.log(`Verified packaged runtime and 2 Windows executables for ${version}. SHA256SUMS.txt written.`);
