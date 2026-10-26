# Arquitetura

O Record Converter é uma aplicação local Electron + React. Não possui backend HTTP, banco de dados ou processamento remoto.

## Responsabilidades

| Caminho | Responsabilidade |
| --- | --- |
| `src/` | Importação, progresso, tabela de revisão, edição e exportação em português |
| `electron/main/` | Janela, ciclo de vida, diálogos nativos e autorização de IPC |
| `electron/preload/` | API mínima disponibilizada ao renderer isolado |
| `electron/services/` | Descoberta de arquivos, processamento em lote, PDF, CSV e consolidação |
| `shared/` | Schema posicional e validações testáveis sem interface |
| `tests/` | Casos sintéticos unitários, integração e fluxos da interface |
| `scripts/` | Verificação da distribuição e smoke test Windows |

## Fluxo

A seleção nativa autoriza os caminhos de entrada. Pastas são percorridas recursivamente com deduplicação de caminhos reais e proteção contra ciclos. O lote executa com concorrência limitada, reporta progresso e mantém resultados dos arquivos válidos quando outro arquivo falha. O cancelamento interrompe o trabalho pendente.

O extrator lê somente o cabeçalho do S-21: nome, datas, sexo, grupo e privilégios. O sufixo do identificador não determina a identidade; a página e os widgets do documento fornecem a associação. A árvore de campos é a primeira fonte; a alternativa determinística lê widgets de páginas quando a árvore está ausente. O arquivo de referência possui 75 widgets por página, mas não oferece uma árvore AcroForm utilizável. O PDF nunca é enviado a serviços externos nem modificado.

Caixas de seleção usam seus estados reais e aparências, sem interpretar qualquer string não vazia como marcação. Informação desconhecida, desmarcada e marcada permanece distinta internamente. Valores contraditórios precisam de revisão. A extração não percorre registros mensais como cadastro.

## Identidade e conservação

Nome normalizado, nascimento e batismo quando disponível fundamentam a comparação. Acentos e caixa só são normalizados para comparação; os valores originais permanecem no cadastro. Correspondências comprovadas podem ser consolidadas; nomes semelhantes ou dados divergentes permanecem para decisão do usuário.

Cada cadastro guarda `cells`, um vetor de 24 strings, além de fontes e metadados internos. As duas posições `emailMain` são independentes. Na atualização de um CSV, informações confiáveis preenchem lacunas; ausência no PDF não apaga dados existentes. Conflitos mantêm as alternativas até escolha explícita. Metadados, identificadores e avisos não são serializados.

## Segurança e privacidade

A janela usa isolamento de contexto, sandbox e Node desabilitado no renderer. O preload expõe operações específicas, sem filesystem arbitrário. IPC valida remetente e argumentos; navegação e janelas externas são bloqueadas. A CSP limita recursos ao aplicativo. A distribuição não depende de fontes, scripts ou serviços remotos.

Os documentos são processados em memória; o aplicativo não mantém um banco permanente de cadastros. Diagnósticos públicos evitam valores de registros e conteúdo de PDFs. O salvamento usa um diálogo de destino e verifica o conteúdo gravado antes de informar sucesso.

Os testes e artifacts públicos contêm exclusivamente dados sintéticos. O instalador não inclui fixtures, PDFs de origem, CSVs pessoais nem dependências de desenvolvimento.
