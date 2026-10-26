// Keep user decisions distinct from the original PDF facts used by the inspector.
export function editRecordField(record, field, value, resolveConflict = false) {
  const meta = { ...record.meta };
  if ([20, 21, 22].includes(field)) {
    meta.originalCheckboxes ??= { ...meta.checkboxes };
    meta.checkboxes = { ...meta.checkboxes, [field]: value === 'TRUE' };
  }
  return {
    ...record, meta, reviewed: false,
    cells: record.cells.map((cell, index) => index === field ? value : cell),
    issues: record.issues.filter(issue => issue.field !== field || /duplicate|identity|duplicidade/.test(issue.code)),
    conflicts: resolveConflict ? record.conflicts.filter(conflict => conflict.field !== field) : record.conflicts,
  };
}
