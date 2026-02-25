/**
 * Guía de slope - Tabla de equivalencia Sistema Mundial de Hándicap (Golf Lerma).
 * Carga data/slope-equivalencia.csv, permite elegir handicap, tee y modalidad y muestra el valor.
 */
(function () {
  'use strict';

  var CSV_URL = 'data/slope-equivalencia.csv';
  var TEES = [
    { id: 'BLANCAS', label: 'Blancas' },
    { id: 'AMARILLAS', label: 'Amarillas' },
    { id: 'AZULES', label: 'Azules' },
    { id: 'ROJAS', label: 'Rojas' }
  ];
  var MODALIDADES = [
    { id: 'Informal 100%', label: 'Informal 100%' },
    { id: 'Medal 95%', label: 'Medal 95%' },
    { id: 'Four Ball 85%', label: 'Four Ball 85%' }
  ];

  function parseCSVLine(line) {
    var numMatch = line.match(/^(\d+),/);
    if (!numMatch) return null;
    var hdcp = parseInt(numMatch[1], 10);
    var quoted = line.match(/"[^"]*"/g);
    var values = quoted ? quoted.map(function (s) { return s.slice(1, -1).trim(); }) : [];
    while (values.length < 12) values.push('');
    return { hdcp: hdcp, values: values };
  }

  function parseCSV(text) {
    var lines = text.split(/\r?\n/);
    var rows = [];
    for (var i = 3; i < lines.length; i++) {
      var row = parseCSVLine(lines[i]);
      if (row) rows.push(row);
    }
    return rows;
  }

  function getUniqueHandicaps(rows) {
    var seen = {};
    var out = [];
    rows.forEach(function (r) {
      if (!seen[r.hdcp]) {
        seen[r.hdcp] = true;
        out.push(r.hdcp);
      }
    });
    return out.sort(function (a, b) { return a - b; });
  }

  function findValue(rows, hdcp, teeId, modId) {
    var teeIndex = TEES.findIndex(function (t) { return t.id === teeId; });
    var modIndex = MODALIDADES.findIndex(function (m) { return m.id === modId; });
    if (teeIndex < 0 || modIndex < 0) return null;
    var colIndex = teeIndex * 3 + modIndex;
    var row = rows.find(function (r) { return r.hdcp === hdcp; });
    if (!row || colIndex >= row.values.length) return null;
    var val = row.values[colIndex];
    return (val && val.trim()) ? val : null;
  }

  function init() {
    var block = document.getElementById('slope-guia-block');
    if (!block) return;

    var selectHdcp = block.querySelector('[data-slope-hdcp]');
    var selectTee = block.querySelector('[data-slope-tee]');
    var selectMod = block.querySelector('[data-slope-modalidad]');
    var resultEl = block.querySelector('[data-slope-result]');
    var resultValue = block.querySelector('[data-slope-result-value]');

    if (!selectHdcp || !selectTee || !selectMod || !resultValue) return;

    function showResult() {
      var hdcp = parseInt(selectHdcp.value, 10);
      var tee = selectTee.value;
      var mod = selectMod.value;
      if (isNaN(hdcp) || !tee || !mod) {
        resultEl.style.display = 'none';
        return;
      }
      var val = findValue(window.SLOPE_EQUIVALENCIA_DATA || [], hdcp, tee, mod);
      if (val) {
        resultValue.textContent = val;
        resultEl.style.display = 'block';
      } else {
        resultValue.textContent = '—';
        resultEl.style.display = 'block';
      }
    }

    function fillHandicaps(rows) {
      var opts = getUniqueHandicaps(rows);
      selectHdcp.innerHTML = '<option value="">Tu handicap (puntos)</option>' +
        opts.map(function (n) { return '<option value="' + n + '">' + n + '</option>'; }).join('');
    }

    function fillTees() {
      selectTee.innerHTML = '<option value="">Color de tee</option>' +
        TEES.map(function (t) { return '<option value="' + t.id + '">' + t.label + '</option>'; }).join('');
    }

    function fillModalidades() {
      selectMod.innerHTML = '<option value="">Modalidad de juego</option>' +
        MODALIDADES.map(function (m) { return '<option value="' + m.id + '">' + m.label + '</option>'; }).join('');
    }

    fillTees();
    fillModalidades();
    resultEl.style.display = 'none';

    fetch(CSV_URL)
      .then(function (r) { return r.text(); })
      .then(function (text) {
        var rows = parseCSV(text);
        window.SLOPE_EQUIVALENCIA_DATA = rows;
        fillHandicaps(rows);
        selectHdcp.addEventListener('change', showResult);
        selectTee.addEventListener('change', showResult);
        selectMod.addEventListener('change', showResult);
      })
      .catch(function () {
        selectHdcp.innerHTML = '<option value="">Error al cargar datos</option>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
