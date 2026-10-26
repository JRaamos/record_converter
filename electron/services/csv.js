import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { CSV_HEADERS } from '../../shared/schema.js';

export function parseCsv(input) {
  let text;
  try { text = typeof input === 'string' ? input : new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(input); }
  catch { throw new Error('O CSV não contém UTF-8 válido.'); }
  if (text.charCodeAt(0) === 0xFEFF) throw new Error('O CSV deve usar UTF-8 sem BOM.');
  let rows;
  try { rows = parse(text, { delimiter: ';', relax_column_count: true, skip_empty_lines: false }); }
  catch { throw new Error('CSV inválido: confira aspas, separadores e quebras de linha.'); }
  if (!rows.length || rows[0].length !== 24 || rows[0].some((v, i) => v !== CSV_HEADERS[i])) throw new Error('Cabeçalho incompatível: são exigidas as 24 posições originais, incluindo os dois emailMain.');
  return rows.slice(1).map((row, index) => {
    if (row.length === 25 && row[24] === '') return row.slice(0, 24);
    if (row.length !== 24) throw new Error(`Linha ${index + 2}: quantidade de campos inválida ou 25ª posição não vazia.`);
    return row;
  });
}
export function serializeCsv(rows) {
  if (!Array.isArray(rows) || rows.some(row => !Array.isArray(row) || row.length !== 24 || row.some(cell => typeof cell !== 'string'))) throw new Error('Cada cadastro precisa de exatamente 24 campos de texto.');
  return CSV_HEADERS.join(';') + (rows.length ? '\n' + stringify(rows.map(row => [...row, '']), { delimiter: ';', record_delimiter: '\n', eof: false }) : '');
}
