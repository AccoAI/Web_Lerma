/**
 * Bloque "Organiza tu viaje" — Rentcars abre en pestaña nueva (no iframe: su API devuelve 403 embebida).
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

  function buildSearchUrl(trip, locationName) {
    if (trip && trip.pickup && trip.dropoff && typeof window.buildRentcarsSearchUrl === 'function') {
      return (
        window.buildRentcarsSearchUrl({
          pickup: trip.pickup,
          dropoff: trip.dropoff,
          locationName: locationName || trip.pickup_location || 'Madrid, España',
        }) ||
        trip.rentcars_embed_url ||
        null
      );
    }
    return (trip && trip.rentcars_embed_url) || null;
  }

  function mountRentcarsLauncher(trip, affiliateHome) {
    var hasDates = trip && trip.pickup && trip.dropoff;
    var defaultLoc = (trip && trip.pickup_location) || 'Madrid, España';
    var searchUrl = buildSearchUrl(trip, defaultLoc) || affiliateHome;

    var html =
      '<div class="post-booking-rentcars-launcher" id="post-booking-rentcars">' +
      '<h3 class="post-booking-embed-title">Alquiler de coche — Rentcars</h3>' +
      '<p class="post-booking-rentcars-note">' +
      'Rentcars no permite completar la búsqueda dentro de nuestra web (limitación de su sistema). ' +
      'Pulsa el botón: se abre <strong>Rentcars en una pestaña nueva</strong> con las fechas de tu paquete ya cargadas.</p>';

    if (hasDates) {
      html +=
        '<div class="post-booking-rentcars-resumen">' +
        '<div class="post-booking-rentcars-fecha"><span class="post-booking-rentcars-fecha-k">Recogida</span>' +
        '<span class="post-booking-rentcars-fecha-v">' +
        escapeHtml(formatFechaEs(trip.pickup)) +
        '</span><span class="post-booking-rentcars-fecha-h">10:00</span></div>' +
        '<div class="post-booking-rentcars-fecha"><span class="post-booking-rentcars-fecha-k">Devolución</span>' +
        '<span class="post-booking-rentcars-fecha-v">' +
        escapeHtml(formatFechaEs(trip.dropoff)) +
        '</span><span class="post-booking-rentcars-fecha-h">10:00</span></div>' +
        '</div>' +
        '<p class="post-booking-rentcars-loc-label">Zona de recogida sugerida</p>' +
        '<div class="post-booking-rentcars-locs" role="group" aria-label="Zona de recogida">' +
        '<button type="button" class="post-booking-rentcars-loc is-active" data-loc="Madrid, España">Madrid</button>' +
        '<button type="button" class="post-booking-rentcars-loc" data-loc="Burgos, España">Burgos</button>' +
        '</div>';
    } else {
      html +=
        '<p class="post-booking-embed-intro">Compara coches para moverte entre Madrid, Lerma y Saldaña. Recomendamos SUV o furgoneta (clase V) si viajas con palos.</p>';
    }

    html +=
      '<a id="post-booking-rentcars-cta" class="btn-reservar-paquete post-booking-rentcars-cta" href="' +
      escapeHtml(searchUrl) +
      '" target="_blank" rel="noopener noreferrer sponsored">🚙 Buscar coches en Rentcars</a>';

    if (affiliateHome && affiliateHome !== searchUrl) {
      html +=
        '<p class="post-booking-rentcars-alt"><a href="' +
        escapeHtml(affiliateHome) +
        '" target="_blank" rel="noopener noreferrer sponsored">Abrir Rentcars sin fechas</a></p>';
    }

    html += '</div>';
    return html;
  }

  function wireRentcarsLauncher(rootEl, trip) {
    if (!rootEl || !trip || !trip.pickup) return;
    var cta = rootEl.querySelector('#post-booking-rentcars-cta');
    var locBtns = rootEl.querySelectorAll('.post-booking-rentcars-loc');
    if (!cta || !locBtns.length) return;

    locBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        locBtns.forEach(function (b) {
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
        var loc = btn.getAttribute('data-loc');
        var url = buildSearchUrl(trip, loc);
        if (url) cta.href = url;
      });
    });
  }

  function renderTravelBlock(containerId, trip) {
    var cfg = window.TRAVEL_AFFILIATES || {};
    var affiliateHome = (cfg.rentalcars || '').trim();
    var sky = (cfg.skyscanner || '').trim();
    var el = document.getElementById(containerId);
    if (!el) return;

    var hasRental = affiliateHome || (trip && trip.rentcars_embed_url);
    if (!hasRental && !sky) {
      el.hidden = true;
      return;
    }

    var html =
      '<h2 class="configurador-titulo post-travel-title">Organiza tu viaje</h2>' +
      '<p class="post-travel-intro">Reserva coche (y vuelo si lo necesitas) para tu estancia en Burgos y alrededores.</p>';

    if (hasRental) {
      html += mountRentcarsLauncher(trip, affiliateHome);
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

    wireRentcarsLauncher(el.querySelector('#post-booking-rentcars'), trip);
  }

  window.renderPostBookingTravel = renderTravelBlock;
})();
