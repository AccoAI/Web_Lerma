/**
 * Bloque "Organiza tu viaje" — Rentcars widget embebido (post-booking).
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
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '—';
    try {
      var d = new Date(iso + 'T12:00:00');
      return d.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (e) {
      return iso;
    }
  }

  function affiliateUrl() {
    if (typeof window.buildRentcarsAffiliateUrl === 'function') {
      return window.buildRentcarsAffiliateUrl({ utmMedium: 'afiliado-embed' });
    }
    var cfg = window.TRAVEL_AFFILIATES || {};
    return (cfg.rentalcars || '').trim() || null;
  }

  function widgetSrc() {
    var cfg = window.TRAVEL_AFFILIATES || {};
    return (cfg.rentcarsWidgetSrc || '').trim();
  }

  function renderTripContext(trip) {
    var rows =
      '<li><span class="restaurante-paquete-inhouse-k">Zona sugerida</span> ' +
      '<span class="restaurante-paquete-inhouse-v">Madrid (vuelo) o Burgos (golf)</span></li>';

    if (trip && trip.pickup && trip.dropoff) {
      rows =
        '<li><span class="restaurante-paquete-inhouse-k">Recogida</span> ' +
        '<span class="restaurante-paquete-inhouse-v">' +
        escapeHtml(formatFechaEs(trip.pickup)) +
        ' · 10:00</span></li>' +
        '<li><span class="restaurante-paquete-inhouse-k">Devolución</span> ' +
        '<span class="restaurante-paquete-inhouse-v">' +
        escapeHtml(formatFechaEs(trip.dropoff)) +
        ' · 10:00</span></li>' +
        rows;
    }

    return (
      '<div class="restaurante-paquete-inhouse restaurante-paquete-embed-ctx post-booking-rentcars-ctx">' +
      '<p class="restaurante-paquete-inhouse-intro">Datos de tu paquete — introdúcelos en el buscador:</p>' +
      '<ul class="restaurante-paquete-inhouse-datos" role="list">' +
      rows +
      '</ul>' +
      '<p class="post-booking-rentcars-affiliate-note">Afiliado <strong>10695</strong>.</p>' +
      '</div>'
    );
  }

  function mountRentcarsEmbed(trip, iframeHeight) {
    var src = widgetSrc();
    var embedUrl = affiliateUrl();

    var html =
      '<div class="post-booking-embed post-booking-rentcars-block" id="post-booking-rentcars">' +
      '<div class="post-booking-embed-head">' +
      '<h3 class="post-booking-embed-title">Alquiler de coche — Rentcars</h3>';

    if (embedUrl) {
      html +=
        '<a class="post-booking-embed-external" href="' +
        escapeHtml(embedUrl) +
        '" target="_blank" rel="noopener noreferrer sponsored">Abrir en Rentcars ↗</a>';
    }

    html += '</div>';

    if (src) {
      html +=
        '<p class="post-booking-embed-intro">Busca arriba y pulsa «Buscar». Los resultados se abren en Rentcars (pestaña nueva); esta página de confirmación permanece abierta.</p>' +
        '<div class="restaurante-paquete-embed-row post-booking-rentcars-embed-row">' +
        renderTripContext(trip) +
        '<div class="post-booking-rentcars-stack">' +
        '<div class="post-booking-rentcars-widget-host restaurante-paquete-iframe-wrap">' +
        '<iframe class="post-booking-rentcars-widget-iframe" title="Buscar coche en Rentcars" ' +
        'sandbox="allow-scripts allow-forms allow-same-origin allow-popups" ' +
        'src="' +
        escapeHtml(src) +
        '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" height="420"></iframe>' +
        '</div></div></div>';
    } else if (embedUrl) {
      html +=
        '<p class="post-booking-embed-intro">Compara coches para tu viaje. Recomendamos SUV o furgoneta si viajas con palos.</p>' +
        '<div class="restaurante-paquete-embed-row post-booking-rentcars-embed-row">' +
        renderTripContext(trip) +
        '<div class="restaurante-paquete-iframe-wrap post-booking-iframe-wrap">' +
        '<iframe id="post-booking-rentcars-iframe" class="restaurante-paquete-iframe post-booking-rentcars-iframe" ' +
        'title="Buscar coche en Rentcars" src="' +
        escapeHtml(embedUrl) +
        '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" height="' +
        String(iframeHeight) +
        '"></iframe>' +
        '</div></div>' +
        '<p class="post-booking-embed-hint">Configura <code>rentcarsWidgetSrc</code> en <code>js/travel-affiliates.js</code> para el buscador oficial.</p>';
    } else {
      html +=
        '<p class="post-booking-embed-intro">Configura tu enlace de afiliado en <code>js/travel-affiliates.js</code>.</p>';
    }

    html += '</div>';
    return html;
  }

  function renderTravelBlock(containerId, trip, paqueteId) {
    var cfg = window.TRAVEL_AFFILIATES || {};
    var affiliateHome = (cfg.rentalcars || '').trim();
    var sky = (cfg.skyscanner || '').trim();
    var iframeHeight = parseInt(cfg.rentalcarsIframeHeight, 10) || 780;
    var el = document.getElementById(containerId);
    if (!el) return;

    if (
      typeof window.paqueteIncluyePostbookingViajeYRestaurantes === 'function' &&
      !window.paqueteIncluyePostbookingViajeYRestaurantes(paqueteId)
    ) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }

    var hasRental = affiliateHome || widgetSrc() || affiliateUrl();
    if (!hasRental && !sky) {
      el.hidden = true;
      return;
    }

    var html =
      '<h2 class="configurador-titulo post-travel-title">Organiza tu viaje</h2>' +
      '<p class="post-travel-intro">Reserva coche (y vuelo si lo necesitas) para tu estancia en Burgos y alrededores.</p>';

    if (hasRental) {
      html += mountRentcarsEmbed(trip, iframeHeight);
    }

    if (sky) {
      html +=
        '<div class="post-booking-sky-launcher">' +
        '<h3 class="post-booking-embed-title">Vuelos — Skyscanner</h3>' +
        '<p class="post-booking-embed-intro">Compara vuelos hacia Madrid.</p>' +
        '<a class="btn-reservar-paquete post-travel-btn" href="' +
        escapeHtml(sky) +
        '" target="_blank" rel="noopener noreferrer sponsored">✈️ Buscar vuelos en Skyscanner</a>' +
        '</div>';
    }

    el.innerHTML = html;
    el.className = 'confirmacion-seccion-card post-travel-box comida-restaurante-picker-panel post-booking-travel-panel';
    el.hidden = false;
  }

  window.renderPostBookingTravel = renderTravelBlock;
})();
