'use strict';

const $ = id => document.getElementById(id);
let current = null;
let inputFile = null;
let version = 0;

function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}

function reset() {
  version++;
  current = null;
  $('result').hidden = true;
  $('process').disabled = !$('file').files.length;
}

$('file').addEventListener('change', () => {
  reset();
  status($('file').files.length ? 'Arquivo selecionado. Clique em Processar arquivo.' : 'Selecione um arquivo para começar.');
});
$('input-encoding').addEventListener('change', () => { reset(); status('Codificação alterada. Processe o arquivo novamente.'); });

function renderChanges() {
  const query = $('search').value.trim().toLowerCase();
  const changes = current.result.changes.filter(item => item.mapa.toLowerCase().includes(query));
  const fragment = document.createDocumentFragment();
  for (const item of changes) {
    const row = document.createElement('tr');
    const values = [item.record, item.mapa, item.carga, item.ajud1, item.ajud2, item.factorChanged ? `${item.oldFactor.trim() || '(vazio)'} → ${item.factor}` : item.factor, item.recargaChanged ? `${item.oldRecarga.trim() || '(vazio)'} → ${item.recarga}` : item.recarga];
    values.forEach((value, index) => {
      const cell = document.createElement('td');
      cell.textContent = String(value).trim() || '—';
      if ((index === 5 && item.factorChanged) || (index === 6 && item.recargaChanged)) cell.className = 'changed';
      row.append(cell);
    });
    fragment.append(row);
  }
  $('changes').replaceChildren(fragment);
  $('table-count').textContent = changes.length ? `${changes.length} registro(s) exibido(s). Um mapa pode aparecer em mais de um registro.` : query ? 'Nenhum mapa corresponde à busca.' : 'Nenhum ajuste necessário: o arquivo já atende às regras.';
}

$('search').addEventListener('input', renderChanges);
$('process').addEventListener('click', async () => {
  reset();
  const run = version;
  const file = $('file').files[0];
  if (!file) return;
  const encoding = $('input-encoding').value;
  $('process').disabled = true;
  status('Lendo e processando o arquivo…');
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (run !== version) return;
    const decoded = CsvConverter.decode(bytes, encoding);
    const result = CsvConverter.process(decoded.text);
    current = { decoded, result };
    inputFile = file;
    $('total').textContent = result.total;
    $('changed').textContent = result.changes.length;
    $('factors').textContent = result.fatorCount;
    $('recharges').textContent = result.recargaCount;
    $('search').value = '';
    $('output-encoding').value = 'original';
    renderChanges();
    $('result').hidden = false;
    status(`${file.name} • ${CsvConverter.labels[decoded.encoding]}${decoded.bom && decoded.encoding !== 'utf-8-bom' ? ' com BOM' : ''} • ${result.columns} colunas • separador ${result.separator === '\t' ? 'tabulação' : result.separator}. Processamento concluído.`);
  } catch (error) {
    if (run === version) status(`Não foi possível processar: ${error.message}`, true);
  } finally {
    if (run === version) $('process').disabled = false;
  }
});

$('download').addEventListener('click', () => {
  if (!current) return;
  try {
    const selected = $('output-encoding').value;
    const original = selected === 'original';
    const encoding = original ? current.decoded.encoding : selected;
    const bytes = CsvConverter.encode(current.result.text, encoding, original ? current.decoded.bom : true);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = inputFile.name.replace(/\.[^.]+$/, '') + '_ajustado.txt';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    status(`Download preparado: ${link.download} • ${CsvConverter.labels[encoding]}.`);
  } catch (error) { status(error.message, true); }
});
