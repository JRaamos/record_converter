import { fullName, normalizeName, makeRecord } from '../../shared/validation.js';

const clone = value => structuredClone(value);
const identity = record => normalizeName(fullName(record));
function certainMatch(a, b) {
  return identity(a) && identity(a) === identity(b) && a.cells[9] && a.cells[9] === b.cells[9] && (!a.cells[19] || !b.cells[19] || a.cells[19] === b.cells[19]);
}
function conflictValues(record, field) {
  return record.conflicts?.find(conflict => conflict.field === field)?.values ?? [];
}
export function mergeRecords(left, right) {
  const result = clone(left);
  result.sources = [...new Set([...left.sources, ...right.sources])];
  result.issues = [...left.issues, ...right.issues].filter((issue, index, all) => all.findIndex(other => other.code === issue.code && other.field === issue.field && other.message === issue.message) === index);
  result.conflicts = [];
  for (let field = 0; field < 24; field++) {
    const a = left.cells[field], b = right.cells[field];
    const nameDivisionDifference = field < 3 && fullName(left) && fullName(right) && a !== b;
    const explicitCheckDifference = [20, 21, 22].includes(field) && left.meta?.checkboxes?.[field] !== undefined && right.meta?.checkboxes?.[field] !== undefined && left.meta.checkboxes[field] !== null && right.meta.checkboxes[field] !== null && left.meta.checkboxes[field] !== right.meta.checkboxes[field];
    const values = [...new Set([...conflictValues(left, field), ...conflictValues(right, field), ...(a && b && a !== b || explicitCheckDifference || nameDivisionDifference ? [a, b] : [])])];
    if (values.length > 1) result.conflicts.push({ field, values });
    if (!a && b) result.cells[field] = b;
  }
  result.meta = { ...left.meta, pages: [...(left.meta.pages ?? []), ...(right.meta.pages ?? [])], observations: [...(left.meta.observations ?? []), ...(right.meta.observations ?? [])], checkboxes: { ...right.meta.checkboxes, ...left.meta.checkboxes } };
  if (['otherSheep', 'anointed', 'specialPioneer', 'missionary'].some(field => new Set(result.meta.observations.map(observation => observation[field]).filter(value => value !== null && value !== undefined)).size > 1) && !result.issues.some(issue => issue.code === 'header-observation-conflict')) {
    result.issues.push({ code: 'header-observation-conflict', critical: false, message: 'Há divergências entre opções de cabeçalho sem coluna de exportação. Confira os dados extraídos de cada página.' });
  }
  result.reviewed = left.reviewed && right.reviewed;
  return result;
}
export function consolidateRecords(input) {
  const records = []; const byName = new Map(); const byBirth = new Map(); let duplicates = 0;
  for (const original of input) {
    const record = clone(original);
    const name = identity(record);
    const birthKey = JSON.stringify([name, record.cells[9]]);
    const candidates = record.cells[9] ? byBirth.get(birthKey) ?? [] : [];
    const matches = candidates.filter(index => certainMatch(records[index], record));
    if (matches.length === 1) { records[matches[0]] = mergeRecords(records[matches[0]], record); duplicates++; }
    else {
      const index = records.push(record) - 1;
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(index);
      if (!byBirth.has(birthKey)) byBirth.set(birthKey, []);
      byBirth.get(birthKey).push(index);
    }
  }
  for (const [name, indexes] of byName) {
    if (name && indexes.length > 1) for (const index of indexes) {
      const record = records[index];
      if (!record.issues.some(issue => issue.code === 'duplicate')) record.issues.push({ code: 'duplicate', critical: true, message: 'Mesmo nome com identidade incompleta ou divergente. Confirme se são pessoas distintas ou consolide os cadastros.' });
    }
  }
  return { records, duplicates };
}
export function mergeExisting(rows, pdfRecords) {
  return consolidateRecords([...rows.map(row => { const record = makeRecord(row, 'CSV existente'); record.meta.origin = 'csv'; record.meta.checkboxes = Object.fromEntries([20, 21, 22].map(field => [field, row[field] === 'TRUE' ? true : null])); return record; }), ...pdfRecords]);
}
