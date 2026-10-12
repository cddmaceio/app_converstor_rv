# RV — Ajustador de mapas

Abra `index.html` em um navegador moderno. Mantenha `converter.js`, `app.js` e `style.css` na mesma pasta. A página funciona localmente, sem instalação e sem enviar dados para servidores.

1. Selecione o CSV e confira a codificação de entrada (a opção automática usa BOM, verifica UTF-8 e recorre a Windows-1252).
2. Clique em **Processar arquivo**. Confira os mapas ajustados e os valores anteriores e novos. Use a busca para localizar um mapa.
3. Escolha a codificação de saída e clique em **Baixar TXT**. A opção padrão preserva a codificação de entrada e a presença de BOM.

O TXT mantém o formato tabular do CSV, inclusive separador, cabeçalho, zeros à esquerda, campos entre aspas, espaços e quebras de linha. O nome de saída termina em `_ajustado.txt`.

## Regras

- `CargaAtual` igual a `Recarga`, desconsiderando espaços externos e maiúsculas: `Recarga = Sim`. Outras cargas mantêm o valor original de Recarga.
- `Fator` corresponde à quantidade de matrículas não zeradas em `MatricAjud1` e `MatricAjud2`: 0, 1 ou 2. Matrículas vazias contam como zero; valores não numéricos impedem o processamento.
- A lista apresenta somente registros com mudanças. Um mesmo mapa pode ocorrer em vários registros.

## Codificações

UTF-8, UTF-8 com BOM, Unicode UTF-16 LE/BE e Windows-1252 (ANSI) estão disponíveis para saída. Arquivos sem BOM podem ter codificação ambígua: confira os acentos na tabela e selecione a entrada manualmente quando necessário. A exportação Windows-1252 rejeita caracteres não representáveis em vez de substituí-los.

## Verificação

Com Node.js instalado, execute `node converter.test.js`. Para verificar também um CSV real, use `node converter.test.js "C:\caminho\arquivo.csv"`. Os testes verificam as regras, a preservação dos outros campos, codificações, separadores e erros de entrada.
