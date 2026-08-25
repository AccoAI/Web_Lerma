/**
 * Bloque post-pago: descarga de la guía Golf en Burgos (PDF).
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

    var abs =
      (location.origin || '') +
      '/' +
      GUIA_PATH.replace(/^\//, '');

    el.hidden = false;
    el.innerHTML =
      '<div class="post-booking-embed post-booking-guia-block">' +
      '<div class="post-booking-embed-head">' +
      '<h3 class="post-booking-embed-title">Guía Golf en Burgos</h3>' +
      '</div>' +
      '<p class="post-booking-embed-intro">Regalo de tu paquete: ideas para visitar Burgos y alrededores. Descárgala ahora; también te la enviaremos por WhatsApp cuando el envío automático esté activo.</p>' +
      '<p class="post-booking-guia-actions">' +
      '<a class="btn-reservar-paquete" href="' +
      GUIA_PATH +
      '" download="Guia-Golf-en-Burgos.pdf" target="_blank" rel="noopener noreferrer">Descargar guía PDF</a>' +
      '<a class="btn-reservar-paquete confirmacion-btn-secondary" href="https://wa.me/34638722973?text=' +
      encodeURIComponent(
        'Hola, he reservado un paquete con guía Golf en Burgos. ¿Me la podéis enviar por WhatsApp? ' + abs
      ) +
      '" target="_blank" rel="noopener noreferrer">Pedir por WhatsApp</a>' +
      '</p>' +
      '</div>';
  };
})();
