# Contrato CSV

O contrato reproduz o modelo fornecido, inclusive seu cabeçalho duplicado e a convenção de terminador das linhas de dados.

```csv
nameFirst;nameMiddle;nameLast;nameSuffix;nameNickname;maritalStatus;gender;anointedOtherSheep;inactive;dateBirth;addressHomeStreet;addressHomeCity;addressHomeStateProvince;addressHomePostal;phoneMobile;phoneHome;emailMain;emailMain;emailJwpub;dateBaptism;privilegeMS;privilegePioneer;privilegeElder;notes
```

| Posição (1–24) | Campo | Origem e regra |
| --- | --- | --- |
| 1 | nameFirst | Primeiro componente do nome; editável |
| 2 | nameMiddle | Componentes intermediários, sem perder partículas |
| 3 | nameLast | Último componente; divisão heurística, revisável |
| 4 | nameSuffix | Vazio no novo cadastro; preservar existente |
| 5 | nameNickname | Vazio no novo cadastro; preservar existente |
| 6 | maritalStatus | Vazio no novo cadastro; preservar existente |
| 7 | gender | Masculino `M`; feminino `F`; inconsistência exige revisão |
| 8 | anointedOtherSheep | Vazio no novo cadastro; sem código comprovado; preservar existente |
| 9 | inactive | Vazio no novo cadastro; preservar existente |
| 10 | dateBirth | Nascimento: `AAAA-MM-DD` |
| 11 | addressHomeStreet | Vazio no novo cadastro; preservar existente |
| 12 | addressHomeCity | Vazio no novo cadastro; preservar existente |
| 13 | addressHomeStateProvince | Vazio no novo cadastro; preservar existente |
| 14 | addressHomePostal | Vazio no novo cadastro; preservar existente |
| 15 | phoneMobile | Vazio no novo cadastro; preservar existente |
| 16 | phoneHome | Vazio no novo cadastro; preservar existente |
| 17 | emailMain | Primeira posição independente; preservar existente |
| 18 | emailMain | Segunda posição independente; preservar existente |
| 19 | emailJwpub | Vazio no novo cadastro; preservar existente |
| 20 | dateBaptism | Batismo: `AAAA-MM-DD` |
| 21 | privilegeMS | Servo ministerial marcado: `TRUE`; demais vazios |
| 22 | privilegePioneer | Pioneiro regular marcado: `TRUE`; demais vazios |
| 23 | privilegeElder | Ancião marcado: `TRUE`; demais vazios |
| 24 | notes | Vazio inicialmente; edição manual ou preservação do CSV |

## Serialização

- UTF-8 sem BOM; delimitador `;`; quebra de linha LF (`\n`).
- Não acrescenta LF ao final do arquivo, conforme os bytes do modelo original.
- Cabeçalho com exatamente 24 posições e sem separador extra.
- Linha de dados: 24 posições de cadastro **mais uma posição terminal vazia**. O separador adicional não é uma coluna de cadastro. Se `notes` estiver vazio, os separadores finais refletem tanto `notes` quanto o terminador.
- Na importação, uma 25ª posição só é aceita quando vazia. Conteúdo nessa posição é erro; não há truncamento silencioso.
- Campos contendo `;`, aspas ou quebras de linha usam escape CSV com aspas duplas. Aspas internas são duplicadas.
- Cada posição é uma string. Não se usa um objeto indexado pelo nome do cabeçalho, pois isso destruiria uma ocorrência de `emailMain`.
- Nenhuma coluna, identificador interno, histórico mensal ou metadado é acrescentado.

## Mapeamento S-21

Identificadores `900_<n>_<tipo>_<sufixo>` são reconhecidos independentemente do sufixo, mantendo a associação com a página.

| Número | Informação |
| --- | --- |
| 1 | Nome completo |
| 2 | Nascimento |
| 3 / 4 | Masculino / Feminino |
| 5 | Batismo |
| 6 / 7 | Outras ovelhas / Ungido (interno, sem código exportável comprovado) |
| 8 / 9 / 10 | Ancião / Servo ministerial / Pioneiro regular |
| 11 / 12 | Pioneiro especial / Missionário (não mapeados para privilégio regular) |

Datas `DD/MM/AAAA` são validadas, inclusive anos bissextos, antes de converter. Datas ausentes permanecem vazias; datas impossíveis não são corrigidas automaticamente. Ausência de um campo e caixa explicitamente desmarcada permanecem estados internos diferentes. Nenhum deles produz `FALSE` automaticamente.

Nome é dividido inicialmente em primeiro, intermediários e último componente. Essa divisão não é uma interpretação definitiva de sobrenomes; todos os componentes e acentos são preservados, com edição e indicação de ambiguidade.

## Compatibilidade e regressões

Os testes com fixtures sintéticas comparam o cabeçalho byte a byte, preservam as duas posições `emailMain`, verificam o terminador vazio e os escapes, rejeitam uma 25ª posição preenchida e executam exportação/importação de ida e volta. Os documentos reais são usados somente para validação local e não são versionados.

O campo `anointedOtherSheep` não possui convenção demonstrada pelo modelo: todos os exemplos fornecidos estão vazios. O aplicativo não inventa códigos. Registros mensais, horas, estudos, ano de serviço e observações mensais são excluídos do mapeamento.
