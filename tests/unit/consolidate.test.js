import { describe, expect, it } from 'vitest';
import { makeRecord } from '../../shared/validation.js';
import { consolidateRecords, mergeRecords, mergeExisting } from '../../electron/services/consolidate.js';

function person(name = 'Marina', birth = '2000-02-29', baptism = '2018-08-17') { const r = makeRecord(); r.cells[0] = name; r.cells[2] = 'Campos'; r.cells[9] = birth; r.cells[19] = baptism; return r; }
describe('identidade conservadora e atualização', () => {
  it('consolida nome normalizado + nascimento compatível', () => { const r = consolidateRecords([person('Marína'), person('MARINA')]); expect(r.duplicates).toBe(1); expect(r.records).toHaveLength(1); });
  it('não usa somente o nome como identidade', () => { const r = consolidateRecords([person('Marina', ''), person('Marina', '')]); expect(r.records).toHaveLength(2); expect(r.records.every(p => p.issues.some(i => i.code === 'duplicate' && i.critical))).toBe(true); });
  it('não mescla nascimento divergente', () => expect(consolidateRecords([person(), person('Marina', '1999-02-28')]).records).toHaveLength(2));
  it('não mescla batismo contraditório', () => expect(consolidateRecords([person(), person('Marina', '2000-02-29', '2019-01-01')]).records).toHaveLength(2));
  it('preserva telefone, endereço, notas e ambos e-mails', () => { const old = person(); for (const field of [10, 14, 16, 17, 23]) old.cells[field] = `conteúdo ${field}`; const r = mergeExisting([old.cells], [person()]); expect(r.records).toHaveLength(1); for (const field of [10, 14, 16, 17, 23]) expect(r.records[0].cells[field]).toBe(old.cells[field]); });
  it('preenche vazio confiável sem apagar dado ausente no PDF', () => { const old = person(); old.cells[6] = ''; old.cells[14] = 'telefone fictício'; const pdf = person(); pdf.cells[6] = 'F'; expect(mergeExisting([old.cells], [pdf]).records[0].cells[6]).toBe('F'); });
  it('mantém conflitos para decisão humana', () => { const a = person(), b = person(); a.cells[6] = 'M'; b.cells[6] = 'F'; expect(mergeRecords(a, b).conflicts).toContainEqual({ field: 6, values: ['M', 'F'] }); });
  it('distingue desconhecido de explicitamente desmarcado', () => { const a = person(), b = person(); a.meta.checkboxes = { 20: true }; a.cells[20] = 'TRUE'; b.meta.checkboxes = { 20: false }; expect(mergeRecords(a, b).conflicts).toContainEqual({ field: 20, values: ['TRUE', ''] }); b.meta.checkboxes = { 20: null }; expect(mergeRecords(a, b).conflicts).toEqual([]); });
  it('sinaliza privilégio existente TRUE contra PDF desmarcado', () => { const old = person(), pdf = person(); old.cells[22] = 'TRUE'; pdf.meta.checkboxes = { 22: false }; expect(mergeExisting([old.cells], [pdf]).records[0].conflicts).toContainEqual({ field: 22, values: ['TRUE', ''] }); });
  it('adiciona pessoas novas e não altera entrada', () => { const old = person(); const saved = structuredClone(old); const r = mergeExisting([old.cells], [person('Outro')]); expect(r.records).toHaveLength(2); expect(old).toEqual(saved); });
  it('não usa data de batismo ausente para unir duas identidades divergentes', () => { const r = consolidateRecords([person('Marina', '2000-02-29', ''), person(), person('Marina', '2000-02-29', '2020-01-01')]); expect(r.records).toHaveLength(2); expect(r.records.every(record => record.issues.some(issue => issue.code === 'duplicate'))).toBe(true); });
  it('processa milhares de cadastros sem comparações globais quadráticas', () => { const input = Array.from({ length: 3000 }, (_, i) => person(`Pessoa ${i}`)); expect(consolidateRecords(input).records).toHaveLength(3000); });
  it('não perde divergência entre divisões do mesmo nome', () => { const a = person('Marina Vitória'), b = person('Marina'); b.cells[1] = 'Vitória'; const [r] = consolidateRecords([a, b]).records; expect(r.conflicts).toContainEqual({ field: 0, values: ['Marina Vitória', 'Marina'] }); expect(r.conflicts).toContainEqual({ field: 1, values: ['', 'Vitória'] }); });
  it('não consolida registros anônimos pela data', () => { const a = person(''); a.cells[2] = ''; expect(consolidateRecords([a, a]).records).toHaveLength(2); });
});
