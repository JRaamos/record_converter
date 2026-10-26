import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { syntheticPdf } from '../fixtures/s21.js';
import { extractPdf } from '../../electron/services/pdf.js';
import { parseCsv, serializeCsv } from '../../electron/services/csv.js';
import { consolidateRecords } from '../../electron/services/consolidate.js';
import { validateRecord } from '../../shared/validation.js';

describe('formulário S-21 sintético', () => {
  it('extrai nome, datas, sexo e três privilégios', async () => { const [r] = await extractPdf(await syntheticPdf([{ 8: true, 9: true, 10: true }])); expect(r.cells.slice(0, 3)).toEqual(['Marina', 'Vitória dos', 'Campos']); expect(r.cells[9]).toBe('2000-02-29'); expect(r.cells[19]).toBe('2018-08-17'); expect(r.cells[6]).toBe('F'); expect(r.cells.slice(20, 23)).toEqual(['TRUE', 'TRUE', 'TRUE']); });
  it('consolida duas páginas em uma pessoa', async () => { const records = await extractPdf(await syntheticPdf([{}, {}])); expect(records).toHaveLength(1); expect(records[0].sources).toHaveLength(2); });
  it('aceita widgets órfãos com V vazio e AS Off, conforme arquivo real', async () => { const [r] = await extractPdf(await syntheticPdf([{}, {}], { orphan: true })); expect(r.cells[6]).toBe('F'); expect(r.meta.checkboxes).toEqual({ 20: false, 21: false, 22: false }); expect(validateRecord(r).some(i => i.critical)).toBe(false); });
  it('reconhece estado marcado personalizado pela aparência', async () => { const [r] = await extractPdf(await syntheticPdf([{ 10: true }], { orphan: true, customState: true })); expect(r.cells[6]).toBe('F'); expect(r.cells[21]).toBe('TRUE'); });
  it('detecta divergência entre valor e aparência da checkbox', async () => { const [r] = await extractPdf(await syntheticPdf([{}], { mismatch: true })); expect(r.issues.some(i => i.code === 'checkbox' && i.critical)).toBe(true); });
  it('não mistura identidades entre páginas', async () => expect(await extractPdf(await syntheticPdf([{}, { 1: 'Outra Pessoa', 2: '01/01/1990' }]))).toHaveLength(2));
  it('retém conflito de privilégios entre páginas', async () => { const [r] = await extractPdf(await syntheticPdf([{ 10: true }, { 10: false }])); expect(r.conflicts).toContainEqual({ field: 21, values: ['TRUE', ''] }); });
  it('sinaliza divergências de cabeçalho sem inventar códigos CSV', async () => { const [r] = await extractPdf(await syntheticPdf([{ 6: true, 7: false }, { 6: false, 7: true }])); expect(r.issues.some(issue => issue.code === 'header-observation-conflict')).toBe(true); expect(r.cells[7]).toBe(''); expect(r.meta.observations).toHaveLength(2); });
  it('ignora campos mensais e não promove especial/missionário', async () => { const [r] = await extractPdf(await syntheticPdf([{ 11: true, 12: true, 13: true }])); expect(r.cells[21]).toBe(''); expect(r.cells[23]).toBe(''); expect(r.cells[7]).toBe(''); expect(r.meta.observations[0].specialPioneer).toBe(true); });
  it('conserva desconhecido diferente de desmarcado', async () => { const [r] = await extractPdf(await syntheticPdf([{ 9: undefined }])); expect(r.meta.checkboxes[20]).toBe(null); expect(r.cells[20]).toBe(''); });
  it('sinaliza sexo ausente ou duplamente marcado', async () => { for (const values of [{ 3: false, 4: false }, { 3: true, 4: true }]) { const [r] = await extractPdf(await syntheticPdf([values])); expect(r.issues.some(i => i.code === 'gender')).toBe(true); } });
  it('preserva data inválida para correção manual', async () => { const [r] = await extractPdf(await syntheticPdf([{ 2: '31/02/2020' }])); expect(r.cells[9]).toBe('31/02/2020'); expect(validateRecord(r).some(i => i.code === 'date')).toBe(true); });
  it('rejeita PDF corrompido', async () => expect(extractPdf(Buffer.from('inválido'))).rejects.toThrow(/PDF inválido/));
  it('rejeita PDF sem campos interativos', async () => { const doc = await PDFDocument.create(); doc.addPage(); await expect(extractPdf(await doc.save())).rejects.toThrow(/Formato não suportado/); });
  it('deduplica vários arquivos e reimporta CSV por posições', async () => { const a = await extractPdf(await syntheticPdf(), 'A.pdf'); const b = await extractPdf(await syntheticPdf(), 'B.pdf'); const result = consolidateRecords([...a, ...b]); expect(result.duplicates).toBe(1); const rows = result.records.map(r => r.cells); expect(parseCsv(serializeCsv(rows))).toEqual(rows); });
});
