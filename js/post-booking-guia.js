/**
 * Bloque post-pago: guía Golf en Burgos (descarga + reenvío automático por Twilio).
 */
(function () {
  'use strict';

  var GUIA_PATH = 'pdf/guia-golf-burgos.pdf';

  window.renderPostBookingGuiaBurgos = function (containerId, paqueteId, opts) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;

    if (
      typeof window.paqueteIncluyeGuiaBurgos !== 'function' ||
      !window.paqueteIncluyeGuiaBurgos(paqueteId)
    ) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }

    opts = opts || {};
    var sessionId = opts.sessionId || '';

    el.hidden = false;
    el.innerHTML =
      '<div class="post-booking-embed post-booking-guia-block">' +
      '<div class="post-booking-embed-head">' +
      '<h3 class="post-booking-embed-title">Guía Golf en Burgos</h3>' +
      '</div>' +
      '<p class="post-booking-embed-intro">Regalo de tu paquete, sin coste. Al confirmar el pago te la enviamos automáticamente por WhatsApp (y por correo). También puedes descargarla aquí.</p>' +
      '<p class="post-booking-guia-actions">' +
      '<a class="btn-reservar-paquete" href="' +
      GUIA_PATH +
      '" download="Guia-Golf-en-Burgos.pdf" target="_blank" rel="noopener noreferrer">Descargar guía PDF</a>' +
      (sessionId
        ? '<button type="button" class="btn-reservar-paquete confirmacion-btn-secondary" id="btnReenviarGuiaWa">Reenviar por WhatsApp</button>'
        : '') +
      '</p>' +
      '<p class="post-booking-guia-status" id="guiaWaStatus" hidden></p>' +
      '</div>';

    var btn = document.getElementById('btnReenviarGuiaWa');
    var statusEl = document.getElementById('guiaWaStatus');
    if (!btn || !sessionId) return;

    btn.addEventListener('click', function () {
      btn.disabled = true;
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = 'Enviando por WhatsApp…';
      }
      fetch('/api/enviar-guia-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
        .then(function (r) {
          return r.json().then(function (j) {
            return { ok: r.ok, j: j };
          });
        })
        .then(function (_ref) {
          var ok = _ref.ok;
          var j = _ref.j || {};
          if (statusEl) {
            if (ok) {
              statusEl.textContent =
                'Enviado. Mira el chat «Twilio Sandbox» (no un chat contigo mismo).';
            } else {
              statusEl.textContent = j.error || 'No se pudo enviar.';
            }
          }
        })
        .catch(function () {
          if (statusEl) statusEl.textContent = 'Error de conexión al enviar WhatsApp.';
        })
        .finally(function () {
          btn.disabled = false;
        });
    });
  };
})();
