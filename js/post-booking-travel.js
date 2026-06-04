/**
 * Bloque "Organiza tu viaje" — Rentcars widget embebido (post-booking).
 */
(function () {
  'use strict';

  var rentcarsMsgBound = false;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function affiliateUrl() {
    if (typeof window.buildRentcarsAffiliateUrl === 'function') {
      return window.buildRentcarsAffiliateUrl({ utmMedium: 'afiliado-embed' });
    }
    var cfg = window.TRAVEL_AFFILIATES || {};
    return (cfg.rentalcars || '').trim() || null;
  }

  function widgetSrcBase() {
    var cfg = window.TRAVEL_AFFILIATES || {};
    return (cfg.rentcarsWidgetSrc || '').trim();
  }

  function widgetIframeHeight() {
    var cfg = window.TRAVEL_AFFILIATES || {};
    var desktop = parseInt(cfg.rentalcarsIframeHeight, 10) || 520;
    if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 639px)').matches) {
      return Math.max(480, Math.min(desktop, Math.round(window.innerHeight * 0.75)));
    }
    return desktop;
  }

  /** Fechas del paquete como query al widget (si el motor las interpreta). */
  function buildWidgetSrc(trip) {
    var base = widgetSrcBase();
    if (!base) return '';
    try {
      var u = new URL(base);
      if (trip && trip.pickup && /^\d{4}-\d{2}-\d{2}$/.test(trip.pickup)) {
        u.searchParams.set('pickup', trip.pickup);
        u.searchParams.set('pickupDate', trip.pickup);
      }
      if (trip && trip.dropoff && /^\d{4}-\d{2}-\d{2}$/.test(trip.dropoff)) {
        u.searchParams.set('dropoff', trip.dropoff);
        u.searchParams.set('dropoffDate', trip.dropoff);
      }
      return u.toString();
    } catch (e) {
      return base;
    }
  }

  function extractRentcarsUrlFromMessage(data) {
    if (!data) return null;
    if (typeof data === 'string') {
      var s = data.trim();
      if (/^https?:\/\//i.test(s) && s.indexOf('rentcars.com') >= 0) return s;
      try {
        var parsed = JSON.parse(s);
        return extractRentcarsUrlFromMessage(parsed);
      } catch (e) {
        return null;
      }
    }
    if (typeof data === 'object') {
      var keys = ['url', 'href', 'link', 'searchUrl', 'redirect', 'redirectUrl', 'target'];
      for (var i = 0; i < keys.length; i++) {
        var v = data[keys[i]];
        if (typeof v === 'string' && v.indexOf('rentcars.com') >= 0) return v;
      }
    }
    return null;
  }

  function showRentcarsResultsLink(url) {
    if (!url) return;
    var go = document.getElementById('post-booking-rentcars-go');
    if (go) {
      go.href = url;
      go.hidden = false;
    }
    /* Tras «Buscar» en el widget; si el navegador bloquea pop-up, queda el botón verde. */
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      /* ignore */
    }
  }

  function bindRentcarsWidgetMessaging() {
    if (rentcarsMsgBound) return;
    rentcarsMsgBound = true;
    window.addEventListener('message', function (e) {
      if (!e.data) return;
      var origin = (e.origin || '').toLowerCase();
      if (
        origin.indexOf('rentcars.com') < 0 &&
        origin.indexOf('widgets.rentcars.com') < 0
      ) {
        return;
      }
      var url = extractRentcarsUrlFromMessage(e.data);
      if (url) showRentcarsResultsLink(url);
    });
  }

  function mountRentcarsEmbed(trip) {
    var src = buildWidgetSrc(trip);
    var embedUrl = affiliateUrl();
    var alto = widgetIframeHeight();

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
        '<p class="post-booking-embed-intro post-booking-rentcars-intro">Elige ciudad de recogida y devolución, ajusta las fechas de tu estancia y pulsa «Buscar». Los coches se abren en Rentcars (pestaña nueva); esta confirmación sigue aquí.</p>' +
        '<div class="post-booking-rentcars-widget-host restaurante-paquete-iframe-wrap">' +
        '<iframe class="post-booking-rentcars-widget-iframe restaurante-paquete-iframe" id="post-booking-rentcars-widget" title="Buscar coche en Rentcars" ' +
        'sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox" ' +
        'src="' +
        escapeHtml(src) +
        '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" height="' +
        String(alto) +
        '"></iframe>' +
        '</div>' +
        '<p class="post-booking-rentcars-go-wrap">' +
        '<a id="post-booking-rentcars-go" class="btn-reservar-paquete post-booking-rentcars-go" href="' +
        escapeHtml(embedUrl || 'https://www.rentcars.com/es/') +
        '" target="_blank" rel="noopener noreferrer sponsored" hidden>Ver coches disponibles en Rentcars</a>' +
        '</p>';
    } else if (embedUrl) {
      html +=
        '<p class="post-booking-embed-intro">Compara coches para tu viaje. Recomendamos SUV o furgoneta si viajas con palos.</p>' +
        '<div class="post-booking-rentcars-widget-host restaurante-paquete-iframe-wrap">' +
        '<iframe id="post-booking-rentcars-iframe" class="restaurante-paquete-iframe post-booking-rentcars-iframe" ' +
        'title="Buscar coche en Rentcars" src="' +
        escapeHtml(embedUrl) +
        '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" height="' +
        String(alto) +
        '"></iframe>' +
        '</div>';
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

    var hasRental = affiliateHome || widgetSrcBase() || affiliateUrl();
    if (!hasRental && !sky) {
      el.hidden = true;
      return;
    }

    var html =
      '<h2 class="configurador-titulo post-travel-title">Organiza tu viaje</h2>' +
      '<p class="post-travel-intro">Reserva coche (y vuelo si lo necesitas) para tu estancia en Burgos y alrededores.</p>';

    if (hasRental) {
      html += mountRentcarsEmbed(trip);
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
    el.className = 'confirmacion-seccion-card post-travel-box post-booking-travel-panel';
    el.hidden = false;

    if (widgetSrcBase()) {
      bindRentcarsWidgetMessaging();
      var ifr = document.getElementById('post-booking-rentcars-widget');
      if (ifr) {
        ifr.addEventListener('load', function () {
          /* Tras cargar, el usuario usa el formulario del widget. */
        });
      }
    }
  }

  window.renderPostBookingTravel = renderTravelBlock;
})();
