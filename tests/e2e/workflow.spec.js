import { test, expect } from '@playwright/test';

const cells = (name = 'Maria', last = 'Exemplo') => {
  const row = Array(24).fill('');
  row[0] = name; row[1] = 'Aparecida dos'; row[2] = last;
  row[6] = 'F'; row[9] = '1980-03-15'; row[19] = '2000-04-22'; row[21] = 'TRUE';
  return row;
};
const record = (id = 'record-1', values = cells()) => ({
  id, cells: values, sources: ['sintetico.pdf · página 1'],
  issues: [{ code: 'name-split', message: 'Confira a divisão do nome.', critical: false }],
  conflicts: [], reviewed: false, meta: { originalName: values.slice(0, 3).join(' '), observations: [{ page: 1, otherSheep: true, anointed: false, specialPioneer: false, missionary: false }] },
});
async function launch(page, { records = [record()], existingRows = [], failed = false, delay = false } = {}) {
  await page.addInitScript(({ records, existingRows, failed, delay }) => {
    let listener = () => {};
    let stop = false;
    window.__exported = null;
    window.recordConverter = {
      selectPdfs: async () => [{ id: 'file-1', name: 'sintetico.pdf' }],
      selectFolder: async () => [{ id: 'file-1', name: 'subpasta/sintetico.pdf' }, { id: 'file-2', name: 'outro.PDF' }],
      addDroppedFiles: async () => [{ id: 'file-1', name: 'sintetico.pdf' }],
      importCsv: async () => ({ name: 'cadastros.csv', rows: existingRows }),
      start: async () => {
        listener({ found: 1, processed: 0, success: 0, failed: 0, current: 'sintetico.pdf' });
        if (delay) await new Promise(resolve => setTimeout(resolve, 900));
        listener({ found: 1, processed: stop ? 0 : 1, success: stop || failed ? 0 : 1, failed: failed ? 1 : 0, current: '' });
        return { records: stop || failed ? [] : records, duplicates: 1, cancelled: stop, errors: failed ? [{ name: 'sintetico.pdf', message: 'PDF corrompido.' }] : [], stats: { found: 1, processed: stop ? 0 : 1, success: stop || failed ? 0 : 1, failed: failed ? 1 : 0 } };
      },
      cancel: async () => { stop = true; },
      onProgress: cb => { window.__progress = cb; listener = cb; return () => { listener = () => {}; }; },
      exportCsv: async rows => { window.__exported = rows; return { saved: true, path: 'C:\\Saida\\publicadores.csv' }; },
      revealOutput: async () => { window.__revealed = true; },
    };
  }, { records, existingRows, failed, delay });
  await page.goto('/');
}
async function process(page) {
  await page.getByRole('button', { name: 'Selecionar PDFs', exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar conversão', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Confira cada cadastro.' })).toBeVisible();
}

test('importa, revisa e exporta posições originais com acentos e observações manuais', async ({ page }) => {
  await launch(page);
  await expect(page.getByRole('heading', { name: 'Comece pelos registros.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar conversão', exact: true })).toBeDisabled();
  await process(page);
  await page.getByRole('button', { name: 'Editar Maria Aparecida dos Exemplo' }).click();
  await page.getByLabel('Primeiro nome', { exact: true }).fill('Mária');
  await page.getByLabel('E-mail principal · 1', { exact: true }).fill('primeiro@example.test');
  await page.getByLabel('E-mail principal · 2', { exact: true }).fill('segundo@example.test');
  await page.getByLabel('Observações', { exact: true }).fill('Observação manual; com "aspas"\ne nova linha');
  await expect(page.getByLabel('Ungido / outras ovelhas', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Salvar revisão' }).click();
  await page.getByRole('button', { name: 'Continuar para exportação' }).click();
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'CSV salvo e verificado.' })).toBeVisible();
  const exported = await page.evaluate(() => window.__exported);
  expect(exported).toHaveLength(1); expect(exported[0]).toHaveLength(24);
  expect(exported[0][0]).toBe('Mária'); expect(exported[0][16]).toBe('primeiro@example.test'); expect(exported[0][17]).toBe('segundo@example.test');
  expect(exported[0][23]).toContain('\n');
  await page.getByRole('button', { name: 'Abrir pasta de saída' }).click();
  expect(await page.evaluate(() => window.__revealed)).toBe(true);
});

