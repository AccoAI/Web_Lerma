/**
 * Precios Hotelbeds en tiempo real para cualquier paquete con calendario + alojamiento.
 * Configurar antes de cargar el script: window.HOTELBEDS_PAGE = { formId, hotelWrapId, preciosBlockId, ... onResumen }
 */
(function () {
  var DEBOUNCE_MS = 800;
  var debounceTimer = null;
  var ALL_HOTEL_IDS = ['alisa', 'ceres', 'parador', 'silken', 'palacio-blasones', 'hotel-centro'];
  /** Hotel API: destination.code solo 1–3 caracteres (p. ej. BRG). «BUR2» no es válido y devuelve 400. */
  var DESTINATIONS_LERMA_BURGOS = ['BRG'];
  var ALLOWED_HOTEL_CODES = {
    lerma: { '62060': 1, '8116': 1, '194680': 1, '134469': 1 },
    burgos: { '87356': 1, '23103': 1, '54825': 1, '35657': 1 },
  };

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
    window.__HB_CONTENT_BY_CODE = null;
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

  function boardFullFromRate(rate) {
    if (!rate) return '';
    var bn = rate.boardName;
    if (typeof bn === 'string') return bn.trim();
    if (bn && bn.content) return String(bn.content).trim();
    return String(rate.boardCode || '').trim();
  }

  function paidExtrasFromRate(rate) {
    var lines = [];
    if (!rate || typeof rate !== 'object') return lines;
    var taxes = rate.taxes && (rate.taxes.taxes || rate.taxes);
    if (!Array.isArray(taxes)) return lines;
    taxes.forEach(function (tx) {
      if (!tx || typeof tx !== 'object') return;
      if (tx.included === true) return;
      var amt = tx.clientAmount != null ? tx.clientAmount : tx.amount;
      if (amt == null || amt === '' || Number(amt) === 0) return;
      var desc = (tx.description && String(tx.description).trim()) || tx.type || 'Cargo adicional';
      lines.push(desc + ': ' + amt + ' ' + (tx.currency || 'EUR'));
    });
    return lines;
  }

  function rateCommentsFromRate(rate) {
    var out = [];
    if (!rate) return out;
    var rc = rate.rateComments;
    if (!Array.isArray(rc)) return out;
    rc.forEach(function (c) {
      if (typeof c === 'string') out.push(c);
      else if (c && c.text) out.push(c.text);
    });
    return out;
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
            boardName: boardFullFromRate(rate),
            rateExtrasPaid: paidExtrasFromRate(rate),
            rateComments: rateCommentsFromRate(rate),
          };
          break;
        }
      }
    }
    return map;
  }

  function loadHotelContentEnrichment() {
    var base =
      typeof window !== 'undefined' && window.location && window.location.origin
        ? window.location.origin
        : '';
    if (!base) return Promise.resolve();
    return Promise.all(
      DESTINATIONS_LERMA_BURGOS.map(function (dest) {
        return fetch(
          base +
            '/api/hotelbeds-list-hotels?destination=' +
            encodeURIComponent(dest) +
            '&source=content&enrich=1&filter=none&from=1&to=200&language=CAS'
        )
          .then(function (r) {
            return r.json();
          })
          .then(function (data) {
            return data.hotels || [];
          })
          .catch(function () {
            return [];
          });
      })
    )
      .then(function (lists) {
        var byCode = {};
        lists.forEach(function (arr) {
          arr.forEach(function (h) {
            if (h && h.code) byCode[String(h.code)] = h;
          });
        });
        window.__HB_CONTENT_BY_CODE = byCode;
      })
      .catch(function () {
        window.__HB_CONTENT_BY_CODE = {};
      });
  }

  function renderStarsBadge(categoryName) {
    var s = (categoryName || '').trim();
    if (!s) return '';
    var m =
      s.match(/([1-5])\s*(?:star|stars|estrella|estrellas|\*|★)/i) ||
      s.match(/^([1-5])(?:\s|$|\*|★)/);
    var n = m ? parseInt(m[1], 10) : 0;
    if (n >= 1 && n <= 5) {
      return '<span class="hotelbeds-stars" title="' + escapeHtml(s) + '">' + '★'.repeat(n) + '</span>';
    }
    return '<span class="hotelbeds-category">' + escapeHtml(s) + '</span>';
  }

  function truncateText(t, max) {
    if (!t) return '';
    t = String(t);
    if (t.length <= max) return t;
    return t.slice(0, max - 1) + '…';
  }

  /**
   * @param {object} hAvail — hotel objeto Availability API
   * @param {object|null} meta — __HB_CONTENT_BY_CODE[code]
   * @param {object|null} pick — __HB_RATE_BY_CODE[code]
   */
  function hotelRichCardHtml(hAvail, meta, pick, priceStr, selSuffix) {
    var code = String(hAvail.code || '');
    var displayName =
      (typeof hAvail.name === 'string' ? hAvail.name : hAvail.name && hAvail.name.content) ||
      (meta && meta.name) ||
      'Hotel ' + code;
    if (typeof displayName !== 'string') displayName = String(displayName || 'Hotel');

    var img = meta && meta.imageUrl ? meta.imageUrl : '';
    var catLabel = meta && (meta.categoryName || meta.categoryCode) ? meta.categoryName || meta.categoryCode : '';
    var desc = meta && meta.descriptionShort ? meta.descriptionShort : '';
    var paidFac = (meta && meta.facilitiesWithCharge) || [];
    var hf = (meta && meta.hotelFacilities) || [];
    var rf = (meta && meta.roomFacilities) || [];
    var boardLine = pick && pick.boardName ? pick.boardName : pick && pick.boardCode ? String(pick.boardCode) : '';
    var roomLine = pick && pick.roomName ? pick.roomName : '';
    var ratePaid = (pick && pick.rateExtrasPaid) || [];
    var rateComm = (pick && pick.rateComments) || [];

    var imgHtml = img
      ? '<div class="hotelbeds-card-media"><img src="' + escapeHtml(img) + '" alt="" loading="lazy" width="120" height="90"></div>'
      : '<div class="hotelbeds-card-media hotelbeds-card-media--empty" aria-hidden="true"></div>';

    var paidBlock = '';
    if (paidFac.length) {
      paidBlock +=
        '<div class="hotelbeds-paid-facilities"><strong>Servicios con coste adicional (hotel):</strong><ul class="hotelbeds-mini-list">' +
        paidFac
          .slice(0, 25)
          .map(function (x) {
            return '<li>' + escapeHtml(x) + '</li>';
          })
          .join('') +
        '</ul></div>';
    }
    var facBlock = '';
    var facCombined = hf.slice(0, 12).concat(rf.length ? ['— Habitación —'] : []).concat(rf.slice(0, 12));
    if (facCombined.length) {
      facBlock =
        '<div class="hotelbeds-facilities"><strong>Instalaciones (extracto Content API):</strong> ' +
        escapeHtml(truncateText(facCombined.join(' · '), 420)) +
        '</div>';
    }

    var boardBlock = '';
    if (boardLine || roomLine) {
      boardBlock =
        '<div class="hotelbeds-board-room">' +
        (roomLine ? '<div><strong>Habitación:</strong> ' + escapeHtml(roomLine) + '</div>' : '') +
        (boardLine ? '<div><strong>Régimen:</strong> ' + escapeHtml(boardLine) + '</div>' : '') +
        '</div>';
    }

    var rateExtraBlock = '';
    if (ratePaid.length) {
      rateExtraBlock +=
        '<div class="hotelbeds-rate-paid"><strong>Cargos en la tarifa (API disponibilidad):</strong><ul class="hotelbeds-mini-list">' +
        ratePaid
          .map(function (x) {
            return '<li>' + escapeHtml(x) + '</li>';
          })
          .join('') +
        '</ul></div>';
    }
    if (rateComm.length) {
      rateExtraBlock +=
        '<div class="hotelbeds-rate-comments"><strong>Observaciones tarifa:</strong> ' +
        escapeHtml(truncateText(rateComm.join(' '), 400)) +
        '</div>';
    }

    return (
      '<article class="hotelbeds-card">' +
      imgHtml +
      '<div class="hotelbeds-card-main">' +
      '<header class="hotelbeds-card-head">' +
      renderStarsBadge(catLabel) +
      '<span class="hotelbeds-card-title">' +
      escapeHtml(displayName) +
      selSuffix +
      '</span>' +
      '<span class="hotelbeds-price">' +
      escapeHtml(priceStr) +
      '</span>' +
      '</header>' +
      (desc ? '<p class="hotelbeds-desc">' + escapeHtml(truncateText(desc, 380)) + '</p>' : '') +
      boardBlock +
      paidBlock +
      facBlock +
      rateExtraBlock +
      '</div></article>'
    );
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

  function cityForCode(code, hotelObj) {
    var c = String(code || '');
    if (ALLOWED_HOTEL_CODES.lerma[c]) return 'lerma';
    if (ALLOWED_HOTEL_CODES.burgos[c]) return 'burgos';
    return cityForHotel(hotelObj || {});
  }

  function isAllowedHotel(code) {
    var c = String(code || '');
    return !!(ALLOWED_HOTEL_CODES.lerma[c] || ALLOWED_HOTEL_CODES.burgos[c]);
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
        if (!isAllowedHotel(code)) return;
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
    hotelList = (hotelList || []).filter(function (h) { return isAllowedHotel(h && h.code); });
    if (!hotelList || hotelList.length === 0) {
      window.LIVE_HOTEL_PRICES = null;
      window.HOTELBEDS_DYNAMIC_OPTS = null;
      setBookingWidgetVisible(true);
      renderBlock(
        '<div class="hotelbeds-block hotelbeds-info">' +
        'Hotelbeds no devolvió catálogo ni disponibilidad para Burgos/Lerma con estas fechas (es habitual en entorno de pruebas o sin inventario). ' +
        'Puedes elegir un <strong>hotel de referencia</strong> en los desplegables (precios orientativos de la web) o reservar con los enlaces a Booking más abajo.' +
        '</div>'
      );
      document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
      return;
    }
    window.LIVE_HOTEL_PRICES = null;
    var lerma = [];
    var burgos = [];
    hotelList.forEach(function (h) {
      var name = (typeof h.name === 'string' ? h.name : (h.name && h.name.content) ? h.name.content : '') || ('Hotel ' + h.code);
      var ciudad = cityForCode(h.code, h);
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
    var hotels = ((data.hotels && data.hotels.hotels) || []).filter(function (h) {
      return isAllowedHotel(h && h.code);
    });
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
    var rateBy = window.__HB_RATE_BY_CODE || {};
    var contentBy = window.__HB_CONTENT_BY_CODE || {};
    var html =
      '<div class="hotelbeds-block hotelbeds-results"><h4 class="hotelbeds-title">Precios en tiempo real (Hotelbeds)</h4><ul class="hotelbeds-list hotelbeds-list--cards">';
    hotels.forEach(function (h) {
      var code = String(h.code);
      var ourId = codeToId[code];
      var rate = h.minRate;
      if (rate == null && h.rooms && h.rooms[0]) {
        var r0 = h.rooms[0];
        var rr = r0.rates && r0.rates[0] ? r0.rates[0] : null;
        if (rr) rate = parseFloat(rr.net || rr.gross || rr.sellingRate) || null;
      }
      if (typeof rate === 'string') rate = parseFloat(rate) || null;
      if (ourId && rate != null) live[ourId] = rate;
      var priceStr = rate != null ? (Math.round(rate * 100) / 100) + ' €/noche' : '—';
      var sel = selectedHotels.indexOf(code) >= 0 ? ' <span class="hotelbeds-selected">(elegido)</span>' : '';
      var pick = rateBy[code];
      var meta = contentBy[code];
      html +=
        '<li class="hotelbeds-item-wrap">' +
        hotelRichCardHtml(h, meta, pick, priceStr, sel) +
        '</li>';
    });
    html +=
      '</ul><p class="hotelbeds-note">Ficha enriquecida con Hotelbeds Content API (estrellas, imagen, descripción, instalaciones). Los <strong>servicios con coste adicional</strong> y cargos de tarifa se muestran cuando la API los incluye. Precios orientativos por noche.</p></div>';
    window.LIVE_HOTEL_PRICES = Object.keys(live).length ? live : null;
    setBookingWidgetVisible(!window.LIVE_HOTEL_PRICES);
    renderBlock(html);
    triggerResumenUpdate();
    document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
  }

  function renderHotelbedsResultsByDestination(data) {
    var hotels = ((data.hotels && data.hotels.hotels) || []).filter(function (h) {
      return isAllowedHotel(h && h.code);
    });
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
      var ciudad = cityForCode(code, h);
      var key = 'hb-' + code;
      live[key] = rate != null ? rate : null;
      var opt = { v: key, l: name, p: rate };
      if (ciudad === 'lerma') lerma.push(opt); else burgos.push(opt);
    });
    window.LIVE_HOTEL_PRICES = live;
    window.HOTELBEDS_DYNAMIC_OPTS = { lerma: lerma, burgos: burgos };

    var rateBy = window.__HB_RATE_BY_CODE || {};
    var contentBy = window.__HB_CONTENT_BY_CODE || {};
    var html =
      '<div class="hotelbeds-block hotelbeds-results"><h4 class="hotelbeds-title">Precios en tiempo real (Hotelbeds) · Lerma y Burgos</h4><ul class="hotelbeds-list hotelbeds-list--cards">';
    hotels.forEach(function (h) {
      var code = String(h.code);
      var key = 'hb-' + code;
      var rate = live[key];
      var priceStr = rate != null ? (Math.round(rate * 100) / 100) + ' €/noche' : '—';
      var pick = rateBy[code];
      var meta = contentBy[code];
      html +=
        '<li class="hotelbeds-item-wrap">' +
        hotelRichCardHtml(h, meta, pick, priceStr, '') +
        '</li>';
    });
    html +=
      '</ul><p class="hotelbeds-note">Elige el hotel para cada noche en los desplegables. Ficha enriquecida con Content API. Cargos e instalaciones de pago cuando los devuelve la API.</p></div>';
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
        return loadHotelContentEnrichment().then(function () {
          return hb;
        });
      })
      .then(function (hb) {
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
