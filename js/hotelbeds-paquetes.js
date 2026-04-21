/**
 * Precios Hotelbeds en tiempo real para cualquier paquete con calendario + alojamiento.
 * Configurar antes de cargar el script: window.HOTELBEDS_PAGE = { formId, hotelWrapId, preciosBlockId, ... onResumen }
 */
(function () {
  var DEBOUNCE_MS = 800;
  var debounceTimer = null;
  var ALL_HOTEL_IDS = ['alisa', 'ceres', 'parador', 'silken', 'palacio-blasones', 'hotel-centro'];
  var DESTINATIONS_LERMA_BURGOS = ['BUR', 'BUR2'];

  function pageOpts() {
    var d = {
      formId: 'configuradorForm',
      hotelWrapId: 'configurador-hotel-wrap',
      preciosBlockId: 'hotelbeds-precios-block',
      bookingWidgetId: 'booking-com-widget',
      linkLermaId: 'booking-link-lerma',
      linkBurgosId: 'booking-link-burgos',
      onResumen: null,
    };
    return Object.assign({}, d, window.HOTELBEDS_PAGE || {});
  }

  function getForm() {
    var id = pageOpts().formId;
    return id ? document.getElementById(id) : null;
  }

  function getContainer() {
    var id = pageOpts().preciosBlockId;
    return id ? document.getElementById(id) : null;
  }

  function getFormData() {
    var form = getForm();
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
    var id = pageOpts().bookingWidgetId;
    if (!id) return;
    var w = document.getElementById(id);
    if (w) w.style.display = visible ? '' : 'none';
  }

  function renderLoading() {
    window.LIVE_HOTEL_PRICES = null;
    setBookingWidgetVisible(false);
    renderBlock('<div class="hotelbeds-block hotelbeds-loading"><span class="hotelbeds-spinner"></span> Consultando precios en tiempo real...</div>');
  }

  function clearHotelbedsBookingContext() {
    window.__HB_LAST_AVAIL__ = null;
    window.__HB_RATE_BY_CODE = null;
  }

  function renderError(msg) {
    window.LIVE_HOTEL_PRICES = null;
    clearHotelbedsBookingContext();
    setBookingWidgetVisible(true);
    renderBlock('<div class="hotelbeds-block hotelbeds-error"><strong>No se pudieron cargar precios en tiempo real.</strong><br>' + escapeHtml(msg || 'Error de conexión') + '</div><p class="hotelbeds-block hotelbeds-info">El total del resumen puede usar precios por defecto. Puedes continuar con la reserva.</p>');
  }

  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function pickPreferredRate(rates) {
    if (!rates) return null;
    var list = Array.isArray(rates) ? rates : [rates];
    var i;
    var r;
    for (i = 0; i < list.length; i++) {
      r = list[i];
      if (r && r.rateKey && String(r.rateType || '').toUpperCase() === 'BOOKABLE') return r;
    }
    for (i = 0; i < list.length; i++) {
      r = list[i];
      if (r && r.rateKey) return r;
    }
    return null;
  }

  function indexRatesByHotelCode(data) {
    var map = {};
    var hotels = (data && data.hotels && data.hotels.hotels) || [];
    var hi;
    for (hi = 0; hi < hotels.length; hi++) {
      var h = hotels[hi];
      var code = String(h.code || '');
      var rooms = h.rooms || [];
      var ri;
      for (ri = 0; ri < rooms.length; ri++) {
        var room = rooms[ri];
        var rates = room.rates || [];
        var rate = pickPreferredRate(rates);
        if (rate && code) {
          map[code] = {
            rateKey: rate.rateKey,
            rateType: rate.rateType || 'BOOKABLE',
            roomName:
              (typeof room.name === 'string' ? room.name : room.name && room.name.content) ||
              room.description ||
              '',
            boardCode: rate.boardCode || rate.boardName || '',
          };
          break;
        }
      }
    }
    return map;
  }

  function triggerResumenUpdate() {
    var o = pageOpts();
    if (typeof o.onResumen === 'function') {
      o.onResumen();
      return;
    }
    if (typeof window.actualizarResumen === 'function') window.actualizarResumen();
    if (typeof window.actualizarResumenTorneo === 'function') window.actualizarResumenTorneo();
    if (typeof window.actualizarResumenRyder === 'function') window.actualizarResumenRyder();
  }

  function fetchHotelbeds(checkIn, checkOut, hotelCodes) {
    var base = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    return fetch(base + '/api/hotelbeds-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkIn: checkIn, checkOut: checkOut, rooms: 1, adults: 2, hotelCodes: hotelCodes }),
    }).then(function (r) { return r.json(); });
  }

  function fetchHotelbedsByDestination(checkIn, checkOut) {
    var base = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    var merged = { hotels: { hotels: [] } };
    var byCode = {};
    function addHotels(list) {
      var arr = [];
      if (list && list.hotels) {
        if (Array.isArray(list.hotels)) arr = list.hotels;
        else if (list.hotels.hotels && Array.isArray(list.hotels.hotels)) arr = list.hotels.hotels;
      }
      arr.forEach(function (h) {
        var code = String(h.code);
        if (!byCode[code]) {
          byCode[code] = h;
          merged.hotels.hotels.push(h);
        }
      });
    }
    var seq = DESTINATIONS_LERMA_BURGOS.reduce(function (promise, dest) {
      return promise.then(function () {
        return fetch(base + '/api/hotelbeds-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkIn: checkIn, checkOut: checkOut, rooms: 1, adults: 2, destinationCode: dest }),
        }).then(function (r) { return r.json(); }).then(function (data) {
          if (!data.error) addHotels(data.hotels || data);
          return data;
        }).catch(function () { return {}; });
      });
    }, Promise.resolve());
    return seq.then(function () { return merged; });
  }

  function cityForHotel(h) {
    var name = (h.name && (typeof h.name === 'string' ? h.name : h.name.content)) || '';
    var city = (h.destinationName && (typeof h.destinationName === 'string' ? h.destinationName : h.destinationName.content)) || (h.city || '');
    var s = (name + ' ' + (city || '')).toUpperCase();
    return /LERMA/.test(s) ? 'lerma' : 'burgos';
  }

  var DEFAULT_PRICE_PER_NIGHT = 75;

  function fetchHotelbedsListHotels() {
    var base = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    var all = [];
    var byCode = {};
    function addFromResponse(data) {
      var list = (data && data.hotels) ? data.hotels : [];
      if (!Array.isArray(list)) return;
      list.forEach(function (h) {
        var code = String(h.code || h);
        if (!byCode[code]) {
          byCode[code] = true;
          all.push({ code: code, name: h.name || ('Hotel ' + code), city: h.city || '' });
        }
      });
    }
    return Promise.all(DESTINATIONS_LERMA_BURGOS.map(function (dest) {
      return fetch(base + '/api/hotelbeds-list-hotels?destination=' + encodeURIComponent(dest) + '&source=content&filter=none&from=1&to=200')
        .then(function (r) { return r.json(); })
        .then(function (data) { if (!data.error) addFromResponse(data); return data; })
        .catch(function () { return {}; });
    })).then(function () { return all; });
  }

  function renderFullHotelListFromContent(hotelList) {
    if (!hotelList || hotelList.length === 0) {
      window.LIVE_HOTEL_PRICES = null;
      window.HOTELBEDS_DYNAMIC_OPTS = null;
      setBookingWidgetVisible(true);
      renderBlock('<div class="hotelbeds-block hotelbeds-info">No se pudo cargar el listado de hoteles. Elige Lerma o Burgos y un hotel en los desplegables; si no aparecen opciones, usa el enlace a Booking.com debajo.</div>');
      document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
      return;
    }
    window.LIVE_HOTEL_PRICES = null;
    var lerma = [];
    var burgos = [];
    hotelList.forEach(function (h) {
      var name = (typeof h.name === 'string' ? h.name : (h.name && h.name.content) ? h.name.content : '') || ('Hotel ' + h.code);
      var ciudad = cityForHotel(h);
      var opt = { v: 'hb-' + h.code, l: name, p: DEFAULT_PRICE_PER_NIGHT };
      if (ciudad === 'lerma') lerma.push(opt); else burgos.push(opt);
    });
    window.HOTELBEDS_DYNAMIC_OPTS = { lerma: lerma, burgos: burgos };
    setBookingWidgetVisible(true);
    var totalHotels = lerma.length + burgos.length;
    renderBlock(
      '<div class="hotelbeds-block hotelbeds-results">' +
      '<h4 class="hotelbeds-title">Hoteles en Lerma y Burgos (Hotelbeds)</h4>' +
      '<p class="hotelbeds-note">Se muestran <strong>' + totalHotels + ' hoteles</strong> en la zona. Elige <strong>Lugar</strong> y <strong>Hotel</strong> en los desplegables. Precio orientativo ' + DEFAULT_PRICE_PER_NIGHT + ' €/noche (a confirmar según disponibilidad).</p>' +
      '</div>'
    );
    document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
    triggerResumenUpdate();
  }

  function renderHotelbedsResults(data, selectedHotels) {
    window.HOTELBEDS_DYNAMIC_OPTS = null;
    var hotels = (data.hotels && data.hotels.hotels) || [];
    if (hotels.length === 0) {
      window.LIVE_HOTEL_PRICES = null;
      setBookingWidgetVisible(true);
      renderBlock('<div class="hotelbeds-block hotelbeds-info">No hay disponibilidad para las fechas seleccionadas. Puedes continuar con precios por defecto.</div>');
      document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
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
    html += '</ul><p class="hotelbeds-note">Precios por noche. El total del resumen usa estos importes cuando apliquen.</p></div>';
    window.LIVE_HOTEL_PRICES = Object.keys(live).length ? live : null;
    setBookingWidgetVisible(!window.LIVE_HOTEL_PRICES);
    renderBlock(html);
    triggerResumenUpdate();
    document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
  }

  function renderHotelbedsResultsByDestination(data) {
    var hotels = (data.hotels && data.hotels.hotels) || [];
    if (hotels.length === 0) {
      fetchHotelbedsListHotels().then(function (list) {
        renderFullHotelListFromContent(list);
      }).catch(function () {
        renderFullHotelListFromContent([]);
      });
      return;
    }
    var live = {};
    var lerma = [];
    var burgos = [];
    function getStr(v) { return (typeof v === 'string' ? v : (v && v.content) ? v.content : '') || ''; }
    hotels.forEach(function (h) {
      var code = String(h.code);
      var name = getStr(h.name) || getStr(h.description) || ('Hotel ' + code);
      var rate = h.minRate;
      if (rate == null && h.rooms && h.rooms[0]) {
        var r0 = h.rooms[0];
        var rr = (r0.rates && r0.rates[0]) ? r0.rates[0] : null;
        if (rr) rate = parseFloat(rr.net || rr.gross || rr.sellingRate) || null;
      }
      if (typeof rate === 'string') rate = parseFloat(rate) || null;
      var ciudad = cityForHotel(h);
      var key = 'hb-' + code;
      live[key] = rate != null ? rate : null;
      var opt = { v: key, l: name, p: rate };
      if (ciudad === 'lerma') lerma.push(opt); else burgos.push(opt);
    });
    window.LIVE_HOTEL_PRICES = live;
    window.HOTELBEDS_DYNAMIC_OPTS = { lerma: lerma, burgos: burgos };

    var html = '<div class="hotelbeds-block hotelbeds-results"><h4 class="hotelbeds-title">Precios en tiempo real (Hotelbeds) · Lerma y Burgos</h4><ul class="hotelbeds-list">';
    hotels.forEach(function (h) {
      var code = String(h.code);
      var name = getStr(h.name) || getStr(h.description) || ('Hotel ' + code);
      var key = 'hb-' + code;
      var rate = live[key];
      var priceStr = rate != null ? (Math.round(rate * 100) / 100) + ' €' : '—';
      html += '<li class="hotelbeds-item"><span class="hotelbeds-name">' + escapeHtml(name) + '</span> <span class="hotelbeds-price">' + priceStr + '</span></li>';
    });
    html += '</ul><p class="hotelbeds-note">Elige el hotel para cada noche en los desplegables. El total usa estos precios cuando estén disponibles.</p></div>';
    setBookingWidgetVisible(false);
    renderBlock(html);
    document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
    triggerResumenUpdate();
  }

  function run() {
    var formData = getFormData();
    if (!formData) return;

    var range = getCheckInCheckOut(formData);
    if (!range) {
      window.LIVE_HOTEL_PRICES = null;
      clearHotelbedsBookingContext();
      setBookingWidgetVisible(false);
      renderBlock('<p class="hotelbeds-block hotelbeds-info">Selecciona las fechas en el calendario para ver precios en tiempo real (Hotelbeds).</p>');
      return;
    }

    var noches = parseInt(formData.get('noches') || '0', 10);
    if (noches < 1) {
      window.LIVE_HOTEL_PRICES = null;
      clearHotelbedsBookingContext();
      setBookingWidgetVisible(false);
      renderBlock('<p class="hotelbeds-block hotelbeds-info">Selecciona las fechas de estancia para ver hoteles y precios en tiempo real.</p>');
      return;
    }

    renderLoading();

    var cfg = window.HOTELBEDS_CONFIG;
    var codes = cfg && cfg.getCodesForSelectedHotels ? cfg.getCodesForSelectedHotels(formData, noches) : (cfg && cfg.getAllHotelCodes ? cfg.getAllHotelCodes() : []);

    var hbPromise = codes.length > 0
      ? fetchHotelbeds(range.checkIn, range.checkOut, codes)
      : fetchHotelbedsByDestination(range.checkIn, range.checkOut);

    hbPromise
      .then(function (hb) {
        if (hb && hb.error) {
          throw new Error(typeof hb.error === 'string' ? hb.error : (hb.error && hb.error.message) || 'Hotelbeds error');
        }
        window.__HB_LAST_AVAIL__ = hb;
        window.__HB_RATE_BY_CODE = indexRatesByHotelCode(hb);
        if (codes.length > 0) {
          var fd = getFormData();
          var n = parseInt(fd.get('noches') || '0', 10);
          var selectedCodes = cfg && cfg.getCodesForSelectedHotels ? cfg.getCodesForSelectedHotels(fd, n) : [];
          renderHotelbedsResults(hb, selectedCodes);
        } else {
          renderHotelbedsResultsByDestination(hb);
        }
      })
      .catch(function (err) {
        renderError(err.message);
        document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
      });
  }

  function splitHolderName(full) {
    full = (full || '').trim();
    if (!full) return { name: 'Guest', surname: 'Booking' };
    var sp = full.indexOf(' ');
    if (sp < 0) return { name: full, surname: 'Booking' };
    return {
      name: full.slice(0, sp).trim() || 'Guest',
      surname: full.slice(sp + 1).trim() || 'Booking',
    };
  }

  var HB_PAQUETE_LABELS = {
    'fin-semana': 'Fin de semana golf Burgos',
    'golf-vino': 'Paquete golf y vino',
    '36-hoyos': '36 hoyos golf',
    ryder: 'Ryder cup',
    torneos: 'Torneo / configurador',
    'pausa-drive': 'Pausa & drive',
    cochinillo: 'Paquete cochinillo',
    'tour-boogie': 'Tour boogie',
    bautismos: 'Bautismos',
    'primera-cuota': 'Cuota socio',
  };

  function hotelCodeFromSelectValue(hv, cfg) {
    if (!hv) return null;
    hv = String(hv);
    if (hv.indexOf('hb-') === 0) return hv.slice(3);
    var dash = hv.indexOf('-');
    if (dash > 0 && cfg && cfg.getCode) {
      var c = cfg.getCode(hv.slice(dash + 1));
      if (c) return String(c);
    }
    return null;
  }

  function getActiveHotelCodeForBooking(formData, noches, cfg) {
    var map = window.__HB_RATE_BY_CODE || {};
    var i;
    for (i = 1; i <= (noches || 10); i++) {
      var hv = (formData.get && formData.get('hotel-noche-' + i)) || '';
      var code = hotelCodeFromSelectValue(hv, cfg);
      if (code && map[code]) return code;
    }
    for (i = 1; i <= (noches || 10); i++) {
      hv = (formData.get && formData.get('hotel-noche-' + i)) || '';
      code = hotelCodeFromSelectValue(hv, cfg);
      if (code) return code;
    }
    return null;
  }

  function extractRateKeyAfterCheckrate(chk) {
    if (!chk || typeof chk !== 'object') return null;
    var h = chk.hotel || chk;
    var rooms = (h && h.rooms) || [];
    var r0 = rooms[0];
    if (!r0) return null;
    var rates = r0.rates || [];
    var rt = Array.isArray(rates) ? rates[0] : rates;
    return rt && rt.rateKey ? String(rt.rateKey) : null;
  }

  window.tryHotelbedsBookForStripe = function (opts) {
    opts = opts || {};
    if (window.HOTELBEDS_SKIP_PREBOOK === true) {
      return Promise.resolve(null);
    }
    var formId = opts.formId || (pageOpts().formId || 'configuradorForm');
    var form = document.getElementById(formId);
    if (!form) return Promise.resolve(null);
    var fd = new FormData(form);
    var noches = parseInt(fd.get('noches') || '0', 10);
    var cfg = window.HOTELBEDS_CONFIG;
    var hotelCode = getActiveHotelCodeForBooking(fd, noches, cfg);
    if (!hotelCode) return Promise.resolve(null);
    var hb = window.__HB_LAST_AVAIL__;
    var byCode = window.__HB_RATE_BY_CODE || {};
    if (!hb || !hb.hotels || !byCode[hotelCode]) return Promise.resolve(null);
    var pick = byCode[hotelCode];
    if (!pick || !pick.rateKey) return Promise.resolve(null);

    var nombre = (fd.get('usuario[1][nombre]') || '').trim();
    var mail = (fd.get('usuario[1][correo]') || '').trim();
    var pre = (fd.get('usuario[1][movil_prefijo]') || '+34').trim().replace(/\s+/g, '');
    var mov = (fd.get('usuario[1][movil]') || '').replace(/\s+/g, '');
    var phone = mov.indexOf('+') === 0 ? mov : pre + mov;
    if (!phone) phone = '+34000000000';

    if (!mail) {
      return Promise.reject(new Error('Falta el correo del titular (usuario 1) para la reserva de hotel.'));
    }

    var nameParts = splitHolderName(nombre);
    var base = window.location.origin || '';
    var paquete = opts.paquete || '';
    var pkgLabel = HB_PAQUETE_LABELS[paquete] || paquete || 'Paquete Golf Lerma';

    function postHb(payload) {
      return fetch(base + '/api/hotelbeds-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(function (r) {
        return r.json();
      });
    }

    function doBooking(finalRateKey) {
      var booking = {
        holder: {
          name: nameParts.name,
          surname: nameParts.surname,
          email: mail,
          phone: phone,
        },
        rooms: [
          {
            rateKey: finalRateKey,
            paxes: [
              {
                roomId: 1,
                type: 'AD',
                name: nameParts.name,
                surname: nameParts.surname,
              },
            ],
          },
        ],
        clientReference: 'GL-' + paquete + '-' + Date.now(),
        remark: 'Web paquete / Stripe: ' + pkgLabel,
        tolerance: '2',
      };
      return postHb({ action: 'booking', booking: booking, packageLabel: pkgLabel }).then(function (res) {
        if (!res.ok || !res.voucher) {
          var msg =
            res.hotelbedsError ||
            (res.data &&
              res.data.error &&
              (typeof res.data.error === 'string' ? res.data.error : res.data.error.message)) ||
            res.error ||
            'La reserva Hotelbeds no devolvió bono (voucher).';
          throw new Error(String(msg));
        }
        return res.voucher;
      });
    }

    var rk = pick.rateKey;
    var rt = String(pick.rateType || '').toUpperCase();
    if (rt === 'RECHECK') {
      return postHb({ action: 'checkrates', rooms: [{ rateKey: rk }] }).then(function (cr) {
        if (!cr.ok) {
          var e =
            cr.hotelbedsError ||
            (cr.data && cr.data.error && (cr.data.error.message || cr.data.error)) ||
            cr.error ||
            'CheckRate falló';
          throw new Error(String(e));
        }
        var nk = extractRateKeyAfterCheckrate(cr.data);
        if (!nk) throw new Error('CheckRate no devolvió rateKey.');
        return doBooking(nk);
      });
    }
    return doBooking(rk);
  };

  function schedule() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(run, DEBOUNCE_MS);
  }

  window.actualizarPreciosHotelbeds = function () {
    schedule();
  };

  function init() {
    var o = pageOpts();
    var wrap = o.hotelWrapId ? document.getElementById(o.hotelWrapId) : null;
    if (!wrap) return;

    var container = getContainer();
    if (!container && o.preciosBlockId) {
      container = document.createElement('div');
      container.id = o.preciosBlockId;
      container.className = 'hotelbeds-precios-wrap';
      wrap.appendChild(container);
    }
    setBookingWidgetVisible(false);

    var form = getForm();
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

  function updateBookingLinks() {
    var o = pageOpts();
    if (!o.linkLermaId && !o.linkBurgosId) return;
    var range = getCheckInCheckOut(getFormData() || new FormData());
    var baseLerma = 'https://www.booking.com/searchresults.html?ss=Lerma%2C+Espa%C3%B1a';
    var baseBurgos = 'https://www.booking.com/searchresults.html?ss=Burgos%2C+Espa%C3%B1a';
    var suffix = '';
    if (range && range.checkIn && range.checkOut) {
      suffix = '&checkin=' + range.checkIn + '&checkout=' + range.checkOut;
    }
    var linkLerma = o.linkLermaId ? document.getElementById(o.linkLermaId) : null;
    var linkBurgos = o.linkBurgosId ? document.getElementById(o.linkBurgosId) : null;
    if (linkLerma) linkLerma.href = baseLerma + suffix;
    if (linkBurgos) linkBurgos.href = baseBurgos + suffix;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = getForm();
    if (form) {
      form.addEventListener('change', updateBookingLinks);
      form.addEventListener('input', updateBookingLinks);
    }
    setTimeout(updateBookingLinks, 300);
  });
})();