test('bloqueia data impossível e permite correção manual', async ({ page }) => {
  const bad = record(); bad.cells[9] = '2025-02-29';
  await launch(page, { records: [bad] }); await process(page);
  await page.getByRole('button', { name: 'Continuar para exportação' }).click();
  await expect(page.getByRole('button', { name: 'Exportar CSV', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Voltar à revisão' }).click();
  await page.getByRole('button', { name: 'Editar Maria Aparecida dos Exemplo' }).click();
  await page.getByLabel('Nascimento', { exact: true }).fill('1980-03-15');
  await page.getByRole('button', { name: 'Salvar revisão' }).click();
  await page.getByRole('button', { name: 'Continuar para exportação' }).click();
  await expect(page.getByRole('button', { name: 'Exportar CSV', exact: true })).toBeEnabled();
});

test('preserva os dois e-mails e o contato do CSV existente durante atualização', async ({ page }) => {
  const row = cells(); row[16] = 'email1@example.test'; row[17] = 'email2@example.test'; row[14] = '(00) 90000-0000'; row[23] = 'Observação preservada';
  await launch(page, { existingRows: [row] });
  await page.getByRole('button', { name: 'Importar CSV existente', exact: true }).click(); await process(page);
  await page.getByRole('button', { name: 'Continuar para exportação' }).click();
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
  const exported = await page.evaluate(() => window.__exported);
  expect(exported).toHaveLength(1); expect(exported[0][14]).toBe(row[14]); expect(exported[0][16]).toBe(row[16]); expect(exported[0][17]).toBe(row[17]); expect(exported[0][23]).toBe(row[23]);
});

test('resolve conflito somente por escolha explícita', async ({ page }) => {
  const conflicting = record(); conflicting.conflicts = [{ field: 21, values: ['TRUE', ''] }];
  await launch(page, { records: [conflicting] }); await process(page);
  await page.getByRole('button', { name: 'Editar Maria Aparecida dos Exemplo' }).click();
  await page.getByRole('button', { name: 'Manter vazio', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar revisão' }).click();
  await page.getByRole('button', { name: 'Continuar para exportação' }).click();
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
  expect((await page.evaluate(() => window.__exported))[0][21]).toBe('');
});

test('exige confirmação para excluir registros inválidos', async ({ page }) => {
  const bad = record('bad', cells('Inválida')); bad.cells[9] = '2001-99-99';
  await launch(page, { records: [record(), bad] }); await process(page);
  await page.getByLabel('Selecionar Inválida Aparecida dos Exemplo', { exact: true }).check();
  await page.getByRole('button', { name: 'Excluir da exportação', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Editar Inválida Aparecida dos Exemplo' })).toBeVisible();
  await page.getByRole('button', { name: 'Excluir da exportação', exact: true }).click();
  await page.getByRole('button', { name: 'Excluir cadastros', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Editar Inválida Aparecida dos Exemplo' })).toHaveCount(0);
});

test('permite confirmar identidades distintas para possíveis duplicados', async ({ page }) => {
  const one = record('one'); const two = record('two'); two.cells[9] = '1990-03-15';
  for (const item of [one, two]) item.issues.push({ code: 'duplicate', critical: true, message: 'Mesmo nome, confirme a identidade.' });
  await launch(page, { records: [one, two] }); await process(page);
  await page.getByLabel('Selecionar cadastros desta página').check();
  await page.getByRole('button', { name: 'Manter separados', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Manter separados', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar para exportação' }).click();
  await expect(page.getByRole('button', { name: 'Exportar CSV', exact: true })).toBeEnabled();
});

test('consolida suspeitos e apresenta valores conflitantes para revisão', async ({ page }) => {
  const one = record('one'); const two = record('two'); two.cells[9] = '1990-03-15';
  for (const item of [one, two]) item.issues.push({ code: 'duplicate', critical: true, message: 'Mesmo nome, confirme a identidade.' });
  await launch(page, { records: [one, two] }); await process(page);
  await page.getByLabel('Selecionar cadastros desta página').check();
  await page.getByRole('button', { name: 'Consolidar', exact: true }).click();
  await page.getByRole('button', { name: 'Consolidar registros', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Manter 1980-03-15', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar revisão' }).click();
  await expect(page.getByRole('button', { name: 'Editar Maria Aparecida dos Exemplo' })).toHaveCount(1);
});

test('permite cancelar o lote sem anunciar sucesso de exportação', async ({ page }) => {
  await launch(page, { delay: true });
  await page.getByRole('button', { name: 'Selecionar PDFs', exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar conversão', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar processamento', exact: true }).click();
  await expect(page.getByText('Processamento cancelado. Os resultados já concluídos estão disponíveis abaixo.')).toBeVisible();
  expect(await page.evaluate(() => window.__exported)).toBeNull();
});

test('exibe falha de PDF e continua navegável', async ({ page }) => {
  await launch(page, { failed: true }); await process(page);
  await page.getByText('Ver 1 arquivo(s) que não puderam ser lidos').click();
  await expect(page.getByText('PDF corrompido.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar aos arquivos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Iniciar conversão', exact: true })).toBeEnabled();
});

test('busca e filtra nomes sem distinguir acentuação', async ({ page }) => {
  await launch(page, { records: [record('one', cells('Mária')), record('two', cells('Joana'))] }); await process(page);
  await page.getByRole('textbox', { name: 'Pesquisar por nome' }).fill('maria');
  await expect(page.getByRole('button', { name: 'Editar Mária Aparecida dos Exemplo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar Joana Aparecida dos Exemplo' })).toHaveCount(0);
});

test('exige confirmação explícita para excluir páginas não interpretáveis', async ({ page }) => {
  const partial = record(); partial.issues.push({ code: 'unsupported-page', critical: true, message: 'Uma página não possui cabeçalho interpretável.' });
  await launch(page, { records: [partial] }); await process(page);
  await page.getByRole('button', { name: 'Editar Maria Aparecida dos Exemplo' }).click();
  await page.getByRole('button', { name: 'Salvar revisão' }).click();
  await expect(page.getByText('Resolver pendência', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Editar Maria Aparecida dos Exemplo' }).click();
  await page.getByRole('button', { name: 'Revisar exclusão de páginas incompatíveis' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('podem conter outra pessoa');
  await page.getByRole('button', { name: 'Excluir conteúdo dessas páginas' }).click();
  await page.getByRole('button', { name: 'Salvar revisão' }).click();
  await page.getByRole('button', { name: 'Continuar para exportação' }).click();
  await expect(page.getByRole('button', { name: 'Exportar CSV', exact: true })).toBeEnabled();
});

test('mostra aviso de pasta inacessível durante seleção e após processamento', async ({ page }) => {
  await launch(page);
  await page.evaluate(() => window.__progress({ discoveryWarnings: [{ name: 'Pasta protegida', message: 'Acesso negado.' }] }));
  await expect(page.getByText('Pasta protegida: Acesso negado.')).toBeVisible();
  await process(page);
  await expect(page.getByText('Os arquivos desses locais podem não estar incluídos nesta conversão.')).toBeVisible();
});

test('não anuncia sucesso quando a gravação falha', async ({ page }) => {
  await launch(page); await process(page);
  await page.evaluate(() => { window.recordConverter.exportCsv = async () => { throw new Error('Não foi possível gravar o arquivo.'); }; });
  await page.getByRole('button', { name: 'Continuar para exportação' }).click();
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Não foi possível gravar o arquivo.');
  await expect(page.getByRole('heading', { name: 'CSV salvo e verificado.' })).toHaveCount(0);
});
