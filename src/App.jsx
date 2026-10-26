import { useEffect, useMemo, useRef, useState } from 'react';
import { CSV_HEADERS, FIELD_LABELS } from '../shared/schema.js';
import { fullName, validateRecord } from '../shared/validation.js';
import { mergeExisting, mergeRecords } from '../electron/services/consolidate.js';
import Icon from './components/Icon.jsx';
import * as S from './styles/theme.js';

const LABELS = ['Primeiro nome', 'Nomes do meio', 'Sobrenome', 'Sufixo', 'Apelido', 'Estado civil', 'Sexo', 'Ungido / outras ovelhas', 'Inativo', 'Nascimento', 'Endereço', 'Cidade', 'Estado / província', 'CEP', 'Celular', 'Telefone', 'E-mail principal · 1', 'E-mail principal · 2', 'E-mail JWPub', 'Batismo', 'Servo ministerial', 'Pioneiro regular', 'Ancião', 'Observações'];
const getName = record => fullName(record.cells) || 'Nome não informado';
const nameCompare = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const isDuplicateIssue = issue => /duplicate|identity|duplicidade/.test(issue.code);
const recordIssues = record => validateRecord(record);
const needsReview = record => recordIssues(record).length > 0;
const isBlocked = record => recordIssues(record).some(issue => issue.critical);
const dateDisplay = value => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : value || '—';

function useFocusScope(ref, onClose) {
  useEffect(() => {
    const previous = document.activeElement;
    const root = ref.current;
    const focusable = () => Array.from(root?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || []);
    focusable()[0]?.focus();
    const handle = event => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (!elements.length) return;
      const first = elements[0]; const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    root?.addEventListener('keydown', handle);
    return () => { root?.removeEventListener('keydown', handle); previous?.focus(); };
  }, [ref, onClose]);
}

function ConfirmDialog({ confirmation, close }) {
  const ref = useRef(null);
  useFocusScope(ref, close);
  return <S.DialogBackdrop onClick={event => { event.stopPropagation(); close(); }}><S.Dialog role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" ref={ref} onClick={event => event.stopPropagation()}>
    <h2 id="confirm-title">{confirmation.title}</h2><p id="confirm-description">{confirmation.message}</p>
    <S.Row><S.Button onClick={close}>Cancelar</S.Button><S.Button $primary onClick={() => { confirmation.run(); close(); }}>{confirmation.action}</S.Button></S.Row>
  </S.Dialog></S.DialogBackdrop>;
}

