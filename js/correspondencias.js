/**
 * Correspondencias: rellenar desplegable "Club de procedencia" y mostrar precio cuando aplique.
 * Depende de correspondencias-data.js (getClubsCorrespondencia, getClubById, getPrecioGreenFee, isCorrespondencia).
 */

(function () {
  'use strict';

  var SELECT_CLASS = 'select-club-correspondencia';
  var INFO_CLASS = 'correspondencia-precio-info';
  var DATA_CAMPO = 'data-campo'; // 'lerma' | 'saldana' | 'ambos' | 'paquete' | 'simulador'

  function rellenarSelect(select) {
    if (!select || typeof getClubsCorrespondencia !== 'function') return;
    var clubs = getClubsCorrespondencia();
    var frag = document.createDocumentFragment();

    var opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = '— No aplica (cliente particular)';
    frag.appendChild(opt0);

    clubs.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.nombre;
      frag.appendChild(opt);
    });

    var optOtro = document.createElement('option');
    optOtro.value = 'otro';
    optOtro.textContent = 'Otro (indicar en observaciones)';
    frag.appendChild(optOtro);

    select.innerHTML = '';
    select.appendChild(frag);
  }

  function actualizarPrecioInfo(select, infoEl, campo) {
    if (!infoEl) return;
    var v = select.value;
    if (!v || v === 'otro') {
      infoEl.textContent = '';
      infoEl.classList.remove('correspondencia-aplicable');
      return;
    }
    if (typeof isCorrespondencia !== 'function' || !isCorrespondencia(v)) {
      infoEl.textContent = '';
      return;
    }
    infoEl.classList.add('correspondencia-aplicable');
    if (campo === 'paquete' || campo === 'simulador' || campo === 'ambos' || !campo) {
      var c = typeof getClubById === 'function' ? getClubById(v) : null;
      if (c) {
        var parts = [];
        if (c.greenFeeLerma != null) parts.push('Lerma: ' + c.greenFeeLerma + ' €');
        if (c.greenFeeSaldana != null) parts.push('Saldaña: ' + c.greenFeeSaldana + ' €');
        infoEl.textContent = parts.length ? 'Tarifa correspondencia aplicable. Green fee: ' + parts.join(' · ') + '.' : 'Tarifa correspondencia aplicable.';
      } else {
        infoEl.textContent = 'Tarifa correspondencia aplicable.';
      }
    } else if (campo === 'lerma' || campo === 'saldana') {
      var p = typeof getPrecioGreenFee === 'function' ? getPrecioGreenFee(v, campo) : null;
      infoEl.textContent = p != null ? 'Precio correspondencia: ' + p + ' €' : 'Tarifa correspondencia aplicable.';
    } else {
      infoEl.textContent = 'Tarifa correspondencia aplicable.';
    }
  }

  function initSelects() {
    var selects = document.querySelectorAll('.' + SELECT_CLASS);
    selects.forEach(function (sel) {
      rellenarSelect(sel);
      var block = sel.closest('.form-group-correspondencia');
      var info = block ? block.querySelector('.' + INFO_CLASS) : null;
      var campo = (block && block.getAttribute) ? block.getAttribute(DATA_CAMPO) : 'paquete';

      sel.addEventListener('change', function () {
        actualizarPrecioInfo(sel, info, campo);
      });
      actualizarPrecioInfo(sel, info, campo);
    });
  }

  window.inicializarSelectCorrespondencia = function (sel) {
    if (!sel || !sel.classList.contains(SELECT_CLASS)) return;
    rellenarSelect(sel);
    var block = sel.closest('.form-group-correspondencia');
    var info = block ? block.querySelector('.' + INFO_CLASS) : null;
    var campo = (block && block.getAttribute) ? block.getAttribute(DATA_CAMPO) : 'paquete';
    sel.addEventListener('change', function () { actualizarPrecioInfo(sel, info, campo); });
    actualizarPrecioInfo(sel, info, campo);
  };

  function parseCSV(text) {
    var rows = [];
    var row = [], field = '', inQ = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
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
          if (row.some(function (x) { return x; })) rows.push(row);
          row = [];
          if (c === '\r' && text[i + 1] === '\n') i++;
        } else field += c;
      }
    }
    if (field || row.length) {
      row.push(field.replace(/\s+/g, ' ').trim());
      if (row.some(function (x) { return x; })) rows.push(row);
    }
    return rows;
  }

  var COLUMNAS = ['ZONA', 'CAMPO DE GOLF', 'CCAA', 'LABORABLES', 'SÁB./FEST.', 'DÍAS', 'TEL. RESERVAS', 'OBSERVACIONES'];

  function filaDesdeArray(r) {
    return {
      zona: (r[0] || '').trim(),
      campo: (r[1] || '').trim(),
      ccaa: (r[2] || '').trim(),
      laborables: (r[3] || '').trim(),
      sabFest: (r[4] || '').trim(),
      dias: (r[5] || '').trim(),
      tel: (r[6] || '').trim(),
      observaciones: (r[7] || '').trim()
    };
  }

  function escap(s) {
    if (s == null || s === '') return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function textoFila(f) {
    return [f.zona, f.campo, f.ccaa, f.laborables, f.sabFest, f.dias, f.tel, f.observaciones].join(' ').toLowerCase();
  }

  function cumpleBusqueda(f, q) {
    if (!q || !q.trim()) return true;
    var k = q.trim().toLowerCase();
    return textoFila(f).indexOf(k) !== -1;
  }

  function agruparPorZona(filas) {
    var g = {};
    filas.forEach(function (f) {
      var z = f.zona || '—';
      if (!g[z]) g[z] = [];
      g[z].push(f);
    });
    var zonas = Object.keys(g).sort();
    return zonas.map(function (z) { return { zona: z, filas: g[z] }; });
  }

  function renderGrupos(grupos, cont) {
    cont.innerHTML = '';
    grupos.forEach(function (gr, idx) {
      var div = document.createElement('div');
      div.className = 'correspondencias-grupo';
      var idBtn = 'correspondencias-toggle-' + idx;
      var idBody = 'correspondencias-body-' + idx;
      var html = '<button type="button" class="correspondencias-grupo-header" id="' + idBtn + '" aria-expanded="true" aria-controls="' + idBody + '">';
      html += '<span class="correspondencias-grupo-titulo">' + escap(gr.zona) + '</span><span class="correspondencias-grupo-count">(' + gr.filas.length + ')</span>';
      html += '<span class="correspondencias-grupo-chevron" aria-hidden="true"></span>';
      html += '</button>';
      html += '<div class="correspondencias-grupo-body" id="' + idBody + '">';
      html += '<div class="tabla-correspondencias-wrapper"><table class="tabla-correspondencias tabla-correspondencias-completa"><thead><tr>';
      COLUMNAS.forEach(function (col) { html += '<th>' + escap(col) + '</th>'; });
      html += '</tr></thead><tbody>';
      gr.filas.forEach(function (f) {
        html += '<tr>';
        html += '<td>' + escap(f.zona) + '</td><td>' + escap(f.campo) + '</td><td>' + escap(f.ccaa) + '</td>';
        html += '<td>' + escap(f.laborables) + '</td><td>' + escap(f.sabFest) + '</td><td>' + escap(f.dias) + '</td>';
        html += '<td>' + escap(f.tel) + '</td><td>' + escap(f.observaciones) + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table></div></div>';
      div.innerHTML = html;
      cont.appendChild(div);

      var btn = div.querySelector('.correspondencias-grupo-header');
      var body = div.querySelector('.correspondencias-grupo-body');
      if (btn && body) {
        btn.addEventListener('click', function () {
          var open = !div.classList.contains('collapsed');
          div.classList.toggle('collapsed', open);
          body.setAttribute('aria-hidden', open);
          btn.setAttribute('aria-expanded', !open);
        });
      }
    });
  }

  function fallbackDesdeClubs(cont, inputBuscar) {
    var clubs = typeof getClubsCorrespondencia === 'function' ? getClubsCorrespondencia() : [];
    var filas = clubs.map(function (c) {
      var lab = c.greenFeeLerma != null ? c.greenFeeLerma + ' €' : 'Consulte';
      var sab = c.greenFeeSaldana != null ? c.greenFeeSaldana + ' €' : 'Consulte';
      return { zona: '—', campo: c.nombre || '', ccaa: '', laborables: lab, sabFest: sab, dias: '', tel: '', observaciones: '' };
    });
    cont._filas = filas;
    var q = inputBuscar ? inputBuscar.value || '' : '';
    var filtradas = filas.filter(function (f) { return cumpleBusqueda(f, q); });
    var grupos = agruparPorZona(filtradas);
    var sinRes = document.getElementById('correspondencias-sin-resultados');
    if (sinRes) sinRes.style.display = grupos.length ? 'none' : 'block';
    renderGrupos(grupos, cont);
  }

  function loadAndRenderCorrespondencias() {
    var cont = document.getElementById('correspondencias-tabla-grupos');
    var cargando = document.getElementById('correspondencias-cargando');
    var sinResultados = document.getElementById('correspondencias-sin-resultados');
    var inputBuscar = document.getElementById('correspondencias-buscar');
    if (!cont) return;

    function aplicarBusqueda(texto) {
      var q = (typeof texto === 'string' ? texto : (inputBuscar && inputBuscar.value)) || '';
      if (cont._filas) {
        var filtradas = cont._filas.filter(function (f) { return cumpleBusqueda(f, q); });
        var grupos = agruparPorZona(filtradas);
        if (cargando) cargando.style.display = 'none';
        if (sinResultados) sinResultados.style.display = grupos.length ? 'none' : 'block';
        renderGrupos(grupos, cont);
      }
    }

    if (inputBuscar) {
      inputBuscar.addEventListener('input', function () { aplicarBusqueda(inputBuscar.value); });
      inputBuscar.addEventListener('search', function () { aplicarBusqueda(inputBuscar.value); });
    }

    var csvUrl = 'CORRESPONDENCIAS_GOLFLERMA_GOLFSALDAÑA - Hoja 1.csv';
    if (cargando) cargando.style.display = 'block';
    if (sinResultados) sinResultados.style.display = 'none';

    fetch(csvUrl).then(function (res) {
      if (!res.ok) throw new Error('CSV no disponible');
      return res.text();
    }).then(function (text) {
      var rows = parseCSV(text);
      var header = rows[0] || [];
      var dataRows = rows.slice(1);
      var filas = [];
      dataRows.forEach(function (r) {
        var campo = (r[1] || '').trim();
        if (campo) filas.push(filaDesdeArray(r));
      });
      cont._filas = filas;
      if (cargando) cargando.style.display = 'none';
      aplicarBusqueda('');
    }).catch(function () {
      if (cargando) cargando.style.display = 'none';
      cont._filas = null;
      fallbackDesdeClubs(cont, inputBuscar);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initSelects();
    loadAndRenderCorrespondencias();
  });
})();
