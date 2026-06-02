/**
 * Bloque "Organiza tu viaje" — Rentcars widget + resultados en iframe (postMessage).
 */
(function () {
  'use strict';

  var rentcarsMessageBound = false;

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

  function normalizeRentcarsResultsUrl(raw) {
    var url = String(raw || '').trim();
    if (!/^https:\/\/(www\.)?rentcars\.com\//i.test(url)) return null;
    try {
      var u = new URL(url);
      if (!u.searchParams.get('requestorid') && !u.searchParams.get('requestor')) {
        var id = (window.TRAVEL_AFFILIATES || {}).rentcarsRequestorId || '10695';
        u.searchParams.set('requestorid', id);
      }
      if (!u.searchParams.get('utm_source')) {
        u.searchParams.set('utm_source', 'web-lerma.vercel.app');
      }
      if (!u.searchParams.get('utm_medium')) {
        u.searchParams.set('utm_medium', 'afiliado-widget-inpage');
      }
      return u.toString();
    } catch (e) {
      return url;
    }
  }

  function ensureRentcarsMessageListener() {
    if (rentcarsMessageBound) return;
    rentcarsMessageBound = true;
    window.addEventListener('message', function (ev) {
      if (!ev || !ev.data) return;
      var url = normalizeRentcarsResultsUrl(ev.data);
      if (!url) return;

      var panel = document.getElementById('post-booking-rentcars-results-panel');
      var cta = document.getElementById('post-booking-rentcars-results-cta');
      var hint = document.getElementById('post-booking-rentcars-results-hint');
      if (!panel || !cta) return;

      cta.href = url;
      panel.hidden = false;
      panel.removeAttribute('hidden');
      if (hint) hint.hidden = true;

      try {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e2) {
        /* ignore */
      }
    });
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
      '<p class="post-booking-rentcars-affiliate-note">Afiliado <strong>10695</strong>. Tras buscar, usa el botón verde sin cerrar esta página.</p>' +
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
      ensureRentcarsMessageListener();
      html +=
        '<p class="post-booking-embed-intro">Busca arriba y pulsa «Buscar». Esta página <strong>no se cierra</strong>: los resultados se abren en un panel o pestaña nueva.</p>' +
        '<div class="restaurante-paquete-embed-row post-booking-rentcars-embed-row">' +
        renderTripContext(trip) +
        '<div class="post-booking-rentcars-stack">' +
        '<div class="post-booking-rentcars-widget-host restaurante-paquete-iframe-wrap">' +
        '<iframe class="post-booking-rentcars-widget-iframe" title="Buscar coche en Rentcars" ' +
        'sandbox="allow-scripts allow-forms allow-same-origin allow-popups" ' +
        'src="' +
        escapeHtml(src) +
        '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" height="420"></iframe>' +
        '</div>' +
        '<p class="post-booking-embed-hint" id="post-booking-rentcars-results-hint">Tras «Buscar», aparecerá aquí el acceso a los coches.</p>' +
        '<div class="post-booking-rentcars-results-panel" id="post-booking-rentcars-results-panel" hidden>' +
        '<p class="post-booking-rentcars-results-k">Búsqueda lista</p>' +
        '<p class="post-booking-rentcars-results-t">Tu consulta en Rentcars está preparada con el enlace de afiliado.</p>' +
        '<a id="post-booking-rentcars-results-cta" class="btn-reservar-paquete post-booking-rentcars-results-cta" href="#" target="_blank" rel="noopener noreferrer sponsored">Ver coches disponibles</a>' +
        '</div></div></div>' +
        '<p class="post-booking-embed-hint post-booking-rentcars-fallback-hint">Rentcars no permite mostrar resultados embebidos (política de su web). Si se abrió otra pestaña al buscar, puedes usarla o el botón verde de arriba.</p>';
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

  function renderTravelBlock(containerId, trip) {
    var cfg = window.TRAVEL_AFFILIATES || {};
    var affiliateHome = (cfg.rentalcars || '').trim();
    var sky = (cfg.skyscanner || '').trim();
    var iframeHeight = parseInt(cfg.rentalcarsIframeHeight, 10) || 780;
    var el = document.getElementById(containerId);
    if (!el) return;

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
