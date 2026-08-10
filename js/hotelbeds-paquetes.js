/**
 * Precios Hotelbeds en tiempo real para cualquier paquete con calendario + alojamiento.
 * Opciones en window.HOTELBEDS_PAGE: formId, preciosBlockId, onResumen, hideHotelEuroUi (false = mostrar € en tarjetas y funnel).
 * Precio mostrado al cliente: RSP (sellingRate). net se conserva en hb_hotel_stay_book_net para liquidación interna.
 */
(function () {
  var DEBOUNCE_MS = 1500;
  var debounceTimer = null;
  var runAbortCtrl = null;
  var ALL_HOTEL_IDS = ['alisa', 'ceres', 'parador', 'silken', 'palacio-blasones', 'hotel-centro'];
  /** Hotel API: destination.code solo 1–3 caracteres (p. ej. BRG). «BUR2» no es válido y devuelve 400. */
  var DESTINATIONS_LERMA_BURGOS = ['BRG'];
  /**
   * Pool Hotelbeds para paquetes Golf Burgos / Campeonato.
 * Flujo: 1) filtro por disponibilidad (API) → 2) orden por este ranking de preferencia.
 * Certificación: el resto del catálogo BRG (Content API) se mapea al final sin mostrarse en UI salvo fallback de disponibilidad.
   */
  /**
   * Pool preferente (UI + orden de venta). Los códigos de cobertura certificación se añaden al final
   * tras cargar Content API BRG (ver syncCoverageCodesFromContent).
   */
  var BRG_HOTEL_CODES = [
    // — Ranking 1–9 (Burgos) —
    '23103', // 1 · NH Collection Palacio de Burgos · 4★
    '35657', // 2 · AC Hotel Burgos by Marriott · 4★
    '271694', // 3 · Landa · 5★
    '87356', // 4 · Silken Gran Teatro · 4★
    '1242', // 5 · Hotel Rice Reyes Católicos · 4★
    '1882', // 6 · Abba Burgos · 4★
    '54825', // 7 · Hotel Rice Palacio De Los Blasones · 4★
    '431138', // 8 · Hotel Boutique Museo · 3★
    '934', // 9 · Hotel Maria Luisa · 3★
    // — Ranking 9+ (misma prioridad, orden relativo dentro del grupo) —
    '3242', // Corona de Castilla Burgos · 4★
    '136659', // Hotel Rice Bulevar · 3★
    '4177', // Crisol Meson del Cid · 3★
    '100337', // Hotel Cordon · 3★
    '114225', // Hotel Cardena · 3★
    '116820', // La Puebla · 3★
    '126077', // B&B hotel Burgos · 4★
    '134466', // Los Braseros · 3★
    '135470', // Centro Los Braseros · 3★
    '150730', // Via Gotica · 3★
    '1001544', // Hotel Forum Evolucion · SPC
    '1021767', // Apartamentos El Cid · SPC
    '8112', // Crisol Almirante Bonifaz · 4★
    '27476', // Norte y Londres · 2★
    // — Lerma (pestaña Lerma; al final del pool para consulta API) —
    '62060', // Parador de Lerma
    '8116', // Alisa
    '194680', // Posada De Eufrasio
  ];
  /** Orden Lerma (pestaña Lerma): Parador → Alisa → Posada De Eufrasio. */
  var LERMA_HOTEL_CODES_ORDER = ['62060', '8116', '194680'];
  /** Códigos en Lerma (resto = Burgos). */
  var LERMA_HOTEL_CODES = {
    '62060': 1,
    '8116': 1,
    '194680': 1,
  };
  /** Máximo de hoteles mostrados en modo «un solo hotel cubre al grupo» (solo lista preferente). */
  var HB_DISPLAY_MAX = 3;
  /** Máximo de hoteles en reparto (si ninguno cubre al grupo entero). */
  var HB_SPLIT_MAX = 6;
  /** Máximo de combinaciones de reparto mostradas como tarjeta única. */
  var HB_SPLIT_MAX_COMBOS = 8;
  var HB_AVAIL_BATCH_SIZE = 20;

  var ALLOWED_HOTEL_CODES = {
    lerma: {},
    burgos: {},
  };
  var CURATED_HOTEL_LABELS = {
    '23103': 'NH Collection Palacio de Burgos',
    '35657': 'AC Hotel Burgos by Marriott',
    '271694': 'Landa',
    '87356': 'Silken Gran Teatro',
    '1242': 'Hotel Rice Reyes Católicos',
    '1882': 'Abba Burgos',
    '54825': 'Hotel Rice Palacio De Los Blasones',
    '431138': 'Hotel Boutique Museo',
    '934': 'Hotel Maria Luisa',
    '3242': 'Corona de Castilla Burgos',
    '136659': 'Hotel Rice Bulevar',
    '4177': 'Crisol Meson del Cid',
    '100337': 'Hotel Cordon',
    '114225': 'Hotel Cardena',
    '116820': 'La Puebla',
    '126077': 'B&B hotel Burgos',
    '134466': 'Los Braseros',
    '135470': 'Centro Los Braseros',
    '150730': 'Via Gotica',
    '1001544': 'Hotel Forum Evolucion',
    '1021767': 'Apartamentos El Cid',
    '8112': 'Crisol Almirante Bonifaz',
    '27476': 'Norte y Londres',
    '62060': 'Parador de Lerma',
    '8116': 'Alisa',
    '194680': 'Posada De Eufrasio',
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
      /** Si no es `false`, no se muestran importes € de Hotelbeds en tarjetas ni funnel (el total del paquete usa internamente hb_hotel_stay_ref_net). */
      hideHotelEuroUi: true,
      /** Opcional: lista de códigos BRG para esta página (sin orden preferente). */
      brgHotelCodes: null,
      /** @deprecated Usa brgHotelCodes */
      brgHotelPriority: null,
      /** Opcional: sustituye HB_DISPLAY_MAX (por defecto 3). */
      displayMaxHotels: null,
      /** Tarjetas compactas: sí muestran descripción corta (1–2 líneas) e instalaciones resumidas. */
      compactHotelCards: true,
    };
    return Object.assign({}, d, window.HOTELBEDS_PAGE || {});
  }

  function getDisplayMaxHotels() {
    var n = pageOpts().displayMaxHotels;
    if (n != null && isFinite(Number(n)) && Number(n) >= 1) return Math.min(20, Math.floor(Number(n)));
    return HB_DISPLAY_MAX;
  }

  function getBrgHotelPriorityCodes() {
    var po = pageOpts();
    var custom = po.brgHotelCodes || po.brgHotelPriority;
    if (Array.isArray(custom) && custom.length) {
      return custom.map(function (c) { return String(c).trim(); }).filter(Boolean);
    }
    return BRG_HOTEL_CODES.slice();
  }

  /** Lista completa para availability / mapeo técnico (preferente + cobertura al final). */
  function getBrgHotelMappingCodeList() {
    var priority = getBrgHotelPriorityCodes();
    var seen = {};
    var out = [];
    priority.forEach(function (c) {
      c = String(c);
      if (!seen[c]) {
        seen[c] = 1;
        out.push(c);
      }
    });
    (window.__HB_COVERAGE_CODES__ || []).forEach(function (c) {
      c = String(c);
      if (!seen[c]) {
        seen[c] = 1;
        out.push(c);
      }
    });
    return out;
  }

  function getBrgHotelCodeList() {
    return getBrgHotelMappingCodeList();
  }

  function getBrgHotelPriorityList() {
    return getBrgHotelPriorityCodes();
  }

  function getLermaHotelCodeList() {
    return LERMA_HOTEL_CODES_ORDER.slice();
  }

  function getBurgosHotelCodeList() {
    return getBrgHotelPriorityCodes().filter(function (code) {
      return !LERMA_HOTEL_CODES[String(code)];
    });
  }

  function getActiveHotelCityZone() {
    return window.__HB_CITY_ZONE__ === 'lerma' ? 'lerma' : 'burgos';
  }

  function setActiveHotelCityZone(zone) {
    window.__HB_CITY_ZONE__ = zone === 'lerma' ? 'lerma' : 'burgos';
  }

  function hotelCityZoneForCode(code) {
    return LERMA_HOTEL_CODES[String(code || '')] ? 'lerma' : 'burgos';
  }

  function mergeHotelPicksByCity(merged, maxPerCity) {
    var burgosHotels = pickHotelsWithOffersByPriority(merged, getBurgosHotelCodeList(), maxPerCity);
    var lermaHotels = pickHotelsWithOffersByPriority(merged, getLermaHotelCodeList(), maxPerCity);
    var seen = {};
    var out = [];
    burgosHotels.concat(lermaHotels).forEach(function (h) {
      var c = String(h.code);
      if (!seen[c]) {
        seen[c] = 1;
        out.push(h);
      }
    });
    return out;
  }

  function sortHotelsForCityDisplay(hotels) {
    var burgosCodes = getBurgosHotelCodeList();
    var lermaCodes = getLermaHotelCodeList();
    var byCode = {};
    (hotels || []).forEach(function (h) {
      if (h && h.code != null) byCode[String(h.code)] = h;
    });
    var sorted = [];
    burgosCodes.forEach(function (code) {
      if (byCode[code]) sorted.push(byCode[code]);
    });
    lermaCodes.forEach(function (code) {
      if (byCode[code]) sorted.push(byCode[code]);
    });
    return sorted;
  }

  function hotelbedsCityToggleHtml() {
    var active = getActiveHotelCityZone();
    return (
      '<div class="hotelbeds-city-toggle" role="group" aria-label="Zona de alojamiento">' +
      '<button type="button" class="hotelbeds-city-toggle__btn' +
      (active === 'burgos' ? ' is-active' : '') +
      '" data-hb-city-zone="burgos">Burgos</button>' +
      '<button type="button" class="hotelbeds-city-toggle__btn' +
      (active === 'lerma' ? ' is-active' : '') +
      '" data-hb-city-zone="lerma">Lerma</button>' +
      '</div>' +
      '<p class="hotelbeds-city-empty" hidden>No hay hoteles con disponibilidad en esta zona para las fechas seleccionadas.</p>'
    );
  }

  function applyHotelCityZoneFilter(root) {
    if (!root) return;
    var zone = getActiveHotelCityZone();
    var wraps = root.querySelectorAll('.hotelbeds-item-wrap[data-hb-city-zone]');
    var visible = 0;
    for (var i = 0; i < wraps.length; i++) {
      var wrap = wraps[i];
      var show = wrap.getAttribute('data-hb-city-zone') === zone;
      wrap.hidden = !show;
      if (show) visible++;
    }
    var empty = root.querySelector('.hotelbeds-city-empty');
    if (empty) empty.hidden = visible > 0;
  }

  function bindHotelCityToggle(root) {
    if (!root) return;
    var btns = root.querySelectorAll('.hotelbeds-city-toggle__btn');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        if (btn.getAttribute('data-hb-city-bound') === '1') return;
        btn.setAttribute('data-hb-city-bound', '1');
        btn.addEventListener('click', function () {
          var zone = btn.getAttribute('data-hb-city-zone') || 'burgos';
          setActiveHotelCityZone(zone);
          var all = root.querySelectorAll('.hotelbeds-city-toggle__btn');
          for (var j = 0; j < all.length; j++) {
            var b = all[j];
            b.classList.toggle('is-active', b.getAttribute('data-hb-city-zone') === zone);
          }
          applyHotelCityZoneFilter(root);
        });
      })(btns[i]);
    }
    applyHotelCityZoneFilter(root);
  }

  function syncAllowedBurgosFromCodes() {
    ALLOWED_HOTEL_CODES.burgos = {};
    ALLOWED_HOTEL_CODES.lerma = {};
    getBrgHotelMappingCodeList().forEach(function (code) {
      var c = String(code);
      if (LERMA_HOTEL_CODES[c]) ALLOWED_HOTEL_CODES.lerma[c] = 1;
      else ALLOWED_HOTEL_CODES.burgos[c] = 1;
    });
  }

  function isPriorityHotelCode(code) {
    var c = String(code || '');
    if (LERMA_HOTEL_CODES[c]) return true;
    return getBrgHotelPriorityCodes().indexOf(c) >= 0;
  }

  /** Tras Content API BRG: códigos no preferentes al final (mapeo certificación, no UI salvo fallback). */
  function syncCoverageCodesFromContent() {
    var priority = getBrgHotelPriorityCodes();
    var prioritySet = {};
    priority.forEach(function (c) {
      prioritySet[String(c)] = 1;
    });
    Object.keys(LERMA_HOTEL_CODES).forEach(function (c) {
      prioritySet[c] = 1;
    });
    var coverage = [];
    var byCode = window.__HB_CONTENT_BY_CODE || {};
    Object.keys(byCode).forEach(function (code) {
      if (!prioritySet[code]) coverage.push(code);
    });
    coverage.sort();
    window.__HB_COVERAGE_CODES__ = coverage;
    var total = priority.length + coverage.length;
    var contentTotal = Object.keys(byCode).length;
    window.__HB_MAPPING_STATS__ = {
      priorityCount: priority.length,
      coverageCount: coverage.length,
      mappingTotal: total,
      contentHotelsInCache: contentTotal,
      coveragePercentOfContent:
        contentTotal > 0 ? Math.round((total / contentTotal) * 1000) / 10 : null,
    };
    syncAllowedBurgosFromCodes();
  }

  function syncAllowedBurgosFromPriority() {
    syncAllowedBurgosFromCodes();
  }

  function hbHideHotelEuroUi() {
    return pageOpts().hideHotelEuroUi !== false;
  }

  function hbFunnelConditionsButtonText() {
    return hbHideHotelEuroUi() ? 'Ver condiciones (Hotelbeds)' : 'Ver condiciones y precio final';
  }

  function getForm() {
    var id = pageOpts().formId;
    return id ? document.getElementById(id) : null;
  }

  /** Hotelbeds Booking API: clientReference 1–20 caracteres (no admite GL-fin-semana-{timestamp}). */
  function buildHbClientReference(paquete) {
    var slug = String(paquete || 'pk')
      .replace(/[^a-z0-9]/gi, '')
      .slice(0, 4)
      .toUpperCase();
    if (!slug) slug = 'PKG';
    return (slug + String(Date.now())).slice(0, 20);
  }

  function getContainer() {
    var id = pageOpts().preciosBlockId;
    return id ? document.getElementById(id) : null;
  }

  function isHotelbedsSectionVisible() {
    var wrap = document.getElementById(pageOpts().hotelWrapId || 'configurador-hotel-wrap');
    return !!(wrap && !wrap.hidden);
  }

  /** Fechas + personas (sin exigir campo de golf). */
  function hotelbedsFetchPrereqsOk(formEl, formData) {
    if (!formData) return false;
    if (!getCheckInCheckOut(formData)) return false;
    var noches = parseInt(formData.get('noches') || '0', 10);
    if (noches < 1) return false;
    if (typeof window.getConfigPrereqState === 'function' && formEl) {
      var prState = window.getConfigPrereqState(formEl);
      if (!prState.fechas || !prState.personas) return false;
    }
    return true;
  }

  function availabilityCacheMatches(formData) {
    var range = getCheckInCheckOut(formData);
    if (!range || !window.__HB_LAST_AVAIL__ || !window.__HB_LAST_AVAIL_RANGE__) return false;
    var cached = window.__HB_LAST_AVAIL_RANGE__;
    if (cached.checkIn !== range.checkIn || cached.checkOut !== range.checkOut) return false;
    var occ = clampHotelbedsOccupancy(getListOccupancyForAvailability(formData));
    var prev = window.__HB_LAST_AVAIL_OCC__;
    if (!prev) return false;
    return occCacheSignature(prev) === occCacheSignature(occ);
  }

  function tryRenderFromCache() {
    if (!window.__HB_LAST_AVAIL__ || !isHotelbedsSectionVisible()) return false;
    return loadHotelContentEnrichment().then(function () {
      if (!isHotelbedsSectionVisible()) return;
      renderHotelbedsResults(window.__HB_LAST_AVAIL__, []);
    }).then(function () {
      return true;
    }).catch(function () {
      return false;
    });
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
    // El calendario guarda `noches` como diferencia entre primer y último día seleccionado.
    // Ej: seleccionar 16 y 17 ⇒ 1 noche (checkOut=17). Antes se hacía last+1 ⇒ 2 noches.
    var noches = 0;
    try {
      noches = parseInt((formData.get && formData.get('noches')) || '0', 10) || 0;
    } catch (e0) { /* ignore */ }
    if (noches < 1) noches = 1;
    var d = new Date(checkIn + 'T12:00:00');
    d.setDate(d.getDate() + noches);
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
    window.__HB_FUNNEL_LAST__ = null;
    window.__HB_LAST_AVAIL__ = null;
    window.__HB_LAST_AVAIL_OCC__ = null;
    window.__HB_LAST_AVAIL_RANGE__ = null;
    window.__HB_WIDEN_AVAIL_CACHE__ = null;
    window.__HB_FUNNEL_OFFERS_KEY_BY_HOTEL__ = null;
    setBookingWidgetVisible(false);
    renderBlock('<div class="hotelbeds-block hotelbeds-loading"><span class="hotelbeds-spinner"></span> Consultando precios en tiempo real...</div>');
  }

  function clearHotelbedsBookingContext() {
    window.__HB_LAST_AVAIL__ = null;
    window.__HB_LAST_AVAIL_OCC__ = null;
    window.__HB_LAST_AVAIL_RANGE__ = null;
    window.__HB_RATE_BY_CODE = null;
    window.__HB_RATE_OFFERS_BY_CODE__ = null;
    window.__HB_FUNNEL_LAST__ = null;
    window.__HB_WIDEN_AVAIL_CACHE__ = null;
    window.__HB_FUNNEL_OFFERS_KEY_BY_HOTEL__ = null;
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

  function parseHotelbedsResponse(r) {
    var ct = (r.headers && r.headers.get ? r.headers.get('content-type') : '') || '';
    return r.text().then(function (text) {
      var trimmed = (text || '').trim();
      if (
        !trimmed ||
        (ct.indexOf('application/json') < 0 &&
          (trimmed.indexOf('<!DOCTYPE') === 0 || trimmed.indexOf('<html') === 0 || trimmed.indexOf('<') === 0))
      ) {
        throw new Error(
          'La API /api de Hotelbeds no devolvió JSON (suele ser HTML de un servidor solo estático). Usa vercel dev o el despliegue en Vercel.'
        );
      }
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        throw new Error('Respuesta no válida de Hotelbeds: ' + (e.message || 'JSON inválido'));
      }
    });
  }

  function isHotelbedsApiUnavailableError(err) {
    var msg = err && err.message ? String(err.message) : '';
    return /<!DOCTYPE|no devolvió JSON|servidor solo estático|vercel dev|Respuesta no válida de Hotelbeds/i.test(msg);
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

  /**
   * Impuestos/cargos NO incluidos (taxes.included === false) con subtipo + importe.
   * Requiere Tax Breakdown activado en la Api Key (Hotelbeds Concept Breakdown).
   */
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
      var subtype = (tx.subType || tx.subtype || '').toString().trim();
      var type = (tx.type || '').toString().trim();
      var desc = (tx.description && String(tx.description).trim()) || '';
      var cur = (tx.clientCurrency || tx.currency || 'EUR').toString().trim();
      var label = subtype || desc || type || 'Cargo adicional';
      if (subtype && type && subtype !== type) {
        lines.push(subtype + ' (' + type + ') — ' + amt + ' ' + cur);
      } else if (subtype && desc && subtype !== desc) {
        lines.push(subtype + ': ' + desc + ' — ' + amt + ' ' + cur);
      } else {
        lines.push(label + ' — ' + amt + ' ' + cur);
      }
    });
    return lines;
  }

  /** Bloque HTML de impuestos excluidos junto a una tarifa (certificación HB). */
  function excludedTaxesBesideRateHtml(offer) {
    var paid = (offer && offer.rateExtrasPaid) || [];
    if (!paid.length) return '';
    return (
      '<div class="hb-funnel-rate-taxes" aria-label="Impuestos y cargos no incluidos">' +
      '<strong>Impuestos / cargos no incluidos:</strong>' +
      '<ul class="hotelbeds-mini-list">' +
      paid
        .map(function (x) {
          return '<li>' + escapeHtml(x) + '</li>';
        })
        .join('') +
      '</ul></div>'
    );
  }

  /** Ofertas / promotions Hotelbeds junto a cada tarifa. */
  function promotionsBesideRateHtml(offer) {
    var promos = (offer && offer.promotions) || [];
    if (!promos.length) return '';
    return (
      '<div class="hb-funnel-rate-offers" aria-label="Ofertas Hotelbeds">' +
      '<strong>Oferta:</strong> ' +
      escapeHtml(promos.join(' · ')) +
      '</div>'
    );
  }

  /** Resumen corto de instalaciones Content (hotel + habitación), sin listar todo el catálogo. */
  function facilitiesSummaryHtml(meta, compact) {
    if (!meta) return '';
    var hotelF = Array.isArray(meta.hotelFacilities) ? meta.hotelFacilities : [];
    var roomF = Array.isArray(meta.roomFacilities) ? meta.roomFacilities : [];
    var max = compact ? 4 : 8;
    var bits = [];
    var i;
    for (i = 0; i < hotelF.length && bits.length < max; i++) {
      if (hotelF[i]) bits.push(String(hotelF[i]));
    }
    for (i = 0; i < roomF.length && bits.length < max; i++) {
      if (roomF[i] && bits.indexOf(String(roomF[i])) < 0) bits.push(String(roomF[i]));
    }
    if (!bits.length) return '';
    var more = hotelF.length + roomF.length > bits.length;
    return (
      '<p class="hotelbeds-facilities-summary" title="Instalaciones (Content API)">' +
      '<strong>Instalaciones:</strong> ' +
      escapeHtml(bits.join(' · ')) +
      (more ? '…' : '') +
      '</p>'
    );
  }

  function rateCommentsFromRate(rate) {
    var out = [];
    if (!rate) return out;
    var rc = rate.rateComments;
    if (typeof rc === 'string' && rc.trim()) {
      out.push(rc.trim());
      return out;
    }
    if (!Array.isArray(rc)) return out;
    rc.forEach(function (c) {
      if (typeof c === 'string') out.push(c);
      else if (c && c.text) out.push(c.text);
    });
    return out;
  }

  function roomNameFrom(room) {
    if (!room) return '';
    if (typeof room.name === 'string') return room.name.trim();
    if (room.name && room.name.content) return String(room.name.content).trim();
    return String(room.description || '').trim();
  }

  function formatPolicyDate(from) {
    if (!from) return '';
    var d = new Date(from);
    if (isNaN(d.getTime())) return String(from);
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function rateClassLabel(code) {
    var c = String(code || '').toUpperCase();
    if (!c) return '';
    if (c === 'NOR') return 'Tarifa normal (NOR)';
    if (c === 'NRF') return 'No reembolsable (NRF)';
    return 'Clase de tarifa ' + c;
  }

  function occupancyFromRate(rate) {
    if (!rate) return '';
    var rooms = rate.rooms != null ? parseInt(rate.rooms, 10) : 0;
    var adults = rate.adults != null ? parseInt(rate.adults, 10) : 0;
    var children = rate.children != null ? parseInt(rate.children, 10) : 0;
    if ((!rooms || !adults || children === 0) && rate.rateKey) {
      var fromKey = parseOccupancyFromRateKey(rate.rateKey);
      if (fromKey) {
        if (!rooms) rooms = fromKey.rooms;
        if (!adults) adults = fromKey.adults;
        if (!children) children = fromKey.children;
      }
    }
    if (!rooms && !adults) return '';
    var bits = [];
    if (rooms) bits.push(rooms + ' hab.');
    if (adults) bits.push(adults + (adults === 1 ? ' adulto' : ' adultos'));
    if (children) bits.push(children + (children === 1 ? ' niño' : ' niños'));
    return bits.join(', ');
  }

  function cancellationFingerprintFromRate(rate) {
    if (!rate || typeof rate !== 'object') return '';
    var pol = rate.cancellationPolicies;
    if (!Array.isArray(pol) || !pol.length) return '';
    return pol
      .map(function (p) {
        if (!p) return '';
        var from = formatPolicyDate(p.from || p.date || '');
        var nr = p.nonRefundable === true || p.nonRefundable === 'true' ? 'nr' : 'ref';
        return (from || 'sin-fecha') + '/' + nr;
      })
      .filter(Boolean)
      .join('|');
  }

  function cancellationFromRate(rate) {
    if (!rate || typeof rate !== 'object') return '';
    var pol = rate.cancellationPolicies;
    if (typeof pol === 'string') return pol.trim();
    if (!Array.isArray(pol)) return '';
    return pol
      .map(function (p) {
        if (!p) return '';
        if (typeof p === 'string') return p;
        if (p.text) return String(p.text).trim();
        var from = formatPolicyDate(p.from || p.date || '');
        var amount = p.amount != null ? p.amount : p.clientAmount;
        var cur = p.currency || 'EUR';
        if (from && amount != null) return 'Gastos de cancelación ' + amount + ' ' + cur + ' desde ' + from;
        if (from) return 'Cancelación desde ' + from;
        if (amount != null) return 'Gastos de cancelación ' + amount + ' ' + cur;
        return '';
      })
      .filter(Boolean)
      .join(' · ');
  }

  function promotionsFromRate(rate) {
    var out = [];
    if (!rate || !rate.promotions) return out;
    var list = Array.isArray(rate.promotions) ? rate.promotions : [rate.promotions];
    list.forEach(function (p) {
      if (!p) return;
      if (typeof p === 'string') {
        out.push(p);
        return;
      }
      var name = p.name ? String(p.name).trim() : '';
      var remark = p.remark ? String(p.remark).trim() : '';
      if (name && remark && name !== remark) out.push(name + ' — ' + remark);
      else if (name) out.push(name);
      else if (remark) out.push(remark);
      else if (p.code) out.push(String(p.code));
    });
    return out;
  }

  function ratePriceLabel(rate) {
    if (!rate) return '';
    var amt = rateRspAmount(rate);
    if (amt == null || amt === '') return '';
    return String(amt) + ' ' + (rate.currency || 'EUR');
  }

  /** Precio recomendado de venta (RSP) — obligatorio mostrar al cliente (certificación HB). */
  function rateRspAmount(rate) {
    if (!rate) return null;
    var amt =
      rate.sellingRate != null ? rate.sellingRate : rate.gross != null ? rate.gross : rate.net;
    if (amt == null || amt === '') return null;
    var n = parseFloat(amt);
    return isNaN(n) ? null : n;
  }

  /** Neto de compra (liquidación con Hotelbeds); no sustituye al RSP en UI. */
  function rateNetAmount(rate) {
    if (!rate) return null;
    var amt = rate.net != null ? rate.net : rate.sellingRate != null ? rate.sellingRate : rate.gross;
    if (amt == null || amt === '') return null;
    var n = parseFloat(amt);
    return isNaN(n) ? null : n;
  }

  /**
   * Hotelbeds «packaging» (glosario HB): tarifa pensada para venderse combinada con otro servicio;
   * no es lo mismo que «opaque» legal en sentido turístico, pero comparte la idea de paquete API.
   */
  function coarseRateKeyForPackaging(offer) {
    if (!offer) return '';
    return [
      String(offer.roomName || '').trim().toLowerCase(),
      String(offer.boardCode || offer.boardName || '').trim(),
    ].join('\u0001');
  }

  /** Neto de hotel que ve el cliente (tarifa empaquetada / la que se reserva en HB), no la de referencia lista. */
  function hotelStayNetForCustomer(offer) {
    if (!offer) return null;
    var book =
      offer.resumenHotelBookNet != null
        ? Number(offer.resumenHotelBookNet)
        : offer.netValue != null
          ? Number(offer.netValue)
          : null;
    if (book != null && isFinite(book) && book > 0) return Math.round(book * 100) / 100;
    var ref = offer.resumenHotelRefNet != null ? Number(offer.resumenHotelRefNet) : null;
    if (ref != null && isFinite(ref) && ref > 0) return Math.round(ref * 100) / 100;
    return null;
  }

  /** Precio total del paquete mostrado al cliente: green fees del grupo + alojamiento (tarifa HB de reserva). */
  function calcTotalPaquete(offer) {
    var gf = typeof window.__HB_GF_TOTAL__ === 'number' && isFinite(window.__HB_GF_TOTAL__) ? window.__HB_GF_TOTAL__ : null;
    if (gf == null) return null;
    var hotelNet = hotelStayNetForCustomer(offer);
    if (hotelNet == null) return null;
    return Math.round((gf + hotelNet) * 100) / 100;
  }

  function fmtEuros(n) {
    if (n == null || !isFinite(n)) return '';
    return n.toFixed(2).replace('.', ',');
  }

  function hbDebugTariffsEnabled() {
    return window.__HB_SHOW_TARIFF_DEBUG__ === true;
  }

  function buildPackagingGroups(offers) {
    var groups = {};
    (offers || []).forEach(function (o) {
      var k = coarseRateKeyForPackaging(o);
      if (!groups[k]) groups[k] = { hasPack: false, unpack: [], pack: [] };
      if (o.packaging) {
        groups[k].hasPack = true;
        groups[k].pack.push(o);
      } else {
        groups[k].unpack.push(o);
      }
    });
    var maxUnpackNetByKey = {};
    Object.keys(groups).forEach(function (k) {
      var maxN = null;
      groups[k].unpack.forEach(function (o) {
        var n = o.netValue;
        if (n != null && !isNaN(n) && (maxN == null || n > maxN)) maxN = n;
      });
      maxUnpackNetByKey[k] = maxN;
    });
    return { groups: groups, maxUnpackNetByKey: maxUnpackNetByKey };
  }

  function enrichOfferRefBook(offer, packagingGroups) {
    if (!offer) return offer;
    var k = coarseRateKeyForPackaging(offer);
    var refN = packagingGroups.maxUnpackNetByKey[k];
    if (offer.packaging) {
      offer.resumenHotelBookNet = offer.netValue;
      offer.resumenHotelRefNet = refN != null ? refN : offer.netValue;
    } else {
      offer.resumenHotelRefNet = offer.netValue;
      offer.resumenHotelBookNet = offer.netValue;
    }
    return offer;
  }

  function hbTariffDebugHtmlForOffer(offer) {
    if (!hbDebugTariffsEnabled() || !offer) return '';
    var book = hotelStayNetForCustomer(offer);
    var ref =
      offer.resumenHotelRefNet != null && isFinite(Number(offer.resumenHotelRefNet))
        ? Number(offer.resumenHotelRefNet)
        : null;
    var gf = typeof window.__HB_GF_TOTAL__ === 'number' && isFinite(window.__HB_GF_TOTAL__) ? window.__HB_GF_TOTAL__ : null;
    var html =
      '<span class="hb-tariff-debug">' +
      '<strong>HB empaquetada (reserva):</strong> ' +
      escapeHtml(book != null ? fmtEuros(book) + ' €' : '—');
    if (ref != null) {
      html += ' · <strong>HB no empaq. (ref):</strong> ' + escapeHtml(fmtEuros(ref) + ' €');
      if (book != null) {
        var delta = Math.round((ref - book) * 100) / 100;
        html +=
          ' · <strong>Δ estancia:</strong> ' +
          escapeHtml(fmtEuros(delta) + ' €');
      }
    }
    if (gf != null && book != null) {
      html +=
        ' · <strong>Paquete (GF+empaq.):</strong> ' +
        escapeHtml(fmtEuros(gf + book) + ' €');
      if (ref != null) {
        html +=
          ' · <strong>Paquete (GF+ref):</strong> ' +
          escapeHtml(fmtEuros(gf + ref) + ' €');
      }
    }
    html +=
      ' · <code>packaging=' +
      (offer.packaging ? 'true' : 'false') +
      '</code></span>';
    return html;
  }

  function ensureHbTariffDebugBanner() {
    var root = getContainer();
    if (!root) return;
    var id = 'hb-tariff-debug-banner';
    var el = document.getElementById(id);
    if (!hbDebugTariffsEnabled()) {
      if (el) el.remove();
      document.body.classList.remove('hb-tariff-debug-on');
      return;
    }
    document.body.classList.add('hb-tariff-debug-on');
    var msg =
      '<strong>Modo debug tarifas HB (F4)</strong> — Empaquetada = lo que reserva el cliente. No empaq. = tarifa lista API (referencia). ' +
      'En el funnel se listan todas las tarifas devueltas por disponibilidad.';
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = 'hb-tariff-debug-banner';
      el.setAttribute('role', 'status');
      root.insertBefore(el, root.firstChild);
    }
    el.innerHTML = msg;
  }

  function refreshHbTariffDebugViews() {
    ensureHbTariffDebugBanner();
    var host = document.getElementById('hb-hotel-funnel-inline');
    var form = getForm();
    if (host && form) {
      var code = (form.querySelector('input[name="hb_selected_hotel_code"]') || {}).value || '';
      if (code) {
        var rk = getSelectedRateKeyFromFunnel(host, form);
        renderFunnelRateChoices(host, code, rk, { skipValidationSync: true });
      }
    }
    refreshHotelCardPackagePrices();
    if (typeof window.actualizarResumen === 'function') window.actualizarResumen();
  }

  function toggleHbDebugTariffs() {
    window.__HB_SHOW_TARIFF_DEBUG__ = !hbDebugTariffsEnabled();
    refreshHbTariffDebugViews();
  }

  /** Si hay tarifa empaquetada y otra no empaquetada para la misma habitación+régimen+clase, oculta la no empaquetada y guarda su net como referencia de resumen (margen vs lo que se reserva). */
  function preferPackagingOffersAndAttachRef(offers) {
    var packagingGroups = buildPackagingGroups(offers);
    var groups = packagingGroups.groups;
    var out = [];
    (offers || []).forEach(function (o) {
      var k = coarseRateKeyForPackaging(o);
      var g = groups[k];
      if (o.packaging) {
        enrichOfferRefBook(o, packagingGroups);
        out.push(o);
        return;
      }
      if (!g.hasPack) {
        enrichOfferRefBook(o, packagingGroups);
        out.push(o);
      }
    });
    out.sort(function (a, b) {
      var an = offerSortPrice(a);
      var bn = offerSortPrice(b);
      return an - bn;
    });
    return out;
  }

  function rateOfferFingerprint(offer) {
    if (!offer) return '';
    return [
      offer.roomName || '',
      offer.boardCode || offer.boardName || '',
      offer.rateClass || '',
      offer.packaging ? '1' : '0',
      offer.cancelFingerprint || '',
      offer.rateCommentsId || '',
      (offer.promotions || []).join('\u001f'),
      (offer.rateComments || []).join('\u001f'),
      offer.paymentType || '',
      offer.allotment || '',
      offer.occupancyLabel || '',
      (offer.rateExtrasPaid || []).join('\u001f'),
    ].join('|');
  }

  function dedupeSimilarRateOffers(offers) {
    var best = {};
    var omitted = 0;
    (offers || []).forEach(function (o) {
      var fp = rateOfferFingerprint(o);
      var existing = best[fp];
      if (!existing) {
        best[fp] = o;
        return;
      }
      omitted++;
      var en = existing.netValue;
      var on = o.netValue;
      if (on != null && en != null && on < en) {
        best[fp] = o;
      } else if (on != null && en == null) {
        best[fp] = o;
      }
    });
    var out = Object.keys(best).map(function (k) {
      return best[k];
    });
    out.sort(function (a, b) {
      var an = offerSortPrice(a);
      var bn = offerSortPrice(b);
      return an - bn;
    });
    return { offers: out, omitted: omitted };
  }

  function rateOfferListHint(offer) {
    if (!offer) return '';
    var parts = [];
    if (offer.occupancyLabel) {
      parts.push('Precio para ' + offer.occupancyLabel + ' (total estancia)');
    }
    if (offer.rateClass) parts.push(rateClassLabel(offer.rateClass));
    if (offer.allotment != null && offer.allotment !== '') {
      parts.push('Cupo HB ' + offer.allotment);
    }
    if (offer.packaging) {
      parts.push('Tarifa paquete Hotelbeds (combinable con otros servicios en el mismo pedido)');
    } else {
      parts.push('Tarifa de alojamiento estándar (sin flag paquete HB)');
    }
    if (offer.rateCommentsId) parts.push('Ref. condiciones HB ' + offer.rateCommentsId);
    if (offer.cancellation) {
      parts.push(offer.cancellation);
    } else {
      parts.push('Cancelación no detallada en el listado');
    }
    if (offer.promotions && offer.promotions.length) {
      parts.push(offer.promotions.join(', '));
    }
    if (offer.rateComments && offer.rateComments.length) {
      parts.push(offer.rateComments.join(' · '));
    } else if (offer.rateCommentsId) {
      parts.push('Texto legal completo tras «' + hbFunnelConditionsButtonText() + '»');
    }
    if (offer.rateExtrasPaid && offer.rateExtrasPaid.length) {
      parts.push(offer.rateExtrasPaid.join(' · '));
    }
    if (offer.paymentType) {
      parts.push('Pago: ' + offer.paymentType);
    }
    return truncateText(parts.join(' · '), 280);
  }

  function funnelRatePickSubhint(offer) {
    if (!offer) return '';
    var parts = [];
    if (offer.occupancyLabel) parts.push('Ocupación: ' + offer.occupancyLabel);
    if (offer.allotment != null && offer.allotment !== '') parts.push('Cupo HB ' + offer.allotment);
    if (offer.rateRooms != null && offer.rateAdults != null) {
      var occTarifa =
        'Ocupación tarifa: ' +
        offer.rateRooms +
        ' hab., ' +
        offer.rateAdults +
        (offer.rateAdults === 1 ? ' adulto' : ' adultos');
      if (offer.rateChildren != null && offer.rateChildren > 0) {
        occTarifa +=
          ', ' +
          offer.rateChildren +
          (offer.rateChildren === 1 ? ' niño' : ' niños') +
          (offer.rateRooms > 1 ? '/hab.' : '');
      }
      parts.push(occTarifa);
    }
    if (!rateHasSufficientAllotment(offer, { rooms: offer.rateRooms || 1 })) {
      parts.push('⚠ Cupo bajo para varias habitaciones');
    }
    if (offer.packaging) parts.push('Tarifa paquete Hotelbeds (packaging=true)');
    else parts.push('Tarifa estándar API (packaging=false)');
    if (offer.promotions && offer.promotions.length) {
      parts.push('Oferta: ' + offer.promotions.join(', '));
    }
    var total = calcTotalPaquete(offer);
    if (total != null) {
      parts.push('Total paquete mostrado (GF + empaquetada): ' + fmtEuros(total) + ' €');
    } else {
      parts.push('Importe del paquete (habitación + green fees) en el resumen al confirmar');
    }
    return truncateText(parts.join(' · '), hbDebugTariffsEnabled() ? 520 : 280);
  }

  function funnelRatePickLabel(offer) {
    if (!offer) return '';
    var label = (offer.roomName || 'Habitación') + ' · ' + (offer.boardName || offer.boardCode || 'Régimen') + ' · ' + offer.rateType;
    if (offer.rateClass) label += ' · ' + rateClassLabel(offer.rateClass);
    return label;
  }

  function mapRateOffer(room, rate) {
    var offer = {
      rateKey: String(rate.rateKey),
      rateType: String(rate.rateType || 'BOOKABLE').toUpperCase(),
      roomName: roomNameFrom(room),
      boardCode: rate.boardCode || '',
      boardName: boardFullFromRate(rate),
      price: ratePriceLabel(rate),
      rateExtrasPaid: paidExtrasFromRate(rate),
      rateComments: rateCommentsFromRate(rate),
      cancellation: cancellationFromRate(rate),
      cancelFingerprint: cancellationFingerprintFromRate(rate),
      promotions: promotionsFromRate(rate),
      paymentType: rate.paymentType ? String(rate.paymentType) : '',
      rateClass: rate.rateClass ? String(rate.rateClass) : '',
      allotment: rate.allotment != null && rate.allotment !== '' ? String(rate.allotment) : '',
      packaging: rate.packaging === true || rate.packaging === 'true',
      rateCommentsId: rate.rateCommentsId ? String(rate.rateCommentsId) : '',
      occupancyLabel: occupancyFromRate(rate),
      rateRooms: rate.rooms != null && rate.rooms !== '' ? parseInt(rate.rooms, 10) : null,
      rateAdults: rate.adults != null && rate.adults !== '' ? parseInt(rate.adults, 10) : null,
      rateChildren:
        rate.children != null && rate.children !== '' ? parseInt(rate.children, 10) : null,
      netValue: rateNetAmount(rate),
      rspValue: rateRspAmount(rate),
    };
    // Completar siempre desde rateKey: a veces HB manda rooms/adults pero children=0/null
    // y el label sí muestra niños (occupancyFromRate ya mezcla rateKey).
    var occKey = parseOccupancyFromRateKey(offer.rateKey);
    if (occKey) {
      if (offer.rateRooms == null) offer.rateRooms = occKey.rooms;
      if (offer.rateAdults == null) offer.rateAdults = occKey.adults;
      if (offer.rateChildren == null || (offer.rateChildren === 0 && occKey.children > 0)) {
        offer.rateChildren = occKey.children;
      }
    }
    offer.listHint = rateOfferListHint(offer);
    return offer;
  }

  function hotelHasBookableOffers(hotel) {
    return collectRateOffersFromHotel(hotel).length > 0;
  }

  function collectRateOffersFromHotel(hotel) {
    var offers = [];
    if (!hotel || !hotel.rooms) return offers;
    hotel.rooms.forEach(function (room) {
      var rates = room.rates || [];
      rates.forEach(function (rate) {
        if (!rate || !rate.rateKey) return;
        offers.push(mapRateOffer(room, rate));
      });
    });
    var deduped = dedupeSimilarRateOffers(offers);
    var packagingGroups = buildPackagingGroups(deduped.offers);
    if (hotel && hotel.code != null) {
      var codeKey = String(hotel.code);
      window.__HB_RATE_OFFERS_ALL_BY_CODE__ = window.__HB_RATE_OFFERS_ALL_BY_CODE__ || {};
      window.__HB_RATE_OFFERS_ALL_BY_CODE__[codeKey] = deduped.offers.map(function (o) {
        return enrichOfferRefBook(Object.assign({}, o), packagingGroups);
      });
    }
    var packed = preferPackagingOffersAndAttachRef(deduped.offers);
    if (hotel && hotel.code != null) {
      window.__HB_RATE_OFFERS_OMITTED__ = window.__HB_RATE_OFFERS_OMITTED__ || {};
      window.__HB_RATE_OFFERS_OMITTED__[String(hotel.code)] =
        deduped.omitted + Math.max(0, deduped.offers.length - packed.length);
    }
    return packed;
  }

  function getFunnelOffersForDisplay(hotelCode) {
    var key = String(hotelCode || '');
    if (hbDebugTariffsEnabled()) {
      var all = (window.__HB_RATE_OFFERS_ALL_BY_CODE__ || {})[key];
      if (all && all.length) return all;
    }
    return (window.__HB_RATE_OFFERS_BY_CODE__ || {})[key] || [];
  }

  function findHotelInAvailability(av, hotelCode) {
    var hotels = (av && av.hotels && av.hotels.hotels) || (av && av.data && av.data.hotels && av.data.hotels.hotels) || [];
    if (!Array.isArray(hotels)) return null;
    var wanted = String(hotelCode || '');
    for (var i = 0; i < hotels.length; i++) {
      if (hotels[i] && String(hotels[i].code || '') === wanted) return hotels[i];
    }
    return null;
  }

  function parseHotelMinRate(h) {
    return getHotelLowestRate(h);
  }

  /** Precio más bajo entre minRate y todas las tarifas BOOKABLE de la respuesta availability. */
  function getHotelLowestRate(h) {
    if (!h) return null;
    var min = null;
    function consider(n) {
      if (n == null || !isFinite(n)) return;
      if (min == null || n < min) min = n;
    }
    if (h.minRate != null) consider(parseFloat(h.minRate));
    var rooms = h.rooms || [];
    for (var ri = 0; ri < rooms.length; ri++) {
      var rates = rooms[ri].rates || [];
      for (var rj = 0; rj < rates.length; rj++) {
        var rr = rates[rj];
        if (!rr || !rr.rateKey) continue;
        consider(parseFloat(rr.net || rr.gross || rr.sellingRate));
      }
    }
    return min;
  }

  function getNochesFromForm() {
    var noches = 1;
    try {
      var fdTmp = getFormData();
      var nTmp = fdTmp && fdTmp.get ? parseInt(fdTmp.get('noches') || '1', 10) : 1;
      if (nTmp && nTmp > 0) noches = nTmp;
    } catch (e0) { /* ignore */ }
    return noches;
  }

  function formatHotelListPriceStr(rate, noches) {
    if (rate == null) return null;
    var total = Math.round(rate * 100) / 100;
    if (noches >= 2) {
      var pn = Math.round((total / noches) * 100) / 100;
      return fmtEuros(total) + ' € (estancia) · ' + fmtEuros(pn) + ' €/noche';
    }
    return 'desde ' + fmtEuros(total) + ' € (estancia)';
  }

  /** Precio mínimo solo alojamiento (sin green fees del grupo). */
  function getHotelLowestStayNet(h) {
    if (!h) return null;
    var offers = collectRateOffersFromHotel(h);
    var min = null;
    for (var i = 0; i < offers.length; i++) {
      var n = hotelStayNetForCustomer(offers[i]);
      if (n != null && (min == null || n < min)) min = n;
    }
    if (min == null) {
      var rate = getHotelLowestRate(h);
      if (rate != null && isFinite(rate)) min = Math.round(rate * 100) / 100;
    }
    return min;
  }

  /** Precio mínimo del paquete (green fees del grupo + alojamiento) para un hotel. */
  function getHotelLowestPackageTotal(h) {
    if (!h) return null;
    var gf =
      typeof window.__HB_GF_TOTAL__ === 'number' && isFinite(window.__HB_GF_TOTAL__)
        ? window.__HB_GF_TOTAL__
        : null;
    var stay = getHotelLowestStayNet(h);
    if (gf == null || stay == null) return null;
    return Math.round((gf + stay) * 100) / 100;
  }

  /** GF una vez + suma alojamiento de cada hotel (reparto multi-hotel). */
  function calcSplitComboPackageTotal(segments) {
    if (!segments || !segments.length) return null;
    var gf =
      typeof window.__HB_GF_TOTAL__ === 'number' && isFinite(window.__HB_GF_TOTAL__)
        ? window.__HB_GF_TOTAL__
        : null;
    if (gf == null) return null;
    var hotelSum = 0;
    var anyStay = false;
    segments.forEach(function (s) {
      var n = s.pkgStay != null ? s.pkgStay : getHotelLowestStayNet(s.hotel);
      if (n != null && isFinite(n)) {
        hotelSum += n;
        anyStay = true;
      }
    });
    if (!anyStay) return null;
    return Math.round((gf + hotelSum) * 100) / 100;
  }

  /** Leyenda en tarjeta de hotel: solo precio de paquete, nunca solo estancia. */
  function formatHotelPackageListPriceStr(pkgTotal) {
    if (pkgTotal == null || !isFinite(pkgTotal)) return null;
    return 'desde ' + fmtEuros(Math.round(pkgTotal * 100) / 100) + ' € (paquete · green fees incluidos)';
  }

  function refreshFunnelRatePackagePrices() {
    var host = document.getElementById('hb-hotel-funnel-inline');
    if (!host || host.offsetParent === null) return;
    var form = getForm();
    if (!form) return;
    var hotelCode = (form.querySelector('input[name="hb_selected_hotel_code"]') || {}).value || '';
    if (!hotelCode) return;
    var priorKey = (form.querySelector('input[name="hb_selected_rate_key"]') || {}).value || '';
    var offers = getFunnelOffersForDisplay(hotelCode);
    if (!offers.length) return;
    var byKey = {};
    offers.forEach(function (o) {
      if (o && o.rateKey) byKey[o.rateKey] = o;
    });
    host.querySelectorAll('input[name="hb-funnel-rate-pick"]').forEach(function (radio) {
      var o = byKey[radio.value];
      if (!o) return;
      var pkgTotal = calcTotalPaquete(o);
      var label = radio.closest('.hb-funnel-rate-pick');
      if (!label) return;
      var priceEl = label.querySelector('.hb-funnel-rate-price');
      if (priceEl && pkgTotal != null) priceEl.textContent = fmtEuros(pkgTotal) + ' €';
      var sub = label.querySelector('.hb-funnel-rate-pick__sub');
      if (sub) sub.textContent = funnelRatePickSubhint(o);
    });
    if (!priorKey) {
      renderFunnelRateChoices(host, hotelCode, '', { skipValidationSync: true });
    }
  }

  /** Sincroniza precios ocultos del resumen desde la tarifa HB actual (p. ej. antes de calcular el total). */
  function syncHbResumenFromCurrentOffer(form) {
    if (!form) return;
    ensureHotelFunnelHiddenInputs(form);
    var splitReady = getSplitBookings(form).filter(function (b) {
      return b && b.ready;
    });
    if (splitReady.length > 0) {
      applySplitBookingsToResumen(form);
      return;
    }
    var code = (form.querySelector('input[name="hb_selected_hotel_code"]') || {}).value || '';
    var rk = (form.querySelector('input[name="hb_selected_rate_key"]') || {}).value || '';
    if (!code || !rk) return;
    var offers = (window.__HB_RATE_OFFERS_BY_CODE__ || {})[String(code)] || [];
    for (var i = 0; i < offers.length; i++) {
      if (offers[i].rateKey === rk) {
        syncHbResumenPriceHidden(form, offers[i]);
        return;
      }
    }
  }

  function refreshHotelCardPackagePrices() {
    document.querySelectorAll('.hotelbeds-card[data-hb-hotel-code]').forEach(function (card) {
      var code = card.getAttribute('data-hb-hotel-code');
      if (!code) return;
      var hotel = findHotelInAvailability(window.__HB_LAST_AVAIL__, code);
      var span = card.querySelector('.hotelbeds-price');
      if (!span) return;
      var pkg = hotel ? getHotelLowestPackageTotal(hotel) : null;
      if (pkg != null) {
        span.textContent = formatHotelPackageListPriceStr(pkg) || '';
        span.classList.remove('hotelbeds-price--package-note');
      }
      if (hbDebugTariffsEnabled() && hotel) {
        var offers = (window.__HB_RATE_OFFERS_ALL_BY_CODE__ || {})[code] || [];
        var bestPack = null;
        var bestRef = null;
        offers.forEach(function (o) {
          var b = hotelStayNetForCustomer(o);
          var r = o.resumenHotelRefNet != null ? Number(o.resumenHotelRefNet) : null;
          if (b != null && (bestPack == null || b < bestPack.book)) bestPack = { book: b, o: o };
          if (r != null && (bestRef == null || r < bestRef.ref)) bestRef = { ref: r, o: o };
        });
        var dbg = card.querySelector('.hotelbeds-price-debug');
        if (!dbg) {
          dbg = document.createElement('div');
          dbg.className = 'hotelbeds-price-debug';
          span.parentNode.appendChild(dbg);
        }
        var dbgHtml = '';
        if (bestPack) {
          dbgHtml += 'Empaq. desde ' + fmtEuros(bestPack.book) + ' €';
        }
        if (bestRef && bestRef.ref !== (bestPack && bestPack.book)) {
          dbgHtml += (dbgHtml ? ' · ' : '') + 'No empaq. desde ' + fmtEuros(bestRef.ref) + ' €';
        }
        dbg.textContent = dbgHtml;
      } else {
        var oldDbg = card.querySelector('.hotelbeds-price-debug');
        if (oldDbg) oldDbg.remove();
      }
    });
    getSplitCombos().forEach(function (combo) {
      combo.totalPkg = calcSplitComboPackageTotal(combo.segments);
    });
    document.querySelectorAll('.hotelbeds-card--split-combo').forEach(function (card) {
      var cid = card.getAttribute('data-hb-split-combo-id');
      var combo = getSplitComboById(cid);
      var span = card.querySelector('.hotelbeds-price');
      if (!combo || !span) return;
      if (combo.totalPkg != null && isFinite(combo.totalPkg)) {
        span.textContent = fmtEuros(combo.totalPkg) + ' € (paquete · green fees incluidos)';
      }
    });
  }

  function hydrateRateOffersFromLastAvailability(hotelCode, funnelOcc) {
    var key = String(hotelCode || '');
    if (!key) return false;
    var offersBy = window.__HB_RATE_OFFERS_BY_CODE__ || {};
    if (offersBy[key] && offersBy[key].length) return true;
    var listOcc = window.__HB_LAST_AVAIL_OCC__;
    // No rellenar con tarifas del listado si la ocupación del funnel no coincide (p.ej. con niños).
    if (funnelOcc && listOcc && occCacheSignature(funnelOcc) !== occCacheSignature(listOcc)) {
      return false;
    }
    var hotel = findHotelInAvailability(window.__HB_LAST_AVAIL__, key);
    if (!hotel) return false;
    var offers = collectRateOffersFromHotel(hotel);
    if (!offers.length) return false;
    offersBy[key] = offers;
    window.__HB_RATE_OFFERS_BY_CODE__ = offersBy;
    try {
      var fdH = getFormData();
      if (fdH) {
        var coH = getCheckInCheckOut(fdH);
        if (coH) {
          var occH = listOcc || getListOccupancyForAvailability(fdH);
          markHbFunnelOffersCached(hotelCode, coH, occH);
        }
      }
    } catch (eH) { /* ignore */ }
    return true;
  }

  /** Códigos típicos de cuota / rate limit (Hotelbeds y similares). */
  function hbQuotaErrorCode(code) {
    var c = String(code || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');
    if (!c) return false;
    return (
      c === 'QUOTA_EXCEEDED' ||
      c === 'RATE_LIMIT_EXCEEDED' ||
      c === 'TOO_MANY_REQUESTS' ||
      c === 'MAX_REQUESTS_EXCEEDED' ||
      c === 'THROTTLED' ||
      c === 'THROTTLE' ||
      /^RATE[_-]?LIMIT/.test(c) ||
      /QUOTA[_-]?EXCEED|EXCEED(?:ED)?[_-]?QUOTA/.test(c)
    );
  }

  /**
   * Cuota / rate limit real de Hotelbeds.
   * - HTTP 429 → rate limit  (siempre)
   * - HTTP 403 + texto "quota exceeded" → cuota agotada (Hotelbeds usa 403 para cuota diaria/mensual)
   * - error.code explícito en la lista de cuota → cuota
   * - Si hay code explícito que NO es cuota → no es cuota (evita falso positivo)
   * - Heurísticas de texto solo en mensajes cortos (evita match accidental en JSON serializado)
   */
  function isHbQuotaLikeMessage(msg, envelope) {
    envelope = envelope || {};
    var http =
      envelope.hotelbedsHttpStatus != null ? envelope.hotelbedsHttpStatus : envelope.httpStatus;
    var httpNum = Number(http);
    if (httpNum === 429) return true;

    var hbRoot = envelope.hotelbeds || envelope.data;
    var errObj = hbRoot && hbRoot.error;
    if (errObj && typeof errObj === 'object') {
      var cTop = errObj.code != null ? String(errObj.code).trim() : '';
      if (cTop && hbQuotaErrorCode(cTop)) return true;
      if (cTop && !hbQuotaErrorCode(cTop)) {
        var msgLow = String(errObj.message || '').toLowerCase();
        if (httpNum === 403 && /quota\s+exceeded|quota\s+reached|quota\s+limit|exceed.*quota/i.test(msgLow)) {
          return true;
        }
        return false;
      }
    }

    var s = String(msg || '').trim();
    if (!s) return false;

    var prefix = /^([A-Za-z0-9_]+)\s*[—:-]\s*/.exec(s);
    if (prefix) {
      if (hbQuotaErrorCode(prefix[1])) return true;
      if (httpNum !== 429 && httpNum !== 403) return false;
    }

    if (s.length > 600) return false;

    var lower = s.toLowerCase();
    if (/\b429\b/.test(lower)) return true;
    if (/too\s+many\s+requests/.test(lower)) return true;
    if (/rate[\s_-]*limit|ratelimit|rate\s+exceeded/i.test(s)) return true;
    if (/throttl/i.test(lower)) return true;
    if (/cuota\s+de\s+consultas|consultas\s+superad|peticiones\s+excedid/i.test(lower)) return true;
    if (/\bquota_exceeded\b|\brate_limit_exceeded\b|\btoo_many_requests\b/i.test(lower)) return true;
    if (httpNum === 403 && /quota\s+exceeded|quota\s+reached|quota\s+limit|exceed.*quota/i.test(lower)) return true;
    if (
      /_quota|quota_exceed|exceed(?:ed)?\s+quota|quota\s+(?:exceed|reached|limit)|api\s+quota|request\s+quota|daily\s+quota|service\s+quota/i.test(
        lower
      )
    ) {
      return true;
    }
    if (/\bquotas?\b\s*(?:exceed|reached|limit|max)|(?:exceed|reached|limit|max)\s+.{0,48}\bquotas?\b/i.test(lower)) {
      return true;
    }
    return false;
  }

  function humanizeHotelbedsError(msg, envelope) {
    var s = String(msg || '').trim();
    if (!s) return s;
    if (isHbQuotaLikeMessage(s, envelope || {})) {
      return 'Cuota de consultas Hotelbeds superada. Espera unos minutos e inténtalo de nuevo.';
    }
    if (/insufficient\s+allotment/i.test(s)) {
      return (
        'Cupo agotado para esa tarifa (stock muy bajo o ya reservado). ' +
        'Elige otra tarifa u hotel, pulsa «Ver condiciones (Hotelbeds)» y «Confirmar hotel» justo antes de pagar.'
      );
    }
    if (/price\s+change|price\s+difference|tolerance/i.test(s)) {
      return 'El precio de la tarifa cambió. Vuelve a «Ver condiciones (Hotelbeds)» y confirma de nuevo.';
    }
    return s;
  }

  /** allotment HB suele ser nº de habitaciones disponibles a ese precio. */
  function rateHasSufficientAllotment(offer, occ) {
    if (!offer || offer.allotment == null || offer.allotment === '') return true;
    var allotment = parseInt(String(offer.allotment), 10);
    if (!Number.isFinite(allotment) || allotment < 1) return true;
    var roomsNeeded = Math.max(1, (occ && occ.rooms) || 1);
    return allotment >= roomsNeeded;
  }

  function getHbFunnelOffersKey(checkInOut, occ, hotelCode) {
    if (!checkInOut || !checkInOut.checkIn) return '';
    return buildAvailCacheKey(checkInOut.checkIn, checkInOut.checkOut, occ, hotelCode);
  }

  function markHbFunnelOffersCached(hotelCode, checkInOut, occ) {
    var k = String(hotelCode || '');
    if (!k) return;
    var key = getHbFunnelOffersKey(checkInOut, occ, hotelCode);
    if (!key) return;
    window.__HB_FUNNEL_OFFERS_KEY_BY_HOTEL__ = window.__HB_FUNNEL_OFFERS_KEY_BY_HOTEL__ || {};
    window.__HB_FUNNEL_OFFERS_KEY_BY_HOTEL__[k] = key;
  }

  function hbFunnelOffersCacheMatches(hotelCode, checkInOut, occ) {
    var k = String(hotelCode || '');
    var map = window.__HB_FUNNEL_OFFERS_KEY_BY_HOTEL__;
    if (!k || !map) return false;
    var want = getHbFunnelOffersKey(checkInOut, occ, hotelCode);
    return want && map[k] === want;
  }

  /**
   * Personas/Grupo = tamaño total del grupo (adultos + niños).
   * Niños se restan: grupo 4 + 2 niños ⇒ 2 adultos + 2 niños.
   */
  function splitPartyIntoAdultsAndChildren(partySize, childrenWanted) {
    var party = clamp(getInt(partySize, 2), 1, 54);
    var kids = clamp(getInt(childrenWanted, 0), 0, 6);
    if (kids > party - 1) kids = Math.max(0, party - 1);
    var adults = Math.max(1, party - kids);
    return { partySize: party, adults: adults, children: kids };
  }

  function getFunnelOccupancyForAvailability(form, adultsInp, roomsInp, childrenInp, adultsDefault, roomsDefault) {
    var partySize = clamp(getInt(adultsInp && adultsInp.value, adultsDefault), 1, 54);
    var rooms = clamp(getInt(roomsInp && roomsInp.value, roomsDefault), 1, 20);
    var childrenWanted = clamp(getInt(childrenInp && childrenInp.value, 0), 0, 6);
    var split = splitPartyIntoAdultsAndChildren(partySize, childrenWanted);
    var host = document.getElementById('hb-hotel-funnel-inline');
    var childAges = host ? readChildAgesFromFunnel(host) : [];
    while (childAges.length < split.children) childAges.push(8);
    if (childAges.length > split.children) childAges = childAges.slice(0, split.children);
    // No recalcular habitaciones al añadir niños: se mantienen las del grupo / las que elija el usuario.
    var occ = normalizeHbOccupancy({
      totalAdults: split.adults,
      rooms: rooms,
      children: split.children,
      childAges: childAges,
    });
    occ.partySize = split.partySize;
    if (!form) return occ;
    var listOcc = window.__HB_LAST_AVAIL_OCC__;
    if (!listOcc) return occ;
    if (occCacheSignature(listOcc) === occCacheSignature(occ)) {
      return listOcc;
    }
    return occ;
  }

  function fetchFunnelAvailabilityOffers(hotelCode, checkInOut, occ) {
    var base = window.location.origin || '';
    var cacheKey = buildAvailCacheKey(checkInOut.checkIn, checkInOut.checkOut, occ, hotelCode);

    function requestAvailability() {
      var occPayload = occToAvailabilityPayload(occ);
      return fetchJson(base + '/api/hotelbeds-availability', Object.assign(
        {
          checkIn: checkInOut.checkIn,
          checkOut: checkInOut.checkOut,
          hotelCodes: [String(hotelCode)],
        },
        occPayload
      )).then(function (av) {
        if (!av || av.error) {
          var rawErr =
            av && av.error
              ? typeof av.error === 'string'
                ? av.error
                : av.error && av.error.message
                  ? String(av.error.message)
                  : String(av.error)
              : '';
          console.warn(
            '[Hotelbeds] Error funnel availability — msg:', rawErr,
            '| HTTP:', av && av.hotelbedsHttpStatus,
            '| code:', av && av.hotelbeds && av.hotelbeds.error && av.hotelbeds.error.code,
            '| rawHb:', JSON.stringify((av && av.hotelbeds) || null)
          );
          if (isHbQuotaLikeMessage(rawErr, av)) {
            throw new Error(
              'Cuota de consultas Hotelbeds superada. Espera unos minutos o revisa el límite en tu cuenta.'
            );
          }
          throw new Error(rawErr || 'Availability sin respuesta válida');
        }
        if (findHotelInAvailability(av, hotelCode)) {
          window.__HB_FUNNEL_LAST__ = { key: cacheKey, av: av };
        } else if (window.__HB_FUNNEL_LAST__ && window.__HB_FUNNEL_LAST__.key === cacheKey) {
          window.__HB_FUNNEL_LAST__ = null;
        }
        return av;
      });
    }

    var cached = window.__HB_FUNNEL_LAST__;

    function lastAvailMatchesFunnel() {
      if (!window.__HB_LAST_AVAIL__) return false;
      var r = window.__HB_LAST_AVAIL_RANGE__;
      if (!r || r.checkIn !== checkInOut.checkIn || r.checkOut !== checkInOut.checkOut) return false;
      var o = window.__HB_LAST_AVAIL_OCC__;
      if (!o || occCacheSignature(o) !== occCacheSignature(occ)) return false;
      return true;
    }

    var avPromise;
    if (cached && cached.key === cacheKey && findHotelInAvailability(cached.av, hotelCode)) {
      avPromise = Promise.resolve(cached.av);
    } else if (lastAvailMatchesFunnel()) {
      avPromise = Promise.resolve(window.__HB_LAST_AVAIL__);
    } else {
      avPromise = requestAvailability();
    }

    function tryWidenAvailabilityForHotel() {
      var want = String(hotelCode || '');
      if (!want) return Promise.resolve(null);
      var widenKey = [checkInOut.checkIn, checkInOut.checkOut, occCacheSignature(occ)].join('|');

      var lr = window.__HB_LAST_AVAIL_RANGE__;
      var lo = window.__HB_LAST_AVAIL_OCC__;
      var lastAvailIsWidenEquivalent =
        window.__HB_LAST_AVAIL__ &&
        lr && lr.checkIn === checkInOut.checkIn && lr.checkOut === checkInOut.checkOut &&
        lo && occCacheSignature(lo) === occCacheSignature(occ);
      if (lastAvailIsWidenEquivalent) {
        return Promise.resolve(findHotelInAvailability(window.__HB_LAST_AVAIL__, want) || null);
      }

      var cache = window.__HB_WIDEN_AVAIL_CACHE__;
      if (cache && cache.key === widenKey && cache.av && !cache.av.error) {
        var h0 = findHotelInAvailability(cache.av, want);
        if (h0) return Promise.resolve(h0);
      }
      var codes = getDisplayedHotelCodesFromLastAvail();
      if (!codes.length) codes = getBrgHotelCodeList();
      var fetchWiden =
        codes.length > 0
          ? fetchHotelbeds(checkInOut.checkIn, checkInOut.checkOut, codes, occ)
          : Promise.resolve(null);
      return fetchWiden.then(function (av) {
        if (!av) return null;
        if (av.error) {
          var msg =
            typeof av.error === 'string'
              ? av.error
              : av.error && av.error.message
                ? String(av.error.message)
                : '';
          if (isHbQuotaLikeMessage(msg, av)) {
            throw new Error(
              'Cuota de consultas Hotelbeds superada. Espera unos minutos o revisa el límite en tu cuenta.'
            );
          }
          if (msg) {
            throw new Error(msg);
          }
          return null;
        }
        window.__HB_WIDEN_AVAIL_CACHE__ = { key: widenKey, av: av };
        return findHotelInAvailability(av, want) || null;
      });
    }

    return avPromise.then(function (av) {
      var hotel = findHotelInAvailability(av, hotelCode);
      // Solo reutilizar el listado si la ocupación es la misma (si no, se colaban tarifas sin niños).
      if (!hotel) {
        var listOccFb = window.__HB_LAST_AVAIL_OCC__;
        if (listOccFb && occCacheSignature(listOccFb) === occCacheSignature(occ)) {
          hotel = findHotelInAvailability(window.__HB_LAST_AVAIL__, hotelCode);
        }
      }
      if (!hotel) {
        return tryWidenAvailabilityForHotel().then(function (h2) {
          if (h2) {
            var offersW = collectRateOffersFromHotel(h2);
            if (!offersW.length) throw new Error('No hay tarifas para esa ocupación.');
            if (!offersMatchRequestedChildren(offersW, occ)) {
              throw new Error(
                'Hotelbeds no devolvió tarifas con niños para esta ocupación. Prueba 1 habitación o otras fechas.'
              );
            }
            window.__HB_RATE_OFFERS_BY_CODE__ = window.__HB_RATE_OFFERS_BY_CODE__ || {};
            window.__HB_RATE_OFFERS_BY_CODE__[String(hotelCode)] = offersW;
            markHbFunnelOffersCached(hotelCode, checkInOut, occ);
            return offersW;
          }
          var listOcc = window.__HB_LAST_AVAIL_OCC__;
          var occMismatch = listOcc && occCacheSignature(listOcc) !== occCacheSignature(occ);
          if (occMismatch) {
            throw new Error(
              'Sin disponibilidad para ' +
                formatHbSearchOccHint(occ) +
                '. Las tarifas del listado eran para ' +
                formatHbSearchOccHint(listOcc) +
                '; ajusta la ocupación o cambia fechas.'
            );
          }
          throw new Error(
            'Sin disponibilidad para ese hotel y ocupación. Revisa fechas y tamaño de grupo, o prueba otras fechas.'
          );
        });
      }
      var offers = collectRateOffersFromHotel(hotel);
      if (!offers.length) throw new Error('No hay tarifas para esa ocupación.');
      if (!offersMatchRequestedChildren(offers, occ)) {
        throw new Error(
          'Las tarifas recibidas no incluyen niños (' +
            formatHbSearchOccHint(occ) +
            '). Pulsa de nuevo «' +
            hbFunnelConditionsButtonText() +
            '» o prueba otra ocupación/fechas.'
        );
      }
      window.__HB_RATE_OFFERS_BY_CODE__ = window.__HB_RATE_OFFERS_BY_CODE__ || {};
      window.__HB_RATE_OFFERS_BY_CODE__[String(hotelCode)] = offers;
      markHbFunnelOffersCached(hotelCode, checkInOut, occ);
      return offers;
    });
  }

  /** True si, pidiendo niños, alguna tarifa del hotel los refleja (rate.children o rateKey). */
  function offersMatchRequestedChildren(offers, occ) {
    var wantKids = occ && (occ.children || 0) > 0;
    if (!wantKids) return true;
    if (!offers || !offers.length) return false;
    for (var i = 0; i < offers.length; i++) {
      var o = offers[i];
      if (o.rateChildren != null && o.rateChildren > 0) return true;
      var fromKey = parseOccupancyFromRateKey(o.rateKey);
      if (fromKey && fromKey.children > 0) return true;
    }
    return false;
  }

  function getOccupancyFromFormData(fd) {
    if (!fd || !fd.get) return normalizeHbOccupancy({ totalAdults: 2 });
    var totalAdults = clamp(getInt(fd.get('hb_occ_adults') || fd.get('tamanio_grupo'), 2), 1, 54);
    var roomsRaw = String(fd.get('hb_occ_rooms') || '').trim();
    var childAges = readChildAgesFromForm(fd);
    return normalizeHbOccupancy({
      totalAdults: totalAdults,
      rooms: roomsRaw ? clamp(getInt(roomsRaw, 1), 1, HB_MAX_ROOMS) : null,
      children: clamp(getInt(fd.get('hb_occ_children'), childAges.length), 0, 6),
      childAges: childAges,
    });
  }

  function getOccupancyFromTamanioGrupo(fd) {
    if (!fd || !fd.get) return null;
    var raw = String(fd.get('tamanio_grupo') || '').trim();
    if (!raw) return null;
    return normalizeHbOccupancy({ totalAdults: clamp(getInt(raw, 2), 1, 54) });
  }

  function hasActiveSplitBookings(fd) {
    if (!fd || !fd.get) return false;
    var raw = String(fd.get('hb_split_bookings') || '').trim();
    if (!raw) return false;
    try {
      var arr = JSON.parse(raw);
      return Array.isArray(arr) && arr.some(function (b) {
        return b && b.ready;
      });
    } catch (e0) {
      return false;
    }
  }

  /** Listado: tamaño de grupo manda; hb_occ solo si un único hotel ya está confirmado. */
  function getListOccupancyForAvailability(fd) {
    if (!fd || !fd.get) return { adults: 2, rooms: 1, children: 0 };
    if (hasActiveSplitBookings(fd) || isSplitCoverageMode()) {
      var fromGroupSplit = getOccupancyFromTamanioGrupo(fd);
      if (fromGroupSplit) return fromGroupSplit;
      var cov = window.__HB_COVERAGE__ || {};
      if (cov.totalAdults) {
        var total = clamp(getInt(cov.totalAdults, 2), 1, 54);
        return normalizeHbOccupancy({ totalAdults: total });
      }
    }
    if (String(fd.get('hb_funnel_ready') || '').trim() === '1') {
      return getOccupancyFromFormData(fd);
    }
    var fromGroup = getOccupancyFromTamanioGrupo(fd);
    if (fromGroup) return fromGroup;
    if (String(fd.get('hb_occ_adults') || '').trim()) return getOccupancyFromFormData(fd);
    return { adults: 2, rooms: 1, children: 0 };
  }

  function resetHbOccForGroupSizeChange(form) {
    if (!form) return;
    var readyEl = form.querySelector('input[name="hb_funnel_ready"]');
    if (readyEl && String(readyEl.value || '').trim() === '1') return;
    ['hb_occ_adults', 'hb_occ_rooms', 'hb_occ_children'].forEach(function (name) {
      var el = form.querySelector('input[name="' + name + '"]');
      if (el) el.value = '';
    });
  }

  function buildAvailCacheKey(checkIn, checkOut, occ, hotelCode) {
    return [checkIn, checkOut, occCacheSignature(occ), String(hotelCode || '')].join('|');
  }

  function indexRatesByHotelCode(data) {
    var map = {};
    var offersByCode = {};
    var hotels = (data && data.hotels && data.hotels.hotels) || [];
    var hi;
    for (hi = 0; hi < hotels.length; hi++) {
      var h = hotels[hi];
      var code = String(h.code || '');
      if (!code) continue;
      var offers = collectRateOffersFromHotel(h);
      if (!offers.length) continue;
      offersByCode[code] = offers;
      var pick = null;
      for (var oi = 0; oi < offers.length; oi++) {
        var o = offers[oi];
        if (String(o.rateType || '').toUpperCase() !== 'BOOKABLE') continue;
        if (
          !pick ||
          (o.netValue != null &&
            (pick.netValue == null || o.netValue < pick.netValue))
        ) {
          pick = o;
        }
      }
      map[code] = pick || offers[0];
    }
    window.__HB_RATE_OFFERS_BY_CODE__ = offersByCode;
    return map;
  }

  function fetchContentHotelsPaginated(base, dest, lang) {
    var pageSize = 200;
    var maxPages = 10;
    var all = [];
    function page(from) {
      if (from > maxPages * pageSize) return Promise.resolve(all);
      var to = from + pageSize - 1;
      return fetch(
        base +
          '/api/hotelbeds-list-hotels?destination=' +
          encodeURIComponent(dest) +
          '&source=content&enrich=1&filter=none&from=' +
          from +
          '&to=' +
          to +
          '&language=' +
          encodeURIComponent(lang || 'ENG')
      )
        .then(function (r) {
          return parseHotelbedsResponse(r);
        })
        .then(function (data) {
          var batch = data.hotels || [];
          batch.forEach(function (h) {
            if (h && h.code) all.push(h);
          });
          if (batch.length < pageSize) return all;
          return page(from + pageSize);
        })
        .catch(function () {
          return all;
        });
    }
    return page(1);
  }

  function loadHotelContentEnrichment() {
    var base =
      typeof window !== 'undefined' && window.location && window.location.origin
        ? window.location.origin
        : '';
    if (!base) return Promise.resolve();
    // Skip if already populated (Hotelbeds Content API is static — fetch once per session)
    if (window.__HB_CONTENT_BY_CODE && Object.keys(window.__HB_CONTENT_BY_CODE).length > 0) {
      return Promise.resolve();
    }
    // Prevent parallel in-flight fetches
    if (window.__HB_CONTENT_LOADING__) return window.__HB_CONTENT_LOADING__;
    window.__HB_CONTENT_LOADING__ = Promise.all(
      DESTINATIONS_LERMA_BURGOS.map(function (dest) {
        return fetchContentHotelsPaginated(base, dest, 'ENG');
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
        syncCoverageCodesFromContent();
        window.__HB_CONTENT_LOADING__ = null;
      })
      .catch(function () {
        window.__HB_CONTENT_BY_CODE = {};
        window.__HB_CONTENT_LOADING__ = null;
      });
    return window.__HB_CONTENT_LOADING__;
  }

  function renderStarsBadge(categoryName, categoryStars) {
    var s = (categoryName || '').trim();
    var sn =
      typeof categoryStars === 'number' && categoryStars >= 1 && categoryStars <= 5 ? categoryStars : 0;
    if (sn >= 1 && sn <= 5) {
      var title = s || sn + ' estrellas';
      return '<span class="hotelbeds-stars" title="' + escapeHtml(title) + '">' + '★'.repeat(sn) + '</span>';
    }
    if (!s) return '';
    var m =
      s.match(/([1-5])\s*(?:star|stars|estrella|estrellas|\*|★)/i) ||
      s.match(/^([1-5])(?:\s|$|\*|★)/) ||
      s.match(/\b([1-5])\s*EST\b/i);
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
  function hotelRichCardHtml(hAvail, meta, pick, priceStr, selSuffix, cardOpts) {
    cardOpts = cardOpts || {};
    var compact = cardOpts.compact !== false && pageOpts().compactHotelCards !== false;
    var code = String(hAvail.code || '');
    var displayName =
      (typeof hAvail.name === 'string' ? hAvail.name : hAvail.name && hAvail.name.content) ||
      (meta && meta.name) ||
      'Hotel ' + code;
    if (typeof displayName !== 'string') displayName = String(displayName || 'Hotel');

    var img = meta && meta.imageUrl ? meta.imageUrl : '';
    var catLabel = meta && (meta.categoryName || meta.categoryCode) ? meta.categoryName || meta.categoryCode : '';
    var catStars = meta && typeof meta.categoryStars === 'number' ? meta.categoryStars : null;
    var city = meta && meta.city ? String(meta.city).trim() : '';
    // Certificación: descripción Content visible también en tarjetas compactas (1–2 líneas vía CSS).
    var desc = meta && meta.descriptionShort ? String(meta.descriptionShort).trim() : '';
    var boardLine = pick && pick.boardName ? pick.boardName : pick && pick.boardCode ? String(pick.boardCode) : '';
    var roomLine = pick && pick.roomName ? pick.roomName : '';
    var ratePaid = (pick && pick.rateExtrasPaid) || [];
    var rateComm = (pick && pick.rateComments) || [];
    var facilityPaid = (meta && meta.facilitiesWithCharge) || [];
    var hideEur = hbHideHotelEuroUi();

    var imgHtml;
    if (img) {
      var imgMedium = img.replace(/\/giata\/bigger\//i, '/giata/medium/');
      imgHtml =
        '<div class="hotelbeds-card-media"><img src="' +
        escapeHtml(img) +
        '" alt="' +
        escapeHtml(displayName) +
        '" loading="lazy" width="120" height="90" data-fallback="' +
        escapeHtml(imgMedium !== img ? imgMedium : '') +
        '" onerror="var f=this.getAttribute(\'data-fallback\');if(f&&this.src!==f){this.src=f;this.removeAttribute(\'data-fallback\');}else{this.parentNode.className=\'hotelbeds-card-media hotelbeds-card-media--empty\';this.remove();}"></div>';
    } else {
      imgHtml = '<div class="hotelbeds-card-media hotelbeds-card-media--empty" aria-hidden="true"></div>';
    }

    var boardBlock = '';
    if (boardLine || roomLine) {
      if (compact) {
        var metaParts = [];
        if (roomLine) metaParts.push(roomLine);
        if (boardLine) metaParts.push(boardLine);
        boardBlock =
          '<p class="hotelbeds-card-meta" title="Tarifa más económica para tu búsqueda">' +
          escapeHtml(metaParts.join(' · ')) +
          '</p>';
      } else {
        boardBlock =
          '<div class="hotelbeds-board-room">' +
          (roomLine ? '<div><strong>Habitación:</strong> ' + escapeHtml(roomLine) + '</div>' : '') +
          (boardLine ? '<div><strong>Régimen:</strong> ' + escapeHtml(boardLine) + '</div>' : '') +
          '</div>';
      }
    }

    var rateExtraBlock = '';
    if (ratePaid.length) {
      rateExtraBlock +=
        '<div class="hotelbeds-rate-paid"><strong>Impuestos y cargos no incluidos:</strong><ul class="hotelbeds-mini-list">' +
        ratePaid
          .map(function (x) {
            return '<li>' + escapeHtml(x) + '</li>';
          })
          .join('') +
        '</ul></div>';
    }
    if (facilityPaid.length) {
      rateExtraBlock +=
        '<div class="hotelbeds-facilities-paid"><strong>Instalaciones con coste adicional:</strong><ul class="hotelbeds-mini-list">' +
        facilityPaid
          .map(function (x) {
            return '<li>' + escapeHtml(x) + '</li>';
          })
          .join('') +
        '</ul></div>';
    }
    rateExtraBlock += facilitiesSummaryHtml(meta, compact);
    if (rateComm.length) {
      rateExtraBlock +=
        '<div class="hotelbeds-rate-comments"><strong>Observaciones tarifa:</strong> ' +
        escapeHtml(truncateText(rateComm.join(' '), compact ? 200 : 400)) +
        '</div>';
    }

    var priceHtml = '';
    if (priceStr && String(priceStr).trim()) {
      priceHtml = '<span class="hotelbeds-price">' + escapeHtml(priceStr) + '</span>';
    } else if (hideEur) {
      priceHtml =
        '<span class="hotelbeds-price hotelbeds-price--package-note">Elige habitación para ver el precio del paquete (green fees incluidos)</span>';
    } else {
      priceHtml =
        '<span class="hotelbeds-price hotelbeds-price--package-note">Elige habitación para ver el precio del paquete (green fees incluidos)</span>';
    }

    var cityHtml =
      compact && city
        ? '<p class="hotelbeds-card-city">' + escapeHtml(city) + '</p>'
        : '';

    return (
      '<article class="hotelbeds-card hotelbeds-card--selectable' +
      (compact ? ' hotelbeds-card--compact' : '') +
      '" role="button" tabindex="0" data-hb-hotel-code="' +
      escapeHtml(code) +
      '">' +
      imgHtml +
      '<div class="hotelbeds-card-main">' +
      '<header class="hotelbeds-card-head">' +
      renderStarsBadge(catLabel, catStars) +
      '<span class="hotelbeds-card-title">' +
      escapeHtml(displayName) +
      selSuffix +
      '</span>' +
      priceHtml +
      '</header>' +
      cityHtml +
      (desc
        ? '<p class="hotelbeds-desc">' + escapeHtml(truncateText(desc, compact ? 160 : 380)) + '</p>'
        : '') +
      boardBlock +
      rateExtraBlock +
      '</div></article>'
    );
  }

  function ensureHiddenHotelInputs(form, noches) {
    if (!form) return;
    var n = Math.max(1, parseInt(noches || '1', 10) || 1);
    for (var i = 1; i <= n; i++) {
      var name = 'hotel-noche-' + i;
      var existing = form.querySelector('input[name="' + name + '"]');
      if (!existing) {
        var hid = document.createElement('input');
        hid.type = 'hidden';
        hid.name = name;
        hid.value = '';
        form.appendChild(hid);
      }
    }
  }

  function ensureHotelFunnelHiddenInputs(form) {
    if (!form) return;
    var names = [
      'hb_occ_adults',
      'hb_occ_rooms',
      'hb_occ_children',
      'hb_selected_hotel_code',
      'hb_selected_rate_key',
      'hb_selected_rate_type',
      'hb_rate_validated',
      'hb_funnel_ready',
      'hb_hotel_stay_ref_net',
      'hb_hotel_stay_book_net',
      'hb_children_ages',
      'hb_split_bookings',
    ];
    names.forEach(function (n) {
      if (form.querySelector('input[name="' + n + '"]')) return;
      var hid = document.createElement('input');
      hid.type = 'hidden';
      hid.name = n;
      hid.value = '';
      form.appendChild(hid);
    });
  }

  function getInt(val, fallback) {
    var n = parseInt(String(val || ''), 10);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  /** Hotelbeds Availability: máx. 10 habitaciones por petición. */
  var HB_MAX_ROOMS = 10;

  /**
   * Ocupación HB para varias habitaciones del mismo tipo: rooms=N, adults=2 ⇒ N dobles (2 adultos/hab.).
   * @see Hotelbeds Booking API — «two rooms for two adults each».
   */
  function buildHbOccupanciesArray(totalAdults, preferredRooms) {
    var n = Math.max(1, parseInt(totalAdults, 10) || 1);
    if (n === 1) return [{ rooms: 1, adults: 1, children: 0 }];
    if (n === 2) {
      var pr2 = preferredRooms != null ? parseInt(preferredRooms, 10) : 0;
      if (pr2 >= 2) return [{ rooms: 2, adults: 1, children: 0 }];
      return [{ rooms: 1, adults: 2, children: 0 }];
    }
    var doubles = preferredRooms != null && !isNaN(preferredRooms)
      ? clamp(Math.max(parseInt(preferredRooms, 10), Math.ceil(n / 2)), 1, HB_MAX_ROOMS)
      : clamp(Math.ceil(n / 2), 1, HB_MAX_ROOMS);
    return [{ rooms: doubles, adults: 2, children: 0 }];
  }

  /**
   * Añade menores a ocupaciones adultas.
   * Hotelbeds: rooms:N + children:C = C niños en CADA habitación.
   * Por eso, con 2 hab. y 2 niños totales usamos children:1 (uno por hab.), no children:2.
   */
  function applyChildAgesToOccupancies(occupancies, childAges) {
    if (!Array.isArray(occupancies) || !occupancies.length || !childAges || !childAges.length) {
      return occupancies;
    }
    // Unidades rooms:1 (sin niños previos) para no acumular en dobles normalize().
    var units = [];
    for (var oi = 0; oi < occupancies.length; oi++) {
      var o = occupancies[oi];
      var rc = Math.max(1, parseInt(o.rooms, 10) || 1);
      var ad = Math.max(1, parseInt(o.adults, 10) || 1);
      for (var r = 0; r < rc; r++) {
        units.push({ rooms: 1, adults: ad, children: 0 });
      }
    }
    if (!units.length) return occupancies;

    var nKids = childAges.length;
    var nRooms = units.length;
    var agesUniform = childAges.every(function (a) {
      return a === childAges[0];
    });
    var sameAdults = units.every(function (u) {
      return u.adults === units[0].adults;
    });

    // Misma ocupación en todas las hab. + niños repartibles + misma edad → un nodo HB.
    if (sameAdults && agesUniform && nKids % nRooms === 0) {
      var perRoom = nKids / nRooms;
      var paxes = [];
      for (var p = 0; p < perRoom; p++) {
        paxes.push({ type: 'CH', age: childAges[0] });
      }
      return [
        {
          rooms: nRooms,
          adults: units[0].adults,
          children: perRoom,
          paxes: paxes,
        },
      ];
    }

    for (var i = 0; i < nKids; i++) {
      var target = units[i % nRooms];
      target.children = (target.children || 0) + 1;
      target.paxes = target.paxes || [];
      target.paxes.push({ type: 'CH', age: childAges[i] });
    }
    return units;
  }

  /** totalAdults = adultos HB (no el tamaño de grupo con niños). */
  function normalizeHbOccupancy(occ) {
    var totalAdults = clamp(
      getInt(occ && (occ.totalAdults != null ? occ.totalAdults : occ.adults), 2),
      1,
      54
    );
    var preferredRooms =
      occ && occ.rooms != null && String(occ.rooms).trim() !== ''
        ? clamp(getInt(occ.rooms, 1), 1, HB_MAX_ROOMS)
        : defaultRoomsForAdults(totalAdults);
    var childAges = Array.isArray(occ && occ.childAges) ? occ.childAges.slice(0, 6) : [];
    var childrenCount = clamp(
      getInt(occ && occ.children, childAges.length),
      childAges.length,
      6
    );
    while (childAges.length < childrenCount) childAges.push(8);
    if (childAges.length > childrenCount) childAges = childAges.slice(0, childrenCount);

    // Siempre reconstruir desde adultos/hab. (evita reaplicar niños sobre ocupaciones ya expandidas).
    var occupancies = buildHbOccupanciesArray(totalAdults, preferredRooms);
    if (childAges.length) {
      occupancies = applyChildAgesToOccupancies(occupancies, childAges);
    }
    var apiRooms = occupancies.reduce(function (sum, o) {
      return sum + (parseInt(o.rooms, 10) || 0);
    }, 0);
    return {
      totalAdults: totalAdults,
      adults: totalAdults,
      rooms: Math.max(preferredRooms, apiRooms),
      children: childrenCount,
      childAges: childAges,
      occupancies: occupancies,
    };
  }

  function occToAvailabilityPayload(occ) {
    var norm = normalizeHbOccupancy(occ);
    return {
      rooms: norm.rooms,
      adults: norm.totalAdults,
      children: norm.children || 0,
      occupancies: norm.occupancies,
    };
  }

  function occCacheSignature(occ) {
    var norm = normalizeHbOccupancy(occ);
    return JSON.stringify(norm.occupancies) + '|' + String(norm.totalAdults) + '|' + String(norm.children || 0);
  }

  function formatHbSearchOccHint(occ) {
    var norm = normalizeHbOccupancy(occ);
    if (!norm.occupancies || !norm.occupancies.length) return '';
    var parts = norm.occupancies.map(function (o) {
      var s = o.rooms + ' hab. × ' + o.adults + ' adulto' + (o.adults === 1 ? '' : 's');
      var ch = Math.max(0, parseInt(o.children, 10) || 0);
      if (ch > 0) {
        var chTotal = ch * Math.max(1, parseInt(o.rooms, 10) || 1);
        s += ' + ' + ch + (ch === 1 ? ' niño' : ' niños');
        if (o.rooms > 1) s += '/hab. (' + chTotal + ' niños)';
      }
      return s;
    });
    var kids = norm.children || 0;
    var party = (occ && occ.partySize) || norm.totalAdults + kids;
    return (
      'Búsqueda Hotelbeds: ' +
      parts.join(' + ') +
      ' (' +
      norm.totalAdults +
      ' adulto' +
      (norm.totalAdults === 1 ? '' : 's') +
      (kids > 0 ? ' + ' + kids + (kids === 1 ? ' niño' : ' niños') : '') +
      ' · grupo ' +
      party +
      ' · habitaciones de cama doble)'
    );
  }

  function clampHotelbedsOccupancy(occ) {
    return normalizeHbOccupancy(occ || { totalAdults: 2 });
  }

  /** Fragmento típico en rateKey: …|2~1~1|8|N@… (habitaciones~adultos~niños). */
  function parseOccupancyFromRateKey(rateKey) {
    var rk = String(rateKey || '');
    // Preferir el segmento junto a edades/flags (|N~N~N|), no el primer \d~\d~\d del string.
    var m = rk.match(/\|(\d+)~(\d+)~(\d+)\|/);
    if (!m) m = rk.match(/(\d+)~(\d+)~(\d+)/);
    if (!m) return null;
    var rooms = parseInt(m[1], 10);
    var adults = parseInt(m[2], 10);
    var children = parseInt(m[3], 10);
    if (!rooms || !adults) return null;
    return {
      rooms: rooms,
      adults: adults,
      children: Number.isFinite(children) ? Math.max(0, children) : 0,
    };
  }

  function findOfferByRateKey(hotelCode, rateKey) {
    var offers = (window.__HB_RATE_OFFERS_BY_CODE__ || {})[String(hotelCode || '')] || [];
    for (var i = 0; i < offers.length; i++) {
      if (offers[i].rateKey === rateKey) return offers[i];
    }
    return null;
  }

  /**
   * Ocupación de booking: debe coincidir con la tarifa HB.
   * Prioridad: oferta (rooms/adults/children) > rateKey > formulario.
   */
  function resolveBookingOccupancy(offer, rateKey, fd) {
    var childAges = readChildAgesFromForm(fd);
    var formAdults = Math.max(
      1,
      parseInt((fd.get('hb_occ_adults') || fd.get('tamanio_grupo') || '2'), 10) || 2
    );
    var formRooms = Math.max(
      1,
      parseInt((fd.get('hb_occ_rooms') || defaultRoomsForAdults(formAdults)), 10) || 1
    );
    var formChildren = clamp(getInt(fd.get('hb_occ_children'), childAges.length), 0, 6);

    var host = document.getElementById('hb-hotel-funnel-inline');
    if (host) {
      var ci = host.querySelector('#hb-funnel-inline-children');
      var uiKids = clamp(getInt(ci && ci.value, 0), 0, 6);
      if (uiKids > formChildren) formChildren = uiKids;
      var agesUi = readChildAgesFromFunnel(host);
      if (agesUi.length) childAges = agesUi;
    }

    var rk = rateKey || (offer && offer.rateKey) || '';
    var fromKey = parseOccupancyFromRateKey(rk);
    var offerRooms = offer && offer.rateRooms != null ? offer.rateRooms : null;
    var offerAdults = offer && offer.rateAdults != null ? offer.rateAdults : null;
    var offerChildren = offer && offer.rateChildren != null ? offer.rateChildren : null;
    // Si la oferta no trae children pero el rateKey/label sí (caso HB frecuente).
    if ((offerChildren == null || offerChildren === 0) && fromKey && fromKey.children > 0) {
      offerChildren = fromKey.children;
    }
    if ((offerRooms == null || offerRooms === 0) && fromKey) offerRooms = fromKey.rooms;
    if ((offerAdults == null || offerAdults === 0) && fromKey) offerAdults = fromKey.adults;
    if (
      (offerChildren == null || offerChildren === 0) &&
      offer &&
      offer.occupancyLabel &&
      /niño/i.test(String(offer.occupancyLabel))
    ) {
      var mCh = String(offer.occupancyLabel).match(/(\d+)\s*niñ/i);
      if (mCh) offerChildren = parseInt(mCh[1], 10) || 1;
    }

    var rooms = formRooms;
    var adults = formAdults;
    var children = formChildren;

    if (offerRooms != null && offerRooms > 0 && offerAdults != null && offerAdults > 0) {
      rooms = offerRooms;
      adults = offerAdults * rooms;
      children = Math.max(0, offerChildren || 0) * rooms;
    } else if (fromKey) {
      rooms = Math.max(1, fromKey.rooms);
      adults = Math.max(1, fromKey.adults) * rooms;
      children = Math.max(0, fromKey.children) * rooms;
    }

    var agesNeeded = Math.max(0, children);
    while (childAges.length < agesNeeded) childAges.push(8);
    if (childAges.length > agesNeeded) childAges = childAges.slice(0, agesNeeded);

    var hasKidsInRate =
      children > 0 ||
      (offerChildren != null && offerChildren > 0) ||
      !!(fromKey && fromKey.children > 0);

    return {
      rooms: rooms,
      adults: adults,
      children: children,
      childAges: childAges,
      formChildren: formChildren,
      rateMissingChildren: formChildren > 0 && !hasKidsInRate,
    };
  }

  function splitAdultsIntoRooms(adults, rooms) {
    adults = Math.max(1, adults | 0);
    rooms = Math.max(1, rooms | 0);
    var alloc = new Array(rooms).fill(0);
    var left = adults;
    for (var i = 0; i < rooms; i++) {
      var take = left >= 2 ? 2 : 1;
      alloc[i] = take;
      left -= take;
      if (left <= 0) break;
    }
    if (left > 0) {
      alloc[rooms - 1] += left;
    }
    return alloc.map(function (x) { return Math.max(1, x); });
  }

  /**
   * Hotelbeds Booking: un único elemento en rooms[] por rateKey.
   * Los paxes llevan roomId 1..N según reparto (no N entradas rooms con el mismo rateKey).
   * Con tarifa «2 hab. × 1 adulto + 1 niño», repartir 1 AD + 1 CH por habitación.
   */
  function buildBookingRooms(finalRateKey, occ, nameParts) {
    var roomsCount = Math.max(1, occ.rooms | 0);
    var adults = Math.max(1, occ.adults | 0);
    var children = Math.max(0, occ.children | 0);
    var childAges = Array.isArray(occ.childAges) ? occ.childAges : [];

    if (roomsCount <= 1) {
      var singlePaxes = buildPaxesForRoom(1, adults, nameParts.name, nameParts.surname);
      if (children > 0) {
        singlePaxes = singlePaxes.concat(
          buildChildPaxesForRoom(1, children, nameParts.name, nameParts.surname, childAges)
        );
      }
      return [{ rateKey: finalRateKey, paxes: singlePaxes }];
    }

    var alloc;
    if (adults % roomsCount === 0) {
      var per = adults / roomsCount;
      alloc = [];
      for (var a = 0; a < roomsCount; a++) alloc.push(per);
    } else {
      alloc = splitAdultsIntoRooms(adults, roomsCount);
    }

    var allPaxes = [];
    for (var i = 0; i < roomsCount; i++) {
      allPaxes = allPaxes.concat(
        buildPaxesForRoom(i + 1, alloc[i] || 1, nameParts.name, nameParts.surname)
      );
    }
    if (children > 0) {
      if (children % roomsCount === 0) {
        var kidsPer = children / roomsCount;
        var ageIdx = 0;
        for (var r = 0; r < roomsCount; r++) {
          var agesForRoom = childAges.slice(ageIdx, ageIdx + kidsPer);
          while (agesForRoom.length < kidsPer) agesForRoom.push(8);
          ageIdx += kidsPer;
          allPaxes = allPaxes.concat(
            buildChildPaxesForRoom(r + 1, kidsPer, nameParts.name, nameParts.surname, agesForRoom)
          );
        }
      } else {
        for (var ci = 0; ci < children; ci++) {
          var childRoomId = (ci % roomsCount) + 1;
          var ageOne = childAges && childAges[ci] != null ? [childAges[ci]] : [8];
          allPaxes = allPaxes.concat(
            buildChildPaxesForRoom(childRoomId, 1, nameParts.name, nameParts.surname, ageOne)
          );
        }
      }
    }
    return [{ rateKey: finalRateKey, paxes: allPaxes }];
  }

  function buildChildPaxesForRoom(roomId, count, holderName, holderSurname, ages) {
    var out = [];
    for (var i = 0; i < count; i++) {
      var age = ages && ages[i] != null ? clamp(parseInt(ages[i], 10) || 8, 0, 17) : 8;
      out.push({
        roomId: roomId,
        type: 'CH',
        age: age,
        name: holderName,
        surname: holderSurname + (count > 1 ? ' Niño ' + (i + 1) : ' Niño'),
      });
    }
    return out;
  }

  function buildPaxesForRoom(roomId, count, holderName, holderSurname) {
    var out = [];
    for (var i = 0; i < count; i++) {
      out.push({
        roomId: roomId,
        type: 'AD',
        name: holderName,
        surname: holderSurname + (count > 1 ? ' ' + (i + 1) : ''),
      });
    }
    return out;
  }

  function isSplitCoverageMode() {
    var cov = window.__HB_COVERAGE__;
    return !!(cov && cov.mode === 'split' && cov.k > 1);
  }

  function getSplitOccForHotelCode(code) {
    var cov = window.__HB_COVERAGE__ || {};
    if (cov.mode !== 'split') return null;
    var adults =
      cov.hotelPartByCode && cov.hotelPartByCode[String(code)] != null
        ? parseInt(cov.hotelPartByCode[String(code)], 10)
        : 0;
    if (!adults) return null;
    return clampHotelbedsOccupancy({ totalAdults: adults });
  }

  function getSplitBookings(form) {
    if (!form) return [];
    var inp = form.querySelector('input[name="hb_split_bookings"]');
    if (!inp || !String(inp.value || '').trim()) return [];
    try {
      var arr = JSON.parse(inp.value);
      return Array.isArray(arr) ? arr : [];
    } catch (e0) {
      return [];
    }
  }

  function setSplitBookings(form, list) {
    ensureHotelFunnelHiddenInputs(form);
    var inp = form.querySelector('input[name="hb_split_bookings"]');
    if (inp) inp.value = JSON.stringify(list || []);
  }

  function saveSplitBooking(form, booking) {
    var list = getSplitBookings(form).filter(function (b) {
      return String(b.code) !== String(booking.code);
    });
    list.push(booking);
    setSplitBookings(form, list);
  }

  function getRequiredSplitHotelCodes() {
    var combo = getActiveSplitCombo();
    if (combo && combo.hotelCodes && combo.hotelCodes.length) return combo.hotelCodes.map(String);
    var cov = window.__HB_COVERAGE__ || {};
    if (cov.hotelCodes && cov.hotelCodes.length) return cov.hotelCodes.map(String);
    var hotels =
      (window.__HB_LAST_AVAIL__ && window.__HB_LAST_AVAIL__.hotels && window.__HB_LAST_AVAIL__.hotels.hotels) || [];
    return hotels.map(function (h) {
      return String(h.code);
    });
  }

  function allSplitHotelsConfigured(form) {
    var required = getRequiredSplitHotelCodes();
    if (!required.length) return false;
    var done = getSplitBookings(form).filter(function (b) {
      return b && b.ready;
    });
    return required.every(function (code) {
      return done.some(function (b) {
        return String(b.code) === String(code);
      });
    });
  }

  function resetSplitBookingsIfCoverageChanged(form, coverage) {
    if (!form) return;
    var key = JSON.stringify(coverage || {});
    if (window.__HB_COVERAGE_KEY__ === key) return;
    if (allSplitHotelsConfigured(form) && coverage && coverage.mode === 'single') {
      var splitTotal = getSplitBookings(form)
        .filter(function (b) {
          return b && b.ready;
        })
        .reduce(function (sum, b) {
          return sum + (parseInt(b.adults, 10) || 0);
        }, 0);
      var covTotal = parseInt(coverage.totalAdults, 10) || 0;
      if (splitTotal > covTotal) return;
    }
    window.__HB_COVERAGE_KEY__ = key;
    setSplitBookings(form, []);
    var ready = form.querySelector('input[name="hb_funnel_ready"]');
    if (ready) ready.value = '';
  }

  function markSplitComboCards(form) {
    var activeCombo = getActiveSplitCombo();
    var activeKey = activeCombo ? comboMultisetKey(activeCombo) : '';
    document.querySelectorAll('.hotelbeds-card--split-combo').forEach(function (el) {
      var cid = el.getAttribute('data-hb-split-combo-id');
      var combo = getSplitComboById(cid);
      el.classList.remove('hotelbeds-card--picked', 'hotelbeds-card--split-done');
      if (combo && comboFullyConfigured(form, combo)) el.classList.add('hotelbeds-card--split-done');
      else if (combo && activeKey && comboMultisetKey(combo) === activeKey) el.classList.add('hotelbeds-card--picked');
    });
  }

  function renderSplitFunnelSteps(host, form, combo, currentHotelCode) {
    if (!host || !combo || !combo.segments || combo.segments.length < 2) return;
    var stepsEl = host.querySelector('#hb-funnel-inline-split-steps');
    if (!stepsEl) return;
    var doneByCode = {};
    getSplitBookings(form).forEach(function (b) {
      if (b && b.ready && b.code) doneByCode[String(b.code)] = b;
    });
    var html = '<ol class="hb-funnel-split-steps__list">';
    combo.segments.forEach(function (seg, idx) {
      var code = String(seg.code);
      var name = hotelDisplayName(seg.hotel, code);
      var isDone = !!doneByCode[code];
      var isCurrent = code === String(currentHotelCode || '');
      var state = isDone ? 'done' : isCurrent ? 'current' : 'pending';
      var statusLbl = isDone ? 'Configurado' : isCurrent ? 'Elige habitación' : 'Pendiente';
      html +=
        '<li class="hb-funnel-split-steps__item hb-funnel-split-steps__item--' +
        state +
        '">' +
        '<span class="hb-funnel-split-steps__n">' +
        (idx + 1) +
        '</span>' +
        '<span class="hb-funnel-split-steps__body">' +
        '<strong>' +
        escapeHtml(name) +
        '</strong> (' +
        seg.adults +
        ' pers.)' +
        '<span class="hb-funnel-split-steps__status">' +
        escapeHtml(statusLbl) +
        '</span></span></li>';
    });
    html += '</ol>';
    stepsEl.innerHTML = html;
    stepsEl.hidden = false;
  }

  function markHotelCardsPicked(form) {
    if (isSplitCoverageMode() && getSplitCombos().length) {
      markSplitComboCards(form);
      return;
    }
    if (isSplitCoverageMode()) {
      markSplitHotelCards(form);
      return;
    }
    var code = String(
      (form.querySelector('input[name="hb_selected_hotel_code"]') || {}).value || ''
    ).trim();
    document.querySelectorAll('.hotelbeds-card--selectable').forEach(function (el) {
      var c = el.getAttribute('data-hb-hotel-code');
      if (code && c === code) el.classList.add('hotelbeds-card--picked');
      else el.classList.remove('hotelbeds-card--picked');
      el.classList.remove('hotelbeds-card--split-done');
    });
  }

  function markSplitHotelCards(form) {
    var editing = String(
      (form.querySelector('input[name="hb_selected_hotel_code"]') || {}).value || ''
    ).trim();
    var doneCodes = {};
    getSplitBookings(form).forEach(function (b) {
      if (b && b.ready && b.code) doneCodes[String(b.code)] = 1;
    });
    document.querySelectorAll('.hotelbeds-card--selectable').forEach(function (el) {
      var c = el.getAttribute('data-hb-hotel-code');
      el.classList.remove('hotelbeds-card--picked', 'hotelbeds-card--split-done');
      if (doneCodes[c]) el.classList.add('hotelbeds-card--split-done');
      else if (editing && c === editing) el.classList.add('hotelbeds-card--picked');
    });
  }

  function ensurePickedHotelCardSlot(host) {
    if (!host) return null;
    var slot = host.querySelector('#hb-funnel-inline-picked-card');
    if (slot) return slot;
    slot = document.createElement('div');
    slot.id = 'hb-funnel-inline-picked-card';
    slot.className = 'hb-hotel-funnel-inline__picked-card';
    slot.hidden = true;
    var controls = host.querySelector('.hb-hotel-funnel-inline__controls');
    if (controls) host.insertBefore(slot, controls);
    else host.appendChild(slot);
    return slot;
  }

  function restorePickedCardToList(root, slot) {
    if (!slot) return;
    var list = root && root.querySelector('.hotelbeds-list');
    while (slot.firstChild) {
      var child = slot.firstChild;
      if (list) list.appendChild(child);
      else slot.removeChild(child);
    }
    slot.hidden = true;
  }

  function syncHotelCardsListVisibility(root, form) {
    if (!root || !form) return;
    var block = root.querySelector('.hotelbeds-results');
    if (!block) return;
    var code = String(
      (form.querySelector('input[name="hb_selected_hotel_code"]') || {}).value || ''
    ).trim();
    var host = root.querySelector('#hb-hotel-funnel-inline');
    var slot = ensurePickedHotelCardSlot(host);
    markHotelCardsPicked(form);

    if (isSplitCoverageMode()) {
      block.classList.remove('hotelbeds-results--room-pick');
      if (code) block.setAttribute('data-hb-picked-hotel', code);
      else block.removeAttribute('data-hb-picked-hotel');
      restorePickedCardToList(root, slot);
      return;
    }

    if (code) {
      block.classList.add('hotelbeds-results--room-pick');
      block.setAttribute('data-hb-picked-hotel', code);
      var pickedCard = root.querySelector('.hotelbeds-card--picked');
      var wrap = pickedCard && pickedCard.closest('.hotelbeds-item-wrap');
      if (slot && wrap) {
        if (wrap.parentNode !== slot) slot.appendChild(wrap);
        slot.hidden = false;
      }
    } else {
      block.classList.remove('hotelbeds-results--room-pick');
      block.removeAttribute('data-hb-picked-hotel');
      restorePickedCardToList(root, slot);
    }
  }

  function clearHotelPickAndShowList(form, host, root) {
    if (!form) return;
    setSelectedHotelInHiddenInputs(form, '', '', '', '', '');
    form.querySelector('input[name="hb_rate_validated"]').value = '';
    window.__HB_FUNNEL_LAST__ = null;
    if (host) {
      host.__hbRatesHotel = '';
      host.__hbAutoRatesPending = false;
      host.__hbAutoConfirmPending = false;
      host.__hbAutoRatesHotel = '';
      var ratesBox = host.querySelector('#hb-funnel-inline-rates');
      var resultBox = host.querySelector('#hb-funnel-inline-result');
      if (ratesBox) ratesBox.innerHTML = '';
      if (resultBox) resultBox.innerHTML = '';
    }
    markHotelCardsPicked(form);
    document.querySelectorAll('.hotelbeds-card--picked').forEach(function (el) {
      el.classList.remove('hotelbeds-card--picked');
    });
    syncHotelCardsListVisibility(root, form);
    if (host && typeof host.__hbRefreshUiState === 'function') host.__hbRefreshUiState();
  }

  function hbFunnelCounterFieldHtml(id, min, max, label) {
    return (
      '<div class="hb-funnel-field hb-funnel-field--counter">' +
      '<span class="hb-funnel-field__k">' + escapeHtml(label) + '</span>' +
      '<div class="ancillary-counter-wrap hb-funnel-counter-wrap">' +
      '<button type="button" class="ancillary-btn ancillary-btn-minus" aria-label="Reducir">−</button>' +
      '<input type="number" min="' + min + '" max="' + max + '" id="' + id + '" class="ancillary-counter hb-funnel-counter" readonly>' +
      '<button type="button" class="ancillary-btn ancillary-btn-plus" aria-label="Aumentar">+</button>' +
      '</div></div>'
    );
  }

  function parseChildAgesCsv(raw) {
    if (!raw) return [];
    return String(raw)
      .split(',')
      .map(function (s) {
        return parseInt(String(s).trim(), 10);
      })
      .filter(function (n) {
        return Number.isFinite(n) && n >= 0 && n <= 17;
      });
  }

  function readChildAgesFromForm(fd) {
    if (!fd || !fd.get) return [];
    return parseChildAgesCsv(fd.get('hb_children_ages'));
  }

  function renderChildAgeInputs(host, count) {
    var box = host && host.querySelector('#hb-funnel-inline-child-ages');
    if (!box) return;
    var n = Math.max(0, Math.min(6, parseInt(count, 10) || 0));
    if (!n) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    box.hidden = false;
    var html = '<p class="hb-funnel-field__k">Edades de los menores (años)</p><div class="hb-funnel-child-ages__grid">';
    for (var i = 0; i < n; i++) {
      html +=
        '<label class="hb-funnel-child-age">Niño ' +
        (i + 1) +
        ' <input type="number" min="0" max="17" class="hb-funnel-child-age-inp" data-child-idx="' +
        i +
        '" value="8"></label>';
    }
    html += '</div>';
    box.innerHTML = html;
  }

  function readChildAgesFromFunnel(host) {
    if (!host) return [];
    var inputs = host.querySelectorAll('.hb-funnel-child-age-inp');
    var ages = [];
    inputs.forEach(function (inp) {
      var raw = String(inp.value || '').trim();
      var n = parseInt(raw, 10);
      if (!Number.isFinite(n)) {
        n = 8;
        inp.value = '8';
      } else {
        n = clamp(n, 0, 17);
        if (raw === '') inp.value = String(n);
      }
      ages.push(n);
    });
    return ages;
  }

  function syncChildrenToHidden(form, host, childrenCount) {
    ensureHotelFunnelHiddenInputs(form);
    var childrenInp = form.querySelector('input[name="hb_occ_children"]');
    var agesInp = form.querySelector('input[name="hb_children_ages"]');
    var n = Math.max(0, Math.min(6, parseInt(childrenCount, 10) || 0));
    if (childrenInp) childrenInp.value = String(n);
    var ages = readChildAgesFromFunnel(host);
    while (ages.length < n) ages.push(8);
    if (ages.length > n) ages = ages.slice(0, n);
    if (agesInp) agesInp.value = ages.join(',');
    return ages;
  }

  function contentSnapshotForHotel(hotelCode) {
    try {
      var meta = window.__HB_CONTENT_BY_CODE && window.__HB_CONTENT_BY_CODE[String(hotelCode)];
      if (!meta) return null;
      var phone = meta.phone ? String(meta.phone).trim() : '';
      var fullAddress = meta.fullAddress ? String(meta.fullAddress).trim() : '';
      if (!phone && !fullAddress) return null;
      return { phone: phone, fullAddress: fullAddress };
    } catch (e0) {
      return null;
    }
  }

  function ensureFunnelChildrenUi(host) {
    if (!host) return;
    if (!host.querySelector('#hb-funnel-inline-children')) {
      var grid = host.querySelector('.hb-hotel-funnel-inline__grid');
      if (grid) {
        grid.insertAdjacentHTML('beforeend', hbFunnelCounterFieldHtml('hb-funnel-inline-children', 0, 6, 'Niños'));
      }
    }
    // Etiqueta: Grupo = tamaño total (adultos+niños), no solo adultos.
    var adultsField = host.querySelector('#hb-funnel-inline-adults');
    if (adultsField) {
      var k = adultsField.closest('.hb-funnel-field');
      var lab = k && k.querySelector('.hb-funnel-field__k');
      if (lab && /personas/i.test(lab.textContent || '')) lab.textContent = 'Grupo';
    }
    if (!host.querySelector('#hb-funnel-inline-child-ages')) {
      var controls = host.querySelector('.hb-hotel-funnel-inline__controls');
      if (controls) {
        var ages = document.createElement('div');
        ages.id = 'hb-funnel-inline-child-ages';
        ages.className = 'hb-funnel-child-ages';
        ages.hidden = true;
        var actions = controls.querySelector('.hb-hotel-funnel-inline__actions');
        if (actions) controls.insertBefore(ages, actions);
        else controls.appendChild(ages);
      }
    }
    var childrenInp = host.querySelector('#hb-funnel-inline-children');
    if (childrenInp && !String(childrenInp.value || '').trim()) childrenInp.value = '0';
  }

  function ensureHotelFunnelInlineUi(root) {
    if (!root) return null;
    var existing = root.querySelector('#hb-hotel-funnel-inline');
    if (existing) {
      ensureFunnelChildrenUi(existing);
      if (!existing.querySelector('#hb-funnel-inline-change-hotel')) {
        var head = existing.querySelector('.hb-hotel-funnel-inline__head');
        if (head) {
          var ch = document.createElement('button');
          ch.type = 'button';
          ch.id = 'hb-funnel-inline-change-hotel';
          ch.className = 'hb-funnel-change-hotel';
          ch.hidden = true;
          ch.textContent = 'Cambiar hotel';
          head.appendChild(ch);
        }
      }
      return existing;
    }
    var host = document.createElement('div');
    host.id = 'hb-hotel-funnel-inline';
    host.className = 'hb-hotel-funnel-inline';
    host.innerHTML =
      '<div class="hb-hotel-funnel-inline__head">' +
      '  <span class="hb-hotel-funnel-inline__title">Alojamiento (Hotelbeds)</span>' +
      '  <span class="hb-hotel-funnel-inline__hotel" id="hb-funnel-inline-hotel">Elige un hotel para continuar.</span>' +
      '  <span class="hb-hotel-funnel-inline__dates" id="hb-funnel-inline-dates"></span>' +
      '  <button type="button" class="hb-funnel-change-hotel" id="hb-funnel-inline-change-hotel" hidden>Cambiar hotel</button>' +
      '</div>' +
      '<div class="hb-hotel-funnel-inline__controls">' +
      '  <div class="hb-hotel-funnel-inline__grid">' +
      hbFunnelCounterFieldHtml('hb-funnel-inline-adults', 1, 54, 'Grupo') +
      hbFunnelCounterFieldHtml('hb-funnel-inline-rooms', 1, 20, 'Habit.') +
      hbFunnelCounterFieldHtml('hb-funnel-inline-children', 0, 6, 'Niños') +
      '  </div>' +
      '  <div class="hb-funnel-child-ages" id="hb-funnel-inline-child-ages" hidden></div>' +
      '  <p class="hb-funnel-occ-hint" id="hb-funnel-inline-occ-hint" hidden></p>' +
      '  <div class="hb-funnel-split-steps" id="hb-funnel-inline-split-steps" hidden></div>' +
      '  <div class="hb-hotel-funnel-inline__actions">' +
      '    <button type="button" class="hb-hotel-funnel-btn hb-hotel-funnel-btn--secondary" id="hb-funnel-inline-check" disabled>' +
      escapeHtml(hbFunnelConditionsButtonText()) +
      '</button>' +
      '    <button type="button" class="hb-hotel-funnel-btn hb-hotel-funnel-btn--hidden" id="hb-funnel-inline-confirm" disabled hidden>Confirmar hotel</button>' +
      '  </div>' +
      '</div>' +
      '<div class="hb-hotel-funnel-inline__rates" id="hb-funnel-inline-rates"></div>' +
      '<div class="hb-hotel-funnel-inline__result" id="hb-funnel-inline-result" aria-live="polite"></div>';
    // Insert just under the H4 title, if present; otherwise at top.
    var title = root.querySelector('.hotelbeds-title');
    if (title && title.parentNode) {
      title.parentNode.insertBefore(host, title.nextSibling);
    } else {
      root.insertBefore(host, root.firstChild);
    }
    return host;
  }

  function hotelNameForCode(code) {
    try {
      var meta = window.__HB_CONTENT_BY_CODE && window.__HB_CONTENT_BY_CODE[String(code)];
      if (meta && meta.name) return String(meta.name);
    } catch (e0) {}
    return 'Hotel ' + code;
  }

  function setSelectedHotelInHiddenInputs(form, hotelCode, rateKey, adults, rooms, rateType, children, childAgesCsv) {
    ensureHotelFunnelHiddenInputs(form);
    form.querySelector('input[name="hb_selected_hotel_code"]').value = String(hotelCode || '');
    form.querySelector('input[name="hb_selected_rate_key"]').value = String(rateKey || '');
    form.querySelector('input[name="hb_selected_rate_type"]').value = String(rateType || '');
    form.querySelector('input[name="hb_occ_adults"]').value = String(adults || '');
    form.querySelector('input[name="hb_occ_rooms"]').value = String(rooms || '');
    // No pisar niños/edades si el caller no los pasa (antes siempre forzaba 0).
    if (children != null && String(children).trim() !== '') {
      form.querySelector('input[name="hb_occ_children"]').value = String(
        clamp(getInt(children, 0), 0, 6)
      );
    }
    if (childAgesCsv != null) {
      form.querySelector('input[name="hb_children_ages"]').value = String(childAgesCsv || '');
    }
    form.querySelector('input[name="hb_rate_validated"]').value = '';
    form.querySelector('input[name="hb_funnel_ready"]').value = '';
    var refN = form.querySelector('input[name="hb_hotel_stay_ref_net"]');
    var bookN = form.querySelector('input[name="hb_hotel_stay_book_net"]');
    if (refN) refN.value = '';
    if (bookN) bookN.value = '';
  }

  function syncHbResumenPriceHidden(form, offer) {
    ensureHotelFunnelHiddenInputs(form);
    var refInp = form.querySelector('input[name="hb_hotel_stay_ref_net"]');
    var bookInp = form.querySelector('input[name="hb_hotel_stay_book_net"]');
    if (!refInp || !bookInp) return;
    var ref = offer && offer.resumenHotelRefNet != null ? Number(offer.resumenHotelRefNet) : null;
    if ((ref == null || !isFinite(ref)) && offer && offer.netValue != null) ref = Number(offer.netValue);
    var book = offer && offer.netValue != null ? Number(offer.netValue) : null;
    refInp.value = ref != null && isFinite(ref) ? String(Math.round(ref * 100) / 100) : '';
    bookInp.value = book != null && isFinite(book) ? String(Math.round(book * 100) / 100) : '';
  }

  function markRateValidated(form, rateKey, rateType, offerForResumen) {
    ensureHotelFunnelHiddenInputs(form);
    form.querySelector('input[name="hb_selected_rate_key"]').value = String(rateKey || '');
    form.querySelector('input[name="hb_selected_rate_type"]').value = String(rateType || '');
    form.querySelector('input[name="hb_rate_validated"]').value = '1';
    if (offerForResumen) syncHbResumenPriceHidden(form, offerForResumen);
  }

  /** Tarifas BOOKABLE: basta elegir régimen; RECHECK exige «Ver condiciones» (CheckRate). */
  function syncFunnelValidationFromPickedRate(host, form) {
    if (!host || !form) return false;
    var hotelCode = (form.querySelector('input[name="hb_selected_hotel_code"]') || {}).value || '';
    if (!hotelCode) return false;
    var offer = getPickedOfferFromFunnel(host, hotelCode);
    if (!offer || !offer.rateKey) return false;
    var rt = String(offer.rateType || 'BOOKABLE').toUpperCase();
    form.querySelector('input[name="hb_selected_rate_key"]').value = offer.rateKey;
    form.querySelector('input[name="hb_selected_rate_type"]').value = rt;
    if (rt === 'BOOKABLE') {
      markRateValidated(form, offer.rateKey, rt, offer);
      return true;
    }
    form.querySelector('input[name="hb_rate_validated"]').value = '';
    return false;
  }

  function offerSortPrice(offer) {
    if (!offer) return 1e12;
    if (offer.rspValue != null && isFinite(offer.rspValue)) return offer.rspValue;
    if (offer.netValue != null && isFinite(offer.netValue)) return offer.netValue;
    return 1e12;
  }

  function renderFunnelLegalBlocksHtml(offer) {
    var html = '';
    if (offer.promotions && offer.promotions.length) {
      html += '<div class="hb-funnel-legal"><strong>Promociones</strong><ul>';
      offer.promotions.forEach(function (p) {
        html += '<li>' + escapeHtml(p) + '</li>';
      });
      html += '</ul></div>';
    }
    if (offer.rateExtrasPaid && offer.rateExtrasPaid.length) {
      html += '<div class="hb-funnel-legal"><strong>Impuestos y cargos no incluidos</strong><ul>';
      offer.rateExtrasPaid.forEach(function (line) {
        html += '<li>' + escapeHtml(line) + '</li>';
      });
      html += '</ul></div>';
    }
    if (offer.facilitiesWithCharge && offer.facilitiesWithCharge.length) {
      html += '<div class="hb-funnel-legal"><strong>Instalaciones con coste adicional</strong><ul>';
      offer.facilitiesWithCharge.forEach(function (line) {
        html += '<li>' + escapeHtml(line) + '</li>';
      });
      html += '</ul></div>';
    }
    if (offer.hotelFacilitiesSummary) {
      html +=
        '<div class="hb-funnel-legal"><strong>Instalaciones del hotel</strong><p>' +
        escapeHtml(offer.hotelFacilitiesSummary) +
        '</p></div>';
    }
    if (offer.rateComments && offer.rateComments.length) {
      html += '<div class="hb-funnel-legal"><strong>Observaciones de tarifa</strong><ul>';
      offer.rateComments.forEach(function (line) {
        html += '<li>' + escapeHtml(line) + '</li>';
      });
      html += '</ul></div>';
    }
    if (offer.cancellation) {
      html += '<div class="hb-funnel-legal"><strong>Política de cancelación</strong><p>' + escapeHtml(offer.cancellation) + '</p></div>';
    } else {
      html += '<div class="hb-funnel-legal"><strong>Política de cancelación</strong><p>No informada por la API en esta consulta.</p></div>';
    }
    return html;
  }

  function renderFunnelConditionsHtml(offer) {
    if (!offer) return '';
    var html = '<div class="hb-funnel-ok"><strong>Condiciones de la tarifa</strong>';
    html += '<div class="hb-funnel-small">' + escapeHtml(offer.roomName || 'Habitación') + ' · ' + escapeHtml(offer.boardName || offer.boardCode || 'Régimen') + '</div>';
    if (offer.occupancyLabel) {
      html += '<div class="hb-funnel-small">Ocupación: ' + escapeHtml(offer.occupancyLabel) + '</div>';
    }
    if (offer.rateClass) {
      html += '<div class="hb-funnel-small">' + escapeHtml(rateClassLabel(offer.rateClass)) + '</div>';
    }
    if (offer.rateCommentsId) {
      html += '<div class="hb-funnel-small">Ref. condiciones HB: ' + escapeHtml(offer.rateCommentsId) + '</div>';
    }
    if (offer.price) {
      html +=
        '<div class="hb-funnel-small">Precio recomendado de venta (RSP): <strong>' +
        escapeHtml(offer.price) +
        '</strong></div>';
    }
    if (hbHideHotelEuroUi()) {
      html +=
        '<div class="hb-funnel-small">El alojamiento Hotelbeds se integra en el <strong>importe total del paquete</strong> (green fees y resto de servicios del circuito).</div>';
    } else if (offer.price) {
      html += '<div class="hb-funnel-small">Total estancia (RSP): <strong>' + escapeHtml(offer.price) + '</strong></div>';
    }
    html += renderFunnelLegalBlocksHtml(offer);
    html += '<div class="hb-funnel-small">La tarifa queda lista al elegir hotel; puedes cambiar habitación abajo si lo deseas.</div></div>';
    return html;
  }

  function offerFromCheckrateData(crData, baseOffer) {
    var h = (crData && crData.hotel) ? crData.hotel : crData;
    var rooms = (h && h.rooms) || [];
    var room = rooms[0] || null;
    var rate = null;
    if (room && room.rates) rate = Array.isArray(room.rates) ? room.rates[0] : room.rates;
    if (!rate) return baseOffer;
    var merged = mapRateOffer(room || {}, rate);
    if (baseOffer && baseOffer.roomName && !merged.roomName) merged.roomName = baseOffer.roomName;
    if (baseOffer && baseOffer.boardName && !merged.boardName) merged.boardName = baseOffer.boardName;
    if (baseOffer && baseOffer.resumenHotelRefNet != null) merged.resumenHotelRefNet = baseOffer.resumenHotelRefNet;
    if (baseOffer && baseOffer.facilitiesWithCharge) merged.facilitiesWithCharge = baseOffer.facilitiesWithCharge;
    merged.resumenHotelBookNet = merged.netValue;
    return merged;
  }

  function getSelectedRateKeyFromFunnel(host, form) {
    if (host) {
      var picked = host.querySelector('input[name="hb-funnel-rate-pick"]:checked');
      if (picked && picked.value) return String(picked.value);
    }
    if (form) {
      var hidden = form.querySelector('input[name="hb_selected_rate_key"]');
      if (hidden && hidden.value) return String(hidden.value);
    }
    return '';
  }

  function renderFunnelRateChoices(host, hotelCode, preferredRateKey, renderOpts) {
    renderOpts = renderOpts || {};
    var box = host.querySelector('#hb-funnel-inline-rates');
    if (!box) return;
    var offers = getFunnelOffersForDisplay(hotelCode);
    if (!offers.length) {
      box.innerHTML =
        '<p class="hb-funnel-small">Cargando tarifas para este hotel… Si no aparecen, pulsa «' +
        hbFunnelConditionsButtonText() +
        '».</p>';
      return;
    }
    var pick = preferredRateKey ? String(preferredRateKey) : '';
    var checkedIdx = 0;
    if (pick) {
      for (var pi = 0; pi < offers.length; pi++) {
        if (offers[pi].rateKey === pick) {
          checkedIdx = pi;
          break;
        }
      }
    }
    var omitted = (window.__HB_RATE_OFFERS_OMITTED__ || {})[String(hotelCode)] || 0;
    var html = hbDebugTariffsEnabled()
      ? '<p class="hb-funnel-small hb-funnel-rates-intro hb-funnel-rates-intro--debug"><strong>Debug F4:</strong> listado completo de tarifas HB. ' +
        'Verde = paquete con GF usando tarifa <em>empaquetada</em>.</p>'
      : '<p class="hb-funnel-small hb-funnel-rates-intro">Hemos aplicado la tarifa más económica. ' +
        'Puedes <strong>cambiar habitación o régimen</strong> abajo (precio en verde = paquete con green fees incluidos).</p>';
    if (omitted > 0 && !hbHideHotelEuroUi()) {
      html +=
        '<p class="hb-funnel-small">Se ocultan ' +
        omitted +
        ' tarifa(s) HB equivalentes; se muestra la más barata de cada grupo.</p>';
    } else if (omitted > 0) {
      html += '<p class="hb-funnel-small">Se agrupan opciones equivalentes; se muestra la opción paquete aplicable.</p>';
    }
    html += '<ul class="hb-funnel-rate-list">';
    offers.forEach(function (o, idx) {
      var label;
      var hint;
      if (hbHideHotelEuroUi()) {
        label = funnelRatePickLabel(o);
        hint = funnelRatePickSubhint(o);
      } else {
        label = (o.roomName || 'Habitación') + ' · ' + (o.boardName || o.boardCode || 'Régimen');
        if (o.price) label += ' · Total estancia ' + o.price;
        label += ' · ' + o.rateType;
        hint = o.listHint || rateOfferListHint(o);
      }
      var pkgTotal = calcTotalPaquete(o);
      var priceBadge = pkgTotal != null
        ? '<span class="hb-funnel-rate-price" title="Total del paquete: alojamiento + green fees">' +
          escapeHtml(fmtEuros(pkgTotal) + ' €') +
          '</span>'
        : '';
      var pkgNote =
        pkgTotal != null
          ? '<span class="hb-funnel-rate-pick__pkg-note">paquete · green fees incl.</span>'
          : '';
      html +=
        '<li><label class="hb-funnel-rate-pick"><input type="radio" name="hb-funnel-rate-pick" value="' +
        escapeHtml(o.rateKey) +
        '" data-rate-type="' +
        escapeHtml(o.rateType) +
        '"' +
        (idx === checkedIdx ? ' checked' : '') +
        '><span class="hb-funnel-rate-pick__body"><span class="hb-funnel-rate-pick__main">' +
        '<span class="hb-funnel-rate-pick__label">' + escapeHtml(label) + '</span>' +
        '<span class="hb-funnel-rate-pick__price-col">' + priceBadge + pkgNote + '</span>' +
        '</span>' +
        promotionsBesideRateHtml(o) +
        excludedTaxesBesideRateHtml(o) +
        (hint
          ? '<span class="hb-funnel-rate-pick__sub">' + escapeHtml(hint) + '</span>'
          : '') +
        (hbTariffDebugHtmlForOffer(o)
          ? '<span class="hb-funnel-rate-pick__sub hb-funnel-rate-pick__sub--debug">' +
            hbTariffDebugHtmlForOffer(o) +
            '</span>'
          : '') +
        '</span></label></li>';
    });
    html += '</ul>';
    box.innerHTML = html;
    var funnelForm = getForm();
    if (funnelForm && !renderOpts.skipValidationSync) syncFunnelValidationFromPickedRate(host, funnelForm);
    if (host.__hbAutoConfirmPending && typeof host.__hbRunAutoConfirm === 'function') {
      host.__hbAutoConfirmPending = false;
      setTimeout(function () {
        host.__hbRunAutoConfirm();
      }, 0);
    }
  }

  function enrichOfferWithHotelContent(offer, hotelCode) {
    if (!offer) return offer;
    try {
      var meta = window.__HB_CONTENT_BY_CODE && window.__HB_CONTENT_BY_CODE[String(hotelCode)];
      if (meta && Array.isArray(meta.facilitiesWithCharge) && meta.facilitiesWithCharge.length) {
        offer.facilitiesWithCharge = meta.facilitiesWithCharge.slice();
      }
      if (meta) {
        var hotelF = Array.isArray(meta.hotelFacilities) ? meta.hotelFacilities : [];
        var roomF = Array.isArray(meta.roomFacilities) ? meta.roomFacilities : [];
        var bits = hotelF.concat(roomF).filter(Boolean).slice(0, 10);
        if (bits.length) offer.hotelFacilitiesSummary = bits.join(' · ');
      }
    } catch (e0) {}
    return offer;
  }

  function getPickedOfferFromFunnel(host, hotelCode) {
    var picked = host.querySelector('input[name="hb-funnel-rate-pick"]:checked');
    var offers = getFunnelOffersForDisplay(hotelCode);
    var offer = null;
    if (picked) {
      var rk = picked.value;
      for (var i = 0; i < offers.length; i++) {
        if (offers[i].rateKey === rk) {
          offer = offers[i];
          break;
        }
      }
    }
    if (!offer && offers.length) offer = offers[0];
    offer = enrichOfferWithHotelContent(offer, hotelCode);
    return normalizeOfferOccupancyFields(offer);
  }

  /** Asegura rateChildren/rooms/adults desde rateKey u occupancyLabel (HB a veces manda children=0). */
  function normalizeOfferOccupancyFields(offer) {
    if (!offer) return offer;
    var occKey = parseOccupancyFromRateKey(offer.rateKey);
    if (occKey) {
      if (offer.rateRooms == null) offer.rateRooms = occKey.rooms;
      if (offer.rateAdults == null) offer.rateAdults = occKey.adults;
      if (offer.rateChildren == null || (offer.rateChildren === 0 && occKey.children > 0)) {
        offer.rateChildren = occKey.children;
      }
    }
    if (
      (offer.rateChildren == null || offer.rateChildren === 0) &&
      offer.occupancyLabel &&
      /niño/i.test(String(offer.occupancyLabel))
    ) {
      var mCh = String(offer.occupancyLabel).match(/(\d+)\s*niñ/i);
      if (mCh) offer.rateChildren = parseInt(mCh[1], 10) || 1;
    }
    return offer;
  }

  /** Tarifa BOOKABLE más barata con cupo suficiente (lista ya ordenada por precio). */
  function pickDefaultBookableOffer(offers, occ) {
    if (!offers || !offers.length) return null;
    for (var i = 0; i < offers.length; i++) {
      var o = offers[i];
      if (String(o.rateType || '').toUpperCase() !== 'BOOKABLE') continue;
      if (!rateHasSufficientAllotment(o, occ)) continue;
      return o;
    }
    return null;
  }

  /**
   * Fija hotel + tarifa para resumen y pago (hb_funnel_ready, hotel-noche-*).
   * @returns {boolean}
   */
  function applySplitBookingsToResumen(form) {
    var bookings = getSplitBookings(form).filter(function (b) {
      return b && b.ready;
    });
    var totalBook = 0;
    var totalRef = 0;
    bookings.forEach(function (b) {
      if (b.bookNet != null && isFinite(b.bookNet)) totalBook += Number(b.bookNet);
      if (b.refNet != null && isFinite(b.refNet)) totalRef += Number(b.refNet);
    });
    var refInp = form.querySelector('input[name="hb_hotel_stay_ref_net"]');
    var bookInp = form.querySelector('input[name="hb_hotel_stay_book_net"]');
    if (refInp) refInp.value = totalRef > 0 ? String(Math.round(totalRef * 100) / 100) : '';
    if (bookInp) bookInp.value = totalBook > 0 ? String(Math.round(totalBook * 100) / 100) : '';
    var nochesInput = form.querySelector('input[name="noches"]');
    var n = Math.max(1, parseInt((nochesInput && nochesInput.value) || '1', 10) || 1);
    var hotelVal = bookings.length ? 'hb-' + String(bookings[0].code) : '';
    for (var hi = 1; hi <= n; hi++) {
      var inp = form.querySelector('input[name="hotel-noche-' + hi + '"]');
      if (inp && hotelVal) inp.value = hotelVal;
    }
  }

  function applyHotelConfirm(host, form, resultEl, opts) {
    opts = opts || {};
    var hotelCode = (form.querySelector('input[name="hb_selected_hotel_code"]') || {}).value || '';
    if (!hotelCode) return false;
    if ((form.querySelector('input[name="hb_rate_validated"]') || {}).value !== '1') return false;
    var rkConfirm = getSelectedRateKeyFromFunnel(host, form);
    if (!rkConfirm) return false;
    var offerConfirm = normalizeOfferOccupancyFields(getPickedOfferFromFunnel(host, hotelCode));
    var occConfirm = resolveBookingOccupancy(offerConfirm, rkConfirm, new FormData(form));
    // Ya no bloqueamos por rateMissingChildren: esa comprobación daba falsos positivos
    // con tarifas que sí muestran «1 niño» y impedía marcar hb_funnel_ready.
    if (offerConfirm && !rateHasSufficientAllotment(offerConfirm, occConfirm)) {
      if (resultEl) {
        resultEl.innerHTML =
          '<p class="hb-funnel-warn">Cupo insuficiente (Cupo HB ' +
          escapeHtml(String(offerConfirm.allotment)) +
          ' para ' +
          occConfirm.rooms +
          ' habitación(es)). Elige otra tarifa o reduce habitaciones.</p>';
      }
      return false;
    }

    if (isSplitCoverageMode()) {
      ensureHotelFunnelHiddenInputs(form);
      var bookNet = hotelStayNetForCustomer(offerConfirm);
      var refNet =
        offerConfirm && offerConfirm.resumenHotelRefNet != null && isFinite(Number(offerConfirm.resumenHotelRefNet))
          ? Number(offerConfirm.resumenHotelRefNet)
          : bookNet;
      saveSplitBooking(form, {
        code: String(hotelCode),
        name: catalogNameForCode(hotelCode),
        adults: occConfirm.adults,
        rooms: occConfirm.rooms,
        rateKey: rkConfirm,
        rateType: String((offerConfirm && offerConfirm.rateType) || 'BOOKABLE'),
        bookNet: bookNet,
        refNet: refNet,
        ready: true,
      });
      applySplitBookingsToResumen(form);
      var required = getRequiredSplitHotelCodes();
      var doneCount = getSplitBookings(form).filter(function (b) {
        return b && b.ready;
      }).length;
      var allDone = allSplitHotelsConfigured(form);
      if (allDone) {
        form.querySelector('input[name="hb_funnel_ready"]').value = '1';
        if (resultEl) {
          resultEl.innerHTML =
            '<p class="hb-funnel-ok"><strong>Reparto de alojamiento configurado.</strong> ' +
            required.length +
            ' hoteles listos para el grupo.</p>';
        }
      } else {
        form.querySelector('input[name="hb_funnel_ready"]').value = '';
        setSelectedHotelInHiddenInputs(form, '', '', '', '', '');
        form.querySelector('input[name="hb_rate_validated"]').value = '';
        if (host) {
          host.__hbRatesHotel = '';
          host.__hbAutoRatesPending = false;
          var ratesBox = host.querySelector('#hb-funnel-inline-rates');
          if (ratesBox) ratesBox.innerHTML = '';
        }
        if (resultEl) {
          resultEl.innerHTML =
            '<p class="hb-funnel-ok"><strong>Hotel configurado (' +
            doneCount +
            '/' +
            required.length +
            ').</strong> Configura el siguiente hotel de la combinación.</p>';
        }
        opts.scrollToPay = false;
      }
      markHotelCardsPicked(form);
      var root = document.getElementById(pageOpts().preciosBlockId || 'hotelbeds-precios-block');
      if (root) syncHotelCardsListVisibility(root, form);
      if (!allDone) {
        var comboNext = getActiveSplitCombo();
        var nextCode = comboNext ? nextUnconfiguredHotelInCombo(form, comboNext) : null;
        if (nextCode && root) {
          setTimeout(function () {
            activateSplitHotelInFunnel(form, nextCode, root);
          }, 250);
        }
      }
      if (typeof window.actualizarResumen === 'function') window.actualizarResumen();
      else triggerResumenUpdate();
      if (allDone && opts.scrollToPay !== false) {
        var reservarAll = document.querySelector('button.btn-reservar-paquete');
        if (reservarAll && reservarAll.scrollIntoView) {
          reservarAll.scrollIntoView({ behavior: 'smooth', block: 'center' });
          reservarAll.focus({ preventScroll: true });
        }
      } else if (!allDone && root) {
        var list = root.querySelector('.hotelbeds-list');
        if (list && list.scrollIntoView) list.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return true;
    }

    form.querySelector('input[name="hb_occ_adults"]').value = String(occConfirm.adults);
    form.querySelector('input[name="hb_occ_rooms"]').value = String(occConfirm.rooms);
    form.querySelector('input[name="hb_occ_children"]').value = String(occConfirm.children || 0);
    var agesConfirm = Array.isArray(occConfirm.childAges) ? occConfirm.childAges : [];
    form.querySelector('input[name="hb_children_ages"]').value = agesConfirm.join(',');
    if (offerConfirm) syncHbResumenPriceHidden(form, offerConfirm);
    form.querySelector('input[name="hb_funnel_ready"]').value = '1';
    var nochesInput = form.querySelector('input[name="noches"]');
    var noches = nochesInput ? nochesInput.value : '1';
    var n = Math.max(1, parseInt(noches || '1', 10) || 1);
    for (var hi = 1; hi <= n; hi++) {
      var inp = form.querySelector('input[name="hotel-noche-' + hi + '"]');
      if (inp) inp.value = 'hb-' + String(hotelCode);
    }
    document.querySelectorAll('.hotelbeds-card--selectable').forEach(function (el) {
      var c = el.getAttribute('data-hb-hotel-code');
      if (c === String(hotelCode)) el.classList.add('hotelbeds-card--picked');
      else el.classList.remove('hotelbeds-card--picked');
    });
    if (typeof window.actualizarResumen === 'function') window.actualizarResumen();
    else triggerResumenUpdate();
    if (opts.scrollToPay !== false) {
      var reservar = document.querySelector('button.btn-reservar-paquete');
      if (reservar && reservar.scrollIntoView) {
        reservar.scrollIntoView({ behavior: 'smooth', block: 'center' });
        reservar.focus({ preventScroll: true });
      }
    }
    return true;
  }

  function deriveRateKeyFromAvailabilityForHotel(av, hotelCode) {
    var hotels = (av && av.hotels && av.hotels.hotels) || (av && av.data && av.data.hotels && av.data.hotels.hotels) || [];
    if (!Array.isArray(hotels) || hotels.length === 0) return null;
    var wanted = String(hotelCode || '');
    var pickedHotel = null;
    for (var i = 0; i < hotels.length; i++) {
      var h = hotels[i];
      if (h && String(h.code || '') === wanted) {
        pickedHotel = h;
        break;
      }
    }
    if (!pickedHotel) pickedHotel = hotels[0];
    var rooms = pickedHotel.rooms || [];
    if (!rooms.length) return null;
    // Prefer a BOOKABLE rateKey anywhere in rooms.
    for (var ri = 0; ri < rooms.length; ri++) {
      var rt = pickPreferredRate(rooms[ri].rates || []);
      if (rt && rt.rateKey) return String(rt.rateKey);
    }
    return null;
  }

  function fetchJson(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) { return parseHotelbedsResponse(r); });
  }

  function readTamanioGrupo(form) {
    var tg = form.querySelector('input[name="tamanio_grupo"]');
    return tg ? String(tg.value || '').trim() : '';
  }

  /**
   * Habitaciones por defecto en disponibilidad HB: cama doble (máx. 2 adultos/hab.).
   * Grupos de golf y reparto multi-hotel usan varias dobles, no triples ni familiares.
   */
  function defaultRoomsForAdults(adults) {
    var n = Math.max(1, parseInt(adults, 10) || 1);
    return clamp(Math.ceil(n / 2), 1, HB_MAX_ROOMS);
  }

  function adultsRoomsFromGroupSize(form) {
    var raw = readTamanioGrupo(form);
    var adults = clamp(getInt(raw, 2), 1, 54);
    var rooms = defaultRoomsForAdults(adults);
    return { adults: adults, rooms: rooms, raw: raw };
  }

  function syncFunnelAdultsFromGroup(host, form, adultsInp, roomsInp, force) {
    if (!host || !adultsInp || !roomsInp) return;
    // Si el usuario ha editado manualmente adultos o habitaciones, no sobreescribir
    // aunque tamanio_grupo cambie (force=true). Solo se puede forzar en la carga inicial (force=false).
    if (force && (adultsInp.__hbUserEdited || roomsInp.__hbUserEdited)) return;
    var sug = adultsRoomsFromGroupSize(form);
    var tgNow = sug.raw;
    if (!force && host.__hbLastTg === tgNow) return;
    host.__hbLastTg = tgNow;
    adultsInp.value = String(sug.adults);
    roomsInp.value = String(sug.rooms);
  }

  function wireHotelFunnelInlineHandlers(root, form) {
    var host = ensureHotelFunnelInlineUi(root);
    if (!host) return;

    var hotelLine = host.querySelector('#hb-funnel-inline-hotel');
    var datesLine = host.querySelector('#hb-funnel-inline-dates');
    var adultsInp = host.querySelector('#hb-funnel-inline-adults');
    var roomsInp = host.querySelector('#hb-funnel-inline-rooms');
    ensureFunnelChildrenUi(host);
    var childrenInp = host.querySelector('#hb-funnel-inline-children');
    if (childrenInp && !String(childrenInp.value || '').trim()) childrenInp.value = '0';
    renderChildAgeInputs(host, childrenInp ? childrenInp.value : 0);
    syncChildrenToHidden(form, host, childrenInp ? childrenInp.value : 0);
    var btnCheck = host.querySelector('#hb-funnel-inline-check');
    var btnConfirm = host.querySelector('#hb-funnel-inline-confirm');
    var btnChangeHotel = host.querySelector('#hb-funnel-inline-change-hotel');
    var result = host.querySelector('#hb-funnel-inline-result');

    var sug0 = adultsRoomsFromGroupSize(form);
    var adultsDefault = sug0.adults;
    var roomsDefault = sug0.rooms;
    syncFunnelAdultsFromGroup(host, form, adultsInp, roomsInp, false);

    function getSelectedHotelCode() {
      return (form.querySelector('input[name="hb_selected_hotel_code"]') || {}).value || '';
    }
    function isRateValidated() {
      return (form.querySelector('input[name="hb_rate_validated"]') || {}).value === '1';
    }

    function refreshUiState() {
      var hotelCode = getSelectedHotelCode();
      btnCheck.disabled = !hotelCode;
      var picked = getPickedOfferFromFunnel(host, hotelCode);
      var needsCheck =
        picked && String(picked.rateType || '').toUpperCase() === 'RECHECK' && !isRateValidated();
      btnConfirm.disabled = !hotelCode || !isRateValidated();
      var splitMode = isSplitCoverageMode();
      var splitDone = splitMode ? getSplitBookings(form).filter(function (b) { return b && b.ready; }).length : 0;
      var splitTotal = splitMode ? getRequiredSplitHotelCodes().length : 0;
      btnConfirm.title = !hotelCode
        ? 'Elige un hotel.'
        : needsCheck
          ? 'Tarifa RECHECK: pulsa «' + hbFunnelConditionsButtonText() + '» antes de confirmar.'
          : !isRateValidated()
            ? 'Elige una tarifa (habitación y régimen).'
            : splitMode
              ? 'Confirmar este hotel (' + (splitDone + 1) + '/' + splitTotal + ').'
              : 'Fijar este hotel y tarifa antes del pago.';
      if (btnConfirm && splitMode) {
        btnConfirm.textContent = isRateValidated()
          ? 'Confirmar hotel (' + (splitDone + 1) + '/' + splitTotal + ')'
          : 'Confirmar hotel y tarifa';
      } else if (btnConfirm) {
        btnConfirm.textContent = 'Confirmar hotel y tarifa';
      }
      if (btnChangeHotel) {
        btnChangeHotel.hidden = !hotelCode;
        if (splitMode && hotelCode) btnChangeHotel.textContent = 'Elegir otro hotel del reparto';
      }
      syncHotelCardsListVisibility(root, form);
      var occHint = host.querySelector('#hb-funnel-inline-occ-hint');
      var splitStepsEl = host.querySelector('#hb-funnel-inline-split-steps');
      if (!hotelCode) {
        hotelLine.hidden = false;
        hotelLine.textContent = 'Elige un hotel para continuar.';
        if (datesLine) datesLine.textContent = '';
        if (occHint) {
          occHint.hidden = true;
          occHint.textContent = '';
        }
        if (splitStepsEl) {
          splitStepsEl.hidden = true;
          splitStepsEl.innerHTML = '';
        }
        host.__hbRatesHotel = '';
        host.__hbAutoRatesHotel = '';
        return;
      }
      hotelLine.hidden = true;
      hotelLine.textContent = '';
      if (datesLine) {
        try {
          var range = getCheckInCheckOut(new FormData(form));
          var datesTxt = '';
          if (range && range.checkIn && range.checkOut) {
            datesTxt = 'Fechas: ' + range.checkIn + ' → ' + range.checkOut;
          }
          if (splitMode && hotelCode) {
            var covSplit = window.__HB_COVERAGE__ || {};
            var partAdults =
              covSplit.hotelPartByCode && covSplit.hotelPartByCode[String(hotelCode)] != null
                ? parseInt(covSplit.hotelPartByCode[String(hotelCode)], 10)
                : 0;
            var groupTotal = parseInt(covSplit.totalAdults, 10) || 0;
            if (partAdults > 0 && groupTotal > partAdults) {
              var partRooms = defaultRoomsForAdults(partAdults);
              datesTxt +=
                (datesTxt ? ' · ' : '') +
                'Grupo ' +
                groupTotal +
                ' pers.: en este hotel, ' +
                partAdults +
                ' pers. en ' +
                partRooms +
                ' hab. dobles';
            }
          }
          datesLine.textContent = datesTxt;
        } catch (e0) {
          datesLine.textContent = '';
        }
      }
      if (occHint) {
        var occForHint = getFunnelOccupancyForAvailability(form, adultsInp, roomsInp, childrenInp, adultsDefault, roomsDefault);
        var hintTxt = formatHbSearchOccHint(occForHint);
        occHint.textContent = hintTxt;
        occHint.hidden = !hintTxt;
      }
      var activeComboUi = getActiveSplitCombo();
      if (splitMode && activeComboUi && activeComboUi.segments.length >= 2) {
        renderSplitFunnelSteps(host, form, activeComboUi, hotelCode);
        var stepIdx = 0;
        for (var si = 0; si < activeComboUi.segments.length; si++) {
          if (String(activeComboUi.segments[si].code) === String(hotelCode)) {
            stepIdx = si + 1;
            break;
          }
        }
        if (stepIdx) {
          hotelLine.hidden = false;
          hotelLine.textContent =
            'Paso ' +
            stepIdx +
            '/' +
            activeComboUi.segments.length +
            ': ' +
            catalogNameForCode(hotelCode);
        }
      } else if (splitStepsEl) {
        splitStepsEl.hidden = true;
        splitStepsEl.innerHTML = '';
      }
      hydrateRateOffersFromLastAvailability(
        hotelCode,
        getFunnelOccupancyForAvailability(form, adultsInp, roomsInp, childrenInp, adultsDefault, roomsDefault)
      );
      var ratesBox = host.querySelector('#hb-funnel-inline-rates');
      var hasList = ratesBox && ratesBox.querySelector('input[name="hb-funnel-rate-pick"]');
      var funnelOccNow = getFunnelOccupancyForAvailability(
        form,
        adultsInp,
        roomsInp,
        childrenInp,
        adultsDefault,
        roomsDefault
      );
      var cachedOffers = (window.__HB_RATE_OFFERS_BY_CODE__ || {})[String(hotelCode)] || [];
      var ratesMatchOcc =
        hasList &&
        host.__hbRatesHotel === hotelCode &&
        hbFunnelOffersCacheMatches(
          hotelCode,
          getCheckInCheckOut(new FormData(form)) || { checkIn: '', checkOut: '' },
          funnelOccNow
        ) &&
        offersMatchRequestedChildren(cachedOffers, funnelOccNow);
      if (ratesMatchOcc) {
        if (host.__hbAutoConfirmPending && typeof host.__hbRunAutoConfirm === 'function') {
          host.__hbAutoConfirmPending = false;
          setTimeout(function () {
            host.__hbRunAutoConfirm();
          }, 0);
        }
        return;
      }
      // Ocupación cambió (p.ej. niños): limpiar tarifas adult-only y recargar.
      if (hasList && host.__hbRatesHotel === hotelCode && !ratesMatchOcc) {
        host.__hbRatesHotel = '';
        if (window.__HB_RATE_OFFERS_BY_CODE__) delete window.__HB_RATE_OFFERS_BY_CODE__[String(hotelCode)];
        if (window.__HB_FUNNEL_OFFERS_KEY_BY_HOTEL__) {
          delete window.__HB_FUNNEL_OFFERS_KEY_BY_HOTEL__[String(hotelCode)];
        }
      }
      var priorKey = getSelectedRateKeyFromFunnel(host, form);
      host.__hbRatesHotel = hotelCode;
      renderFunnelRateChoices(host, hotelCode, priorKey);
      var offers = (window.__HB_RATE_OFFERS_BY_CODE__ || {})[String(hotelCode)] || [];
      if ((!offers.length || !offersMatchRequestedChildren(offers, funnelOccNow)) && !host.__hbAutoRatesPending) {
        var checkInOut = getCheckInCheckOut(new FormData(form));
        if (checkInOut) {
          host.__hbAutoRatesPending = true;
          host.__hbAutoRatesHotel = hotelCode;
          if (ratesBox) {
            ratesBox.innerHTML = '<p class="hb-funnel-small">Cargando tarifas para este hotel...</p>';
          }
          var occ = funnelOccNow;
          fetchFunnelAvailabilityOffers(hotelCode, checkInOut, occ)
            .then(function () {
              if (getSelectedHotelCode() !== hotelCode) return;
              host.__hbRatesHotel = '';
              refreshUiState();
            })
            .catch(function (e) {
              if (getSelectedHotelCode() !== hotelCode) return;
              if (ratesBox) {
                ratesBox.innerHTML =
                  '<p class="hb-funnel-warn">' +
                  escapeHtml(e.message || String(e)) +
                  '</p><p class="hb-funnel-small">Puedes pulsar «' +
                  hbFunnelConditionsButtonText() +
                  '» para reintentar.</p>';
              }
            })
            .finally(function () {
              host.__hbAutoRatesPending = false;
            });
        }
      }
    }

    host.__hbRunAutoConfirm = function () {
      var hotelCode = getSelectedHotelCode();
      if (!hotelCode) return;
      var offers = (window.__HB_RATE_OFFERS_BY_CODE__ || {})[String(hotelCode)] || [];
      if (!offers.length) return;
      var occ = getFunnelOccupancyForAvailability(form, adultsInp, roomsInp, childrenInp, adultsDefault, roomsDefault);
      adultsInp.value = String(occ.partySize || occ.totalAdults + (occ.children || 0));
      roomsInp.value = String(occ.rooms);
      if (childrenInp) childrenInp.value = String(occ.children || 0);
      var def = pickDefaultBookableOffer(offers, occ);
      if (!def) {
        result.innerHTML =
          '<p class="hb-funnel-warn">No hay tarifa instantánea para esta ocupación. Pulsa «' +
          escapeHtml(hbFunnelConditionsButtonText()) +
          '» o elige otra habitación.</p>';
        return;
      }
      var radios = host.querySelectorAll('input[name="hb-funnel-rate-pick"]');
      var matched = false;
      for (var ri = 0; ri < radios.length; ri++) {
        if (radios[ri].value === def.rateKey) {
          radios[ri].checked = true;
          matched = true;
          break;
        }
      }
      if (!matched) {
        host.__hbAutoConfirmPending = true;
        renderFunnelRateChoices(host, hotelCode, def.rateKey);
        return;
      }
      markRateValidated(form, def.rateKey, def.rateType, def);
      if (!applyHotelConfirm(host, form, result, { scrollToPay: false })) return;
      if (result) result.innerHTML = '';
      refreshHotelCardPackagePrices();
      refreshUiState();
    };

    if (!host.__hbBound) {
      host.__hbBound = true;
      host.addEventListener('click', function (ev) {
        var occBtn = ev.target && ev.target.closest
          ? ev.target.closest('.ancillary-btn-minus, .ancillary-btn-plus')
          : null;
        if (occBtn && occBtn.closest('.hb-funnel-counter-wrap')) {
          var wrap = occBtn.closest('.ancillary-counter-wrap');
          var input = wrap && wrap.querySelector('.ancillary-counter');
          if (input) {
            var min = parseInt(input.getAttribute('min') || '1', 10);
            var max = parseInt(input.getAttribute('max') || '99', 10);
            var val = parseInt(input.value || String(min), 10);
            if (occBtn.classList.contains('ancillary-btn-minus')) {
              val = Math.max(min, val - 1);
            } else {
              val = Math.min(max, val + 1);
            }
            input.value = String(val);
            if (input.id === 'hb-funnel-inline-children') {
              renderChildAgeInputs(host, val);
              syncChildrenToHidden(form, host, val);
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
          ev.stopPropagation();
          return;
        }
        ev.stopPropagation();
      });

      if (!form.__hbTamanioSyncListener) {
        form.__hbTamanioSyncListener = true;
        form.addEventListener('input', function (ev) {
          if (!ev.target || ev.target.name !== 'tamanio_grupo') return;
          var h = document.getElementById('hb-hotel-funnel-inline');
          if (!h) return;
          var ai = h.querySelector('#hb-funnel-inline-adults');
          var ri = h.querySelector('#hb-funnel-inline-rooms');
          syncFunnelAdultsFromGroup(h, form, ai, ri, true);
        });
      }

      host.addEventListener('change', function (ev) {
        if (!ev.target || ev.target.name !== 'hb-funnel-rate-pick') return;
        form.querySelector('input[name="hb_funnel_ready"]').value = '';
        syncFunnelValidationFromPickedRate(host, form);
        var hotelCode = getSelectedHotelCode();
        var offer = getPickedOfferFromFunnel(host, hotelCode);
        if (offer && String(offer.rateType || '').toUpperCase() === 'BOOKABLE' && isRateValidated()) {
          if (applyHotelConfirm(host, form, result, { scrollToPay: false })) {
            if (result) result.innerHTML = '';
            refreshHotelCardPackagePrices();
          }
        } else if (offer && String(offer.rateType || '').toUpperCase() === 'RECHECK') {
          form.querySelector('input[name="hb_funnel_ready"]').value = '';
          result.innerHTML =
            '<p class="hb-funnel-warn">Tarifa RECHECK: pulsa «' +
            escapeHtml(hbFunnelConditionsButtonText()) +
            '» para poder reservar.</p>';
        }
        refreshUiState();
      });

      function resetFunnelValidation() {
        form.querySelector('input[name="hb_rate_validated"]').value = '';
        form.querySelector('input[name="hb_funnel_ready"]').value = '';
        host.__hbAutoConfirmPending = true;
        refreshUiState();
      }
      adultsInp.addEventListener('input', function () {
        adultsInp.__hbUserEdited = true;
        if (childrenInp) {
          var sp = splitPartyIntoAdultsAndChildren(adultsInp.value, childrenInp.value);
          if (String(childrenInp.value) !== String(sp.children)) {
            childrenInp.value = String(sp.children);
            renderChildAgeInputs(host, sp.children);
            syncChildrenToHidden(form, host, sp.children);
          }
        }
        resetFunnelValidation();
      });
      adultsInp.addEventListener('change', function () {
        adultsInp.__hbUserEdited = true;
        resetFunnelValidation();
      });
      roomsInp.addEventListener('input', function () {
        roomsInp.__hbUserEdited = true;
        resetFunnelValidation();
      });
      roomsInp.addEventListener('change', function () {
        roomsInp.__hbUserEdited = true;
        resetFunnelValidation();
      });
      if (childrenInp) {
        function onChildrenChanged() {
          var split = splitPartyIntoAdultsAndChildren(
            adultsInp && adultsInp.value,
            childrenInp.value
          );
          childrenInp.value = String(split.children);
          renderChildAgeInputs(host, split.children);
          syncChildrenToHidden(form, host, split.children);
          // Mantener habitaciones; solo invalidar tarifas adult-only.
          host.__hbRatesHotel = '';
          var hc = getSelectedHotelCode();
          if (hc) {
            if (window.__HB_RATE_OFFERS_BY_CODE__) delete window.__HB_RATE_OFFERS_BY_CODE__[String(hc)];
            if (window.__HB_FUNNEL_OFFERS_KEY_BY_HOTEL__) {
              delete window.__HB_FUNNEL_OFFERS_KEY_BY_HOTEL__[String(hc)];
            }
          }
          resetFunnelValidation();
        }
        childrenInp.addEventListener('input', onChildrenChanged);
        childrenInp.addEventListener('change', onChildrenChanged);
      }
      host.addEventListener('input', function (ev) {
        if (!ev.target || !ev.target.classList || !ev.target.classList.contains('hb-funnel-child-age-inp')) return;
        syncChildrenToHidden(form, host, childrenInp ? childrenInp.value : 0);
        host.__hbRatesHotel = '';
        var hcAge = getSelectedHotelCode();
        if (hcAge) {
          if (window.__HB_RATE_OFFERS_BY_CODE__) delete window.__HB_RATE_OFFERS_BY_CODE__[String(hcAge)];
          if (window.__HB_FUNNEL_OFFERS_KEY_BY_HOTEL__) {
            delete window.__HB_FUNNEL_OFFERS_KEY_BY_HOTEL__[String(hcAge)];
          }
        }
        resetFunnelValidation();
      });

      btnCheck.addEventListener('click', function () {
        var hotelCode = getSelectedHotelCode();
        if (!hotelCode) return;
        var checkInOut = getCheckInCheckOut(new FormData(form));
        if (!checkInOut) {
          result.innerHTML = '<p class="hb-funnel-warn">Selecciona fechas antes.</p>';
          return;
        }
        var occ = getFunnelOccupancyForAvailability(form, adultsInp, roomsInp, childrenInp, adultsDefault, roomsDefault);
        adultsInp.value = String(occ.partySize || occ.totalAdults + (occ.children || 0));
        roomsInp.value = String(occ.rooms);
        if (childrenInp) childrenInp.value = String(occ.children || 0);
        syncChildrenToHidden(form, host, occ.children || 0);
        var previousRateKey = getSelectedRateKeyFromFunnel(host, form);
        setSelectedHotelInHiddenInputs(
          form,
          hotelCode,
          '',
          occ.totalAdults,
          occ.rooms,
          '',
          occ.children || 0,
          (occ.childAges || []).join(',')
        );
        refreshUiState();

        var cachedOffersBtn = (window.__HB_RATE_OFFERS_BY_CODE__ || {})[String(hotelCode)] || [];
        var offersReady =
          cachedOffersBtn.length > 0 &&
          hbFunnelOffersCacheMatches(hotelCode, checkInOut, occ) &&
          offersMatchRequestedChildren(cachedOffersBtn, occ);
        result.textContent = offersReady
          ? 'Preparando condiciones de la tarifa…'
          : 'Consultando disponibilidad...';
        btnCheck.disabled = true;
        var fetchStep = offersReady ? Promise.resolve() : fetchFunnelAvailabilityOffers(hotelCode, checkInOut, occ);

        fetchStep
          .then(function () {
            host.__hbRatesHotel = String(hotelCode);
            renderFunnelRateChoices(host, hotelCode, previousRateKey);
            var offer = getPickedOfferFromFunnel(host, hotelCode);
            if (!offer) throw new Error('Selecciona una tarifa.');
            if (offer.rateType === 'RECHECK') {
              var base = window.location.origin || '';
              return fetchJson(base + '/api/hotelbeds-availability', { action: 'checkrates', rooms: [{ rateKey: offer.rateKey }] }).then(function (cr) {
                if (!cr || cr.ok !== true) {
                  var crErr = (cr && (cr.hotelbedsError || cr.error)) || '';
                  var crMsg =
                    typeof crErr === 'string' ? crErr : crErr && crErr.message ? String(crErr.message) : String(crErr);
                  if (isHbQuotaLikeMessage(crMsg, cr)) {
                    throw new Error(
                      'Cuota de consultas Hotelbeds superada. Espera unos minutos o revisa el límite en tu cuenta.'
                    );
                  }
                  throw new Error(crMsg || 'CheckRate falló');
                }
                return offerFromCheckrateData(cr.data, offer);
              });
            }
            return offer;
          })
          .then(function (offer) {
            markRateValidated(form, offer.rateKey, offer.rateType, offer);
            form.querySelector('input[name="hb_occ_adults"]').value = String(occ.totalAdults);
            form.querySelector('input[name="hb_occ_rooms"]').value = String(occ.rooms);
            form.querySelector('input[name="hb_occ_children"]').value = String(occ.children || 0);
            syncChildrenToHidden(form, host, occ.children || 0);
            refreshUiState();
            result.innerHTML = renderFunnelConditionsHtml(offer);
            if (String(offer.rateType || '').toUpperCase() === 'BOOKABLE') {
              applyHotelConfirm(host, form, result, { scrollToPay: false });
            }
          })
          .catch(function (e) {
            refreshUiState();
            result.innerHTML = '<p class="hb-funnel-warn">' + escapeHtml(e.message || String(e)) + '</p>';
          })
          .finally(function () {
            btnCheck.disabled = false;
          });
      });

      btnConfirm.addEventListener('click', function () {
        if (!isRateValidated()) {
          result.innerHTML = '<p class="hb-funnel-warn">Elige una tarifa o pulsa «' + escapeHtml(hbFunnelConditionsButtonText()) + '».</p>';
          return;
        }
        applyHotelConfirm(host, form, result, { scrollToPay: true });
      });
    }

    if (btnChangeHotel && !host.__hbChangeHotelWired) {
      host.__hbChangeHotelWired = true;
      btnChangeHotel.addEventListener('click', function () {
        clearHotelPickAndShowList(form, host, root);
        var list = root && root.querySelector('.hotelbeds-list');
        if (list && list.scrollIntoView) list.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    host.__hbRefreshUiState = refreshUiState;
    refreshUiState();
  }

  function bindSelectableHotelCards() {
    var o = pageOpts();
    var formId = o.formId || 'configuradorForm';
    var form = document.getElementById(formId);
    if (!form) return;
    var nochesInput = form.querySelector('input[name="noches"]');
    var noches = nochesInput ? nochesInput.value : '1';
    ensureHiddenHotelInputs(form, noches);

    ensureHotelFunnelHiddenInputs(form);

    function onActivate(ev) {
      var card = ev.target && ev.target.closest ? ev.target.closest('.hotelbeds-card--selectable') : null;
      if (!card) return;
      if (ev.target && ev.target.tagName === 'A') return;
      var root = document.getElementById(o.preciosBlockId || 'hotelbeds-precios-block');
      var comboId = card.getAttribute('data-hb-split-combo-id');
      if (comboId) {
        activateSplitCombo(comboId, form, root);
        return;
      }
      var code = card.getAttribute('data-hb-hotel-code');
      if (!code) return;
      activateSplitHotelInFunnel(form, code, root);
    }

    // Delegación a nivel de bloque de resultados (más robusto tras re-render).
    var root = document.getElementById(o.preciosBlockId || 'hotelbeds-precios-block');
    if (!root) return;

    // Ensure inline funnel exists and wired.
    wireHotelFunnelInlineHandlers(root, form);

    root.removeEventListener('click', onActivate);
    root.addEventListener('click', onActivate);
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      onActivate(e);
    });
  }

  /** Recalcula __HB_GF_TOTAL__ vía resumen sin tocar precios en tarjetas (p. ej. antes de pintar la lista). */
  function syncGfTotalBeforeHotelListRender() {
    var o = pageOpts();
    if (typeof o.onResumen === 'function') o.onResumen();
    else if (typeof window.actualizarResumen === 'function') window.actualizarResumen();
    else if (typeof window.actualizarResumenTorneo === 'function') window.actualizarResumenTorneo();
    else if (typeof window.actualizarResumenRyder === 'function') window.actualizarResumenRyder();
  }

  function triggerResumenUpdate() {
    syncGfTotalBeforeHotelListRender();
    refreshHotelCardPackagePrices();
    refreshFunnelRatePackagePrices();
  }

  function fetchHotelbeds(checkIn, checkOut, hotelCodes, occ) {
    var base = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    var occPayload = occToAvailabilityPayload(occ);
    return fetch(base + '/api/hotelbeds-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign(
        {
          checkIn: checkIn,
          checkOut: checkOut,
          hotelCodes: hotelCodes,
        },
        occPayload
      )),
    }).then(function (r) { return parseHotelbedsResponse(r); });
  }

  function fetchHotelbedsByDestination(checkIn, checkOut, occ) {
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
    var lastError = null;
    var seq = DESTINATIONS_LERMA_BURGOS.reduce(function (promise, dest) {
      return promise.then(function () {
        var occPayload = occToAvailabilityPayload(occ || { totalAdults: 2 });
        return fetch(base + '/api/hotelbeds-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.assign(
            {
              checkIn: checkIn,
              checkOut: checkOut,
              destinationCode: dest,
            },
            occPayload
          )),
        }).then(function (r) { return parseHotelbedsResponse(r); }).then(function (data) {
          if (data && data.error) {
            lastError = new Error(typeof data.error === 'string' ? data.error : (data.error && data.error.message) || 'Hotelbeds error');
            return data;
          }
          addHotels(data.hotels || data);
          return data;
        }).catch(function (err) {
          lastError = err;
          return {};
        });
      });
    }, Promise.resolve());
    return seq.then(function () {
      if (merged.hotels.hotels.length === 0 && lastError) {
        return Promise.reject(lastError);
      }
      return merged;
    });
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

  function shouldListHotel(h) {
    if (!h || h.code == null) return false;
    return isPriorityHotelCode(h.code);
  }

  function getAllowedHotelCodeList() {
    syncAllowedBurgosFromPriority();
    return getBrgHotelMappingCodeList().slice();
  }

  function getDisplayedHotelCodesFromLastAvail() {
    var hotels =
      (window.__HB_LAST_AVAIL__ && window.__HB_LAST_AVAIL__.hotels && window.__HB_LAST_AVAIL__.hotels.hotels) || [];
    if (!Array.isArray(hotels)) return [];
    return hotels
      .map(function (h) {
        return h && h.code != null ? String(h.code) : '';
      })
      .filter(Boolean);
  }

  function partitionAdults(total, parts) {
    total = Math.max(1, parseInt(total, 10) || 1);
    parts = Math.max(1, parseInt(parts, 10) || 1);
    var base = Math.floor(total / parts);
    var rem = total % parts;
    var out = [];
    for (var i = 0; i < parts; i++) {
      out.push(base + (i < rem ? 1 : 0));
    }
    return out;
  }

  function mergeAvailabilityResponses(results) {
    var byCode = {};
    var hotels = [];
    var errors = [];
    (results || []).forEach(function (hb) {
      if (!hb) return;
      if (hb.error) {
        errors.push(
          typeof hb.error === 'string'
            ? hb.error
            : hb.error && hb.error.message
              ? String(hb.error.message)
              : String(hb.error)
        );
        return;
      }
      var list = (hb.hotels && hb.hotels.hotels) || [];
      list.forEach(function (h) {
        var c = String(h.code || '');
        if (!c || byCode[c]) return;
        byCode[c] = h;
        hotels.push(h);
      });
    });
    return { hotels: hotels, byCode: byCode, errors: errors };
  }

  function pickHotelsWithOffersByPriority(merged, codeList, maxCount) {
    var found = [];
    var byCode = merged.byCode || {};
    for (var i = 0; i < codeList.length; i++) {
      if (maxCount != null && found.length >= maxCount) break;
      var h = byCode[String(codeList[i])];
      if (h && shouldListHotel(h) && hotelHasBookableOffers(h)) {
        found.push(h);
      }
    }
    return found;
  }

  function availableCodesForAdults(merged, codeList, adults) {
    var occ = clampHotelbedsOccupancy({ totalAdults: adults });
    var out = [];
    var byCode = merged.byCode || {};
    for (var i = 0; i < codeList.length; i++) {
      var h = byCode[String(codeList[i])];
      if (h && shouldListHotel(h) && hotelHasBookableOffers(h)) {
        out.push(String(codeList[i]));
      }
    }
    return { codes: out, occ: occ };
  }

  function findSplitAssignment(parts, availBySize, priorityList) {
    var all = findAllSplitAssignments(parts, availBySize, priorityList, 1);
    return all.length ? all[0] : null;
  }

  function findAllSplitAssignments(parts, availBySize, priorityList, maxCombos) {
    var results = [];
    var limit = Math.max(1, parseInt(maxCombos, 10) || HB_SPLIT_MAX_COMBOS);
    function dfs(pi, used, hotelObjs, occSplits) {
      if (results.length >= limit) return;
      if (pi >= parts.length) {
        results.push({
          hotels: hotelObjs.slice(),
          occSplits: occSplits.slice(),
          parts: parts.slice(),
        });
        return;
      }
      var size = parts[pi];
      var bucket = availBySize[size];
      if (!bucket || !bucket.codes || !bucket.codes.length) return;
      for (var j = 0; j < priorityList.length; j++) {
        var code = String(priorityList[j]);
        if (used[code]) continue;
        if (bucket.codes.indexOf(code) < 0) continue;
        used[code] = true;
        hotelObjs.push(bucket.byCode[code]);
        occSplits.push(bucket.occ);
        dfs(pi + 1, used, hotelObjs, occSplits);
        hotelObjs.pop();
        occSplits.pop();
        delete used[code];
        if (results.length >= limit) return;
      }
    }
    dfs(0, {}, [], []);
    return results;
  }

  function hotelDisplayName(hotel, code) {
    if (hotel) {
      var n =
        typeof hotel.name === 'string' ? hotel.name : hotel && hotel.name && hotel.name.content;
      if (n) return String(n);
    }
    return catalogNameForCode(code);
  }

  function comboMultisetKey(combo) {
    if (!combo || !combo.segments || !combo.segments.length) return combo && combo.id ? String(combo.id) : '';
    return combo.segments
      .map(function (s) {
        return String(s.code) + '@' + s.adults;
      })
      .sort()
      .join('|');
  }

  function sortComboSegmentsForDisplay(segments) {
    var priority = getBrgHotelCodeList();
    return segments.slice().sort(function (a, b) {
      var ia = priority.indexOf(String(a.code));
      var ib = priority.indexOf(String(b.code));
      ia = ia < 0 ? 9999 : ia;
      ib = ib < 0 ? 9999 : ib;
      if (ia !== ib) return ia - ib;
      return String(a.code).localeCompare(String(b.code));
    });
  }

  function buildSplitCombo(assignment, parts) {
    var hotelPartByCode = {};
    var hotelCodesOrdered = [];
    var segments = [];
    assignment.hotels.forEach(function (h, idx) {
      var c = String(h.code);
      var adults = parts[idx];
      hotelPartByCode[c] = adults;
      hotelCodesOrdered.push(c);
      var stay = getHotelLowestStayNet(h);
      segments.push({ code: c, adults: adults, hotel: h, pkgStay: stay });
    });
    segments = sortComboSegmentsForDisplay(segments);
    hotelCodesOrdered = segments.map(function (s) {
      return s.code;
    });
    var combo = {
      id: '',
      hotels: assignment.hotels,
      parts: parts.slice(),
      occSplits: assignment.occSplits,
      hotelPartByCode: hotelPartByCode,
      hotelCodes: hotelCodesOrdered,
      segments: segments,
      totalPkg: calcSplitComboPackageTotal(segments),
    };
    combo.id = comboMultisetKey(combo);
    return combo;
  }

  function dedupeSplitCombos(combos) {
    var seen = {};
    var out = [];
    combos.forEach(function (c) {
      var key = comboMultisetKey(c);
      if (!key || seen[key]) return;
      seen[key] = true;
      c.id = key;
      out.push(c);
    });
    return out;
  }

  function buildSplitCombosFromCache(parts, availCache, priorityList) {
    var assignments = findAllSplitAssignments(parts, availCache, priorityList, HB_SPLIT_MAX_COMBOS * 3);
    var combos = assignments.map(function (asn) {
      return buildSplitCombo(asn, parts);
    });
    combos = dedupeSplitCombos(combos);
    combos.sort(function (a, b) {
      var pa = a.totalPkg != null ? a.totalPkg : Infinity;
      var pb = b.totalPkg != null ? b.totalPkg : Infinity;
      return pa - pb;
    });
    return combos.slice(0, HB_SPLIT_MAX_COMBOS);
  }

  function getSplitCombos() {
    return window.__HB_SPLIT_COMBOS__ || [];
  }

  function getSplitComboById(id) {
    if (!id) return null;
    var combos = getSplitCombos();
    for (var i = 0; i < combos.length; i++) {
      if (combos[i].id === id) return combos[i];
    }
    for (var j = 0; j < combos.length; j++) {
      if (comboMultisetKey(combos[j]) === id) return combos[j];
    }
    return null;
  }

  function getConfiguredComboMultisetKey(form) {
    if (!form) return '';
    var bookings = getSplitBookings(form).filter(function (b) {
      return b && b.ready && b.code;
    });
    if (!bookings.length) return '';
    return bookings
      .map(function (b) {
        return String(b.code) + '@' + (parseInt(b.adults, 10) || 0);
      })
      .sort()
      .join('|');
  }

  function getActiveSplitCombo() {
    var id =
      window.__HB_ACTIVE_SPLIT_COMBO_ID__ ||
      (window.__HB_COVERAGE__ && window.__HB_COVERAGE__.activeComboId) ||
      '';
    if (id) return getSplitComboById(id);
    var combos = getSplitCombos();
    return combos.length ? combos[0] : null;
  }

  function applySplitComboToCoverage(combo, totalAdults, k) {
    if (!combo) return;
    window.__HB_COVERAGE__ = {
      mode: 'split',
      k: k || combo.hotelCodes.length,
      totalAdults: totalAdults || (window.__HB_COVERAGE__ && window.__HB_COVERAGE__.totalAdults) || 0,
      parts: combo.parts,
      occSplits: combo.occSplits,
      hotelPartByCode: combo.hotelPartByCode,
      hotelCodes: combo.hotelCodes,
      activeComboId: combo.id,
    };
    window.__HB_ACTIVE_SPLIT_COMBO_ID__ = combo.id;
  }

  function comboFullyConfigured(form, combo) {
    if (!form || !combo || !combo.hotelCodes || !combo.hotelCodes.length) return false;
    var cfgKey = getConfiguredComboMultisetKey(form);
    if (!cfgKey || comboMultisetKey(combo) !== cfgKey) return false;
    var done = getSplitBookings(form).filter(function (b) {
      return b && b.ready;
    });
    return combo.hotelCodes.every(function (code) {
      return done.some(function (b) {
        return String(b.code) === String(code);
      });
    });
  }

  function nextUnconfiguredHotelInCombo(form, combo) {
    if (!combo || !combo.hotelCodes) return null;
    var done = {};
    getSplitBookings(form).forEach(function (b) {
      if (b && b.ready && b.code) done[String(b.code)] = 1;
    });
    for (var i = 0; i < combo.hotelCodes.length; i++) {
      var c = String(combo.hotelCodes[i]);
      if (!done[c]) return c;
    }
    return null;
  }

  function detectActiveComboFromBookings(form) {
    var cfgKey = getConfiguredComboMultisetKey(form);
    if (!cfgKey) return null;
    var combos = getSplitCombos();
    for (var i = 0; i < combos.length; i++) {
      if (comboMultisetKey(combos[i]) === cfgKey) return combos[i];
    }
    return null;
  }

  function splitComboCardHtml(combo, form) {
    var titleParts = combo.segments
      .map(function (s) {
        return (
          escapeHtml(hotelDisplayName(s.hotel, s.code)) +
          ' <span class="hotelbeds-split-pax">' +
          s.adults +
          ' pax</span>'
        );
      })
      .join(' <span class="hotelbeds-combo-plus" aria-hidden="true">+</span> ');
    var priceStr =
      combo.totalPkg != null && isFinite(combo.totalPkg)
        ? fmtEuros(combo.totalPkg) + ' € (paquete · green fees incluidos)'
        : 'Elige habitación para ver el precio del paquete (green fees incluidos)';
    var activeCombo = getActiveSplitCombo();
    var activeKey = activeCombo ? comboMultisetKey(activeCombo) : '';
    var comboKey = comboMultisetKey(combo);
    var klass =
      'hotelbeds-card hotelbeds-card--selectable hotelbeds-card--split-combo hotelbeds-card--compact';
    if (comboFullyConfigured(form, combo)) klass += ' hotelbeds-card--split-done';
    else if (activeKey && comboKey === activeKey) klass += ' hotelbeds-card--picked';
    return (
      '<article class="' +
      klass +
      '" role="button" tabindex="0" data-hb-split-combo-id="' +
      escapeHtml(combo.id) +
      '">' +
      '<div class="hotelbeds-card-main hotelbeds-card-main--combo">' +
      '<header class="hotelbeds-card-head">' +
      '<span class="hotelbeds-card-title hotelbeds-combo-title">' +
      titleParts +
      '</span>' +
      '<span class="hotelbeds-price">' +
      escapeHtml(priceStr) +
      '</span>' +
      '</header></div></article>'
    );
  }

  function activateSplitHotelInFunnel(form, code, root) {
    if (!form || !code) return;
    var o = pageOpts();
    if (!root) root = document.getElementById(o.preciosBlockId || 'hotelbeds-precios-block');
    if (!root) return;
    if (isSplitCoverageMode()) {
      var kept = getSplitBookings(form).filter(function (b) {
        return String(b.code) !== String(code);
      });
      setSplitBookings(form, kept);
      form.querySelector('input[name="hb_funnel_ready"]').value = '';
    }
    var splitOcc = isSplitCoverageMode() ? getSplitOccForHotelCode(code) : null;
    var sug = splitOcc || adultsRoomsFromGroupSize(form);
    setSelectedHotelInHiddenInputs(form, String(code), '', String(sug.adults), String(sug.rooms), '');
    form.querySelector('input[name="hb_rate_validated"]').value = '';
    form.querySelector('input[name="hb_funnel_ready"]').value = allSplitHotelsConfigured(form) ? '1' : '';
    window.__HB_FUNNEL_LAST__ = null;
    wireHotelFunnelInlineHandlers(root, form);
    var host = root.querySelector('#hb-hotel-funnel-inline');
    if (host) {
      var ai = host.querySelector('#hb-funnel-inline-adults');
      var ri = host.querySelector('#hb-funnel-inline-rooms');
          if (splitOcc) {
            if (ai) {
              ai.value = String(splitOcc.totalAdults);
              ai.__hbUserEdited = false;
            }
            if (ri) {
              ri.value = String(splitOcc.rooms);
              ri.__hbUserEdited = false;
            }
          } else {
            syncFunnelAdultsFromGroup(host, form, ai, ri, true);
            var sug2 = adultsRoomsFromGroupSize(form);
            setSelectedHotelInHiddenInputs(form, String(code), '', String(sug2.adults), String(sug2.rooms), '');
          }
      host.__hbRatesHotel = '';
      host.__hbAutoRatesPending = false;
      host.__hbAutoConfirmPending = true;
      var resultBox = host.querySelector('#hb-funnel-inline-result');
      if (resultBox) resultBox.innerHTML = '';
      if (typeof host.__hbRefreshUiState === 'function') host.__hbRefreshUiState();
    }
    syncHotelCardsListVisibility(root, form);
    markHotelCardsPicked(form);
    if (host && host.scrollIntoView) host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function activateSplitCombo(comboId, form, root) {
    var combo = getSplitComboById(comboId);
    if (!combo || !form) return;
    var prevCombo = getActiveSplitCombo();
    var prevKey = prevCombo ? comboMultisetKey(prevCombo) : '';
    var nextKey = comboMultisetKey(combo);
    if (prevKey !== nextKey) {
      setSplitBookings(form, []);
      form.querySelector('input[name="hb_funnel_ready"]').value = '';
    }
    applySplitComboToCoverage(combo);
    var nextCode = nextUnconfiguredHotelInCombo(form, combo);
    if (!nextCode) {
      if (comboFullyConfigured(form, combo)) return;
      nextCode = combo.hotelCodes[0];
    }
    activateSplitHotelInFunnel(form, nextCode, root);
  }

  function buildCoverageNote(coverage) {
    if (!coverage || coverage.mode !== 'split') return '';
    var k = coverage.k || (coverage.hotels && coverage.hotels.length) || 0;
    var total = coverage.totalAdults || 0;
    var parts = coverage.parts || [];
    var partsTxt = parts.length ? parts.join(' + ') : '';
    return (
      '<p class="hotelbeds-note hotelbeds-note--split">' +
      '<strong>Se ofrecen ' +
      k +
      ' hoteles</strong> porque ninguno tiene disponibilidad para alojar a todo el grupo' +
      (total ? ' (' + total + ' personas)' : '') +
      ' en un solo establecimiento.' +
      (partsTxt ? ' Reparto sugerido: <strong>' + partsTxt + ' personas</strong> por hotel (habitaciones de cama doble).' : '') +
      ' <strong>Elige una combinación</strong> y configura habitación y régimen; al confirmar cada hotel pasarás al siguiente automáticamente.' +
      '</p>'
    );
  }

  function fetchHotelbedsBatched(checkIn, checkOut, hotelCodes, occ) {
    var codes = (hotelCodes || []).map(String).filter(Boolean);
    if (!codes.length) return Promise.resolve({ hotels: { hotels: [] }, apiCalls: 0 });
    var chunks = [];
    for (var i = 0; i < codes.length; i += HB_AVAIL_BATCH_SIZE) {
      chunks.push(codes.slice(i, i + HB_AVAIL_BATCH_SIZE));
    }
    return Promise.all(
      chunks.map(function (chunk) {
        return fetchHotelbeds(checkIn, checkOut, chunk, occ);
      })
    ).then(function (results) {
      var merged = mergeAvailabilityResponses(results);
      return {
        hotels: { hotels: merged.hotels, total: merged.hotels.length },
        merged: merged,
        apiCalls: chunks.length,
        errors: merged.errors,
      };
    });
  }

  function throwAvailabilityError(hb, fallbackMsg) {
    var raw =
      hb && hb.error
        ? typeof hb.error === 'string'
          ? hb.error
          : hb.error && hb.error.message
            ? String(hb.error.message)
            : String(hb.error)
        : fallbackMsg || 'Availability sin respuesta válida';
    var e = new Error(raw);
    if (hb && hb.hotelbedsHttpStatus) e.hotelbedsHttpStatus = hb.hotelbedsHttpStatus;
    if (isHbQuotaLikeMessage(raw, hb)) {
      e.message =
        'Cuota de consultas Hotelbeds superada. Espera unos minutos e inténtalo de nuevo (no es falta de credenciales).';
    }
    throw e;
  }

  /**
   * Disponibilidad primero, preferencia después:
   * 1) Hoteles que cubren al grupo entero (orden preferencia).
   * 2) Si ninguno: mínimo k hoteles (2, 3…) con reparto equilibrado del grupo.
   */
  function fetchBrgHotelsForDisplay(checkIn, checkOut, occ, abortSignal) {
    var mappingCodes = getBrgHotelMappingCodeList();
    var displayPriorityCodes = getBrgHotelPriorityCodes();
    var codes = mappingCodes;
    var maxSingle = getDisplayMaxHotels();
    if (!codes.length) {
      return Promise.resolve({ hotels: [], poolSize: 0, apiCalls: 0, coverage: null });
    }

    var totalAdults = Math.max(
      1,
      parseInt(occ && (occ.totalAdults != null ? occ.totalAdults : occ.adults), 10) || 2
    );
    var fullOcc = clampHotelbedsOccupancy({
      adults: totalAdults,
      rooms: defaultRoomsForAdults(totalAdults),
      children: (occ && occ.children) || 0,
    });

    return fetchHotelbedsBatched(checkIn, checkOut, codes, fullOcc).then(function (fullBatch) {
      if (abortSignal && abortSignal.aborted) {
        return { hotels: [], poolSize: codes.length, apiCalls: fullBatch.apiCalls, aborted: true };
      }
      if (fullBatch.errors && fullBatch.errors.length && !(fullBatch.merged && fullBatch.merged.hotels.length)) {
        throwAvailabilityError({ error: fullBatch.errors[0] });
      }

      var singleHotels = mergeHotelPicksByCity(fullBatch.merged, maxSingle);
      if (singleHotels.length) {
        window.__HB_SPLIT_COMBOS__ = [];
        window.__HB_ACTIVE_SPLIT_COMBO_ID__ = '';
        window.__HB_COVERAGE__ = {
          mode: 'single',
          k: 1,
          totalAdults: totalAdults,
          parts: [totalAdults],
          occ: fullOcc,
        };
        return {
          hotels: singleHotels,
          poolSize: codes.length,
          apiCalls: fullBatch.apiCalls,
          aborted: false,
          rawApiCount: fullBatch.merged.hotels.length,
          occ: fullOcc,
          coverage: window.__HB_COVERAGE__,
        };
      }

      var maxK = Math.min(HB_SPLIT_MAX, totalAdults);
      var splitChain = Promise.resolve({ apiCalls: fullBatch.apiCalls, availCache: {} });
      for (var k = 2; k <= maxK; k++) {
        (function (hotelCount) {
          splitChain = splitChain.then(function (state) {
            if (state.resolved) return state;
            var parts = partitionAdults(totalAdults, hotelCount);
            var uniqueSizes = [];
            parts.forEach(function (n) {
              if (uniqueSizes.indexOf(n) < 0) uniqueSizes.push(n);
            });
            var pending = uniqueSizes.filter(function (size) {
              return !state.availCache[size];
            });
            var fetchSizes = Promise.resolve(state);
            if (pending.length) {
              fetchSizes = Promise.all(
                pending.map(function (size) {
                  var sizeOcc = clampHotelbedsOccupancy({
                    adults: size,
                    rooms: defaultRoomsForAdults(size),
                    children: 0,
                  });
                  return fetchHotelbedsBatched(checkIn, checkOut, codes, sizeOcc).then(function (batch) {
                    var avail = availableCodesForAdults(batch.merged, displayPriorityCodes, size);
                    return {
                      size: size,
                      batch: batch,
                      codes: avail.codes,
                      occ: avail.occ,
                      byCode: batch.merged.byCode,
                    };
                  });
                })
              ).then(function (sizeResults) {
                var next = {
                  apiCalls: state.apiCalls,
                  availCache: Object.assign({}, state.availCache),
                  resolved: false,
                };
                sizeResults.forEach(function (sr) {
                  next.apiCalls += sr.batch.apiCalls;
                  next.availCache[sr.size] = {
                    codes: sr.codes,
                    occ: sr.occ,
                    byCode: sr.byCode,
                  };
                });
                return next;
              });
            }
            return fetchSizes.then(function (st) {
              if (st.resolved) return st;
              var combos = buildSplitCombosFromCache(parts, st.availCache, displayPriorityCodes);
              if (!combos.length) return st;
              window.__HB_SPLIT_COMBOS__ = combos;
              var leadCombo = combos[0];
              applySplitComboToCoverage(leadCombo, totalAdults, hotelCount);
              return {
                resolved: true,
                hotels: leadCombo.hotels,
                poolSize: codes.length,
                apiCalls: st.apiCalls,
                aborted: false,
                rawApiCount: leadCombo.hotels.length,
                occ: fullOcc,
                coverage: window.__HB_COVERAGE__,
                splitCombos: combos,
              };
            });
          });
        })(k);
      }

      return splitChain.then(function (finalState) {
        if (finalState.resolved && finalState.hotels) return finalState;
        window.__HB_SPLIT_COMBOS__ = [];
        window.__HB_COVERAGE__ = { mode: 'none', totalAdults: totalAdults };
        return {
          hotels: [],
          poolSize: codes.length,
          apiCalls: finalState.apiCalls || fullBatch.apiCalls,
          aborted: false,
          rawApiCount: 0,
          occ: fullOcc,
          coverage: window.__HB_COVERAGE__,
        };
      });
    });
  }

  function catalogNameForCode(code) {
    var c = String(code || '');
    if (CURATED_HOTEL_LABELS[c]) return CURATED_HOTEL_LABELS[c];
    var contentBy = window.__HB_CONTENT_BY_CODE || {};
    if (contentBy[c] && contentBy[c].name) return contentBy[c].name;
    var opts = window.HOTELBEDS_DYNAMIC_OPTS || {};
    function findIn(arr) {
      var key = 'hb-' + c;
      for (var i = 0; i < (arr || []).length; i++) {
        if (arr[i].v === key) return arr[i].l;
      }
      return null;
    }
    return findIn(opts.lerma) || findIn(opts.burgos) || ('Hotel ' + c);
  }

  function buildStaticCatalogHotels() {
    return getAllowedHotelCodeList().map(function (code) {
      return { code: code, name: catalogNameForCode(code), city: cityForCode(code) };
    });
  }

  function catalogResultsNoteHtml(totalHotels) {
    var down = window.__HB_API_DOWN__ || '';
    if (down) {
      var isNoAvail = down.indexOf('Sin disponibilidad') === 0;
      if (isNoAvail) {
        return (
          '<p class="hotelbeds-note hotelbeds-note--noavail">' +
          'Hotelbeds confirma <strong>sin disponibilidad</strong> para estas fechas y ocupación. ' +
          'Puedes continuar eligiendo hotel del catálogo y configurar habitaciones manualmente.' +
          '</p>'
        );
      }
      return (
        '<p class="hotelbeds-note">No se pudo consultar tarifas en tiempo real (' +
        escapeHtml(down) +
        '). Se muestran <strong>' +
        totalHotels +
        ' hoteles</strong> del catálogo: elige uno y configura habitaciones.</p>'
      );
    }
    return (
      '<p class="hotelbeds-note">Sin precio en vivo para estas fechas. Se muestran <strong>' +
      totalHotels +
      ' hoteles</strong> del catálogo: haz clic en uno y usa el bloque de habitaciones para revalidar con tu grupo.</p>'
    );
  }

  function showCatalogAfterAvailabilityFailure(err) {
    if (isHotelbedsApiUnavailableError(err)) {
      renderError(err.message);
      document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
      return;
    }
    var errMsg = (err && err.message) ? err.message : 'Error de conexión';
    if (isHbQuotaLikeMessage(errMsg, err)) {
      errMsg =
        'Cuota de consultas Hotelbeds superada. Espera unos minutos e inténtalo de nuevo (no es falta de credenciales).';
    }
    var httpSt = err && err.hotelbedsHttpStatus ? ' [HTTP ' + err.hotelbedsHttpStatus + ']' : '';
    var errCode = err && err.hbErrorCode ? ' [code: ' + err.hbErrorCode + ']' : '';
    window.__HB_API_DOWN__ = errMsg + httpSt + errCode;
    setBookingWidgetVisible(true);
    renderBlock(
      '<div class="hotelbeds-block hotelbeds-warn">' +
      '<p><strong>No se pudo consultar disponibilidad en Hotelbeds.</strong></p>' +
      '<p>' +
      escapeHtml(errMsg + httpSt + errCode) +
      '</p>' +
      '<p>Revisa fechas y ocupación o inténtalo de nuevo en unos minutos.</p>' +
      '</div>'
    );
    document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
  }

  var PRICE_ON_REQUEST_LABEL = 'Precio a consultar';

  function cardListPriceCaption(hotel, noches, fallbackLabel) {
    if (hotel && typeof hotel === 'object' && hotel.code != null) {
      var pkg = getHotelLowestPackageTotal(hotel);
      var pkgStr = formatHotelPackageListPriceStr(pkg);
      if (pkgStr) return pkgStr;
    }
    if (fallbackLabel != null && String(fallbackLabel).trim()) return fallbackLabel;
    return '';
  }

  function fetchHotelbedsListHotels() {
    var base = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    var all = [];
    var byCode = {};
    var range = null;
    try {
      var fd = getFormData();
      if (fd) range = getCheckInCheckOut(fd);
    } catch (e0) { /* ignore */ }
    function addFromResponse(data) {
      var list = (data && data.hotels) ? data.hotels : [];
      if (!Array.isArray(list)) return;
      list.forEach(function (h) {
        var code = String(h.code || h);
        if (!shouldListHotel(h)) return;
        var rate = parseHotelMinRate(h);
        if (!byCode[code]) {
          byCode[code] = {
            code: code,
            name: h.name || ('Hotel ' + code),
            city: h.city || '',
            minRate: rate,
          };
          all.push(byCode[code]);
        } else if (rate != null) {
          byCode[code].minRate = rate;
        }
      });
    }
    var allowedCodes = getAllowedHotelCodeList();
    var tasks = DESTINATIONS_LERMA_BURGOS.map(function (dest) {
      return fetch(
        base +
          '/api/hotelbeds-list-hotels?destination=' +
          encodeURIComponent(dest) +
          '&source=content&filter=none&from=1&to=200&language=ENG'
      )
        .then(function (r) { return parseHotelbedsResponse(r); })
        .then(function (data) { if (!data.error) addFromResponse(data); return data; })
        .catch(function () { return {}; });
    });
    if (allowedCodes.length > 0 && !window.__HB_API_DOWN__) {
      var codesQuery = encodeURIComponent(allowedCodes.join(','));
      var availUrl =
        base +
        '/api/hotelbeds-list-hotels?hotelCodes=' +
        codesQuery +
        '&source=availability&filter=none';
      if (range && range.checkIn && range.checkOut) {
        availUrl += '&checkIn=' + encodeURIComponent(range.checkIn) + '&checkOut=' + encodeURIComponent(range.checkOut);
      }
      tasks.push(
        fetch(availUrl)
          .then(function (r) { return parseHotelbedsResponse(r); })
          .then(function (data) { if (!data.error) addFromResponse(data); return data; })
          .catch(function () { return {}; })
      );
    }
    return Promise.all(tasks).then(function () {
      if (!all.length) all = buildStaticCatalogHotels();
      return all;
    });
  }

  function renderFullHotelListFromContent(hotelList) {
    hotelList = (hotelList || []).filter(function (h) { return shouldListHotel(h); });
    if (!hotelList || hotelList.length === 0) hotelList = buildStaticCatalogHotels();
    if (!hotelList || hotelList.length === 0) {
      window.LIVE_HOTEL_PRICES = null;
      window.HOTELBEDS_DYNAMIC_OPTS = null;
      setBookingWidgetVisible(true);
      renderBlock(
        '<div class="hotelbeds-block hotelbeds-info">' +
        'No hay hoteles configurados para Lerma y Burgos. Revisa los códigos permitidos o prueba otras fechas.' +
        '</div>'
      );
      document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
      return;
    }
    window.LIVE_HOTEL_PRICES = null;
    var lerma = [];
    var burgos = [];
    var live = {};
    var noches = getNochesFromForm();
    var fallbackPriceStr = PRICE_ON_REQUEST_LABEL;
    hotelList.forEach(function (h) {
      var name = (typeof h.name === 'string' ? h.name : (h.name && h.name.content) ? h.name.content : '') || ('Hotel ' + h.code);
      var ciudad = cityForCode(h.code, h);
      var rate = parseHotelMinRate(h);
      var opt = { v: 'hb-' + h.code, l: name, p: rate };
      if (rate != null) live['hb-' + h.code] = rate;
      if (ciudad === 'lerma') lerma.push(opt); else burgos.push(opt);
    });
    window.HOTELBEDS_DYNAMIC_OPTS = { lerma: lerma, burgos: burgos };
    if (Object.keys(live).length) window.LIVE_HOTEL_PRICES = live;
    setBookingWidgetVisible(!Object.keys(live).length);
    var totalHotels = lerma.length + burgos.length;
    loadHotelContentEnrichment()
      .then(function () {
        var contentBy = window.__HB_CONTENT_BY_CODE || {};
        var html =
          '<div class="hotelbeds-block hotelbeds-results">' +
          '<h4 class="hotelbeds-title">Hoteles en Lerma y Burgos (Hotelbeds)</h4>' +
          catalogResultsNoteHtml(totalHotels) +
          hotelbedsCityToggleHtml() +
          '<ul class="hotelbeds-list hotelbeds-list--cards">';
        sortHotelsForCityDisplay(hotelList).forEach(function (h) {
          var code = String(h.code);
          var zone = hotelCityZoneForCode(code);
          var meta = contentBy[code] || null;
          var stub = { code: code, name: meta && meta.name ? meta.name : h.name };
          var priceStr = cardListPriceCaption(h, noches, '');
          html +=
            '<li class="hotelbeds-item-wrap" data-hb-city-zone="' +
            zone +
            '">' +
            hotelRichCardHtml(stub, meta, null, priceStr, '') +
            '</li>';
        });
        html += '</ul></div>';
        renderBlock(html);
        bindSelectableHotelCards();
        bindHotelCityToggle(document.getElementById(pageOpts().preciosBlockId || 'hotelbeds-precios-block'));
        document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
        triggerResumenUpdate();
      })
      .catch(function () {
        renderBlock(
          '<div class="hotelbeds-block hotelbeds-info">No se pudieron cargar las fichas de hotel. Prueba de nuevo en unos segundos.</div>'
        );
        document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
      });
  }

  function renderNoAvailabilityForDates(scannedCount, occ, rawApiCount) {
    window.LIVE_HOTEL_PRICES = null;
    window.HOTELBEDS_DYNAMIC_OPTS = null;
    clearHotelbedsBookingContext();
    window.__HB_API_DOWN__ = 'Sin disponibilidad confirmada por Hotelbeds para estas fechas';
    setBookingWidgetVisible(true);
    var extra =
      scannedCount != null && scannedCount > 0
        ? ' Se consultaron ' + scannedCount + ' hotel(es) de la lista en Burgos.'
        : '';
    var occLine = occ ? ' ' + escapeHtml(formatHbSearchOccHint(occ)) + '.' : '';
    var tip = '';
    if (occ && occ.rooms >= HB_MAX_ROOMS) {
      tip =
        '<p>Hotelbeds admite como máximo ' +
        HB_MAX_ROOMS +
        ' habitaciones por consulta. Reduce el tamaño del grupo o contáctanos para grupos muy grandes.</p>';
    } else if (occ && (occ.adults > 4 || occ.rooms > 2)) {
      tip =
        '<p>Con grupos grandes o varias habitaciones el stock online suele ser muy limitado (sobre todo en el entorno test de Hotelbeds). Prueba con menos jugadores, estancias de 2+ noches u otras fechas.</p>';
    } else if (rawApiCount === 0) {
      tip =
        '<p>Si acabas de probar muchas fechas seguidas, puede haber <strong>cuota de API</strong> de Hotelbeds: espera unos minutos y recarga la página.</p>';
    }
    renderBlock(
      '<div class="hotelbeds-block hotelbeds-warn">' +
      '<p><strong>No hay hoteles con disponibilidad</strong> para las fechas y ocupación seleccionadas.' +
      occLine +
      extra +
      '</p>' +
      '<p>Prueba otras fechas, reduce el <strong>tamaño del grupo</strong> o deja ese campo vacío para ver opciones con 2 adultos.</p>' +
      tip +
      '</div>'
    );
    document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
  }

  function renderHotelbedsResults(data, selectedHotels) {
    window.HOTELBEDS_DYNAMIC_OPTS = null;
    var rawHotels = (data.hotels && data.hotels.hotels) || [];
    var hotels = rawHotels.filter(function (h) { return shouldListHotel(h); });
    if (hotels.length === 0) {
      console.warn(
        '[Hotelbeds] renderHotelbedsResults → 0 hoteles tras filtro.',
        '| total en respuesta API:', (data.hotels && data.hotels.total) != null ? data.hotels.total : '(sin campo total)',
        '| hoteles en array raw:', rawHotels.length,
        '| selectedHotels pedidos:', JSON.stringify(selectedHotels),
        '| allowedCodes:', JSON.stringify(getAllowedHotelCodeList()),
        '| códigos recibidos:', JSON.stringify(rawHotels.map(function(h){ return h.code; })),
        '| data.hotels:', JSON.stringify(data.hotels || null)
      );
      renderNoAvailabilityForDates();
      return;
    }
    var maxShow = getDisplayMaxHotels();
    var cfg = window.HOTELBEDS_CONFIG;
    var codeToId = {};
    ALL_HOTEL_IDS.forEach(function (id) {
      var c = cfg && cfg.getCode ? cfg.getCode(id) : null;
      if (c) codeToId[String(c)] = id;
    });
    var live = {};
    var rateBy = window.__HB_RATE_BY_CODE || {};
    var contentBy = window.__HB_CONTENT_BY_CODE || {};
    var coverage = window.__HB_COVERAGE__ || null;
    var formR = document.getElementById(pageOpts().formId || 'configuradorForm');
    if (formR) resetSplitBookingsIfCoverageChanged(formR, coverage);
    var coverageNote = buildCoverageNote(coverage);
    var partialNote = '';
    if (!coverageNote && coverage && coverage.mode === 'single' && hotels.length < maxShow) {
      partialNote =
        '<p class="hotelbeds-note">' +
        hotels.length +
        ' hotel(es) con disponibilidad para todo el grupo (ordenados por preferencia).</p>';
    }
    var title =
      coverage && coverage.mode === 'split'
        ? 'Hoteles con disponibilidad (reparto de grupo)'
        : 'Hoteles con disponibilidad para tu grupo (Hotelbeds)';
    var html =
      '<div class="hotelbeds-block hotelbeds-results"><h4 class="hotelbeds-title">' +
      title +
      '</h4>' +
      coverageNote +
      partialNote +
      '<ul class="hotelbeds-list hotelbeds-list--cards">';
    // Hotelbeds Availability suele devolver minRate como total de la estancia.
    // Para evitar confusión, mostramos total estancia + (aprox) por noche según nº de noches.
    var noches = getNochesFromForm();
    syncGfTotalBeforeHotelListRender();
    var splitCombos = getSplitCombos();
    var showCityToggle = !(coverage && coverage.mode === 'split' && splitCombos.length);
    if (coverage && coverage.mode === 'split' && splitCombos.length) {
      var matchedCombo = formR ? detectActiveComboFromBookings(formR) : null;
      if (matchedCombo) {
        applySplitComboToCoverage(matchedCombo);
      } else if (!window.__HB_ACTIVE_SPLIT_COMBO_ID__ && splitCombos[0]) {
        applySplitComboToCoverage(splitCombos[0]);
      }
      if (splitCombos.length > 1) {
        partialNote =
          '<p class="hotelbeds-note">' +
          splitCombos.length +
          ' combinaciones de reparto (ordenadas por precio de paquete).</p>';
      }
      splitCombos.forEach(function (combo) {
        html += '<li class="hotelbeds-item-wrap">' + splitComboCardHtml(combo, formR) + '</li>';
      });
    } else {
      if (showCityToggle) html += hotelbedsCityToggleHtml();
      sortHotelsForCityDisplay(hotels).forEach(function (h) {
        var code = String(h.code);
        var zone = hotelCityZoneForCode(code);
        var ourId = codeToId[code];
        var rate = getHotelLowestRate(h);
        if (ourId && rate != null) live[ourId] = rate;
        var priceStr = cardListPriceCaption(h, noches, null);
        var sel = selectedHotels.indexOf(code) >= 0 ? ' <span class="hotelbeds-selected">(elegido)</span>' : '';
        if (coverage && coverage.mode === 'split' && coverage.hotelPartByCode && coverage.hotelPartByCode[code]) {
          sel +=
            ' <span class="hotelbeds-split-pax">Para ' +
            escapeHtml(String(coverage.hotelPartByCode[code])) +
            ' personas</span>';
        }
        var pick = rateBy[code];
        var meta = contentBy[code];
        html +=
          '<li class="hotelbeds-item-wrap" data-hb-city-zone="' +
          zone +
          '">' +
          hotelRichCardHtml(h, meta, pick, priceStr, sel) +
          '</li>';
      });
    }
    html +=
      '</ul><p class="hotelbeds-note">' +
      'Precio «desde» = paquete (alojamiento + green fees), tarifa más económica. Detalle de habitación y régimen al elegir hotel.' +
      '</p></div>';
    window.LIVE_HOTEL_PRICES = Object.keys(live).length ? live : null;
    setBookingWidgetVisible(!window.LIVE_HOTEL_PRICES);
    renderBlock(html);
    bindSelectableHotelCards();
    var formAfter = document.getElementById(pageOpts().formId || 'configuradorForm');
    var rootAfter = document.getElementById(pageOpts().preciosBlockId || 'hotelbeds-precios-block');
    if (showCityToggle) bindHotelCityToggle(rootAfter);
    if (formAfter && rootAfter) syncHotelCardsListVisibility(rootAfter, formAfter);
    refreshHotelCardPackagePrices();
    document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
  }

  function renderHotelbedsResultsByDestination(data) {
    var rawHotels = (data.hotels && data.hotels.hotels) || [];
    var hotels = rawHotels.filter(function (h) { return shouldListHotel(h); });
    if (hotels.length === 0) {
      console.warn(
        '[Hotelbeds] renderHotelbedsResultsByDestination → 0 hoteles tras filtro.',
        '| total en respuesta API:', (data.hotels && data.hotels.total) != null ? data.hotels.total : '(sin campo total)',
        '| hoteles en array raw:', rawHotels.length,
        '| allowedCodes:', JSON.stringify(getAllowedHotelCodeList()),
        '| códigos recibidos:', JSON.stringify(rawHotels.map(function(h){ return h.code; })),
        '| data.hotels:', JSON.stringify(data.hotels || null)
      );
      renderNoAvailabilityForDates();
      return;
    }
    var live = {};
    var lerma = [];
    var burgos = [];
    function getStr(v) { return (typeof v === 'string' ? v : (v && v.content) ? v.content : '') || ''; }
    var noches = getNochesFromForm();
    syncGfTotalBeforeHotelListRender();
    hotels.forEach(function (h) {
      var code = String(h.code);
      var name = getStr(h.name) || getStr(h.description) || ('Hotel ' + code);
      var rate = parseHotelMinRate(h);
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
      '<div class="hotelbeds-block hotelbeds-results"><h4 class="hotelbeds-title">' +
      (hbHideHotelEuroUi()
        ? 'Hoteles con disponibilidad (Hotelbeds) · Lerma y Burgos'
        : 'Precios en tiempo real (Hotelbeds) · Lerma y Burgos') +
      '</h4>' +
      hotelbedsCityToggleHtml() +
      '<ul class="hotelbeds-list hotelbeds-list--cards">';
    sortHotelsForCityDisplay(hotels).forEach(function (h) {
      var code = String(h.code);
      var zone = hotelCityZoneForCode(code);
      var key = 'hb-' + code;
      var priceStr = cardListPriceCaption(h, noches, null);
      var pick = rateBy[code];
      var meta = contentBy[code];
      html +=
        '<li class="hotelbeds-item-wrap" data-hb-city-zone="' +
        zone +
        '">' +
        hotelRichCardHtml(h, meta, pick, priceStr, '') +
        '</li>';
    });
    html +=
      '</ul><p class="hotelbeds-note">' +
      'Precio «desde» = total del paquete (alojamiento + green fees). Elige hotel y habitación en el bloque de configuración.' +
      '</p></div>';
    setBookingWidgetVisible(false);
    renderBlock(html);
    bindSelectableHotelCards();
    var formAfterDest = document.getElementById(pageOpts().formId || 'configuradorForm');
    var rootAfterDest = document.getElementById(pageOpts().preciosBlockId || 'hotelbeds-precios-block');
    bindHotelCityToggle(rootAfterDest);
    if (formAfterDest && rootAfterDest) syncHotelCardsListVisibility(rootAfterDest, formAfterDest);
    document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
    refreshHotelCardPackagePrices();
  }

  function run(opts) {
    opts = opts || {};
    var silentPrefetch = opts.silentPrefetch === true || !isHotelbedsSectionVisible();

    if (runAbortCtrl) {
      try { runAbortCtrl.abort(); } catch (e) { /* ignore */ }
    }
    runAbortCtrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var thisAbort = runAbortCtrl;

    var formData = getFormData();
    if (!formData) return;

    var formEl = document.getElementById(pageOpts().formId || 'configuradorForm');

    if (!hotelbedsFetchPrereqsOk(formEl, formData)) {
      if (!silentPrefetch) {
        window.LIVE_HOTEL_PRICES = null;
        clearHotelbedsBookingContext();
        setBookingWidgetVisible(false);
        var prState =
          typeof window.getConfigPrereqState === 'function' && formEl
            ? window.getConfigPrereqState(formEl)
            : { fechas: false, personas: false };
        var prKey =
          typeof window.getConfigPrereqHintI18nKey === 'function'
            ? window.getConfigPrereqHintI18nKey(prState)
            : 'config_hint_falta_ambos';
        var hintTxt =
          typeof window.getConfigPrereqHintText === 'function'
            ? window.getConfigPrereqHintText(prKey)
            : 'Completa fechas y número de personas para ver hoteles.';
        renderBlock('<p class="hotelbeds-block hotelbeds-info">' + escapeHtml(hintTxt) + '</p>');
      }
      return;
    }

    if (!silentPrefetch && availabilityCacheMatches(formData)) {
      tryRenderFromCache();
      return;
    }

    var range = getCheckInCheckOut(formData);
    if (!range) {
      if (!silentPrefetch) {
        window.LIVE_HOTEL_PRICES = null;
        clearHotelbedsBookingContext();
        setBookingWidgetVisible(false);
        renderBlock(
          '<p class="hotelbeds-block hotelbeds-info">Selecciona las fechas en el calendario para ver precios en tiempo real (Hotelbeds).</p>'
        );
      }
      return;
    }

    if (!silentPrefetch) {
      renderLoading();
    } else {
      window.__HB_PREFETCH_IN_FLIGHT__ = true;
    }
    window.__HB_API_DOWN__ = '';

    syncAllowedBurgosFromPriority();

    var occ = clampHotelbedsOccupancy(getListOccupancyForAvailability(formData));
    loadHotelContentEnrichment()
      .then(function () {
        if (thisAbort && thisAbort.signal && thisAbort.signal.aborted) return null;
        var codePool = getBrgHotelMappingCodeList();
        if (!codePool.length) {
          window.__HB_PREFETCH_IN_FLIGHT__ = false;
          if (!silentPrefetch) {
            renderBlock(
              '<div class="hotelbeds-block hotelbeds-info">No hay códigos de hotel configurados (BRG_HOTEL_CODES).</div>'
            );
            document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
          }
          return null;
        }
        var stats = window.__HB_MAPPING_STATS__;
        if (stats && stats.coveragePercentOfContent != null) {
          console.info(
            '[Hotelbeds] Mapeo BRG:',
            stats.mappingTotal,
            'códigos (',
            stats.priorityCount,
            'preferentes +',
            stats.coverageCount,
            'cobertura;',
            stats.coveragePercentOfContent,
            '% del catálogo Content en caché)'
          );
        }
        return fetchBrgHotelsForDisplay(
          range.checkIn,
          range.checkOut,
          occ,
          thisAbort && thisAbort.signal ? thisAbort.signal : null
        );
      })
      .then(function (result) {
        if (!result) return;
        if (thisAbort && thisAbort.signal && thisAbort.signal.aborted) return;
        var hotels = (result && result.hotels) || [];
        if (!hotels.length) {
          console.warn(
            '[Hotelbeds] Sin hoteles tras filtro.',
            'occ:', result.occ,
            'rawApi:', result.rawApiCount,
            'pool:', result.poolSize
          );
          window.__HB_PREFETCH_IN_FLIGHT__ = false;
          if (!silentPrefetch) {
            renderNoAvailabilityForDates(result && result.poolSize, result && result.occ, result && result.rawApiCount);
          }
          return;
        }
        var hb = { hotels: { hotels: hotels, total: hotels.length } };
        window.__HB_LAST_AVAIL__ = hb;
        window.__HB_LAST_AVAIL_OCC__ = occ;
        window.__HB_LAST_AVAIL_RANGE__ = { checkIn: range.checkIn, checkOut: range.checkOut };
        var widenSeedKey = [range.checkIn, range.checkOut, occCacheSignature(occ)].join('|');
        window.__HB_WIDEN_AVAIL_CACHE__ = { key: widenSeedKey, av: hb };
        window.__HB_RATE_BY_CODE = indexRatesByHotelCode(hb);
        console.info(
          '[Hotelbeds] Mostrando',
          hotels.length,
          'hotel(es) con disponibilidad (pool BRG:',
          result.poolSize,
          ',',
          result.apiCalls,
          'llamada(s) availability).'
        );
        return loadHotelContentEnrichment().then(function () {
          return hb;
        });
      })
      .then(function (hb) {
        if (thisAbort && thisAbort.signal && thisAbort.signal.aborted) return;
        window.__HB_PREFETCH_IN_FLIGHT__ = false;
        if (!hb) return;
        if (silentPrefetch) {
          document.dispatchEvent(new CustomEvent('hotelbeds-prefetch-ready'));
          if (isHotelbedsSectionVisible()) {
            return loadHotelContentEnrichment().then(function () {
              renderHotelbedsResults(hb, []);
            });
          }
          return;
        }
        renderHotelbedsResults(hb, []);
      })
      .catch(function (err) {
        if (thisAbort && thisAbort.signal && thisAbort.signal.aborted) return;
        window.__HB_PREFETCH_IN_FLIGHT__ = false;
        if (silentPrefetch) return;
        showCatalogAfterAvailabilityFailure(err);
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
    'fin-semana': 'Paquete Golf Burgos',
    'golf-burgos': 'Paquete Golf Burgos',
    'golf-vino': 'Golf Canalla',
    'golf-canalla': 'Golf Canalla',
    '36-hoyos': 'Golf Ilimitado Burgos',
    'golf-ilimitado': 'Golf Ilimitado Burgos',
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

  /** CheckRate inmediatamente antes de booking: rateKey fresco y cupo actualizado. */
  function ensureFreshRateKeyForBooking(postHb, rateKey) {
    return postHb({ action: 'checkrates', rooms: [{ rateKey: rateKey }] }).then(function (cr) {
      if (!cr.ok) {
        var raw =
          cr.hotelbedsError ||
          (cr.data && cr.data.error && (cr.data.error.message || cr.data.error)) ||
          cr.error ||
          'CheckRate falló';
        throw new Error(humanizeHotelbedsError(String(raw), cr));
      }
      var nk = extractRateKeyAfterCheckrate(cr.data);
      if (!nk) throw new Error('CheckRate no devolvió rateKey actualizado.');
      return { rateKey: nk, checkrateData: cr.data };
    });
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
    // Funnel-selected rateKey (revalidated) has priority.
    var selectedRateKey = (fd.get('hb_selected_rate_key') || '').trim();
    var adults = Math.max(1, parseInt((fd.get('hb_occ_adults') || fd.get('tamanio_grupo') || '2'), 10) || 2);
    var roomsCount = Math.max(1, parseInt((fd.get('hb_occ_rooms') || defaultRoomsForAdults(adults)), 10) || 1);

    var funnelReady = (fd.get('hb_funnel_ready') || '').trim() === '1';
    var selectedHotel = (fd.get('hb_selected_hotel_code') || '').trim();
    var rateValidated = (fd.get('hb_rate_validated') || '').trim() === '1';
    if (selectedHotel && !funnelReady) {
      if (rateValidated) {
        return Promise.reject(
          new Error(
            'Elige un hotel en la lista Hotelbeds (o cambia la habitación en el bloque de alojamiento) y después «Reservar paquete».'
          )
        );
      }
      // Hotel clicado en la lista pero sin tarifa/disponibilidad: no bloquear el pago del paquete.
      return Promise.resolve(null);
    }

    var pick = null;
    if (selectedRateKey) {
      pick = {
        rateKey: selectedRateKey,
        rateType: String(fd.get('hb_selected_rate_type') || 'BOOKABLE').toUpperCase(),
      };
    } else {
      var hotelCode = getActiveHotelCodeForBooking(fd, noches, cfg);
      if (!hotelCode) return Promise.resolve(null);
      var hb = window.__HB_LAST_AVAIL__;
      var byCode = window.__HB_RATE_BY_CODE || {};
      if (!hb || !hb.hotels || !byCode[hotelCode]) return Promise.resolve(null);
      pick = byCode[hotelCode];
      if (!pick || !pick.rateKey) return Promise.resolve(null);
    }

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
        return parseHotelbedsResponse(r);
      });
    }

    function doBooking(finalRateKey, checkrateSnapshot) {
      var hotelForOffer = selectedHotel || getActiveHotelCodeForBooking(fd, noches, cfg);
      var offerForOcc = hotelForOffer ? findOfferByRateKey(hotelForOffer, finalRateKey) : null;
      if (!offerForOcc && hotelForOffer) {
        // Tras CheckRate el rateKey cambia; usar la oferta del funnel si sigue visible.
        var hostBook = document.getElementById('hb-hotel-funnel-inline');
        if (hostBook) offerForOcc = getPickedOfferFromFunnel(hostBook, hotelForOffer);
      }
      offerForOcc = normalizeOfferOccupancyFields(offerForOcc);
      var bookOcc = resolveBookingOccupancy(offerForOcc, finalRateKey, fd);
      var booking = {
        holder: {
          name: nameParts.name,
          surname: nameParts.surname,
          email: mail,
          phone: phone,
        },
        rooms: buildBookingRooms(finalRateKey, bookOcc, nameParts),
        clientReference: buildHbClientReference(paquete),
        remark: 'Web paquete / Stripe: ' + pkgLabel,
        tolerance: '2',
      };
      return postHb({
        action: 'booking',
        booking: booking,
        packageLabel: pkgLabel,
        checkrateSnapshot: checkrateSnapshot || null,
        contentSnapshot: contentSnapshotForHotel(hotelForOffer) || null,
      }).then(function (res) {
        if (!res.ok || !res.voucher) {
          var msg =
            res.hotelbedsError ||
            res.voucherMapError ||
            (res.data &&
              res.data.error &&
              (typeof res.data.error === 'string' ? res.data.error : res.data.error.message)) ||
            res.error ||
            'La reserva Hotelbeds no devolvió bono (voucher).';
          if (res.ok && !res.voucher && res.data && res.data.booking && res.data.booking.reference) {
            msg =
              'Reserva Hotelbeds confirmada (ref. ' +
              res.data.booking.reference +
              ') pero no se pudo generar el bono: ' +
              (res.voucherMapError || 'datos incompletos en la respuesta');
          }
          throw new Error(humanizeHotelbedsError(String(msg), res));
        }
        return res.voucher;
      });
    }

    var rk = pick.rateKey;
    return ensureFreshRateKeyForBooking(postHb, rk).then(function (crResult) {
      return doBooking(crResult.rateKey, crResult.checkrateData);
    });
  };

  function shouldIgnoreHotelbedsFormRefresh(target) {
    if (!target) return false;
    var name = target.name || '';
    var id = target.id || '';
    if (target.classList) {
      if (target.classList.contains('comida-menu-comensales')) return true;
      if (target.classList.contains('comida-comensales-counter')) return true;
    }
    if (name === 'hb-funnel-rate-pick') return true;
    if (name.indexOf('hb_') === 0) return true;
    if (/^campo-dia-\d+$/.test(name)) return true;
    if (/^hora_salida/.test(name)) return true;
    if (name.indexOf('comida_') === 0) return true;
    if (name.indexOf('ancillary_') === 0) return true;
    if (name.indexOf('tienda_') === 0) return true;
    if (id === 'hb-funnel-inline-adults' || id === 'hb-funnel-inline-rooms' || id === 'hb-funnel-inline-children') return true;
    if (target.closest && target.closest('#hb-hotel-funnel-inline')) {
      var tag = (target.tagName || '').toUpperCase();
      if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'LABEL') return true;
    }
    return false;
  }

  function scheduleFromForm(ev) {
    if (ev && ev.target && ev.target.name === 'tamanio_grupo') {
      resetHbOccForGroupSizeChange(getForm());
    }
    if (ev && shouldIgnoreHotelbedsFormRefresh(ev.target)) return;
    schedule();
  }

  function schedule() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      var formEl = document.getElementById(pageOpts().formId || 'configuradorForm');
      var formData = getFormData();
      if (!hotelbedsFetchPrereqsOk(formEl, formData)) {
        if (isHotelbedsSectionVisible()) run({ silentPrefetch: false });
        return;
      }
      if (isHotelbedsSectionVisible()) {
        if (window.__HB_PREFETCH_IN_FLIGHT__) {
          renderLoading();
          return;
        }
        if (availabilityCacheMatches(formData)) {
          tryRenderFromCache();
          return;
        }
        run({ silentPrefetch: false });
        return;
      }
      if (!availabilityCacheMatches(formData)) {
        run({ silentPrefetch: true });
      }
    }, DEBOUNCE_MS);
  }

  window.actualizarPreciosHotelbeds = function () {
    schedule();
  };

  window.scheduleHotelbedsPrefetch = function () {
    schedule();
  };

  document.addEventListener('hotelbeds-prefetch-ready', function () {
    if (!isHotelbedsSectionVisible()) return;
    if (availabilityCacheMatches(getFormData())) tryRenderFromCache();
  });

  window.refreshHotelCardPackagePrices = refreshHotelCardPackagePrices;
  window.refreshFunnelRatePackagePrices = refreshFunnelRatePackagePrices;
  window.syncHbResumenFromCurrentOffer = syncHbResumenFromCurrentOffer;
  window.toggleHbDebugTariffs = toggleHbDebugTariffs;
  window.hbDebugTariffsEnabled = hbDebugTariffsEnabled;
  window.getHbTariffDebugResumenHtml = function (form) {
    if (!hbDebugTariffsEnabled() || !form) return '';
    var refInp = form.querySelector('input[name="hb_hotel_stay_ref_net"]');
    var bookInp = form.querySelector('input[name="hb_hotel_stay_book_net"]');
    var ref = refInp && refInp.value ? parseFloat(String(refInp.value).replace(',', '.')) : NaN;
    var book = bookInp && bookInp.value ? parseFloat(String(bookInp.value).replace(',', '.')) : NaN;
    var gf = typeof window.__HB_GF_TOTAL__ === 'number' ? window.__HB_GF_TOTAL__ : NaN;
    var html = '<div class="hb-tariff-debug-resumen"><p><strong>Debug tarifas (F4)</strong></p><ul>';
    html += '<li>Green fees (grupo): ' + (isFinite(gf) ? fmtEuros(gf) + ' €' : '—') + '</li>';
    html += '<li>Hotel empaquetado (reserva): ' + (isFinite(book) ? fmtEuros(book) + ' €' : '—') + '</li>';
    html += '<li>Hotel no empaquetado (ref): ' + (isFinite(ref) ? fmtEuros(ref) + ' €' : '—') + '</li>';
    if (isFinite(ref) && isFinite(book)) {
      html += '<li>Δ estancia (ref − empaq.): ' + fmtEuros(ref - book) + ' €</li>';
    }
    if (isFinite(gf) && isFinite(book)) {
      html += '<li>Total paquete mostrado (GF + empaq.): ' + fmtEuros(gf + book) + ' €</li>';
    }
    if (isFinite(gf) && isFinite(ref)) {
      html += '<li>Total si usáramos ref (GF + ref): ' + fmtEuros(gf + ref) + ' €</li>';
    }
    html += '</ul></div>';
    return html;
  };

  window.getHotelbedsMappingCoverage = function () {
    return {
      priorityCodes: getBrgHotelPriorityCodes(),
      coverageCodes: (window.__HB_COVERAGE_CODES__ || []).slice(),
      mappingCodes: getBrgHotelMappingCodeList(),
      displayMaxHotels: getDisplayMaxHotels(),
      stats: window.__HB_MAPPING_STATS__ || null,
    };
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

    if (!window.__HB_TARIFF_DEBUG_KEY_BOUND__) {
      window.__HB_TARIFF_DEBUG_KEY_BOUND__ = true;
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'F4') return;
        var t = e.target;
        if (
          t &&
          (t.tagName === 'INPUT' ||
            t.tagName === 'TEXTAREA' ||
            t.tagName === 'SELECT' ||
            t.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        toggleHbDebugTariffs();
      });
    }

    syncAllowedBurgosFromPriority();

    var form = getForm();
    if (form) {
      form.addEventListener('change', scheduleFromForm);
      form.addEventListener('input', scheduleFromForm);
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

  window.HOTELBEDS_STRICT_PREBOOK = true;

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
