/**
 * Bloque post-pago: guía Golf en Burgos (descarga).
 * Envío WhatsApp/email: midend + Brevo (no desde esta web).
 */
(function () {
  'use strict';

  var GUIA_PATH = 'pdf/guia-golf-burgos.pdf';

  window.renderPostBookingGuiaBurgos = function (containerId, paqueteId) {
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

    el.hidden = false;
    el.innerHTML =
      '<div class="post-booking-embed post-booking-guia-block">' +
      '<div class="post-booking-embed-head">' +
      '<h3 class="post-booking-embed-title">Guía Golf en Burgos</h3>' +
      '</div>' +
      '<p class="post-booking-embed-intro">Regalo de tu paquete, sin coste. También te la enviamos por correo/WhatsApp cuando el midend lo tenga activo. Puedes descargarla aquí.</p>' +
      '<p class="post-booking-guia-actions">' +
      '<a class="btn-reservar-paquete" href="' +
      GUIA_PATH +
      '" download="Guia-Golf-en-Burgos.pdf" target="_blank" rel="noopener noreferrer">Descargar guía PDF</a>' +
      '</p>' +
      '</div>';
  };
})();
