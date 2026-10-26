import { describe, expect, it } from 'vitest';
import { parseDate, splitName, normalizeName, makeRecord, validateRecord, fullName } from '../../shared/validation.js';

describe('datas rigorosas', () => {
  it.each([['29/02/2000', '2000-02-29'], ['01/01/0001', '0001-01-01'], ['31/12/2025', '2025-12-31']])('converte %s', (input, expected) => expect(parseDate(input)).toBe(expected));
  it.each(['29/02/1900', '31/04/2020', '00/12/2020', '01/13/2020', '1/2/2000', '01/01/0000', 'ontem'])('rejeita %s', value => expect(() => parseDate(value)).toThrow());
  it('não inventa data ausente', () => expect(parseDate('')).toBe(''));
  it('aceita ISO apenas em modo CSV', () => { expect(parseDate('2000-02-29', 'csv')).toBe('2000-02-29'); expect(() => parseDate('2000-02-29')).toThrow(); });
});
describe('nomes e validação', () => {
  it('preserva todas as partes e acentos', () => { const parts = splitName('María Aparecida dos Santos'); expect(parts).toEqual(['María', 'Aparecida dos', 'Santos']); expect(fullName(parts)).toBe('María Aparecida dos Santos'); });
  it('aceita nome único sem duplicá-lo', () => expect(splitName('Ana')).toEqual(['Ana', '', '']));
  it('normaliza somente para comparação', () => expect(normalizeName('  MÁRIA  Vitória ')).toBe('maria vitoria'));
  it('bloqueia campos e dimensões inválidos', () => { const r = makeRecord(); r.cells[6] = 'X'; r.cells[9] = '2023-02-29'; r.cells[20] = 'FALSE'; expect(validateRecord(r).map(i => i.code)).toEqual(['required', 'date', 'gender-value', 'boolean']); r.cells.push(''); expect(validateRecord(r).at(-1).code).toBe('structure'); });
  it('revisado não suprime conflitos críticos', () => { const r = makeRecord(); r.cells[0] = 'Fictício'; r.reviewed = true; r.conflicts = [{ field: 6, values: ['M', 'F'] }]; expect(validateRecord(r).some(i => i.critical)).toBe(true); });
  it('aceita campos opcionais ausentes', () => { const r = makeRecord(); r.cells[0] = 'Fictício'; expect(validateRecord(r)).toEqual([]); });
});
