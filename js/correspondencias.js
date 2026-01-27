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

  function renderTablasCorrespondencias() {
    var contLerma = document.getElementById('tabla-correspondencias-lerma');
    var contSaldana = document.getElementById('tabla-correspondencias-saldana');
    if (!contLerma && !contSaldana) return;
    var clubs = typeof getClubsCorrespondencia === 'function' ? getClubsCorrespondencia() : [];

    function filas(str, key) {
      return clubs.map(function (c) {
        var p = c[key];
        return '<tr><td>' + (c.nombre || '') + '</td><td>' + (p != null ? p + ' €' : '—') + '</td></tr>';
      }).join('');
    }

    if (contLerma) {
      contLerma.innerHTML = '<table class="tabla-correspondencias"><thead><tr><th>Club</th><th>Green fee (día)</th></tr></thead><tbody>' + filas('greenFeeLerma', 'greenFeeLerma') + '</tbody></table>';
    }
    if (contSaldana) {
      contSaldana.innerHTML = '<table class="tabla-correspondencias"><thead><tr><th>Club</th><th>Green fee (día)</th></tr></thead><tbody>' + filas('greenFeeSaldana', 'greenFeeSaldana') + '</tbody></table>';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initSelects();
    renderTablasCorrespondencias();
  });
})();
