/**
 * Sustituye input[type=time] de hora de salida por dos desplegables (hora + minutos cada 15 min).
 */
(function () {
  'use strict';

  var STEP_MIN = 15;
  var HOUR_START = 6;
  var HOUR_END = 21;
  var DEFAULT_TIME = '10:00';

  function snapMinute(m) {
    var s = Math.round(m / STEP_MIN) * STEP_MIN;
    if (s >= 60) return 0;
    return s;
  }

  function parseTime(v) {
    if (!v || typeof v !== 'string') return parseTime(DEFAULT_TIME);
    var m = v.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return parseTime(DEFAULT_TIME);
    var h = parseInt(m[1], 10);
    var min = snapMinute(parseInt(m[2], 10));
    if (min === 60) {
      min = 0;
      h = (h + 1) % 24;
    }
    if (h < HOUR_START) h = HOUR_START;
    if (h > HOUR_END) h = HOUR_END;
    return { h: h, m: min };
  }

  function formatTime(h, m) {
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function buildPickerFromInput(input) {
    if (!input || input.dataset.horaPickerInit === '1') return;
    input.dataset.horaPickerInit = '1';

    var t = parseTime(input.value || DEFAULT_TIME);
    var wrap = document.createElement('div');
    wrap.className = 'hora-salida-picker';

    var selH = document.createElement('select');
    selH.className = 'hora-salida-picker__h';
    selH.setAttribute('aria-label', 'Hora');
    if (input.id) selH.id = input.id;

    for (var h = HOUR_START; h <= HOUR_END; h++) {
      var oh = document.createElement('option');
      oh.value = String(h);
      oh.textContent = String(h).padStart(2, '0');
      if (h === t.h) oh.selected = true;
      selH.appendChild(oh);
    }

    var sep = document.createElement('span');
    sep.className = 'hora-salida-picker__sep';
    sep.setAttribute('aria-hidden', 'true');
    sep.textContent = ':';

    var selM = document.createElement('select');
    selM.className = 'hora-salida-picker__m';
    selM.setAttribute('aria-label', 'Minutos (cada ' + STEP_MIN + ' min)');
    for (var mi = 0; mi < 60; mi += STEP_MIN) {
      var om = document.createElement('option');
      om.value = String(mi);
      om.textContent = String(mi).padStart(2, '0');
      if (mi === t.m) om.selected = true;
      selM.appendChild(om);
    }

    var hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = input.name || '';
    hidden.value = formatTime(t.h, t.m);
    if (input.required) hidden.required = true;
    if (input.getAttribute('title')) hidden.title = input.getAttribute('title');

    function sync() {
      var hv = parseInt(selH.value, 10);
      var mv = parseInt(selM.value, 10);
      hidden.value = formatTime(hv, mv);
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
    }

    selH.addEventListener('change', sync);
    selM.addEventListener('change', sync);

    wrap.appendChild(selH);
    wrap.appendChild(sep);
    wrap.appendChild(selM);
    wrap.appendChild(hidden);

    var parent = input.parentNode;
    if (parent) {
      parent.insertBefore(wrap, input);
      parent.removeChild(input);
    }
  }

  function initAll(root) {
    var scope = root || document;
    scope.querySelectorAll('input[type="time"]').forEach(function (inp) {
      var name = (inp.name || '').toLowerCase();
      if (name.indexOf('hora') === 0 || name === 'hora') buildPickerFromInput(inp);
    });
  }

  function observeDynamicHoraFields() {
    var targets = document.querySelectorAll('.hora-salida-en-fechas-wrap, .hora-salida-por-dia-container, .fechas-dia-plan-list');
    if (!targets.length) return;
    var timer;
    var mo = new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        targets.forEach(function (el) {
          initAll(el);
        });
      }, 40);
    });
    targets.forEach(function (el) {
      mo.observe(el, { childList: true, subtree: true });
    });
  }

  window.initHoraSalidaPickers = initAll;
  window.HORA_SALIDA_PICKER_STEP_MIN = STEP_MIN;

  document.addEventListener('DOMContentLoaded', function () {
    initAll(document);
    observeDynamicHoraFields();
  });
})();
