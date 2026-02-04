/**
 * Integración Hotelbeds en Paquete Fin de Semana.
 * Consulta precios en tiempo real cuando el usuario selecciona fechas y hoteles.
 */
(function () {
  var DEBOUNCE_MS = 800;
  var containerId = 'hotelbeds-precios-block';
  var debounceTimer = null;

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

  function renderLoading() {
    renderBlock('<div class="hotelbeds-block hotelbeds-loading"><span class="hotelbeds-spinner"></span> Consultando precios en tiempo real...</div>');
  }

  function renderError(msg) {
    renderBlock('<div class="hotelbeds-block hotelbeds-error">⚠️ ' + (msg || 'Error al cargar precios') + '</div>');
  }

  function renderNoConfig() {
    renderBlock('<div class="hotelbeds-block hotelbeds-info">💡 Para ver precios en tiempo real, configura los códigos Hotelbeds en <code>precios-data.js</code> (hotelbedsCode por hotel). Usa <code>/api/hotelbeds-list-hotels?checkIn=...&checkOut=...</code> para obtener los códigos.</div>');
  }

  function renderResults(data, selectedHotels) {
    var hotels = (data.hotels && data.hotels.hotels) || [];
    if (hotels.length === 0) {
      renderBlock('<div class="hotelbeds-block hotelbeds-info">No hay disponibilidad en Hotelbeds para las fechas seleccionadas.</div>');
      return;
    }

    var cfg = window.HOTELBEDS_CONFIG;
    var codeToId = {};
    var ids = ['alisa', 'ceres', 'parador', 'silken', 'palacio-blasones', 'hotel-centro'];
    ids.forEach(function (id) {
      var c = cfg && cfg.getCode ? cfg.getCode(id) : null;
      if (c) codeToId[String(c)] = id;
    });

    var html = '<div class="hotelbeds-block hotelbeds-results"><h4 class="hotelbeds-title">Precios en tiempo real (Hotelbeds)</h4><ul class="hotelbeds-list">';
    hotels.forEach(function (h) {
      var code = String(h.code);
      var name = (h.name || (h.description && h.description.content) || 'Hotel ' + code);
      var rate = h.minRate;
      if (rate == null && h.rooms && h.rooms[0]) {
        var r0 = h.rooms[0];
        var rr = (r0.rates && r0.rates[0]) ? r0.rates[0] : null;
        if (rr) rate = parseFloat(rr.net || rr.gross || rr.sellingRate) || null;
      }
      if (typeof rate === 'string') rate = parseFloat(rate) || null;
      var priceStr = rate != null ? (Math.round(rate * 100) / 100) + ' €' : '—';
      var sel = selectedHotels.indexOf(code) >= 0 ? ' <span class="hotelbeds-selected">(elegido)</span>' : '';
      html += '<li class="hotelbeds-item"><span class="hotelbeds-name">' + name + sel + '</span> <span class="hotelbeds-price">' + priceStr + '</span></li>';
    });
    html += '</ul><p class="hotelbeds-note">Precios por noche. Los importes del resumen usan tarifas propias; aquí se muestran referencias de Hotelbeds.</p></div>';
    renderBlock(html);
  }

  function fetchAvailability(checkIn, checkOut, hotelCodes) {
    var base = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    var url = base + '/api/hotelbeds-availability';
    var body = JSON.stringify({
      checkIn: checkIn,
      checkOut: checkOut,
      rooms: 1,
      adults: 2,
      hotelCodes: hotelCodes,
    });

    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    }).then(function (r) { return r.json(); });
  }

  function run() {
    var formData = getFormData();
    if (!formData) return;

    var range = getCheckInCheckOut(formData);
    if (!range) {
      renderBlock('');
      return;
    }

    var noches = parseInt(formData.get('noches') || '0', 10);
    if (noches < 2) {
      renderBlock('');
      return;
    }

    var cfg = window.HOTELBEDS_CONFIG;
    var codes = cfg && cfg.getCodesForSelectedHotels ? cfg.getCodesForSelectedHotels(formData, noches) : [];

    if (codes.length === 0) {
      var allCodes = cfg && cfg.getAllHotelCodes ? cfg.getAllHotelCodes() : [];
      if (allCodes.length === 0) {
        renderNoConfig();
        return;
      }
      codes = allCodes;
    }

    renderLoading();
    fetchAvailability(range.checkIn, range.checkOut, codes)
      .then(function (data) {
        if (data.error) {
          renderError(data.error);
          return;
        }
        var selectedCodes = cfg && cfg.getCodesForSelectedHotels ? cfg.getCodesForSelectedHotels(formData, noches) : [];
        renderResults(data, selectedCodes);
      })
      .catch(function (err) {
        renderError(err.message || 'Error de conexión');
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }
})();
