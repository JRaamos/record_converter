# Record Converter

Aplicativo Windows para converter formulários S-21 de registros de publicadores em um CSV compatível com o modelo de 24 colunas. Todo o processamento acontece no computador, sem servidor, OCR, conta, telemetria ou envio de documentos.

**[Baixar instalador Windows x64](https://github.com/JRaamos/record_converter/releases/latest)** · [Especificação CSV](docs/CSV_SPECIFICATION.md) · [Arquitetura](docs/ARCHITECTURE.md)

## Utilização

1. Instale o `Record-Converter-Setup-1.0.0.exe`, ou abra a versão `Portable`.
2. Selecione PDFs, arraste arquivos para o aplicativo ou escolha uma pasta. As subpastas são incluídas.
3. Opcionalmente, importe o CSV atual para preservar endereços, contatos e demais informações existentes.
4. Inicie a conversão. Um PDF incompatível não interrompe os demais arquivos; o processamento pode ser cancelado.
5. Revise os cadastros, divisões de nome, possíveis duplicados e conflitos. Corrija ou exclua explicitamente os registros inválidos.
6. Exporte para um local escolhido. O aplicativo confirma o sucesso somente após verificar a gravação.

As páginas da mesma pessoa são consolidadas quando a identidade é suficientemente comprovada. Divergências exigem revisão; nomes iguais, isoladamente, não justificam mesclagem. Os dados mensais do formulário não são exportados.

## Desenvolvimento

Requisitos: Node.js 22 e npm. Windows 10/11 x64 para gerar e testar a distribuição Windows; macOS/Linux podem executar desenvolvimento e testes de lógica/interface. O usuário final **não precisa instalar Node.js**.

```sh
npm ci
npm run dev
```

React com JavaScript, Vite e styled-components compõem a interface. Electron fornece as operações locais por IPC restrito. pdf-lib lê os campos PDF; csv-parse e csv-stringify preservam os valores por posição.

```sh
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run test:electron
npm run dist:win
npm run test:packaged
```

No Windows, execute `pwsh ./scripts/windows-smoke.ps1` após gerar os executáveis. O workflow [Windows build and release](https://github.com/JRaamos/record_converter/actions/workflows/windows.yml) executa lint, testes, compilação, empacotamento, instalação e desinstalação em um runner Windows. Tags estáveis `vX.Y.Z` publicam a Release apenas depois das verificações.

## Compatibilidade e limites

- Windows 10/11 x64. Funciona offline depois da instalação.
- Formulários S-21 com campos reconhecidos, incluindo widgets interativos sem árvore AcroForm. PDFs digitalizados, formulários achatados, protegidos ou com campos desconhecidos podem exigir outro arquivo.
- O cabeçalho mantém **24 posições**, inclusive as duas `emailMain`. Cada linha de dados mantém o campo vazio terminal do modelo original; UTF-8 sem BOM, delimitador `;` e LF.
- `anointedOtherSheep` permanece vazio em novos cadastros: o modelo não comprova os códigos aceitos. A seleção do PDF fica disponível internamente para revisão. Valores de CSV já existente são preservados.
- Pioneiro especial, missionário e pioneiro auxiliar mensal não são convertidos em pioneiro regular.
- Nomes, dados conflitantes e identidades ambíguas requerem decisão humana. O programa não adivinha valores ausentes.
- O instalador é **não assinado**. O Windows SmartScreen pode apresentar aviso de aplicativo não reconhecido. Confira a origem na Release e o SHA-256; não há certificado artificial ou desativação de segurança.
- Os testes de interface automatizam o fluxo com dados sintéticos. O smoke test da instalação verifica o executável instalado; não equivale a uma sessão manual completa em todas as versões do Windows.

Nenhum PDF real ou cadastro pessoal integra o repositório, os testes públicos ou os executáveis. Veja [como publicar uma versão](docs/RELEASE.md).