function RecordEditor({ record, onSave, onClose }) {
  const [draft, setDraft] = useState(() => structuredClone(record));
  const [acknowledging, setAcknowledging] = useState(null);
  const ref = useRef(null);
  useFocusScope(ref, onClose);
  const issues = recordIssues(draft);
  const change = (field, value) => setDraft(current => ({ ...current, reviewed: false, cells: current.cells.map((cell, index) => index === field ? value : cell), issues: current.issues.filter(issue => issue.field !== field || isDuplicateIssue(issue)) }));
  const resolve = (field, value) => setDraft(current => ({ ...current, reviewed: false, cells: current.cells.map((cell, index) => index === field ? value : cell), conflicts: current.conflicts.filter(conflict => conflict.field !== field), issues: current.issues.filter(issue => issue.field !== field || isDuplicateIssue(issue)) }));
  return <S.Overlay onClick={onClose}><S.Drawer role="dialog" aria-modal="true" aria-labelledby="editor-title" ref={ref} onClick={event => event.stopPropagation()}>
    <header><S.Spread><h2 id="editor-title">Revisar cadastro</h2><S.TextButton aria-label="Fechar editor" onClick={onClose}><Icon name="close" /></S.TextButton></S.Spread><p>{getName(record)}</p></header>
    <S.DrawerBody>
      <S.Banner>A informação “ungido / outras ovelhas” é identificada, mas não possui código de exportação confirmado. O valor de um CSV existente é preservado.</S.Banner>
      {(draft.sources || []).length > 0 && <S.Muted>Origem: {draft.sources.join(' • ')}</S.Muted>}
      {draft.meta && <details><summary style={{ cursor: 'pointer', fontSize: 12 }}>Informações extraídas do formulário</summary><ExtractedInfo meta={draft.meta} /></details>}
      {issues.length > 0 && <S.Banner $error={issues.some(issue => issue.critical)}><strong>Verificações deste cadastro</strong><ul style={{ margin: '7px 0 0', paddingLeft: 17 }}>{issues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}{issue.critical && issue.field === undefined && ['unsupported-page', 'checkbox', 'field-type', 'repeated-field'].includes(issue.code) && <S.TextButton style={{ display: 'flex', margin: '4px 0 9px' }} onClick={() => setAcknowledging(issue)}>{issue.code === 'unsupported-page' ? 'Revisar exclusão de páginas incompatíveis' : 'Confirmar conferência no PDF'}</S.TextButton>}</li>)}</ul></S.Banner>}
      {(draft.conflicts || []).map((conflict, index) => <S.Conflict key={`${conflict.field}-${index}`}><strong>Escolha o valor: {LABELS[conflict.field] || 'Informação divergente'}</strong><span>Os documentos apresentam valores diferentes.</span><div>{Array.from(new Set(conflict.values)).map((value, valueIndex) => <S.Button key={valueIndex} onClick={() => resolve(conflict.field, value)}>Manter {value === '' ? 'vazio' : value}</S.Button>)}</div><S.TextButton onClick={() => resolve(conflict.field, draft.cells[conflict.field])}>Usar o valor editado abaixo</S.TextButton></S.Conflict>)}
      <S.FieldGrid>{CSV_HEADERS.map((header, index) => <S.Field key={`${header}-${index}`} style={index === 23 ? { gridColumn: '1 / -1' } : undefined}><span>{LABELS[index] || FIELD_LABELS[index]}</span>
        {index === 6 ? <S.Select aria-label={LABELS[index]} value={draft.cells[index]} onChange={event => change(index, event.target.value)}><option value="">Não informado</option><option value="F">Feminino</option><option value="M">Masculino</option>{!['', 'F', 'M'].includes(draft.cells[index]) && <option>{draft.cells[index]}</option>}</S.Select>
          : [20, 21, 22].includes(index) ? <S.Select aria-label={LABELS[index]} value={draft.cells[index]} onChange={event => change(index, event.target.value)}><option value="">Em branco</option><option value="TRUE">Sim</option>{!['', 'TRUE'].includes(draft.cells[index]) && <option>{draft.cells[index]}</option>}</S.Select>
            : index === 23 ? <textarea aria-label={LABELS[index]} value={draft.cells[index]} onChange={event => change(index, event.target.value)} />
              : <S.Input aria-label={LABELS[index]} value={draft.cells[index]} disabled={index === 7} placeholder={[9, 19].includes(index) ? 'AAAA-MM-DD' : undefined} onChange={event => change(index, event.target.value)} />}
        {[9, 19].includes(index) && <small>Formato: ano-mês-dia. Deixe vazio se desconhecido.</small>}
        {index === 7 && <small>Preservado do CSV; não preenchido automaticamente.</small>}
      </S.Field>)}</S.FieldGrid>
    </S.DrawerBody>
    <footer><S.Spread><S.TextButton onClick={onClose}>Descartar alterações</S.TextButton><S.Button $primary onClick={() => onSave({ ...draft, reviewed: true })}><Icon name="check" />Salvar revisão</S.Button></S.Spread></footer>
  </S.Drawer>{acknowledging && <ConfirmDialog close={() => setAcknowledging(null)} confirmation={{
    title: acknowledging.code === 'unsupported-page' ? 'Excluir conteúdo não interpretável?' : 'Confirmar conferência do documento?',
    message: acknowledging.code === 'unsupported-page' ? 'Estas páginas não foram extraídas e podem conter outra pessoa. Confira o PDF original. Ao confirmar, você aceita exportar somente os cadastros interpretados, excluindo o conteúdo das páginas incompatíveis.' : 'Confira a opção indicada no PDF original. Ao confirmar, a informação sem coluna de exportação será mantida como desconhecida e não será preenchida automaticamente no CSV.',
    action: acknowledging.code === 'unsupported-page' ? 'Excluir conteúdo dessas páginas' : 'Conferi e aceito deixar em branco',
    run: () => setDraft(current => ({ ...current, issues: current.issues.filter(issue => !(issue.code === acknowledging.code && issue.field === acknowledging.field && issue.message === acknowledging.message)) })),
  }} />}</S.Overlay>;
}

