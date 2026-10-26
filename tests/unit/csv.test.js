import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CSV_HEADERS, emptyCells } from '../../shared/schema.js';
import { parseCsv, serializeCsv } from '../../electron/services/csv.js';

describe('contrato CSV por posições', () => {
  it('cabeçalho byte a byte igual ao contrato de referência', () => {
    const expected = readFileSync(new URL('../fixtures/header.csv', import.meta.url));
    expect(Buffer.from(serializeCsv([]))).toEqual(expected);
  });
  it('mantém duas colunas emailMain distintas', () => { const row = emptyCells(); row[0] = 'Marina'; row[16] = 'primeiro@example.invalid'; row[17] = 'segundo@example.invalid'; expect(parseCsv(serializeCsv([row]))).toEqual([row]); expect(CSV_HEADERS.filter(c => c === 'emailMain')).toHaveLength(2); });
  it('adiciona somente campo terminal vazio por registro sem LF final', () => { const text = serializeCsv([emptyCells()]); expect(text.split('\n')[0].split(';')).toHaveLength(24); expect(text.split('\n')[1].split(';')).toHaveLength(25); expect(text.endsWith(';')).toBe(true); expect(text.includes('\r')).toBe(false); });
  it('faz escape de aspas, ponto e vírgula, acentos e linhas', () => { const row = emptyCells(); row[0] = 'João'; row[23] = 'Texto; "citado"\nsegunda linha'; expect(parseCsv(serializeCsv([row]))).toEqual([row]); });
  it('aceita 24 posições sem convenção terminal na importação', () => expect(parseCsv(CSV_HEADERS.join(';') + '\n' + emptyCells().join(';'))).toEqual([emptyCells()]));
  it('rejeita 25ª posição preenchida', () => expect(() => parseCsv(serializeCsv([emptyCells()]) + 'não perder')).toThrow(/25ª/));
  it('rejeita colunas extras vazias', () => expect(() => parseCsv(serializeCsv([emptyCells()]) + ';')).toThrow());
  it('rejeita alteração de cabeçalho e ordem', () => expect(() => parseCsv(CSV_HEADERS.toReversed().join(';'))).toThrow(/Cabeçalho/));
  it('rejeita UTF-8 inválido', () => expect(() => parseCsv(Uint8Array.of(0xff))).toThrow(/UTF-8/));
  it('rejeita BOM', () => expect(() => parseCsv(Buffer.from('\ufeff' + CSV_HEADERS.join(';')))).toThrow(/BOM/));
  it('rejeita aspas não fechadas', () => expect(() => parseCsv(CSV_HEADERS.join(';') + '\n"oops')).toThrow(/CSV inválido/));
  it('não permite exportação estruturalmente inválida', () => expect(() => serializeCsv([['a']])).toThrow(/24/));
});
