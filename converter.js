(function (root) {
  'use strict';

  const labels = { 'utf-8': 'UTF-8', 'utf-8-bom': 'UTF-8 com BOM', 'utf-16le': 'Unicode UTF-16 LE', 'utf-16be': 'Unicode UTF-16 BE', 'windows-1252': 'Windows-1252 (ANSI)' };

  function decode(bytes, choice = 'auto') {
    let encoding = choice;
    let bom = false;
    if (choice === 'auto') {
      if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) encoding = 'utf-8-bom';
      else if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = 'utf-16le';
      else if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = 'utf-16be';
      else if (bytes[1] === 0 && bytes[3] === 0) encoding = 'utf-16le';
      else if (bytes[0] === 0 && bytes[2] === 0) encoding = 'utf-16be';
      else {
        try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); encoding = 'utf-8'; }
        catch { encoding = 'windows-1252'; }
      }
    }
    bom = encoding === 'utf-8-bom' || (encoding === 'utf-16le' && bytes[0] === 0xff && bytes[1] === 0xfe) || (encoding === 'utf-16be' && bytes[0] === 0xfe && bytes[1] === 0xff);
    const text = new TextDecoder(encoding === 'utf-8-bom' ? 'utf-8' : encoding, { fatal: true }).decode(bytes);
    return { text, encoding, bom };
  }

  function encode(text, encoding, bom = true) {
    if (encoding === 'utf-8' || encoding === 'utf-8-bom') {
      const body = new TextEncoder().encode(text);
      if (encoding === 'utf-8') return body;
      const result = new Uint8Array(body.length + 3);
      result.set([0xef, 0xbb, 0xbf]); result.set(body, 3);
      return result;
    }
    if (encoding === 'utf-16le' || encoding === 'utf-16be') {
      const offset = bom ? 2 : 0;
      const result = new Uint8Array(text.length * 2 + offset);
      const view = new DataView(result.buffer);
      const little = encoding === 'utf-16le';
      if (bom) view.setUint16(0, 0xfeff, little);
      for (let i = 0; i < text.length; i++) view.setUint16(offset + i * 2, text.charCodeAt(i), little);
      return result;
    }
    if (encoding !== 'windows-1252') throw new Error('Codificação de saída desconhecida.');
    const table = new Map();
    const decoder = new TextDecoder('windows-1252');
    for (let i = 0; i < 256; i++) table.set(decoder.decode(Uint8Array.of(i)), i);
    return Uint8Array.from(Array.from(text, character => {
      if (!table.has(character)) throw new Error(`O caractere “${character}” não existe em Windows-1252. Escolha UTF-8 ou Unicode.`);
      return table.get(character);
    }));
  }

  // Keep raw fields and record endings so only changed cells are rewritten.
  function parse(text, separator) {
    const records = [];
    let cells = [], start = 0, quoted = false;
    const pushCell = end => {
      const raw = text.slice(start, end);
      let value = raw;
      if (raw.startsWith('"')) {
        if (!raw.endsWith('"') || raw.length < 2) throw new Error('Campo entre aspas inválido.');
        value = raw.slice(1, -1).replace(/""/g, '"');
      }
      cells.push({ raw, value });
    };
    for (let i = 0; i < text.length; i++) {
      const character = text[i];
      if (character === '"') {
        if (quoted && text[i + 1] === '"') { i++; continue; }
        if (quoted) quoted = false;
        else if (i === start) quoted = true;
        else throw new Error('Aspas inesperadas em um campo do arquivo.');
      } else if (!quoted && character === separator) {
        pushCell(i); start = i + 1;
      } else if (!quoted && (character === '\r' || character === '\n')) {
        pushCell(i);
        let ending = character;
        if (character === '\r' && text[i + 1] === '\n') { ending += '\n'; i++; }
        records.push({ cells, ending }); cells = []; start = i + 1;
      }
    }
    if (quoted) throw new Error('O arquivo contém um campo com aspas não fechadas.');
    if (start < text.length) { pushCell(text.length); records.push({ cells, ending: '' }); }
    return records;
  }

  function process(text) {
    const firstLine = text.split(/\r\n|\n|\r/, 1)[0];
    const separator = [';', '\t', ','].find(candidate => {
      try { return parse(firstLine, candidate)[0]?.cells.some(cell => cell.value.trim().toLowerCase() === 'cargaatual'); }
      catch { return false; }
    });
    if (!separator) throw new Error('Cabeçalho não reconhecido. Use um arquivo com a coluna CargaAtual, separado por ;, vírgula ou tabulação.');
    const records = parse(text, separator);
    const header = records[0].cells.map(cell => cell.value.trim().toLowerCase());
    const index = {};
    for (const name of ['cargaatual', 'recarga', 'fator', 'matricajud1', 'matricajud2', 'mapa']) {
      index[name] = header.indexOf(name);
      if (index[name] < 0) throw new Error(`Coluna obrigatória ausente: ${name}.`);
      if (header.lastIndexOf(name) !== index[name]) throw new Error(`Coluna duplicada: ${name}.`);
    }
    const changes = [];
    let total = 0, recargaCount = 0, fatorCount = 0;
    for (let r = 1; r < records.length; r++) {
      const cells = records[r].cells;
      if (cells.length === 1 && cells[0].value.trim() === '') continue;
      if (cells.length !== header.length) throw new Error(`Registro ${r + 1}: ${cells.length} colunas; o cabeçalho possui ${header.length}.`);
      total++;
      const get = name => cells[index[name]].value;
      const present = name => {
        const value = get(name).trim();
        if (value && !/^\d+$/.test(value)) throw new Error(`Registro ${r + 1}: matrícula inválida em ${name}.`);
        return /[1-9]/.test(value);
      };
      const factor = String(Number(present('matricajud1')) + Number(present('matricajud2')));
      const oldFactor = get('fator'), oldRecarga = get('recarga');
      const newRecarga = get('cargaatual').trim().toLowerCase() === 'recarga' ? 'Sim' : oldRecarga;
      const factorChanged = oldFactor !== factor;
      const recargaChanged = oldRecarga !== newRecarga;
      const set = (name, value) => { const cell = cells[index[name]]; cell.value = value; cell.raw = cell.raw.startsWith('"') ? `"${value}"` : value; };
      if (factorChanged) { set('fator', factor); fatorCount++; }
      if (recargaChanged) { set('recarga', newRecarga); recargaCount++; }
      if (factorChanged || recargaChanged) changes.push({ record: r + 1, mapa: get('mapa'), carga: get('cargaatual'), ajud1: get('matricajud1'), ajud2: get('matricajud2'), oldFactor, factor, oldRecarga, recarga: newRecarga, factorChanged, recargaChanged });
    }
    return { text: records.map(record => record.cells.map(cell => cell.raw).join(separator) + record.ending).join(''), changes, total, recargaCount, fatorCount, columns: header.length, separator };
  }

  const api = { decode, encode, parse, process, labels };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CsvConverter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
