/**
 * Genera js/correspondencias-data.js desde el CSV de correspondencias.
 * Uso: node scripts/generar-correspondencias.js
 */
const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'CORRESPONDENCIAS_GOLFLERMA_GOLFSALDAÑA - Hoja 1.csv');
const outPath = path.join(__dirname, '..', 'js', 'correspondencias-data.js');

const csv = fs.readFileSync(csvPath, 'utf8');

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') {
        row.push(field.replace(/\s+/g, ' ').trim());
        field = '';
      } else if (c === '\n' || c === '\r') {
        row.push(field.replace(/\s+/g, ' ').trim());
        field = '';
        if (row.some(x => x)) rows.push(row);
        row = [];
        if (c === '\r' && text[i + 1] === '\n') i++;
      } else field += c;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\s+/g, ' ').trim());
    if (row.some(x => x)) rows.push(row);
  }
  return rows;
}

function firstNum(s) {
  if (!s || typeof s !== 'string') return null;
  const m = s.match(/(\d+)[.,]?(\d*)/);
  if (!m) return null;
  if (m[2]) return parseFloat(m[1] + '.' + m[2]);
  return parseInt(m[1], 10);
}

function slug(n) {
  return n
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'club';
}

const rows = parseCSV(csv);
const header = rows[0] || [];
const dataRows = rows.slice(1);

const clubs = [];
const ids = new Set();

for (const r of dataRows) {
  const nombre = (r[1] || '').trim();
  if (!nombre) continue;
  const lab = firstNum(r[3]);
  const sab = firstNum(r[4]);
  let id = slug(nombre);
  if (ids.has(id)) {
    let n = 2;
    while (ids.has(id + '-' + n)) n++;
    id = id + '-' + n;
  }
  ids.add(id);
  clubs.push({
    id,
    nombre,
    greenFeeLerma: lab,
    greenFeeSaldana: sab,
    zona: (r[0] || '').trim(),
    ccaa: (r[2] || '').trim(),
    laborables: (r[3] || '').trim(),
    sabFest: (r[4] || '').trim(),
    dias: (r[5] || '').trim(),
    telReservas: (r[6] || '').trim(),
    observaciones: (r[7] || '').trim()
  });
}

const js = `/**
 * Datos de correspondencias: clubs con acuerdo y precios green fee.
 * Generado desde CORRESPONDENCIAS_GOLFLERMA_GOLFSALDAÑA - Hoja 1.csv
 * LABORABLES -> greenFeeLerma | SÁB./FEST. -> greenFeeSaldana
 * Para regenerar: node scripts/generar-correspondencias.js
 */
const CORRESPONDENCIAS_DATA = {
  clubs: ${JSON.stringify(clubs, null, 4).replace(/^/gm, ' ')}
};

function getClubsCorrespondencia() {
  return CORRESPONDENCIAS_DATA.clubs || [];
}

function getClubById(id) {
  return (CORRESPONDENCIAS_DATA.clubs || []).find(function (c) { return c.id === id; });
}

function getPrecioGreenFee(clubId, campo) {
  var c = getClubById(clubId);
  if (!c) return null;
  if (campo === "lerma") return c.greenFeeLerma != null ? c.greenFeeLerma : null;
  if (campo === "saldana") return c.greenFeeSaldana != null ? c.greenFeeSaldana : null;
  return null;
}

function isCorrespondencia(clubId) {
  return !!getClubById(clubId);
}
`;

fs.writeFileSync(outPath, js, 'utf8');
console.log('Generado js/correspondencias-data.js con', clubs.length, 'clubs.');
