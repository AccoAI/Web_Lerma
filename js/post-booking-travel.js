/**
 * Bloque "Organiza tu viaje" en confirmacion-reserva.html (post-pago).
 * Requiere js/travel-affiliates.js (window.TRAVEL_AFFILIATES).
 */
(function () {
  function renderTravelBlock(containerId) {
    var cfg = window.TRAVEL_AFFILIATES || {};
    var rental = (cfg.rentalcars || '').trim();
    var sky = (cfg.skyscanner || '').trim();
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!rental && !sky) {
      el.hidden = true;
      return;
    }

    var html =
      '<h2 class="post-travel-title">Organiza tu viaje</h2>' +
      '<p class="post-travel-intro">¡Reserva confirmada! Para organizar tu viaje a Madrid, aquí tienes nuestros recursos recomendados:</p>' +
      '<p class="post-travel-detail">Para moverte con comodidad entre Madrid, Lerma y Saldaña, te sugerimos alquilar un vehículo. ' +
      'Al viajar con palos de golf, lo ideal es reservar un <strong>SUV o una furgoneta (clase V)</strong> para evitar problemas de espacio en el maletero.</p>' +
      '<div class="post-travel-actions">';

    if (sky) {
      html +=
        '<a class="button post-travel-btn" href="' +
        escapeHtml(sky) +
        '" target="_blank" rel="noopener noreferrer sponsored">✈️ Vuelos a Madrid (Skyscanner)</a>';
    }
    if (rental) {
      html +=
        '<a class="button post-travel-btn post-travel-btn--car" href="' +
        escapeHtml(rental) +
        '" target="_blank" rel="noopener noreferrer sponsored">🚙 Alquilar coche en Rentcars</a>';
    }
    html += '</div>';
    el.innerHTML = html;
    el.hidden = false;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  window.renderPostBookingTravel = renderTravelBlock;
})();
