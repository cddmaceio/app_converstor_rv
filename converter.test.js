'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const { decode, encode, parse, process: convert } = require('./converter.js');

const header = 'Mapa;CargaAtual;MatricAjud1;MatricAjud2;Fator;Recarga;Descrição';
const source = header + '\r\n' + [
  '001;Recarga;00003;00000;0;   ;"ação; entrega"',
  '002;Roteriz;00003;00009;0;Não;"texto com ""aspas"""',
  '003;Recarga;00000;00009;2;Não;"duas\r\nlinhas"',
  '004;Roteriz;00000;00000;0;   ;  espaços  ',
  '005;Recarga;00001;00002;2;Sim;fim'
].join('\r\n') + '\r\n';
const result = convert(source);
assert.equal(result.total, 5);
assert.equal(result.changes.length, 3);
assert.equal(result.recargaCount, 2);
assert.equal(result.fatorCount, 3);
assert.deepEqual(result.changes.map(item => item.factor), ['1', '2', '1']);
assert.equal(convert(result.text).changes.length, 0);
const oldRows = parse(source, ';'), newRows = parse(result.text, ';');
for (let r = 0; r < oldRows.length; r++) {
  assert.equal(oldRows[r].ending, newRows[r].ending);
  for (let c = 0; c < oldRows[r].cells.length; c++) {
    if (r && (c === 4 || c === 5)) continue;
    assert.equal(oldRows[r].cells[c].raw, newRows[r].cells[c].raw);
  }
}
for (const encoding of ['utf-8', 'utf-8-bom', 'utf-16le', 'utf-16be', 'windows-1252']) {
  const bytes = encode(source, encoding);
  const decoded = decode(bytes);
  assert.equal(decoded.encoding, encoding);
  assert.equal(decoded.text, source);
  assert.deepEqual(encode(decoded.text, decoded.encoding, decoded.bom), bytes);
}
for (const encoding of ['utf-16le', 'utf-16be']) {
  const bytes = encode(source, encoding, false);
  const decoded = decode(bytes);
  assert.equal(decoded.encoding, encoding);
  assert.equal(decoded.bom, false);
  assert.deepEqual(encode(decoded.text, decoded.encoding, false), bytes);
}
assert.throws(() => encode('😀', 'windows-1252'), /não existe/);
assert.throws(() => convert(header + '\n1;Recarga;abc;0;0;;x'), /matrícula inválida/);
assert.throws(() => convert(header + '\n1;Recarga;0'), /colunas/);
assert.throws(() => convert('Mapa;Fator\n1;0'), /Cabeçalho/);
assert.throws(() => parse('"campo aberto', ';'), /não fechadas/);
for (const separator of [',', '\t']) {
  const data = ['Mapa', 'CargaAtual', 'MatricAjud1', 'MatricAjud2', 'Fator', 'Recarga'].map(value => `"${value}"`).join(separator) + '\n' + ['1', 'Recarga', '0', '0009', '0', ''].map(value => `"${value}"`).join(separator);
  assert.equal(convert(data).changes[0].factor, '1');
}
console.log('Testes aprovados: regras, preservação de campos, aspas, separadores, codificações e validação.');

if (process.argv[2]) {
  const bytes = new Uint8Array(fs.readFileSync(process.argv[2]));
  const decoded = decode(bytes);
  assert.deepEqual(encode(decoded.text, decoded.encoding, decoded.bom), bytes);
  const actual = convert(decoded.text);
  assert.equal(convert(actual.text).changes.length, 0);
  const before = parse(decoded.text, actual.separator), after = parse(actual.text, actual.separator);
  const columns = before[0].cells.map(cell => cell.value.trim().toLowerCase());
  for (let r = 0; r < before.length; r++) {
    assert.equal(before[r].ending, after[r].ending);
    for (let c = 0; c < before[r].cells.length; c++) {
      if (r && ['recarga', 'fator'].includes(columns[c])) continue;
      assert.equal(before[r].cells[c].raw, after[r].cells[c].raw);
    }
  }
  console.log(JSON.stringify({ encoding: decoded.encoding, bom: decoded.bom, columns: actual.columns, records: actual.total, changed: actual.changes.length, factors: actual.fatorCount, recharges: actual.recargaCount }, null, 2));
}
