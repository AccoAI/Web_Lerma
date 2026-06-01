/**
 * Bloque "Organiza tu viaje" en confirmacion-reserva.html — visores embebidos (iframe).
 * @param {string} containerId
 * @param {{ pickup?: string, dropoff?: string, pickup_location?: string, rentcars_embed_url?: string }|null} trip
 */
(function () {
  'use strict';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatFechaEs(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '';
    try {
      var d = new Date(iso + 'T12:00:00');
      return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return iso;
    }
  }

  function mountEmbedBlock(opts) {
    var id = opts.id;
    var title = opts.title;
    var intro = opts.intro || '';
    var src = opts.src;
    var height = opts.height || 720;
    var externalLabel = opts.externalLabel || 'Abrir en pantalla completa';

    return (
      '<div class="post-booking-embed" id="' +
      escapeHtml(id) +
      '">' +
      '<div class="post-booking-embed-head">' +
      '<h3 class="post-booking-embed-title">' +
      escapeHtml(title) +
      '</h3>' +
      '<a class="post-booking-embed-external" href="' +
      escapeHtml(src) +
      '" target="_blank" rel="noopener noreferrer sponsored">' +
      escapeHtml(externalLabel) +
      '</a>' +
      '</div>' +
      (intro ? '<p class="post-booking-embed-intro">' + intro + '</p>' : '') +
      '<div class="restaurante-paquete-iframe-wrap post-booking-iframe-wrap">' +
      '<iframe class="restaurante-paquete-iframe post-booking-iframe" src="' +
      escapeHtml(src) +
      '" title="' +
      escapeHtml(title) +
      '" style="height:' +
      height +
      'px" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
      '</div>' +
      '<p class="post-booking-embed-hint">Si el visor no carga, usa el enlace de arriba para reservar en la web del proveedor.</p>' +
      '</div>'
    );
  }

  function renderTravelBlock(containerId, trip) {
    var cfg = window.TRAVEL_AFFILIATES || {};
    var rentalBase = (cfg.rentalcars || '').trim();
    var sky = (cfg.skyscanner || '').trim();
    var el = document.getElementById(containerId);
    if (!el) return;

    var rental =
      (trip && trip.rentcars_embed_url) ||
      rentalBase;
    if (!rental && !sky) {
      el.hidden = true;
      return;
    }

    var rentalH = cfg.rentalcarsIframeHeight || 780;
    var skyH = cfg.skyscannerIframeHeight || 700;

    var html =
      '<h2 class="configurador-titulo post-travel-title">Organiza tu viaje</h2>' +
      '<p class="post-travel-intro">Para moverte entre Madrid, el aeropuerto, Lerma y Saldaña, reserva coche (y vuelo si lo necesitas) desde los visores integrados.</p>' +
      '<p class="post-travel-detail">Con palos de golf, recomendamos <strong>SUV o furgoneta (clase V)</strong> por el maletero.</p>';

    if (rental) {
      var rentalIntro = 'Busca recogida en Madrid o Burgos y confirma la reserva en el visor.';
      if (trip && trip.pickup && trip.dropoff) {
        rentalIntro =
          '<strong>Fechas de tu paquete:</strong> recogida ' +
          escapeHtml(formatFechaEs(trip.pickup)) +
          ' · devolución ' +
          escapeHtml(formatFechaEs(trip.dropoff)) +
          (trip.pickup_location ? ' · zona sugerida: ' + escapeHtml(trip.pickup_location) : '') +
          '.';
      }
      html += mountEmbedBlock({
        id: 'post-booking-rentcars',
        title: 'Alquiler de coche — Rentcars',
        intro: rentalIntro,
        src: rental,
        height: rentalH,
        externalLabel: 'Abrir Rentcars',
      });
    }

    if (sky) {
      html += mountEmbedBlock({
        id: 'post-booking-skyscanner',
        title: 'Vuelos — Skyscanner',
        intro: 'Compara vuelos hacia Madrid en el visor.',
        src: sky,
        height: skyH,
        externalLabel: 'Abrir Skyscanner',
      });
    }

    el.innerHTML = html;
    el.className = 'confirmacion-seccion-card post-travel-box comida-restaurante-picker-panel post-booking-travel-panel';
    el.hidden = false;
  }

  window.renderPostBookingTravel = renderTravelBlock;
})();