function ExtractedInfo({ meta }) {
  const show = value => value === true ? 'Marcado' : value === false ? 'Desmarcado' : 'Desconhecido';
  const labels = { otherSheep: 'Outras ovelhas', anointed: 'Ungido', specialPioneer: 'Pioneiro especial', missionary: 'Missionário' };
  return <div style={{ fontSize: 11, lineHeight: 1.7, color: '#687c5b' }}>
    {meta.originalName && <p style={{ marginTop: 12 }}>Nome completo no PDF: <strong>{meta.originalName}</strong></p>}
    {Object.entries(meta.checkboxes || {}).map(([field, value]) => <div key={field}>{LABELS[Number(field)]}: {show(value)}</div>)}
    {(meta.observations || []).map((observation, index) => <div key={index} style={{ marginTop: 12 }}><strong>Página {observation.page || index + 1}</strong>{Object.entries(labels).map(([field, label]) => <div key={field}>{label}: {show(observation[field])}</div>)}</div>)}
    {!meta.originalName && !meta.observations?.length && <p>Cadastro preservado do CSV existente.</p>}
  </div>;
}

export default function App() {
  const api = window.recordConverter;
  const [step, setStep] = useState('import');
  const [files, setFiles] = useState([]);
  const [existing, setExisting] = useState(null);
  const [records, setRecords] = useState([]);
  const [duplicates, setDuplicates] = useState(0);
  const [errors, setErrors] = useState([]);
  const [discoveryWarnings, setDiscoveryWarnings] = useState([]);
  const [progress, setProgress] = useState({ found: 0, processed: 0, success: 0, failed: 0, current: '' });
  const [processing, setProcessing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [drag, setDrag] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [saved, setSaved] = useState(null);
  const [page, setPage] = useState(0);
  const [excluded, setExcluded] = useState(0);

  useEffect(() => api?.onProgress(update => {
    setProgress(current => ({ ...current, ...update }));
    if (Array.isArray(update.discoveryWarnings)) setDiscoveryWarnings(current => Array.from(new Map([...current, ...update.discoveryWarnings].map(item => [`${item.name}:${item.message}`, item])).values()));
  }), [api]);
  useEffect(() => { setPage(0); }, [search, filter]);
  const pending = useMemo(() => records.filter(needsReview).length, [records]);
  const blocked = useMemo(() => records.filter(isBlocked).length, [records]);
  const duplicateCount = useMemo(() => records.filter(record => recordIssues(record).some(isDuplicateIssue)).length, [records]);
  const filtered = useMemo(() => records.filter(record => nameCompare(getName(record)).includes(nameCompare(search)) && (filter === 'all' || (filter === 'review' && needsReview(record)) || (filter === 'valid' && !isBlocked(record)) || (filter === 'duplicates' && recordIssues(record).some(isDuplicateIssue)))), [records, search, filter]);
  const pages = Math.max(1, Math.ceil(filtered.length / 60));
  const currentPage = Math.min(page, pages - 1);
  const shown = filtered.slice(currentPage * 60, (currentPage + 1) * 60);
  const safeAction = async action => {
    setMessage(''); setBusy(true);
    try { if (!api) throw new Error('Abra o Record Converter instalado para selecionar arquivos.'); return await action(); }
    catch (error) { setMessage(error.message || 'Não foi possível concluir a operação.'); }
    finally { setBusy(false); }
  };
  const addFiles = items => setFiles(current => Array.from(new Map([...current, ...items].map(item => [item.id, item])).values()));
  const selectFiles = mode => safeAction(async () => {
    setDiscovering(true); setProgress({ found: 0, processed: 0, success: 0, failed: 0, current: 'Localizando PDFs…' });
    try { addFiles(await (mode === 'folder' ? api.selectFolder() : api.selectPdfs())); } finally { setDiscovering(false); }
  });
  const loadCsv = () => safeAction(async () => { const result = await api.importCsv(); if (result) setExisting(result); });
  const start = async () => {
    setMessage(''); setSaved(null); setProcessing(true); setCancelled(false); setErrors([]); setSelected([]); setExcluded(0);
    setProgress({ found: files.length, processed: 0, success: 0, failed: 0, current: '' });
    try {
      const result = files.length ? await api.start(files.map(file => file.id)) : { records: [], duplicates: 0, errors: [], stats: { found: 0, processed: 0, success: 0, failed: 0 } };
      const merged = existing ? mergeExisting(existing.rows, result.records) : result;
      setRecords(merged.records);
      setDuplicates((result.duplicates || 0) + (existing ? merged.duplicates || 0 : 0));
      setErrors(result.errors || []); setCancelled(Boolean(result.cancelled));
      if (result.stats) setProgress(current => ({ ...current, ...result.stats }));
      setStep('review');
    } catch (error) { setMessage(error.message || 'Falha no processamento. Tente novamente.'); }
    finally { setProcessing(false); }
  };
  const requestStart = () => records.length ? setConfirmation({ title: 'Processar os arquivos novamente?', message: 'A revisão atual será substituída pelos dados dos arquivos selecionados. As alterações manuais desta sessão serão descartadas.', action: 'Processar novamente', run: start }) : start();
  const update = record => { setRecords(current => current.map(item => item.id === record.id ? record : item)); setEditing(null); setSaved(null); };
  const removeSelected = () => setConfirmation({ title: 'Excluir da exportação?', message: `Os ${selected.length} cadastros selecionados serão retirados desta sessão. Os PDFs e o CSV original não serão alterados.`, action: 'Excluir cadastros', run: () => { setExcluded(current => current + selected.length); setRecords(current => current.filter(record => !selected.includes(record.id))); setSelected([]); setSaved(null); } });
  const keepSeparate = () => setConfirmation({ title: 'Confirmar pessoas diferentes?', message: 'Confirme que os cadastros selecionados representam pessoas diferentes. A pendência de possível duplicidade será removida somente destes registros.', action: 'Manter separados', run: () => { setRecords(current => current.map(record => selected.includes(record.id) ? { ...record, issues: record.issues.filter(issue => !isDuplicateIssue(issue)), meta: { ...record.meta, identityConfirmed: true } } : record)); setSelected([]); setSaved(null); } });
  const mergeSelected = () => setConfirmation({ title: 'Consolidar a mesma pessoa?', message: `Os ${selected.length} registros selecionados se tornarão um cadastro. Valores diferentes serão apresentados para escolha antes da exportação.`, action: 'Consolidar registros', run: () => {
    const toMerge = records.filter(record => selected.includes(record.id));
    const merged = toMerge.slice(1).reduce((left, right) => mergeRecords(left, right), toMerge[0]);
    merged.issues = merged.issues.filter(issue => !isDuplicateIssue(issue));
    merged.reviewed = false;
    setRecords(current => [...current.filter(record => !selected.includes(record.id)), merged]);
    setDuplicates(current => current + toMerge.length - 1); setSelected([]); setEditing(merged.id); setSaved(null);
  } });
  const exportRows = () => safeAction(async () => {
    if (!records.length || records.some(isBlocked)) throw new Error('Resolva as inconsistências críticas antes de exportar.');
    const result = await api.exportCsv(records.map(record => record.cells));
    if (result.saved) setSaved(result.path);
  });
  const reset = () => setConfirmation({ title: 'Iniciar nova conversão?', message: 'Os dados desta sessão serão descartados. Os arquivos já exportados permanecem no computador.', action: 'Nova conversão', run: () => { setStep('import'); setFiles([]); setExisting(null); setRecords([]); setErrors([]); setDiscoveryWarnings([]); setSelected([]); setDuplicates(0); setSaved(null); setMessage(''); setExcluded(0); setCancelled(false); } });
  const closeEditor = useMemo(() => () => setEditing(null), []);
  const closeConfirmation = useMemo(() => () => setConfirmation(null), []);
  const editingRecord = records.find(record => record.id === editing);
  const disabled = busy || processing;

  return <><S.GlobalStyle /><S.Layout>
    <S.Sidebar><S.Brand><S.BrandIcon><Icon name="file" size={23} /></S.BrandIcon><span>Record<br />Converter<small>Registros em ordem</small></span></S.Brand>
      <S.Nav aria-label="Etapas da conversão">{[['import', 'Importar arquivos'], ['review', 'Revisar cadastros'], ['export', 'Exportar CSV']].map(([value, label], index) => <S.NavButton key={value} $active={step === value} disabled={disabled || (value !== 'import' && records.length === 0 && errors.length === 0)} onClick={() => { setStep(value); setMessage(''); }}><span>{index + 1}</span>{label}</S.NavButton>)}</S.Nav>
      <S.LocalNote><strong><Icon name="shield" size={15} />Seus dados ficam aqui</strong>Processamento local e offline.<br />Nenhum documento é enviado.<div style={{ marginTop: 22, fontSize: 10 }}>VERSÃO 1.0.0 • WINDOWS</div></S.LocalNote>
    </S.Sidebar>
    <S.Main><S.Topbar><span>Área de trabalho <span style={{ margin: '0 8px', color: '#adb5a8' }}>/</span> {processing ? 'Processamento' : step === 'import' ? 'Importação' : step === 'review' ? 'Revisão' : 'Exportação'}</span><span><span style={{ width: 6, height: 6, background: '#63965c', borderRadius: '50%' }} />100% local</span></S.Topbar>
      <S.Content key={step}>
        {message && <S.Banner role="alert" $error>{message}</S.Banner>}
        {discoveryWarnings.length > 0 && !saved && <S.Banner $error role="alert"><strong>Alguns locais não puderam ser verificados</strong><div>Os arquivos desses locais podem não estar incluídos nesta conversão.</div>{discoveryWarnings.map((warning, index) => <div key={index}>{warning.name}: {warning.message}</div>)}</S.Banner>}
        {!api && <S.Banner>Pré-visualização da interface. A seleção e gravação de arquivos estão disponíveis no aplicativo desktop.</S.Banner>}
        {step === 'import' && <><S.Eyebrow>01 / Importação</S.Eyebrow><h1>Comece pelos registros.</h1><S.Muted>Importe os formulários S-21 e prepare os cadastros para revisão.</S.Muted>
          <S.Dropzone $drag={drag} onDragOver={event => { event.preventDefault(); if (!disabled) setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={event => { event.preventDefault(); setDrag(false); if (!disabled) safeAction(async () => addFiles(await api.addDroppedFiles(Array.from(event.dataTransfer.files)))); }} aria-label="Área para arrastar PDFs">
            <S.DocumentMark><Icon name="upload" /></S.DocumentMark><h2>Arraste seus PDFs para cá</h2><p>Um arquivo, vários registros ou uma pasta inteira com subpastas.</p><S.Row><S.Button $primary disabled={disabled} onClick={() => selectFiles('pdf')}><Icon name="file" size={16} />Selecionar PDFs</S.Button><S.Button disabled={disabled} onClick={() => selectFiles('folder')}><Icon name="folder" size={16} />Selecionar pasta</S.Button></S.Row><p style={{ fontSize: 10, margin: '17px 0 0' }}>Formulários preenchíveis S-21 • PDFs digitalizados não são compatíveis</p>
          </S.Dropzone>
          <S.Spread><div><h3 style={{ marginBottom: 5 }}>Atualizar um CSV existente</h3><S.Muted style={{ marginBottom: 0, fontSize: 12 }}>Preserve contatos, endereços e informações já cadastradas.</S.Muted></div><S.Button disabled={disabled} onClick={loadCsv}><Icon name="table" size={16} />Importar CSV existente</S.Button></S.Spread>
          {existing && <S.FileRow><Icon name="table" /><span>{existing.name}</span><small>{existing.rows.length} cadastros</small><button aria-label="Remover CSV existente" disabled={disabled} onClick={() => setExisting(null)}><Icon name="close" size={14} /></button></S.FileRow>}
          <S.Panel><S.Spread><h3 style={{ margin: 0 }}>Arquivos selecionados <span style={{ color: '#8a9680', fontWeight: 400, marginLeft: 8 }}>{files.length}</span></h3>{files.length > 0 && <S.TextButton disabled={disabled} onClick={() => setFiles([])}>Limpar seleção</S.TextButton>}</S.Spread>
            {files.length ? <S.FileList>{files.map(file => <S.FileRow key={file.id}><Icon name="file" size={17} /><span title={file.name}>{file.name}</span><small>PDF</small><button aria-label={`Remover ${file.name}`} disabled={disabled} onClick={() => setFiles(current => current.filter(item => item.id !== file.id))}><Icon name="close" size={14} /></button></S.FileRow>)}</S.FileList> : <S.Muted style={{ margin: '17px 0 3px', fontSize: 12 }}>Nenhum PDF selecionado. Seus arquivos aparecerão aqui.</S.Muted>}
          </S.Panel>
          {(processing || discovering) && <section aria-live="polite" aria-label="Progresso do processamento"><S.ProgressTrack $percent={progress.found ? Math.round(progress.processed / progress.found * 100) : 0}><div /></S.ProgressTrack><S.Spread><S.Muted>{discovering ? `${progress.found} PDFs encontrados` : `${progress.processed} de ${progress.found} PDFs processados`}</S.Muted><S.TextButton onClick={() => api.cancel().catch(error => setMessage(error.message))}>{discovering ? 'Cancelar busca' : 'Cancelar processamento'}</S.TextButton></S.Spread><S.Muted style={{ fontSize: 11 }}>{progress.current || 'Preparando leitura…'}</S.Muted></section>}
          <S.Footer><small>Os dados poderão ser conferidos<br />e editados antes da exportação.</small><S.Button $primary disabled={disabled || (!files.length && !existing)} onClick={requestStart}>{processing ? 'Processando…' : existing && !files.length ? 'Revisar CSV' : 'Iniciar conversão'}<Icon name="arrow" size={17} /></S.Button></S.Footer>
        </>}
        {step === 'review' && <><S.Eyebrow>02 / Revisão</S.Eyebrow><S.Spread><div><h1>Confira cada cadastro.</h1><S.Muted>Revise os dados extraídos e resolva as pendências antes de exportar.</S.Muted></div><S.Button onClick={() => setStep('import')}><Icon name="upload" size={16} />Voltar aos arquivos</S.Button></S.Spread>
          <S.Stats><div><strong>{records.length}</strong><span>Publicadores</span></div><div><strong>{pending}</strong><span>Precisam de revisão</span></div><div><strong>{duplicates}</strong><span>Duplicados consolidados</span></div><div><strong>{errors.length}</strong><span>PDFs com erro</span></div></S.Stats>
          {cancelled && <S.Banner>Processamento cancelado. Os resultados já concluídos estão disponíveis abaixo.</S.Banner>}
          <S.Banner>“Ungido / outras ovelhas” permanece vazio em novos cadastros até existir uma convenção de importação comprovada. Histórico mensal não é exportado.</S.Banner>
          {errors.length > 0 && <details><summary style={{ color: '#a46645', fontSize: 12, cursor: 'pointer' }}>Ver {errors.length} arquivo(s) que não puderam ser lidos</summary>{errors.map((error, index) => <S.Banner $error key={index}><strong>{error.name}</strong> — {error.message}</S.Banner>)}</details>}
          <S.Toolbar><S.Input aria-label="Pesquisar por nome" placeholder="Pesquisar por nome…" value={search} onChange={event => setSearch(event.target.value)} /><S.Select aria-label="Filtrar cadastros" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Todos os cadastros ({records.length})</option><option value="review">Precisam de revisão ({pending})</option><option value="duplicates">Possíveis duplicados ({duplicateCount})</option><option value="valid">Sem bloqueio ({records.length - blocked})</option></S.Select></S.Toolbar>
          {selected.length > 0 && <S.Row style={{ marginBottom: 13, fontSize: 11 }}><span>{selected.length} selecionado(s)</span><S.TextButton disabled={selected.length < 2} onClick={mergeSelected}><Icon name="merge" size={15} />Consolidar</S.TextButton><S.TextButton onClick={keepSeparate}>Manter separados</S.TextButton><S.TextButton $danger onClick={removeSelected}>Excluir da exportação</S.TextButton><S.TextButton onClick={() => setSelected([])}>Limpar seleção</S.TextButton></S.Row>}
          <S.TableScroll><S.Table><thead><tr><th><input type="checkbox" aria-label="Selecionar cadastros desta página" checked={shown.length > 0 && shown.every(record => selected.includes(record.id))} onChange={event => setSelected(current => event.target.checked ? Array.from(new Set([...current, ...shown.map(record => record.id)])) : current.filter(id => !shown.some(record => record.id === id)))} /></th><th>PUBLICADOR</th><th>NASCIMENTO</th><th>SEXO</th><th>BATISMO</th><th>PRIVILÉGIOS</th><th>STATUS</th><th>REVISÃO</th></tr></thead><tbody>{shown.map(record => <tr key={record.id}><td><input type="checkbox" aria-label={`Selecionar ${getName(record)}`} checked={selected.includes(record.id)} onChange={event => setSelected(current => event.target.checked ? [...current, record.id] : current.filter(id => id !== record.id))} /></td><td style={{ fontWeight: 600, color: '#354c31' }}>{getName(record)}</td><td>{dateDisplay(record.cells[9])}</td><td>{record.cells[6] || '—'}</td><td>{dateDisplay(record.cells[19])}</td><td>{[[20, 'SM'], [21, 'PR'], [22, 'ANC']].filter(([index]) => record.cells[index] === 'TRUE').map(([, label]) => label).join(' · ') || '—'}</td><td><S.Badge $warning={needsReview(record)}>{isBlocked(record) ? 'Resolver pendência' : needsReview(record) ? 'Conferir' : record.reviewed ? 'Revisado' : 'Pronto'}</S.Badge></td><td><S.TextButton aria-label={`Editar ${getName(record)}`} onClick={() => setEditing(record.id)}><Icon name="edit" size={14} />Editar</S.TextButton></td></tr>)}</tbody></S.Table>{shown.length === 0 && <S.Empty><Icon name="table" size={28} /><h2>Nenhum cadastro encontrado</h2><p>{records.length ? 'Ajuste a pesquisa ou o filtro.' : 'Importe um formulário S-21 compatível para continuar.'}</p></S.Empty>}</S.TableScroll>
          <S.Spread style={{ marginTop: 13 }}><small style={{ color: '#89957f', fontSize: 11 }}>{filtered.length} cadastro(s) • {progress.found || 0} PDFs encontrados • {progress.processed || 0} processados • {progress.success || 0} com sucesso • {excluded} excluído(s)</small>{pages > 1 && <S.Row><S.TextButton disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</S.TextButton><small>{currentPage + 1} / {pages}</small><S.TextButton disabled={currentPage + 1 === pages} onClick={() => setPage(currentPage + 1)}>Próxima</S.TextButton></S.Row>}</S.Spread>
          <S.Footer><small>{blocked ? `${blocked} cadastro(s) com inconsistências que bloqueiam a exportação.` : 'Dados conferidos? Avance para escolher o destino do CSV.'}</small><S.Button $primary disabled={!records.length} onClick={() => setStep('export')}>Continuar para exportação<Icon name="arrow" size={17} /></S.Button></S.Footer>
        </>}
        {step === 'export' && <>{saved ? <><S.Success><div><Icon name="check" size={30} /></div><S.Eyebrow>Conversão concluída</S.Eyebrow><h1>CSV salvo e verificado.</h1><p>{records.length} cadastro(s) exportado(s) com a estrutura original.</p><S.Row><S.Button $primary onClick={() => safeAction(() => api.revealOutput())}><Icon name="folder" />Abrir pasta de saída</S.Button><S.Button onClick={reset}>Nova conversão</S.Button></S.Row></S.Success><S.Banner>{saved}</S.Banner></> : <><S.Eyebrow>03 / Exportação</S.Eyebrow><h1>Seu CSV, pronto para salvar.</h1><S.Muted>Confira o resumo e escolha onde deseja guardar o arquivo.</S.Muted><S.Stats><div><strong>{records.length}</strong><span>Cadastros incluídos</span></div><div><strong>{records.length - blocked}</strong><span>Sem bloqueio</span></div><div><strong>{pending}</strong><span>Pendentes de revisão</span></div><div><strong>{duplicates}</strong><span>Consolidados</span></div></S.Stats>
          <S.Panel><h2>Formato de saída</h2><S.Muted>Modelo original de cadastro • 24 colunas • Separador ponto e vírgula</S.Muted><S.FileRow><Icon name="check" size={16} /><span>Nomes, ordem e duas colunas de e-mail preservados</span></S.FileRow><S.FileRow><Icon name="check" size={16} /><span>UTF-8 sem BOM, quebras LF e separador terminal do modelo</span></S.FileRow><S.FileRow><Icon name="check" size={16} /><span>Sem histórico mensal e sem dados inventados</span></S.FileRow></S.Panel>
          {errors.length > 0 && <S.Banner>{errors.length} PDF(s) não puderam ser processados. Seus dados não fazem parte desta exportação.</S.Banner>}
          {excluded > 0 && <S.Banner>{excluded} cadastro(s) foram excluídos da exportação nesta sessão.</S.Banner>}
          {blocked > 0 ? <S.Banner $error role="alert">A exportação está bloqueada: {blocked} cadastro(s) possuem inconsistências críticas. Resolva as pendências ou exclua esses cadastros na tela de revisão.</S.Banner> : pending > 0 && <S.Banner>Há {pending} cadastro(s) com avisos para conferência. Você pode voltar à revisão antes de salvar.</S.Banner>}
          <S.Footer><S.TextButton onClick={() => setStep('review')}>Voltar à revisão</S.TextButton><S.Button $primary disabled={disabled || !records.length || blocked > 0} onClick={exportRows}><Icon name="download" />{busy ? 'Salvando…' : 'Exportar CSV'}</S.Button></S.Footer><S.Muted style={{ marginTop: 20, fontSize: 11 }}>O arquivo original permanece preservado. Uma confirmação será solicitada se o destino escolhido já existir.</S.Muted></>}
        </>}
      </S.Content>
    </S.Main>
  </S.Layout>
    {editingRecord && <RecordEditor key={editingRecord.id} record={editingRecord} onSave={update} onClose={closeEditor} />}
    {confirmation && <ConfirmDialog confirmation={confirmation} close={closeConfirmation} />}
  </>;
}
