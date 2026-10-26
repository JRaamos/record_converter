Primeira versão do Record Converter para Windows 10/11 x64.

- Importação de PDFs S-21 individuais, múltiplos arquivos e pastas recursivas.
- Processamento local de formulários interativos, revisão de cadastros e tratamento de conflitos e duplicidades.
- Criação de CSV ou atualização preservando dados existentes.
- Exportação com as 24 posições originais, as duas `emailMain` e o terminador vazio do modelo.
- Instalador NSIS e versão portátil; funcionamento offline e sem Node.js instalado.

Baixe **Record-Converter-Setup-1.0.0.exe** para instalar, ou **Record-Converter-Portable-1.0.0.exe** para usar a versão portátil. `SHA256SUMS.txt` contém os hashes dos executáveis.

O aplicativo e o instalador não possuem assinatura digital; o Windows SmartScreen pode apresentar aviso de editor não reconhecido. PDFs digitalizados/achatados não são suportados. O código de exportação para `anointedOtherSheep` não foi comprovado pelo modelo e permanece vazio em novos registros. Revise nomes, identidades ambíguas e conflitos antes de exportar.

Os testes automatizados incluem lógica, interface e smoke de instalação/execução/desinstalação em Windows. O smoke não equivale a uma revisão manual completa em todas as configurações do Windows.
