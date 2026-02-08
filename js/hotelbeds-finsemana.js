/**
 * Precios en tiempo real en la página (Amadeus prioritario, Hotelbeds fallback).
 * El total del resumen usa estos precios; la reserva se hace sin salir de la web.
 */
(function () {
  var DEBOUNCE_MS = 800;
  var containerId = 'hotelbeds-precios-block';
  var debounceTimer = null;
  var ALL_HOTEL_IDS = ['alisa', 'ceres', 'parador', 'silken', 'palacio-blasones', 'hotel-centro'];

  function getContainer() {
    return document.getElementById(containerId);
  }

  function getFormData() {
    var form = document.getElementById('configuradorForm');
    if (!form) return null;
    return new FormData(form);
  }

  function getCheckInCheckOut(formData) {
    var fechas = formData.getAll ? formData.getAll('fechas[]') : [];
    if (!fechas.length) return null;
    fechas.sort();
    var checkIn = fechas[0];
    var last = fechas[fechas.length - 1];
    var d = new Date(last + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    var checkOut = d.toISOString().slice(0, 10);
    return { checkIn: checkIn, checkOut: checkOut };
  }

  function renderBlock(html) {
    var el = getContainer();
    if (el) el.innerHTML = html;
  }

  function setBookingWidgetVisible(visible) {
    var w = document.getElementById('booking-com-widget');
    if (w) w.style.display = visible ? '' : 'none';
  }

  function renderLoading() {
    window.LIVE_HOTEL_PRICES = null;
    setBookingWidgetVisible(false);
    renderBlock('<div class="hotelbeds-block hotelbeds-loading"><span class="hotelbeds-spinner"></span> Consultando precios en tiempo real...</div>');
  }

  function renderError(msg) {
    window.LIVE_HOTEL_PRICES = null;
    setBookingWidgetVisible(true);
    renderBlock('<div class="hotelbeds-block hotelbeds-error"><strong>No se pudieron cargar precios en tiempo real.</strong><br>' + escapeHtml(msg || 'Error de conexión') + '</div><p class="hotelbeds-block hotelbeds-info">El total del resumen usa los precios por defecto. Puedes reservar el paquete igualmente con el botón «Reservar Paquete».</p>');
  }

  function renderNoConfig() {
    window.LIVE_HOTEL_PRICES = null;
    setBookingWidgetVisible(true);
    renderBlock('<div class="hotelbeds-block hotelbeds-info">Precios en tiempo real no configurados. El total usa tarifas por defecto. Puedes <strong>reservar el paquete desde aquí</strong> con el botón «Reservar Paquete».</div>');
  }

  /** Renderiza resultados de Amadeus y actualiza LIVE_HOTEL_PRICES para el total del resumen */
  function renderAmadeusResults(data, selectedIds) {
    var hotels = data.hotels || [];
    if (hotels.length === 0) {
      window.LIVE_HOTEL_PRICES = null;
      setBookingWidgetVisible(true);
      renderBlock('<div class="hotelbeds-block hotelbeds-info">No hay ofertas para estas fechas en los hoteles seleccionados. El total usa precios por defecto. Puedes <strong>reservar el paquete desde aquí</strong> con «Reservar Paquete».</div>');
      return;
    }
    var live = {};
    var html = '<div class="hotelbeds-block hotelbeds-results"><h4 class="hotelbeds-title">Precios en tiempo real</h4><ul class="hotelbeds-list">';
    hotels.forEach(function (h) {
      var id = h.id || h.amadeusHotelId;
      var name = h.name || 'Hotel';
      var pricePerNight = h.pricePerNight != null ? h.pricePerNight : null;
      if (id) live[id] = pricePerNight;
      var priceStr = pricePerNight != null ? (Math.round(pricePerNight * 100) / 100) + ' €' : '—';
      var sel = selectedIds && selectedIds.indexOf(id) >= 0 ? ' <span class="hotelbeds-selected">(elegido)</span>' : '';
      html += '<li class="hotelbeds-item"><span class="hotelbeds-name">' + escapeHtml(name) + sel + '</span> <span class="hotelbeds-price">' + priceStr + '</span></li>';
    });
    html += '</ul><p class="hotelbeds-note">Precios por noche. El total del resumen usa estos importes. Reserva todo el paquete sin salir de la página.</p></div>';
    window.LIVE_HOTEL_PRICES = live;
    setBookingWidgetVisible(false);
    renderBlock(html);
    triggerResumenUpdate();
  }

  function renderHotelbedsResults(data, selectedHotels) {
    var hotels = (data.hotels && data.hotels.hotels) || [];
    if (hotels.length === 0) {
      window.LIVE_HOTEL_PRICES = null;
      setBookingWidgetVisible(true);
      renderBlock('<div class="hotelbeds-block hotelbeds-info">No hay disponibilidad para las fechas seleccionadas. Puedes reservar el paquete desde aquí con precios por defecto.</div>');
      return;
    }
    var cfg = window.HOTELBEDS_CONFIG;
    var codeToId = {};
    ALL_HOTEL_IDS.forEach(function (id) {
      var c = cfg && cfg.getCode ? cfg.getCode(id) : null;
      if (c) codeToId[String(c)] = id;
    });
    var live = {};
    var html = '<div class="hotelbeds-block hotelbeds-results"><h4 class="hotelbeds-title">Precios en tiempo real (Hotelbeds)</h4><ul class="hotelbeds-list">';
    hotels.forEach(function (h) {
      var code = String(h.code);
      var ourId = codeToId[code];
      var name = (h.name || (h.description && h.description.content) || 'Hotel ' + code);
      var rate = h.minRate;
      if (rate == null && h.rooms && h.rooms[0]) {
        var r0 = h.rooms[0];
        var rr = (r0.rates && r0.rates[0]) ? r0.rates[0] : null;
        if (rr) rate = parseFloat(rr.net || rr.gross || rr.sellingRate) || null;
      }
      if (typeof rate === 'string') rate = parseFloat(rate) || null;
      if (ourId && rate != null) live[ourId] = rate;
      var priceStr = rate != null ? (Math.round(rate * 100) / 100) + ' €' : '—';
      var sel = selectedHotels.indexOf(code) >= 0 ? ' <span class="hotelbeds-selected">(elegido)</span>' : '';
      html += '<li class="hotelbeds-item"><span class="hotelbeds-name">' + escapeHtml(name) + sel + '</span> <span class="hotelbeds-price">' + priceStr + '</span></li>';
    });
    html += '</ul><p class="hotelbeds-note">Precios por noche. El total del resumen usa estos importes.</p></div>';
    window.LIVE_HOTEL_PRICES = Object.keys(live).length ? live : null;
    setBookingWidgetVisible(!window.LIVE_HOTEL_PRICES);
    renderBlock(html);
    triggerResumenUpdate();
  }

  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function triggerResumenUpdate() {
    if (typeof window.actualizarResumen === 'function') window.actualizarResumen();
  }

  function fetchAmadeus(checkIn, checkOut, hotelIds) {
    var base = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    return fetch(base + '/api/amadeus-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkIn: checkIn, checkOut: checkOut, hotelIds: hotelIds || ALL_HOTEL_IDS }),
    })
      .then(function (r) {
        return r.text().then(function (text) {
          try {
            return JSON.parse(text);
          } catch (e) {
            throw new Error(r.status === 404 ? 'API no encontrada. Prueba en la URL desplegada (Vercel).' : (text || 'Error ' + r.status));
          }
        });
      });
  }

  function fetchHotelbeds(checkIn, checkOut, hotelCodes) {
    var base = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    return fetch(base + '/api/hotelbeds-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkIn: checkIn, checkOut: checkOut, rooms: 1, adults: 2, hotelCodes: hotelCodes }),
    }).then(function (r) { return r.json(); });
  }

  function getSelectedHotelIds(formData, noches) {
    var ids = [];
    for (var i = 1; i <= (noches || 10); i++) {
      var hv = (formData.get && formData.get('hotel-noche-' + i)) || '';
      if (hv && hv.indexOf('-') >= 0) {
        var id = hv.split('-')[1];
        if (id && ids.indexOf(id) < 0) ids.push(id);
      }
    }
    return ids.length ? ids : ALL_HOTEL_IDS;
  }

  function run() {
    var formData = getFormData();
    if (!formData) return;

    var range = getCheckInCheckOut(formData);
    if (!range) {
      window.LIVE_HOTEL_PRICES = null;
      setBookingWidgetVisible(false);
      renderBlock('<p class="hotelbeds-block hotelbeds-info">Selecciona las fechas en el calendario (arriba) para ver precios en tiempo real. Reservarás todo el paquete desde esta página.</p>');
      return;
    }

    var noches = parseInt(formData.get('noches') || '0', 10);
    if (noches < 2) {
      window.LIVE_HOTEL_PRICES = null;
      setBookingWidgetVisible(false);
      renderBlock('<p class="hotelbeds-block hotelbeds-info">Selecciona 2 o más noches para ver hoteles y precios en tiempo real.</p>');
      return;
    }

    var hotelIds = getSelectedHotelIds(formData, noches);
    renderLoading();

    fetchAmadeus(range.checkIn, range.checkOut, hotelIds)
      .then(function (data) {
        if (data.error) throw new Error(data.error);
        if (data.hotels && data.hotels.length > 0) {
          renderAmadeusResults(data, hotelIds);
          return null;
        }
        var cfg = window.HOTELBEDS_CONFIG;
        var codes = cfg && cfg.getCodesForSelectedHotels ? cfg.getCodesForSelectedHotels(formData, noches) : (cfg && cfg.getAllHotelCodes ? cfg.getAllHotelCodes() : []);
        if (codes.length === 0) {
          renderNoConfig();
          return null;
        }
        return fetchHotelbeds(range.checkIn, range.checkOut, codes);
      })
      .then(function (hb) {
        if (hb == null) return;
        if (hb.error) throw new Error(hb.error);
        var cfg = window.HOTELBEDS_CONFIG;
        var fd = getFormData();
        var n = parseInt(fd.get('noches') || '0', 10);
        var selectedCodes = cfg && cfg.getCodesForSelectedHotels ? cfg.getCodesForSelectedHotels(fd, n) : [];
        renderHotelbedsResults(hb, selectedCodes);
      })
      .catch(function (err) {
        var cfg = window.HOTELBEDS_CONFIG;
        var codes = cfg && cfg.getAllHotelCodes ? cfg.getAllHotelCodes() : [];
        if (codes.length > 0) {
          return fetchHotelbeds(range.checkIn, range.checkOut, codes).then(function (hb) {
            if (hb.error) { renderError(err.message); return; }
            var fd = getFormData();
            var n = parseInt(fd.get('noches') || '0', 10);
            var selectedCodes = cfg && cfg.getCodesForSelectedHotels ? cfg.getCodesForSelectedHotels(fd, n) : [];
            renderHotelbedsResults(hb, selectedCodes);
          }).catch(function () { renderError(err.message); });
        } else {
          renderError(err.message);
        }
      });
  }

  function schedule() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(run, DEBOUNCE_MS);
  }

  function init() {
    var wrap = document.getElementById('configurador-hotel-wrap');
    if (!wrap) return;

    var container = getContainer();
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.className = 'hotelbeds-precios-wrap';
      wrap.appendChild(container);
    }
    setBookingWidgetVisible(false);

    var form = document.getElementById('configuradorForm');
    if (form) {
      form.addEventListener('change', schedule);
      form.addEventListener('input', schedule);
    }

    if (typeof CalendarioDias !== 'undefined' && CalendarioDias._instances) {
      Object.keys(CalendarioDias._instances || {}).forEach(function () {
        schedule();
      });
    }

    schedule();
  }

  /** Actualiza enlaces a Booking.com con check-in/check-out del formulario */
  function updateBookingLinks() {
    var range = getCheckInCheckOut(getFormData());
    var baseLerma = 'https://www.booking.com/searchresults.html?ss=Lerma%2C+Espa%C3%B1a';
    var baseBurgos = 'https://www.booking.com/searchresults.html?ss=Burgos%2C+Espa%C3%B1a';
    var suffix = '';
    if (range && range.checkIn && range.checkOut) {
      suffix = '&checkin=' + range.checkIn + '&checkout=' + range.checkOut;
    }
    var linkLerma = document.getElementById('booking-link-lerma');
    var linkBurgos = document.getElementById('booking-link-burgos');
    if (linkLerma) linkLerma.href = baseLerma + suffix;
    if (linkBurgos) linkBurgos.href = baseBurgos + suffix;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('configuradorForm');
    if (form) {
      form.addEventListener('change', updateBookingLinks);
      form.addEventListener('input', updateBookingLinks);
    }
    setTimeout(updateBookingLinks, 300);
  });
})();
