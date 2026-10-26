import { it,expect } from 'vitest';
import { makeRecord } from '../../shared/validation.js';
import { editRecordField } from '../../shared/edit.js';
import { mergeRecords } from '../../electron/services/consolidate.js';
it('manual unchecking is respected by a subsequent merge and original facts remain visible',()=>{
  const original=makeRecord();original.cells[0]='Pessoa';original.cells[21]='TRUE';original.meta.checkboxes={21:true};
  const edited=editRecordField(original,21,'');
  const merged=mergeRecords(edited,original);
  expect(merged.conflicts).toContainEqual({field:21,values:['','TRUE']});
  expect(edited.meta.originalCheckboxes[21]).toBe(true);
  expect(edited.meta.checkboxes[21]).toBe(false);
  expect(original.cells[21]).toBe('TRUE');
});
it('editing alone cannot silently resolve a conflict',()=>{
  const original=makeRecord();original.conflicts=[{field:21,values:['','TRUE']}];
  expect(editRecordField(original,21,'TRUE').conflicts).toHaveLength(1);
  expect(editRecordField(original,21,'TRUE',true).conflicts).toHaveLength(0);
});
