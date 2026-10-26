import { emptyCells } from './schema.js';

export const normalizeName = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
export const fullName = (record) => (Array.isArray(record) ? record : record.cells).slice(0, 3).filter(Boolean).join(' ');
export function parseDate(value, format = 'pdf') {
  if (!value) return '';
  const match = String(value).trim().match(format === 'pdf' ? /^(\d{2})\/(\d{2})\/(\d{4})$/ : /^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('Data inválida: use uma data completa no formato indicado.');
  const [, a, b, c] = match;
  const [year, month, day] = format === 'pdf' ? [+c, +b, +a] : [+a, +b, +c];
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) throw new Error('Data inexistente no calendário.');
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
export function splitName(value) {
  const parts = String(value ?? '').trim().split(/\s+/).filter(Boolean);
  return [parts[0] ?? '', parts.length > 2 ? parts.slice(1, -1).join(' ') : '', parts.length > 1 ? parts.at(-1) : ''];
}
export function makeRecord(cells = emptyCells(), source = '') {
  return { id: globalThis.crypto.randomUUID(), cells: [...cells], sources: source ? [source] : [], issues: [], conflicts: [], meta: {}, reviewed: false };
}
export const identityFingerprint = record => JSON.stringify([normalizeName(fullName(record)), record.cells[9], record.cells[19]]);
/** Recheck user edits without merging people or retaining stale separation approvals. */
export function refreshDuplicateIssues(records, { confirmIds = [] } = {}) {
  const confirmed = new Set(confirmIds);
  const refreshed = records.map(record => ({ ...record, issues: (record.issues ?? []).filter(issue => issue.code !== 'duplicate'), meta: { ...record.meta } }));
  const groups = new Map();
  for (const record of refreshed) {
    const name = normalizeName(fullName(record));
    if (!name) continue;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(record);
  }
  for (const group of groups.values()) {
    const groupFingerprint = JSON.stringify(group.map(record => [record.id, identityFingerprint(record)]).sort(([a], [b]) => a.localeCompare(b)));
    for (const record of group) {
      if (confirmed.has(record.id)) {
        record.meta.identityConfirmed = true;
        record.meta.identityConfirmedGroup = groupFingerprint;
      } else if (record.meta.identityConfirmedGroup !== groupFingerprint) {
        record.meta.identityConfirmed = false;
        delete record.meta.identityConfirmedGroup;
      }
    }
    if (group.length > 1 && !group.every(record => record.meta.identityConfirmed && record.meta.identityConfirmedGroup === groupFingerprint)) {
      for (const record of group) record.issues.push({ code: 'duplicate', critical: true, message: 'Nome coincidente com outro cadastro. Confirme que são pessoas diferentes ou consolide os registros.' });
    }
  }
  return refreshed;
}
export function validateRecord(record) {
  const issues = (record.issues ?? []).filter(issue => !['required', 'date', 'gender-value', 'boolean', 'structure'].includes(issue.code) && !(record.reviewed && !issue.critical));
  const add = (code, message, field) => issues.push({ code, message, field, critical: true });
  if (!Array.isArray(record.cells) || record.cells.length !== 24 || record.cells.some(cell => typeof cell !== 'string')) {
    add('structure', 'O cadastro deve conter exatamente 24 campos de texto.'); return issues;
  }
  if (!record.cells[0].trim()) add('required', 'Informe o primeiro nome.', 0);
  for (const field of [9, 19]) {
    try { parseDate(record.cells[field], 'csv'); } catch { add('date', 'Data inválida. Utilize AAAA-MM-DD.', field); }
  }
  if (!['', 'M', 'F'].includes(record.cells[6])) add('gender-value', 'Sexo deve ser M, F ou vazio.', 6);
  for (const field of [20, 21, 22]) if (!['', 'TRUE'].includes(record.cells[field])) add('boolean', 'Privilégio deve ser TRUE ou vazio.', field);
  for (const conflict of record.conflicts ?? []) add('conflict', 'Escolha um valor para resolver a divergência.', conflict.field);
  return issues;
}
