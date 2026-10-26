import { PDFDocument, PDFName, PDFDict, PDFString, PDFHexString, PDFCheckBox, PDFTextField } from 'pdf-lib';
import { makeRecord, parseDate, splitName } from '../../shared/validation.js';
import { consolidateRecords } from './consolidate.js';

const key = name => PDFName.of(name);
function inherited(dict, name, context) {
  const seen = new Set();
  while (dict instanceof PDFDict && !seen.has(dict)) {
    seen.add(dict);
    const value = dict.get(key(name));
    if (value !== undefined) return context.lookup(value);
    dict = context.lookup(dict.get(key('Parent')));
  }
  return undefined;
}
function textValue(value) {
  return value instanceof PDFString || value instanceof PDFHexString ? value.decodeText() : '';
}
function nameValue(value) { return value instanceof PDFName ? value.decodeText() : ''; }
function belongsToField(widget, field, context) {
  const seen = new Set();
  let current = widget;
  while (current instanceof PDFDict && !seen.has(current)) {
    if (current === field.acroField.dict) return true;
    seen.add(current);
    current = context.lookup(current.get(key('Parent')));
  }
  return false;
}
function checkbox(widget, context, canonical) {
  const value = nameValue(inherited(widget, 'V', context));
  const appearance = nameValue(widget.lookup(key('AS')));
  const ap = widget.lookup(key('AP'));
  const normal = ap instanceof PDFDict ? ap.lookup(key('N')) : undefined;
  const onStates = normal instanceof PDFDict ? normal.keys().map(nameValue).filter(state => state !== 'Off' && state !== '') : [];
  const interpret = state => state === 'Off' ? false : onStates.includes(state) ? true : null;
  const v = interpret(value), a = interpret(appearance);
  if (v !== null && a !== null && v !== a) return { state: null, error: 'Valor e aparência da caixa de seleção divergem.' };
  if (value && v === null) return { state: null, error: 'Estado de caixa de seleção desconhecido.' };
  if (appearance && a === null) return { state: null, error: 'Aparência de caixa de seleção desconhecida.' };
  if (canonical instanceof PDFCheckBox && v !== null) return { state: canonical.isChecked() };
  // Orphan widgets in some S-21 exports have V=/ (or no V); AS references
  // their actual appearance. Never interpret a nonempty string as checked.
  return { state: v ?? a, ...(v === null && a === null ? { error: 'Não foi possível determinar a marcação.' } : {}) };
}

