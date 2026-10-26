import { describe, expect, it } from 'vitest';
import { parseDate, splitName, normalizeName, makeRecord, validateRecord, fullName, refreshDuplicateIssues } from '../../shared/validation.js';

describe('datas rigorosas', () => {
  it.each([['29/02/2000', '2000-02-29'], ['01/01/0001', '0001-01-01'], ['31/12/2025', '2025-12-31']])('converte %s', (input, expected) => expect(parseDate(input)).toBe(expected));
  it.each(['29/02/1900', '31/04/2020', '00/12/2020', '01/13/2020', '1/2/2000', '01/01/0000', 'ontem'])('rejeita %s', value => expect(() => parseDate(value)).toThrow());
  it('não inventa data ausente', () => expect(parseDate('')).toBe(''));
  it('aceita ISO apenas em modo CSV', () => { expect(parseDate('2000-02-29', 'csv')).toBe('2000-02-29'); expect(() => parseDate('2000-02-29')).toThrow(); });
});
describe('duplicidades após edição manual', () => {
  const record = (name, birth = '2000-01-01') => { const value = makeRecord(); value.cells[0] = name; value.cells[9] = birth; return value; };
  const duplicate = value => value.issues.some(issue => issue.code === 'duplicate' && issue.critical);
  it('marca os dois lados de uma colisão criada por edição', () => { const a = record('Pessoa A'), b = record('Pessoa B'); b.cells[0] = 'Pessoa A'; expect(refreshDuplicateIssues([a, b]).every(duplicate)).toBe(true); });
  it('remove pendência antiga quando nomes ficam diferentes', () => { const values = refreshDuplicateIssues([record('Mesmo'), record('Mesmo')]); values[1].cells[0] = 'Diferente'; expect(refreshDuplicateIssues(values).some(duplicate)).toBe(false); });
  it('exige confirmação de ambos e preserva aprovação após editar telefone', () => { const initial = [record('Mesmo'), record('Mesmo')]; const partial = refreshDuplicateIssues(initial, { confirmIds: [initial[0].id] }); expect(partial.every(duplicate)).toBe(true); const approved = refreshDuplicateIssues(partial, { confirmIds: [initial[1].id] }); expect(approved.some(duplicate)).toBe(false); approved[0].cells[14] = 'telefone fictício'; expect(refreshDuplicateIssues(approved).some(duplicate)).toBe(false); });
  it('invalida confirmação de ambos quando nascimento ou batismo muda', () => { for (const column of [9, 19]) { const initial = [record('Mesmo'), record('Mesmo')]; const approved = refreshDuplicateIssues(initial, { confirmIds: initial.map(value => value.id) }); approved[0].cells[column] = '1999-01-01'; expect(refreshDuplicateIssues(approved).every(duplicate)).toBe(true); } });
  it('aprovação antiga não autoriza novo cadastro no mesmo grupo', () => { const initial = [record('Mesmo'), record('Mesmo')]; const approved = refreshDuplicateIssues(initial, { confirmIds: initial.map(value => value.id) }); const newcomer = record('Mesmo'); expect(refreshDuplicateIssues([...approved, newcomer], { confirmIds: [newcomer.id] }).every(duplicate)).toBe(true); });
  it('não modifica entradas e remove pendência depois de exclusão', () => { const initial = [record('Mesmo'), record('Mesmo')]; const snapshot = structuredClone(initial); const flagged = refreshDuplicateIssues(initial); expect(initial).toEqual(snapshot); expect(refreshDuplicateIssues(flagged.slice(0, 1)).some(duplicate)).toBe(false); });
});
describe('nomes e validação', () => {
  it('preserva todas as partes e acentos', () => { const parts = splitName('María Aparecida dos Santos'); expect(parts).toEqual(['María', 'Aparecida dos', 'Santos']); expect(fullName(parts)).toBe('María Aparecida dos Santos'); });
  it('aceita nome único sem duplicá-lo', () => expect(splitName('Ana')).toEqual(['Ana', '', '']));
  it('normaliza somente para comparação', () => expect(normalizeName('  MÁRIA  Vitória ')).toBe('maria vitoria'));
  it('bloqueia campos e dimensões inválidos', () => { const r = makeRecord(); r.cells[6] = 'X'; r.cells[9] = '2023-02-29'; r.cells[20] = 'FALSE'; expect(validateRecord(r).map(i => i.code)).toEqual(['required', 'date', 'gender-value', 'boolean']); r.cells.push(''); expect(validateRecord(r).at(-1).code).toBe('structure'); });
  it('revisado não suprime conflitos críticos', () => { const r = makeRecord(); r.cells[0] = 'Fictício'; r.reviewed = true; r.conflicts = [{ field: 6, values: ['M', 'F'] }]; expect(validateRecord(r).some(i => i.critical)).toBe(true); });
  it('aceita campos opcionais ausentes', () => { const r = makeRecord(); r.cells[0] = 'Fictício'; expect(validateRecord(r)).toEqual([]); });
});
