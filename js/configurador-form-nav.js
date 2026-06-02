/**
 * Navegación móvil en configuradores: Enter / «Siguiente» avanza por secciones;
 * solo el botón «Reservar» envía el formulario (evita «Ir» → pago accidental).
 */
(function () {
  'use strict';

  var INIT_ATTR = 'data-config-nav-init';

  function isTextLikeInput(el) {
    if (!el || el.tagName !== 'INPUT') return false;
    var t = (el.type || 'text').toLowerCase();
    return t === 'text' || t === 'email' || t === 'tel' || t === 'number' || t === 'search';
  }

  function getConfigSteps(form) {
    return Array.prototype.slice.call(
      form.querySelectorAll('.configurador-seccion, .forma-pago-block')
    );
  }

  function findStep(el) {
    return el && el.closest ? el.closest('.configurador-seccion, .forma-pago-block') : null;
  }

  function scrollToStep(step) {
    if (!step) return;
    var header = document.querySelector('.header');
    var offset = header ? header.offsetHeight + 12 : 72;
    var top = step.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    window.setTimeout(function () {
      var focusable = step.querySelector(
        'input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
      );
      if (focusable) {
        try {
          focusable.focus({ preventScroll: true });
        } catch (e) {
          focusable.focus();
        }
      }
    }, 380);
  }

  function advanceFrom(form, el) {
    var steps = getConfigSteps(form);
    if (!steps.length) {
      focusNextInForm(form, el);
      return;
    }
    var current = findStep(el);
    var idx = current ? steps.indexOf(current) : -1;
    if (idx >= 0 && idx < steps.length - 1) {
      scrollToStep(steps[idx + 1]);
      return;
    }
    if (el.classList.contains('telefono-numero') || (el.name && el.name.indexOf('[movil]') >= 0)) {
      var hotel = form.querySelector('#configurador-hotel-wrap');
      if (hotel) {
        scrollToStep(hotel);
        return;
      }
    }
    focusNextInForm(form, el);
  }

  function getFocusable(form) {
    return Array.prototype.slice
      .call(
        form.querySelectorAll(
          'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
        )
      )
      .filter(function (node) {
        if (node.offsetParent === null && node.type !== 'radio') {
          var inDetails = node.closest('details');
          if (!inDetails || !inDetails.open) return false;
        }
        return true;
      });
  }

  function focusNextInForm(form, el) {
    var list = getFocusable(form);
    var i = list.indexOf(el);
    if (i >= 0 && i < list.length - 1) {
      list[i + 1].focus();
      return;
    }
    var steps = getConfigSteps(form);
    if (steps.length) scrollToStep(steps[0]);
  }

  function applyEnterKeyHints(form) {
    form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"]').forEach(
      function (inp) {
        inp.setAttribute('enterkeyhint', 'next');
      }
    );
    form.querySelectorAll('textarea').forEach(function (ta) {
      ta.setAttribute('enterkeyhint', 'enter');
    });
  }

  function triggerConfiguradorSubmit(form) {
    if (typeof window.procesarReservaConfiguradorPaquete === 'function') {
      window.procesarReservaConfiguradorPaquete();
      return;
    }
    form.dataset.explicitSubmit = '1';
    if (typeof form.requestSubmit === 'function') form.requestSubmit();
    else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  }

  function wireSubmitButtons(form) {
    var formId = form.id;
    var selector = formId
      ? 'button.btn-reservar-paquete[form="' + formId + '"], button.btn-reservar-paquete-mobile[form="' + formId + '"]'
      : 'button.btn-reservar-paquete';
    document.querySelectorAll(selector).forEach(function (btn) {
      if (btn.getAttribute('data-config-submit-wired') === '1') return;
      btn.setAttribute('data-config-submit-wired', '1');
      if (btn.type === 'submit') btn.type = 'button';
      btn.addEventListener('click', function () {
        triggerConfiguradorSubmit(form);
      });
    });
    form.querySelectorAll('button.btn-reservar-paquete[type="submit"]').forEach(function (btn) {
      if (btn.getAttribute('data-config-submit-wired') === '1') return;
      btn.setAttribute('data-config-submit-wired', '1');
      btn.type = 'button';
      btn.addEventListener('click', function () {
        triggerConfiguradorSubmit(form);
      });
    });
  }

  function initConfiguradorFormNav(form) {
    if (!form || form.getAttribute(INIT_ATTR) === '1') return;
    form.setAttribute(INIT_ATTR, '1');

    applyEnterKeyHints(form);
    wireSubmitButtons(form);

    form.addEventListener(
      'submit',
      function (e) {
        if (form.dataset.explicitSubmit !== '1') {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        form.dataset.explicitSubmit = '';
      },
      true
    );

    form.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var t = e.target;
      if (!t || !form.contains(t)) return;
      if (t.tagName === 'TEXTAREA') return;
      if (t.tagName === 'BUTTON') return;
      if (t.tagName === 'SELECT') return;
      if (!isTextLikeInput(t)) return;
      e.preventDefault();
      advanceFrom(form, t);
    });
  }

  function initAll() {
    document.querySelectorAll('form.configurador-form').forEach(initConfiguradorFormNav);
  }

  window.initConfiguradorFormNav = initConfiguradorFormNav;
  window.refreshConfiguradorFormNav = function (form) {
    var f = form || document.querySelector('form.configurador-form');
    if (f) {
      applyEnterKeyHints(f);
      wireSubmitButtons(f);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.resumen-mobile-wrapper').forEach(function (wrapper) {
      var formId = wrapper.querySelector('.btn-reservar-paquete');
      if (!formId) return;
      var fid = formId.getAttribute('form');
      if (fid) {
        var f = document.getElementById(fid);
        if (f) wireSubmitButtons(f);
      }
    });
  });
})();
