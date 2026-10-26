import { PDFDocument, PDFName } from 'pdf-lib';

/** Synthetic form only. Never load private documents into public test artifacts. */
export async function syntheticPdf(pages = [{}], { orphan = false, customState = false, mismatch = false } = {}) {
  const document = await PDFDocument.create();
  const form = document.getForm();
  const allFields = [];
  for (const [pageIndex, overrides] of pages.entries()) {
    const page = document.addPage([600, 800]);
    const values = { 1: 'Marina Vitória dos Campos', 2: '29/02/2000', 3: false, 4: true, 5: '17/08/2018', 6: true, 7: false, 8: false, 9: false, 10: false, 11: false, 12: false, ...overrides };
    for (const [number, value] of Object.entries(values)) {
      if (value === undefined) continue;
      const text = [1, 2, 5].includes(+number);
      const name = `900_${number}_${text ? 'Text_SanSerif' : 'CheckBox'}_${pageIndex + 1}`;
      const field = text ? form.createTextField(name) : form.createCheckBox(name);
      field.addToPage(page, { x: 40, y: 750 - (+number * 30), width: text ? 350 : 15, height: 18 });
      if (text) field.setText(value); else if (value) field.check(); else field.uncheck();
      allFields.push(field);
    }
  }
  form.updateFieldAppearances();
  for (const field of allFields) {
    if (field.getName().includes('CheckBox')) {
      const widget = field.acroField.getWidgets()[0];
      if (customState && field.isChecked()) {
        const normal = widget.getAppearances().normal;
        const yes = normal.get(PDFName.of('Yes'));
        normal.delete(PDFName.of('Yes')); normal.set(PDFName.of('Marked'), yes);
        field.acroField.dict.set(PDFName.of('V'), PDFName.of('Marked'));
        widget.dict.set(PDFName.of('AS'), PDFName.of('Marked'));
      }
      if (orphan && !field.isChecked() && !customState) field.acroField.dict.set(PDFName.of('V'), PDFName.of(''));
      if (mismatch && field.getName().includes('_4_')) widget.dict.set(PDFName.of('AS'), PDFName.of('Off'));
    }
  }
  if (orphan) document.catalog.delete(PDFName.of('AcroForm'));
  return document.save({ updateFieldAppearances: false });
}