export async function extractPdf(bytes, sourceName = 'PDF') {
  let document;
  try { document = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: true }); }
  catch { throw new Error('PDF inválido, corrompido ou protegido por senha.'); }
  const canonical = new Map();
  for (const field of document.getForm().getFields()) {
    const name = field.getName();
    if (!canonical.has(name)) canonical.set(name, []);
    canonical.get(name).push(field);
  }
  const records = []; let unsupportedPages = 0;
  for (const [pageIndex, page] of document.getPages().entries()) {
    const annotations = page.node.Annots();
    const fields = new Map(); const fieldIssues = [];
    for (let index = 0; index < (annotations?.size() ?? 0); index++) {
      const widget = document.context.lookup(annotations.get(index));
      if (!(widget instanceof PDFDict) || nameValue(widget.lookup(key('Subtype'))) !== 'Widget') continue;
      const name = textValue(inherited(widget, 'T', document.context));
      const match = /^900_(\d+)_(Text_SanSerif|CheckBox)(?:_\d+)?$/.exec(name);
      if (!match || +match[1] > 12 || +match[1] < 1) continue;
      const number = +match[1];
      const type = nameValue(inherited(widget, 'FT', document.context));
      const text = [1, 2, 5].includes(number);
      const namesakes = canonical.get(name) ?? [];
      const related = namesakes.filter(field => belongsToField(widget, field, document.context));
      if (related.length !== namesakes.length) fieldIssues.push({ code: 'repeated-field', critical: true, message: `Página ${pageIndex + 1}: campo da página e campo AcroForm homônimo são objetos sem vínculo. Confira o documento original.`, pdfField: number });
      const direct = related.length === 1 ? related[0] : undefined;
      let value;
      if (text && type === 'Tx') {
        value = direct instanceof PDFTextField ? direct.getText() ?? '' : textValue(inherited(widget, 'V', document.context));
      } else if (!text && type === 'Btn') {
        const result = checkbox(widget, document.context, direct); value = result.state;
        if (result.error) fieldIssues.push({ code: 'checkbox', critical: true, message: `Página ${pageIndex + 1}: ${result.error}`, pdfField: number });
      } else { value = text ? '' : null; fieldIssues.push({ code: 'field-type', critical: true, message: `Página ${pageIndex + 1}: tipo de campo incompatível.`, pdfField: number }); }
      if (fields.has(number) && fields.get(number) !== value) fieldIssues.push({ code: 'repeated-field', critical: true, message: 'Campos repetidos na página têm valores divergentes.', pdfField: number });
      fields.set(number, value);
    }
    if (!fields.has(1)) { unsupportedPages++; continue; }
    const record = makeRecord(undefined, `${sourceName} · página ${pageIndex + 1}`);
    record.meta = { pages: [pageIndex + 1], sourceName, originalName: fields.get(1), checkboxes: {}, observations: [] };
    record.cells.splice(0, 3, ...splitName(fields.get(1)));
    record.issues.push(...fieldIssues.map(issue => ({ ...issue, field: ({ 1: 0, 2: 9, 3: 6, 4: 6, 5: 19, 8: 22, 9: 20, 10: 21 })[issue.pdfField] })));
    if (record.cells[1]) record.issues.push({ code: 'name-split', critical: false, message: 'Confira a divisão entre nomes intermediários e sobrenome.' });
    for (const [number, column] of [[2, 9], [5, 19]]) {
      const raw = fields.get(number) ?? '';
      try { record.cells[column] = parseDate(raw); }
      catch { record.cells[column] = raw; record.issues.push({ code: 'date', field: column, critical: true, message: 'Data do PDF inválida: revise o valor original.' }); }
    }
    const male = fields.get(3) ?? null, female = fields.get(4) ?? null;
    if (male === true && female === false) record.cells[6] = 'M';
    else if (female === true && male === false) record.cells[6] = 'F';
    else record.issues.push({ code: 'gender', field: 6, critical: true, message: 'Sexo ausente, desconhecido ou com ambas as opções marcadas.' });
    for (const [number, column] of [[8, 22], [9, 20], [10, 21]]) {
      record.meta.checkboxes[column] = fields.get(number) ?? null;
      record.cells[column] = fields.get(number) === true ? 'TRUE' : '';
    }
    record.meta.observations.push({ page: pageIndex + 1, otherSheep: fields.get(6) ?? null, anointed: fields.get(7) ?? null, specialPioneer: fields.get(11) ?? null, missionary: fields.get(12) ?? null });
    if (fields.get(6) === true && fields.get(7) === true) record.issues.push({ code: 'spiritual-status', critical: false, message: 'Ungido e outras ovelhas estão marcados simultaneamente; nenhum código será exportado.' });
    if (fields.get(11) === true || fields.get(12) === true) record.issues.push({ code: 'unsupported-privilege', critical: false, message: 'Pioneiro especial ou missionário identificado. Não será convertido em pioneiro regular.' });
    records.push(record);
  }
  if (!records.length) throw new Error('Formato não suportado: é necessário um PDF S-21 com campos interativos compatíveis. PDFs digitalizados não são aceitos.');
  if (unsupportedPages) for (const record of records) record.issues.push({ code: 'unsupported-page', critical: true, message: `${unsupportedPages} página(s) sem cabeçalho S-21 interpretável. Confira o documento antes de exportar.` });
  return consolidateRecords(records).records;
}
