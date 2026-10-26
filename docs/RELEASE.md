# Distribuição Windows

## Build local

Em Windows com Node.js 22:

```sh
npm ci
npm run lint
npm test
npx playwright install chromium
npm run build
npm run test:e2e
npm run test:electron
npm run dist:win
npm run test:packaged
pwsh ./scripts/windows-smoke.ps1
```

Os arquivos em `release/` são:

- `Record-Converter-Setup-1.0.0.exe`: instalador NSIS x64, com diretório selecionável, atalhos e desinstalador.
- `Record-Converter-Portable-1.0.0.exe`: aplicação portátil x64.
- `SHA256SUMS.txt`: hashes SHA-256 dos executáveis.

`win-unpacked` é material intermediário, não o instalador a entregar. O pacote inclui o runtime Electron; Node.js e npm não são requisitos do computador de destino. O ícone original pode ser reconstruído com `python scripts/generate-icon.py` (Pillow necessário apenas para essa tarefa de desenvolvimento).

## GitHub Actions

O workflow `Windows build and release` executa em `windows-latest` a cada alteração em `main`, pull request, tag `v*` ou acionamento manual em **Actions → Windows build and release → Run workflow**. Usa `npm ci`, lint, testes de lógica e interface, build, empacotamento, verificação de arquivos e smoke test de instalação. Os executáveis e checksums ficam no artifact `Record-Converter-Windows-x64`, retido por 30 dias.

O job de build tem apenas leitura do repositório. O job de publicação recebe `contents: write` e utiliza exclusivamente `GITHUB_TOKEN` do Actions. Nenhum token pessoal ou certificado é necessário.

## Publicar versão

1. Atualize `version` no `package.json` e no lockfile, além das notas de versão.
2. Execute as verificações e envie o commit à branch `main`.
3. Verifique o workflow desse commit. Depois, crie uma tag estável correspondente à versão:

```sh
git tag v1.0.0
git push origin v1.0.0
```

O workflow da tag repete as validações e publica uma Release com os dois executáveis e seus hashes apenas após sucesso. Tags preliminares ou divergentes da versão do pacote não publicam uma Release estável. Se uma publicação falhar, examine o erro antes de repetir: não substitua silenciosamente uma Release existente.

[Execuções](https://github.com/JRaamos/record_converter/actions/workflows/windows.yml) · [Releases](https://github.com/JRaamos/record_converter/releases)

## Verificação e limites de evidência

`verify-package.cjs` inspeciona o `app.asar`, a presença de dependências de runtime e a ausência de fixtures, PDFs/CSVs e dependências de desenvolvimento. Verifica assinaturas estruturais MZ/PE dos executáveis e calcula os hashes.

`windows-smoke.ps1` instala silenciosamente em diretório temporário, confirma os arquivos instalados, executa o programa instalado em modo de autoteste sem Node de desenvolvimento no PATH, exige resultado de sucesso e desinstala. Esse teste não comprova manualmente cada interação, DPI, leitor de tela ou configuração do Windows. Os testes Playwright complementam os testes de lógica e de instalação.

O instalador é não assinado. O SmartScreen pode avisar que o editor não é reconhecido. Não há certificado falso nem mecanismo para desativar proteções. Para futura assinatura, utilize um certificado legítimo e revise o processo de publicação separadamente.
