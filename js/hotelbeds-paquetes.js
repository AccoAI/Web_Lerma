/**
 * Precios Hotelbeds en tiempo real para cualquier paquete con calendario + alojamiento.
 * Opciones en window.HOTELBEDS_PAGE: formId, preciosBlockId, onResumen, hideHotelEuroUi (false = mostrar € en tarjetas y funnel).
 * Con hideHotelEuroUi por defecto, el resumen del paquete sigue usando internamente hb_hotel_stay_ref_net (lista no empaquetada) vía calcularAlojamientoResumenEuros mientras el booking usa la tarifa empaquetada.
 */
(function () {
  var DEBOUNCE_MS = 1500;
  var debounceTimer = null;
  var runAbortCtrl = null;
  var ALL_HOTEL_IDS = ['alisa', 'ceres', 'parador', 'silken', 'palacio-blasones', 'hotel-centro'];
  /** Hotel API: destination.code solo 1–3 caracteres (p. ej. BRG). «BUR2» no es válido y devuelve 400. */
  var DESTINATIONS_LERMA_BURGOS = ['BRG'];
  /**
   * Pool de hoteles Burgos (BRG), orden = prioridad (primero más preferido).
   * Una consulta availability con todos los códigos; se muestran hasta HB_DISPLAY_MAX
   * con tarifas, respetando este orden. Añade códigos; etiquetas en CURATED_HOTEL_LABELS.
   */
  var BRG_HOTEL_CODES = [
    '87356', // Silken Gran Teatro
    '23103', // NH Collection Palacio de Burgos
    '934', // Hotel Maria Luisa
    '1882', // Abba Burgos
    '1021767', // Apartamentos El Cid
    '4177', // Crisol Meson del Cid
  ];
  /** Máximo de hoteles mostrados (solo con disponibilidad real). */
  var HB_DISPLAY_MAX = 3;

  /** Oferta curada Hotelbeds (códigos Content API BRG). Lerma: vacío hasta añadir códigos. */
  var ALLOWED_HOTEL_CODES = {
    lerma: {},
    burgos: {},
  };
  var CURATED_HOTEL_LABELS = {
    '87356': 'Silken Gran Teatro',
    '23103': 'NH Collection Palacio de Burgos',
    '934': 'Hotel Maria Luisa',
    '1882': 'Abba Burgos',
    '1021767': 'Apartamentos El Cid',
    '4177': 'Crisol Meson del Cid',
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
    };
    return Object.assign({}, d, window.HOTELBEDS_PAGE || {});
  }

  function getDisplayMaxHotels() {
    var n = pageOpts().displayMaxHotels;
    if (n != null && isFinite(Number(n)) && Number(n) >= 1) return Math.min(20, Math.floor(Number(n)));
    return HB_DISPLAY_MAX;
  }

  function getBrgHotelCodeList() {
    var po = pageOpts();
    var custom = po.brgHotelCodes || po.brgHotelPriority;
    if (Array.isArray(custom) && custom.length) {
      return custom.map(function (c) { return String(c).trim(); }).filter(Boolean);
    }
    return BRG_HOTEL_CODES.slice();
  }

  function getBrgHotelPriorityList() {
    return getBrgHotelCodeList();
  }

  function syncAllowedBurgosFromCodes() {
    ALLOWED_HOTEL_CODES.burgos = {};
    getBrgHotelCodeList().forEach(function (code) {
      ALLOWED_HOTEL_CODES.burgos[String(code)] = 1;
    });
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
    if (!rooms && !adults) return '';
    var bits = [];
    if (rooms) bits.push(rooms + ' hab.');
    if (adults) bits.push(adults + ' adultos');
    if (children) bits.push(children + ' niños');
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
      if (typeof p === 'string') out.push(p);
      else if (p.name) out.push(String(p.name));
      else if (p.code) out.push(String(p.code));
    });
    return out;
  }

  function ratePriceLabel(rate) {
    if (!rate) return '';
    var amt = rateNetAmount(rate);
    if (amt == null || amt === '') return '';
    return String(amt) + ' ' + (rate.currency || 'EUR');
  }

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

  /** Precio total del paquete (greenfee grupo + tarifa de referencia no empaquetada del hotel). */
  function calcTotalPaquete(offer) {
    var gf = typeof window.__HB_GF_TOTAL__ === 'number' && isFinite(window.__HB_GF_TOTAL__) ? window.__HB_GF_TOTAL__ : null;
    if (gf == null) return null;
    var refNet = offer && offer.resumenHotelRefNet != null ? Number(offer.resumenHotelRefNet) : null;
    if (refNet == null || !isFinite(refNet)) return null;
    return Math.round((gf + refNet) * 100) / 100;
  }

  function fmtEuros(n) {
    if (n == null || !isFinite(n)) return '';
    return n.toFixed(2).replace('.', ',');
  }

  /** Si hay tarifa empaquetada y otra no empaquetada para la misma habitación+régimen+clase, oculta la no empaquetada y guarda su net como referencia de resumen (margen vs lo que se reserva). */
  function preferPackagingOffersAndAttachRef(offers) {
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
    var out = [];
    (offers || []).forEach(function (o) {
      var k = coarseRateKeyForPackaging(o);
      var g = groups[k];
      if (o.packaging) {
        var refN = maxUnpackNetByKey[k];
        o.resumenHotelRefNet = refN != null ? refN : o.netValue;
        o.resumenHotelBookNet = o.netValue;
        out.push(o);
        return;
      }
      if (!g.hasPack) {
        o.resumenHotelRefNet = o.netValue;
        o.resumenHotelBookNet = o.netValue;
        out.push(o);
      }
    });
    out.sort(function (a, b) {
      var an = a.netValue == null ? 1e12 : a.netValue;
      var bn = b.netValue == null ? 1e12 : b.netValue;
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
      var an = a.netValue == null ? 1e12 : a.netValue;
      var bn = b.netValue == null ? 1e12 : b.netValue;
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
    if (offer.packaging) parts.push('Tarifa paquete Hotelbeds');
    var total = calcTotalPaquete(offer);
    if (total != null) {
      parts.push('Precio del paquete: ' + fmtEuros(total) + ' €');
    } else {
      parts.push('Importe del alojamiento integrado en el total del paquete');
    }
    return truncateText(parts.join(' · '), 280);
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
    };
    if (offer.rateRooms == null || offer.rateAdults == null) {
      var occKey = parseOccupancyFromRateKey(offer.rateKey);
      if (occKey) {
        if (offer.rateRooms == null) offer.rateRooms = occKey.rooms;
        if (offer.rateAdults == null) offer.rateAdults = occKey.adults;
        if (offer.rateChildren == null) offer.rateChildren = occKey.children;
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
    var packed = preferPackagingOffersAndAttachRef(deduped.offers);
    if (hotel && hotel.code != null) {
      window.__HB_RATE_OFFERS_OMITTED__ = window.__HB_RATE_OFFERS_OMITTED__ || {};
      window.__HB_RATE_OFFERS_OMITTED__[String(hotel.code)] =
        deduped.omitted + Math.max(0, deduped.offers.length - packed.length);
    }
    return packed;
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
    if (!h) return null;
    var rate = h.minRate;
    if (rate == null && h.rooms && h.rooms[0]) {
      var r0 = h.rooms[0];
      var rr = r0.rates && r0.rates[0] ? r0.rates[0] : null;
      if (rr) rate = parseFloat(rr.net || rr.gross || rr.sellingRate) || null;
    }
    if (typeof rate === 'string') rate = parseFloat(rate) || null;
    return rate != null ? rate : null;
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
      return total + ' € (estancia) · ' + pn + ' €/noche';
    }
    return total + ' € (estancia)';
  }

  function hydrateRateOffersFromLastAvailability(hotelCode) {
    var key = String(hotelCode || '');
    if (!key) return false;
    var offersBy = window.__HB_RATE_OFFERS_BY_CODE__ || {};
    if (offersBy[key] && offersBy[key].length) return true;
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
          var occH = window.__HB_LAST_AVAIL_OCC__ || getListOccupancyForAvailability(fdH);
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

  function getFunnelOccupancyForAvailability(form, adultsInp, roomsInp, adultsDefault, roomsDefault) {
    var adults = clamp(getInt(adultsInp && adultsInp.value, adultsDefault), 1, 54);
    var rooms = clamp(getInt(roomsInp && roomsInp.value, roomsDefault), 1, 20);
    var occ = { adults: adults, rooms: rooms, children: 0 };
    if (!form) return occ;
    var listOcc = window.__HB_LAST_AVAIL_OCC__;
    if (!listOcc) return occ;
    var groupOcc = getListOccupancyForAvailability(new FormData(form));
    if (groupOcc.adults === occ.adults && groupOcc.rooms === occ.rooms) {
      return {
        adults: listOcc.adults,
        rooms: listOcc.rooms,
        children: listOcc.children || 0,
      };
    }
    if (occ.adults === adultsDefault && occ.rooms === roomsDefault) {
      return {
        adults: listOcc.adults,
        rooms: listOcc.rooms,
        children: listOcc.children || 0,
      };
    }
    return occ;
  }

  function fetchFunnelAvailabilityOffers(hotelCode, checkInOut, occ) {
    var base = window.location.origin || '';
    var cacheKey = buildAvailCacheKey(checkInOut.checkIn, checkInOut.checkOut, occ, hotelCode);

    function requestAvailability() {
      return fetchJson(base + '/api/hotelbeds-availability', {
        checkIn: checkInOut.checkIn,
        checkOut: checkInOut.checkOut,
        rooms: occ.rooms,
        adults: occ.adults,
        children: occ.children || 0,
        hotelCodes: [String(hotelCode)],
      }).then(function (av) {
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
      if (!o || o.adults !== occ.adults || o.rooms !== occ.rooms || (o.children || 0) !== (occ.children || 0)) return false;
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
      var widenKey = [checkInOut.checkIn, checkInOut.checkOut, occ.rooms, occ.adults, occ.children || 0].join('|');

      var lr = window.__HB_LAST_AVAIL_RANGE__;
      var lo = window.__HB_LAST_AVAIL_OCC__;
      var lastAvailIsWidenEquivalent =
        window.__HB_LAST_AVAIL__ &&
        lr && lr.checkIn === checkInOut.checkIn && lr.checkOut === checkInOut.checkOut &&
        lo && lo.adults === occ.adults && lo.rooms === occ.rooms && (lo.children || 0) === (occ.children || 0);
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
      if (!hotel) hotel = findHotelInAvailability(window.__HB_LAST_AVAIL__, hotelCode);
      if (!hotel) {
        return tryWidenAvailabilityForHotel().then(function (h2) {
          if (h2) {
            var offersW = collectRateOffersFromHotel(h2);
            if (!offersW.length) throw new Error('No hay tarifas para esa ocupación.');
            window.__HB_RATE_OFFERS_BY_CODE__ = window.__HB_RATE_OFFERS_BY_CODE__ || {};
            window.__HB_RATE_OFFERS_BY_CODE__[String(hotelCode)] = offersW;
            markHbFunnelOffersCached(hotelCode, checkInOut, occ);
            return offersW;
          }
          var listOcc = window.__HB_LAST_AVAIL_OCC__;
          var occMismatch =
            listOcc &&
            (listOcc.adults !== occ.adults || listOcc.rooms !== occ.rooms);
          if (occMismatch) {
            throw new Error(
              'Sin disponibilidad para ' +
                occ.adults +
                ' adulto(s) en ' +
                occ.rooms +
                ' habitación(es). Las tarifas del listado eran para ' +
                listOcc.adults +
                ' adulto(s) en ' +
                listOcc.rooms +
                ' habitación(es); ajusta la ocupación o cambia fechas.'
            );
          }
          throw new Error(
            'Sin disponibilidad para ese hotel y ocupación. Revisa fechas y tamaño de grupo, o prueba otras fechas.'
          );
        });
      }
      var offers = collectRateOffersFromHotel(hotel);
      if (!offers.length) throw new Error('No hay tarifas para esa ocupación.');
      window.__HB_RATE_OFFERS_BY_CODE__ = window.__HB_RATE_OFFERS_BY_CODE__ || {};
      window.__HB_RATE_OFFERS_BY_CODE__[String(hotelCode)] = offers;
      markHbFunnelOffersCached(hotelCode, checkInOut, occ);
      return offers;
    });
  }

  function getOccupancyFromFormData(fd) {
    if (!fd || !fd.get) return { adults: 2, rooms: 1, children: 0 };
    var adults = clamp(getInt(fd.get('hb_occ_adults') || fd.get('tamanio_grupo'), 2), 1, 54);
    var rooms = clamp(getInt(fd.get('hb_occ_rooms') || Math.ceil(adults / 2), 1), 1, HB_MAX_ROOMS);
    return clampHotelbedsOccupancy({ adults: adults, rooms: rooms, children: 0 });
  }

  function getOccupancyFromTamanioGrupo(fd) {
    if (!fd || !fd.get) return null;
    var raw = String(fd.get('tamanio_grupo') || '').trim();
    if (!raw) return null;
    var adults = clamp(getInt(raw, 2), 1, 54);
    return clampHotelbedsOccupancy({
      adults: adults,
      rooms: clamp(Math.ceil(adults / 2), 1, HB_MAX_ROOMS),
      children: 0,
    });
  }

  /** Listado: tamaño de grupo manda; hb_occ solo si el hotel ya está confirmado en el funnel. */
  function getListOccupancyForAvailability(fd) {
    if (!fd || !fd.get) return { adults: 2, rooms: 1, children: 0 };
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
    return [checkIn, checkOut, occ.rooms, occ.adults, occ.children || 0, String(hotelCode || '')].join('|');
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
        if (offers[oi].rateType === 'BOOKABLE') {
          pick = offers[oi];
          break;
        }
      }
      map[code] = pick || offers[0];
    }
    window.__HB_RATE_OFFERS_BY_CODE__ = offersByCode;
    return map;
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
        return fetch(
          base +
            '/api/hotelbeds-list-hotels?destination=' +
            encodeURIComponent(dest) +
            '&source=content&enrich=1&filter=none&from=1&to=200&language=ENG'
        )
          .then(function (r) {
            return parseHotelbedsResponse(r);
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
  function hotelRichCardHtml(hAvail, meta, pick, priceStr, selSuffix) {
    var code = String(hAvail.code || '');
    var displayName =
      (typeof hAvail.name === 'string' ? hAvail.name : hAvail.name && hAvail.name.content) ||
      (meta && meta.name) ||
      'Hotel ' + code;
    if (typeof displayName !== 'string') displayName = String(displayName || 'Hotel');

    var img = meta && meta.imageUrl ? meta.imageUrl : '';
    var catLabel = meta && (meta.categoryName || meta.categoryCode) ? meta.categoryName || meta.categoryCode : '';
    var catStars = meta && typeof meta.categoryStars === 'number' ? meta.categoryStars : null;
    var desc = meta && meta.descriptionShort ? meta.descriptionShort : '';
    var boardLine = pick && pick.boardName ? pick.boardName : pick && pick.boardCode ? String(pick.boardCode) : '';
    var roomLine = pick && pick.roomName ? pick.roomName : '';
    var ratePaid = (pick && pick.rateExtrasPaid) || [];
    var rateComm = (pick && pick.rateComments) || [];
    var hideEur = hbHideHotelEuroUi();

    var imgHtml = img
      ? '<div class="hotelbeds-card-media"><img src="' + escapeHtml(img) + '" alt="" loading="lazy" width="120" height="90"></div>'
      : '<div class="hotelbeds-card-media hotelbeds-card-media--empty" aria-hidden="true"></div>';

    var boardBlock = '';
    if (boardLine || roomLine) {
      boardBlock =
        '<div class="hotelbeds-board-room">' +
        (roomLine ? '<div><strong>Habitación:</strong> ' + escapeHtml(roomLine) + '</div>' : '') +
        (boardLine ? '<div><strong>Régimen:</strong> ' + escapeHtml(boardLine) + '</div>' : '') +
        '</div>';
    }

    var rateExtraBlock = '';
    if (!hideEur) {
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
    }

    var priceHtml = '';
    if (hideEur) {
      priceHtml = '<span class="hotelbeds-price hotelbeds-price--package-note">Incluido en el paquete</span>';
    } else {
      priceHtml = '<span class="hotelbeds-price">' + escapeHtml(priceStr || '') + '</span>';
    }

    return (
      '<article class="hotelbeds-card hotelbeds-card--selectable" role="button" tabindex="0" data-hb-hotel-code="' + escapeHtml(code) + '">' +
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
      (desc ? '<p class="hotelbeds-desc">' + escapeHtml(truncateText(desc, 380)) + '</p>' : '') +
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

  function clampHotelbedsOccupancy(occ) {
    if (!occ) return { adults: 2, rooms: 1, children: 0 };
    return {
      adults: clamp(getInt(occ.adults, 2), 1, 54),
      rooms: clamp(getInt(occ.rooms, 1), 1, HB_MAX_ROOMS),
      children: clamp(getInt(occ.children, 0), 0, 20),
    };
  }

  /** Fragmento típico en rateKey: …|1~2~0|…@ (habitaciones~adultos~niños). */
  function parseOccupancyFromRateKey(rateKey) {
    var rk = String(rateKey || '');
    var m = rk.match(/(\d+)~(\d+)~(\d+)/);
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

  /** Ocupación que exige la tarifa (rateKey > campos rate > formulario funnel). */
  function resolveBookingOccupancy(offer, rateKey, fd) {
    var fromKey = parseOccupancyFromRateKey(rateKey);
    if (fromKey) {
      return {
        rooms: Math.max(1, fromKey.rooms),
        adults: Math.max(1, fromKey.adults),
        children: Math.max(0, fromKey.children),
      };
    }
    var adults = Math.max(
      1,
      parseInt((fd.get('hb_occ_adults') || fd.get('tamanio_grupo') || '2'), 10) || 2
    );
    var rooms = Math.max(1, parseInt((fd.get('hb_occ_rooms') || Math.ceil(adults / 2)), 10) || 1);
    var children = 0;
    if (offer) {
      if (offer.rateRooms != null && offer.rateRooms > 0) rooms = offer.rateRooms;
      if (offer.rateAdults != null && offer.rateAdults > 0) adults = offer.rateAdults;
      if (offer.rateChildren != null && offer.rateChildren >= 0) children = offer.rateChildren;
    }
    return { rooms: rooms, adults: adults, children: children };
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
   */
  function buildBookingRooms(finalRateKey, occ, nameParts) {
    var roomsCount = Math.max(1, occ.rooms | 0);
    var adults = Math.max(1, occ.adults | 0);
    var children = Math.max(0, occ.children | 0);

    if (roomsCount <= 1) {
      var singlePaxes = buildPaxesForRoom(1, adults, nameParts.name, nameParts.surname);
      if (children > 0) {
        singlePaxes = singlePaxes.concat(
          buildChildPaxesForRoom(1, children, nameParts.name, nameParts.surname)
        );
      }
      return [{ rateKey: finalRateKey, paxes: singlePaxes }];
    }

    var alloc = splitAdultsIntoRooms(adults, roomsCount);
    var allPaxes = [];
    for (var i = 0; i < roomsCount; i++) {
      allPaxes = allPaxes.concat(
        buildPaxesForRoom(i + 1, alloc[i] || 1, nameParts.name, nameParts.surname)
      );
    }
    if (children > 0) {
      allPaxes = allPaxes.concat(
        buildChildPaxesForRoom(1, children, nameParts.name, nameParts.surname)
      );
    }
    return [{ rateKey: finalRateKey, paxes: allPaxes }];
  }

  function buildChildPaxesForRoom(roomId, count, holderName, holderSurname) {
    var out = [];
    for (var i = 0; i < count; i++) {
      out.push({
        roomId: roomId,
        type: 'CH',
        age: 8,
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

  function ensureHotelFunnelInlineUi(root) {
    if (!root) return null;
    var existing = root.querySelector('#hb-hotel-funnel-inline');
    if (existing) return existing;
    var host = document.createElement('div');
    host.id = 'hb-hotel-funnel-inline';
    host.className = 'hb-hotel-funnel-inline';
    host.innerHTML =
      '<div class="hb-hotel-funnel-inline__head">' +
      '  <div class="hb-hotel-funnel-inline__title">Configurar habitaciones (Hotelbeds)</div>' +
      '  <div class="hb-hotel-funnel-inline__hotel" id="hb-funnel-inline-hotel">Elige un hotel para continuar.</div>' +
      '</div>' +
      '<div class="hb-hotel-funnel-inline__grid">' +
      '  <label>Adultos <input type="number" min="1" max="54" id="hb-funnel-inline-adults" placeholder=""></label>' +
      '  <label>Habitaciones <input type="number" min="1" max="20" id="hb-funnel-inline-rooms" placeholder=""></label>' +
      '</div>' +
      '<div class="hb-hotel-funnel-inline__rates" id="hb-funnel-inline-rates"></div>' +
      '<div class="hb-hotel-funnel-inline__actions">' +
      '  <button type="button" class="hb-hotel-funnel-btn hb-hotel-funnel-btn--secondary" id="hb-funnel-inline-check" disabled>' +
      escapeHtml(hbFunnelConditionsButtonText()) +
      '</button>' +
      '  <button type="button" class="hb-hotel-funnel-btn" id="hb-funnel-inline-confirm" disabled>Confirmar hotel</button>' +
      '</div>' +
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

  function setSelectedHotelInHiddenInputs(form, hotelCode, rateKey, adults, rooms, rateType) {
    ensureHotelFunnelHiddenInputs(form);
    form.querySelector('input[name="hb_selected_hotel_code"]').value = String(hotelCode || '');
    form.querySelector('input[name="hb_selected_rate_key"]').value = String(rateKey || '');
    form.querySelector('input[name="hb_selected_rate_type"]').value = String(rateType || '');
    form.querySelector('input[name="hb_occ_adults"]').value = String(adults || '');
    form.querySelector('input[name="hb_occ_rooms"]').value = String(rooms || '');
    form.querySelector('input[name="hb_occ_children"]').value = '0';
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
    var book = offer && offer.netValue != null ? Number(offer.netValue) : null;
    refInp.value = ref != null && isFinite(ref) ? String(Math.round(ref * 100) / 100) : '';
    bookInp.value = book != null && isFinite(book) ? String(Math.round(book * 100) / 100) : '';
  }

  function markRateValidated(form, rateKey, rateType, offerForResumen) {
    ensureHotelFunnelHiddenInputs(form);
    form.querySelector('input[name="hb_selected_rate_key"]').value = String(rateKey || '');
    form.querySelector('input[name="hb_selected_rate_type"]').value = String(rateType || '');
    form.querySelector('input[name="hb_rate_validated"]').value = '1';
    form.querySelector('input[name="hb_funnel_ready"]').value = '';
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
      triggerResumenUpdate();
      return true;
    }
    form.querySelector('input[name="hb_rate_validated"]').value = '';
    return false;
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
    if (hbHideHotelEuroUi()) {
      html +=
        '<div class="hb-funnel-small">El alojamiento Hotelbeds se integra en el <strong>importe total del paquete</strong> (green fees y resto de servicios del circuito); no se muestra aquí un precio de habitación desglosado.</div>';
      html +=
        '<div class="hb-funnel-legal"><strong>Cancelación y penalizaciones</strong><p>Según la tarifa elegida y las condiciones del proveedor; el detalle contractual lo confirma Hotelbeds al formalizar la reserva.</p></div>';
    } else {
      if (offer.price) html += '<div class="hb-funnel-small">Total estancia: <strong>' + escapeHtml(offer.price) + '</strong></div>';
      if (offer.promotions && offer.promotions.length) {
        html += '<div class="hb-funnel-legal"><strong>Promociones</strong><ul>';
        offer.promotions.forEach(function (p) {
          html += '<li>' + escapeHtml(p) + '</li>';
        });
        html += '</ul></div>';
      }
      if (offer.rateExtrasPaid && offer.rateExtrasPaid.length) {
        html += '<div class="hb-funnel-legal"><strong>Cargos adicionales</strong><ul>';
        offer.rateExtrasPaid.forEach(function (line) {
          html += '<li>' + escapeHtml(line) + '</li>';
        });
        html += '</ul></div>';
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
    }
    html += '<div class="hb-funnel-small">Pulsa «Confirmar hotel» para fijar esta tarifa antes del pago.</div></div>';
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

  function renderFunnelRateChoices(host, hotelCode, preferredRateKey) {
    var box = host.querySelector('#hb-funnel-inline-rates');
    if (!box) return;
    var offers = (window.__HB_RATE_OFFERS_BY_CODE__ || {})[String(hotelCode)] || [];
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
    var html = '<p class="hb-funnel-small">Elige habitación y régimen:</p>';
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
        ? '<span class="hb-funnel-rate-price">' + escapeHtml(fmtEuros(pkgTotal) + ' €') + '</span>'
        : '';
      html +=
        '<li><label class="hb-funnel-rate-pick"><input type="radio" name="hb-funnel-rate-pick" value="' +
        escapeHtml(o.rateKey) +
        '" data-rate-type="' +
        escapeHtml(o.rateType) +
        '"' +
        (idx === checkedIdx ? ' checked' : '') +
        '><span class="hb-funnel-rate-pick__body"><span class="hb-funnel-rate-pick__main">' +
        escapeHtml(label) + priceBadge +
        '</span>' +
        (hint
          ? '<span class="hb-funnel-rate-pick__sub">' + escapeHtml(hint) + '</span>'
          : '') +
        '</span></label></li>';
    });
    html += '</ul>';
    box.innerHTML = html;
    var funnelForm = getForm();
    if (funnelForm) syncFunnelValidationFromPickedRate(host, funnelForm);
  }

  function getPickedOfferFromFunnel(host, hotelCode) {
    var picked = host.querySelector('input[name="hb-funnel-rate-pick"]:checked');
    var offers = (window.__HB_RATE_OFFERS_BY_CODE__ || {})[String(hotelCode)] || [];
    if (picked) {
      var rk = picked.value;
      for (var i = 0; i < offers.length; i++) {
        if (offers[i].rateKey === rk) return offers[i];
      }
    }
    return offers.length ? offers[0] : null;
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

  function adultsRoomsFromGroupSize(form) {
    var raw = readTamanioGrupo(form);
    var adults = clamp(getInt(raw, 2), 1, 54);
    var rooms = clamp(Math.ceil(adults / 2), 1, 20);
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
    var adultsInp = host.querySelector('#hb-funnel-inline-adults');
    var roomsInp = host.querySelector('#hb-funnel-inline-rooms');
    var btnCheck = host.querySelector('#hb-funnel-inline-check');
    var btnConfirm = host.querySelector('#hb-funnel-inline-confirm');
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
      btnConfirm.title = !hotelCode
        ? 'Elige un hotel.'
        : needsCheck
          ? 'Tarifa RECHECK: pulsa «' + hbFunnelConditionsButtonText() + '» antes de confirmar.'
          : !isRateValidated()
            ? 'Elige una tarifa (habitación y régimen).'
            : 'Fijar este hotel y tarifa antes del pago.';
      if (!hotelCode) {
        hotelLine.textContent = 'Elige un hotel para continuar.';
        host.__hbRatesHotel = '';
        host.__hbAutoRatesHotel = '';
        return;
      }
      hotelLine.textContent = hotelNameForCode(hotelCode);
      hydrateRateOffersFromLastAvailability(hotelCode);
      var ratesBox = host.querySelector('#hb-funnel-inline-rates');
      var hasList = ratesBox && ratesBox.querySelector('input[name="hb-funnel-rate-pick"]');
      if (hasList && host.__hbRatesHotel === hotelCode) return;
      var priorKey = getSelectedRateKeyFromFunnel(host, form);
      host.__hbRatesHotel = hotelCode;
      renderFunnelRateChoices(host, hotelCode, priorKey);
      var offers = (window.__HB_RATE_OFFERS_BY_CODE__ || {})[String(hotelCode)] || [];
      if (!offers.length && !host.__hbAutoRatesPending) {
        var checkInOut = getCheckInCheckOut(new FormData(form));
        if (checkInOut) {
          host.__hbAutoRatesPending = true;
          host.__hbAutoRatesHotel = hotelCode;
          if (ratesBox) {
            ratesBox.innerHTML = '<p class="hb-funnel-small">Cargando tarifas para este hotel...</p>';
          }
          var occ = getFunnelOccupancyForAvailability(form, adultsInp, roomsInp, adultsDefault, roomsDefault);
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

    if (!host.__hbBound) {
      host.__hbBound = true;
      host.addEventListener('click', function (ev) {
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
        var result = host.querySelector('#hb-funnel-inline-result');
        if (
          result &&
          offer &&
          String(offer.rateType || '').toUpperCase() === 'BOOKABLE' &&
          isRateValidated()
        ) {
          result.innerHTML =
            '<p class="hb-funnel-small">Tarifa seleccionada. Puedes pulsar <strong>Confirmar hotel</strong> o «' +
            escapeHtml(hbFunnelConditionsButtonText()) +
            '» para ver cancelación y observaciones.</p>';
        } else if (result && offer && String(offer.rateType || '').toUpperCase() === 'RECHECK') {
          result.innerHTML =
            '<p class="hb-funnel-warn">Tarifa RECHECK: pulsa «' +
            escapeHtml(hbFunnelConditionsButtonText()) +
            '» antes de confirmar.</p>';
        }
        refreshUiState();
      });

      function resetFunnelValidation() {
        form.querySelector('input[name="hb_rate_validated"]').value = '';
        form.querySelector('input[name="hb_funnel_ready"]').value = '';
        refreshUiState();
      }
      adultsInp.addEventListener('input', function () {
        adultsInp.__hbUserEdited = true;
        resetFunnelValidation();
      });
      roomsInp.addEventListener('input', function () {
        roomsInp.__hbUserEdited = true;
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
        var occ = getFunnelOccupancyForAvailability(form, adultsInp, roomsInp, adultsDefault, roomsDefault);
        adultsInp.value = String(occ.adults);
        roomsInp.value = String(occ.rooms);
        var previousRateKey = getSelectedRateKeyFromFunnel(host, form);
        setSelectedHotelInHiddenInputs(form, hotelCode, '', occ.adults, occ.rooms, '');
        refreshUiState();

        var offersReady =
          ((window.__HB_RATE_OFFERS_BY_CODE__ || {})[String(hotelCode)] || []).length > 0 &&
          hbFunnelOffersCacheMatches(hotelCode, checkInOut, occ);
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
            form.querySelector('input[name="hb_occ_adults"]').value = String(occ.adults);
            form.querySelector('input[name="hb_occ_rooms"]').value = String(occ.rooms);
            refreshUiState();
            result.innerHTML = renderFunnelConditionsHtml(offer);
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
        var hotelCode = getSelectedHotelCode();
        if (!hotelCode) return;
        if (!isRateValidated()) {
          result.innerHTML = '<p class="hb-funnel-warn">Antes revisa las condiciones (Hotelbeds).</p>';
          return;
        }
        var rkConfirm = (form.querySelector('input[name="hb_selected_rate_key"]') || {}).value || '';
        var offerConfirm = getPickedOfferFromFunnel(host, hotelCode);
        var occConfirm = resolveBookingOccupancy(offerConfirm, rkConfirm, new FormData(form));
        form.querySelector('input[name="hb_occ_adults"]').value = String(occConfirm.adults);
        form.querySelector('input[name="hb_occ_rooms"]').value = String(occConfirm.rooms);
        form.querySelector('input[name="hb_funnel_ready"]').value = '1';
        var nochesInput = form.querySelector('input[name="noches"]');
        var noches = nochesInput ? nochesInput.value : '1';
        var n = Math.max(1, parseInt(noches || '1', 10) || 1);
        for (var i = 1; i <= n; i++) {
          var inp = form.querySelector('input[name="hotel-noche-' + i + '"]');
          if (inp) inp.value = 'hb-' + String(hotelCode);
        }
        document.querySelectorAll('.hotelbeds-card--selectable').forEach(function (el) {
          var c = el.getAttribute('data-hb-hotel-code');
          if (c === String(hotelCode)) el.classList.add('hotelbeds-card--picked');
          else el.classList.remove('hotelbeds-card--picked');
        });
        triggerResumenUpdate();
        var reservar = document.querySelector('button.btn-reservar-paquete');
        if (reservar && reservar.scrollIntoView) {
          reservar.scrollIntoView({ behavior: 'smooth', block: 'center' });
          reservar.focus({ preventScroll: true });
        }
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
      // Evitar que clicks en enlaces internos actúen como selección.
      if (ev.target && ev.target.tagName === 'A') return;
      var code = card.getAttribute('data-hb-hotel-code');
      if (!code) return;
      // Select hotel and focus inline funnel
      setSelectedHotelInHiddenInputs(form, String(code), '', '', '', '');
      window.__HB_FUNNEL_LAST__ = null;
      var root = document.getElementById(o.preciosBlockId || 'hotelbeds-precios-block');
      if (root) {
        wireHotelFunnelInlineHandlers(root, form);
        var host = root.querySelector('#hb-hotel-funnel-inline');
        if (host) {
          var ai = host.querySelector('#hb-funnel-inline-adults');
          var ri = host.querySelector('#hb-funnel-inline-rooms');
          syncFunnelAdultsFromGroup(host, form, ai, ri, true);
          var sug = adultsRoomsFromGroupSize(form);
          setSelectedHotelInHiddenInputs(form, String(code), '', String(sug.adults), String(sug.rooms), '');
          host.__hbRatesHotel = '';
          host.__hbAutoRatesPending = false;
          if (typeof host.__hbRefreshUiState === 'function') host.__hbRefreshUiState();
        }
        if (host && host.scrollIntoView) host.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
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

  function fetchHotelbeds(checkIn, checkOut, hotelCodes, occ) {
    var base = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    var safeOcc = clampHotelbedsOccupancy(occ);
    return fetch(base + '/api/hotelbeds-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkIn: checkIn,
        checkOut: checkOut,
        rooms: safeOcc.rooms,
        adults: safeOcc.adults,
        children: safeOcc.children || 0,
        hotelCodes: hotelCodes,
      }),
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
        return fetch(base + '/api/hotelbeds-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkIn: checkIn,
            checkOut: checkOut,
            rooms: (occ && occ.rooms) || 1,
            adults: (occ && occ.adults) || 2,
            children: (occ && occ.children) || 0,
            destinationCode: dest,
          }),
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
    return isAllowedHotel(h.code);
  }

  function getAllowedHotelCodeList() {
    syncAllowedBurgosFromPriority();
    var out = getBrgHotelPriorityList().slice();
    var seen = {};
    out.forEach(function (c) {
      seen[c] = 1;
    });
    Object.keys(ALLOWED_HOTEL_CODES.lerma || {}).forEach(function (code) {
      if (!seen[code]) {
        seen[code] = 1;
        out.push(code);
      }
    });
    return out;
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

  /** Una petición availability con todos los códigos BRG; hasta HB_DISPLAY_MAX con tarifas (orden API). */
  function fetchBrgHotelsForDisplay(checkIn, checkOut, occ, abortSignal) {
    var codes = getBrgHotelCodeList();
    var maxShow = getDisplayMaxHotels();
    if (!codes.length) {
      return Promise.resolve({ hotels: [], poolSize: 0, apiCalls: 0 });
    }

    function pickHotelsWithOffers(hb, codeList) {
      var found = [];
      for (var i = 0; i < codeList.length && found.length < maxShow; i++) {
        var h = findHotelInAvailability(hb, codeList[i]);
        if (h && shouldListHotel(h) && hotelHasBookableOffers(h)) {
          found.push(h);
        }
      }
      return found;
    }

    return fetchHotelbeds(checkIn, checkOut, codes, occ).then(function (hb) {
      if (abortSignal && abortSignal.aborted) {
        return { hotels: [], poolSize: codes.length, apiCalls: 1, aborted: true };
      }
      if (!hb || hb.error) {
        var raw =
          hb && hb.error
            ? typeof hb.error === 'string'
              ? hb.error
              : hb.error && hb.error.message
                ? String(hb.error.message)
                : String(hb.error)
            : 'Availability sin respuesta válida';
        var e = new Error(raw);
        if (hb && hb.hotelbedsHttpStatus) e.hotelbedsHttpStatus = hb.hotelbedsHttpStatus;
        if (isHbQuotaLikeMessage(raw, hb)) {
          e.message =
            'Cuota de consultas Hotelbeds superada. Espera unos minutos e inténtalo de nuevo (no es falta de credenciales).';
        }
        throw e;
      }
      var rawList = (hb.hotels && hb.hotels.hotels) || [];
      return {
        hotels: pickHotelsWithOffers(hb, codes),
        poolSize: codes.length,
        apiCalls: 1,
        aborted: false,
        rawApiCount: rawList.length,
        occ: clampHotelbedsOccupancy(occ),
      };
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

  function cardListPriceCaption(rate, noches, fallbackLabel) {
    if (hbHideHotelEuroUi()) return '';
    return formatHotelListPriceStr(rate, noches) || (fallbackLabel != null ? fallbackLabel : PRICE_ON_REQUEST_LABEL);
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
          '<ul class="hotelbeds-list hotelbeds-list--cards">';
        hotelList.forEach(function (h) {
          var code = String(h.code);
          var meta = contentBy[code] || null;
          var stub = { code: code, name: meta && meta.name ? meta.name : h.name };
          var priceStr = cardListPriceCaption(parseHotelMinRate(h), noches, fallbackPriceStr);
          html +=
            '<li class="hotelbeds-item-wrap">' +
            hotelRichCardHtml(stub, meta, null, priceStr, '') +
            '</li>';
        });
        html += '</ul></div>';
        renderBlock(html);
        bindSelectableHotelCards();
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
    var occLine =
      occ && occ.adults
        ? ' Búsqueda: <strong>' +
          occ.adults +
          ' adulto(s)</strong>, <strong>' +
          (occ.rooms || 1) +
          ' habitación(es)</strong>.'
        : '';
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
    var partialNote =
      hotels.length < maxShow
        ? '<p class="hotelbeds-note">Solo ' +
          hotels.length +
          ' de ' +
          maxShow +
          ' hoteles con disponibilidad en Burgos para estas fechas.</p>'
        : '';
    var html =
      '<div class="hotelbeds-block hotelbeds-results"><h4 class="hotelbeds-title">' +
      (hbHideHotelEuroUi()
        ? 'Hoteles con disponibilidad en Burgos (Hotelbeds)'
        : 'Precios en tiempo real · Burgos (Hotelbeds)') +
      '</h4>' +
      partialNote +
      '<ul class="hotelbeds-list hotelbeds-list--cards">';
    // Hotelbeds Availability suele devolver minRate como total de la estancia.
    // Para evitar confusión, mostramos total estancia + (aprox) por noche según nº de noches.
    var noches = getNochesFromForm();
    hotels.forEach(function (h) {
      var code = String(h.code);
      var ourId = codeToId[code];
      var rate = parseHotelMinRate(h);
      if (ourId && rate != null) live[ourId] = rate;
      var priceStr = cardListPriceCaption(rate, noches, null);
      var sel = selectedHotels.indexOf(code) >= 0 ? ' <span class="hotelbeds-selected">(elegido)</span>' : '';
      var pick = rateBy[code];
      var meta = contentBy[code];
      html +=
        '<li class="hotelbeds-item-wrap">' +
        hotelRichCardHtml(h, meta, pick, priceStr, sel) +
        '</li>';
    });
    html +=
      '</ul><p class="hotelbeds-note">' +
      (hbHideHotelEuroUi()
        ? 'Importes de hotel no mostrados; el alojamiento se integra en el total del paquete al confirmar en el funnel.'
        : 'Ficha enriquecida con Hotelbeds Content API (estrellas, imagen y descripción). Los cargos de tarifa se muestran cuando la API los incluye.') +
      '</p></div>';
    window.LIVE_HOTEL_PRICES = Object.keys(live).length ? live : null;
    setBookingWidgetVisible(!window.LIVE_HOTEL_PRICES);
    renderBlock(html);
    bindSelectableHotelCards();
    triggerResumenUpdate();
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
      '</h4><ul class="hotelbeds-list hotelbeds-list--cards">';
    hotels.forEach(function (h) {
      var code = String(h.code);
      var key = 'hb-' + code;
      var rate = live[key];
      var priceStr = cardListPriceCaption(rate, noches, null);
      var pick = rateBy[code];
      var meta = contentBy[code];
      html +=
        '<li class="hotelbeds-item-wrap">' +
        hotelRichCardHtml(h, meta, pick, priceStr, '') +
        '</li>';
    });
    html +=
      '</ul><p class="hotelbeds-note">' +
      (hbHideHotelEuroUi()
        ? 'Elige hotel y régimen en el funnel. Los importes de alojamiento van integrados en el total del paquete.'
        : 'Elige el hotel para cada noche en los desplegables. Ficha enriquecida con Content API. Cargos de tarifa cuando los devuelve la API.') +
      '</p></div>';
    setBookingWidgetVisible(false);
    renderBlock(html);
    bindSelectableHotelCards();
    document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
    triggerResumenUpdate();
  }

  function run() {
    if (runAbortCtrl) {
      try { runAbortCtrl.abort(); } catch (e) { /* ignore */ }
    }
    runAbortCtrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var thisAbort = runAbortCtrl;

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
    window.__HB_API_DOWN__ = '';

    syncAllowedBurgosFromPriority();

    var occ = clampHotelbedsOccupancy(getListOccupancyForAvailability(formData));
    var codePool = getBrgHotelCodeList();
    if (!codePool.length) {
      renderBlock(
        '<div class="hotelbeds-block hotelbeds-info">No hay códigos de hotel configurados (BRG_HOTEL_CODES).</div>'
      );
      document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
      return;
    }

    fetchBrgHotelsForDisplay(
      range.checkIn,
      range.checkOut,
      occ,
      thisAbort && thisAbort.signal ? thisAbort.signal : null
    )
      .then(function (result) {
        if (thisAbort && thisAbort.signal && thisAbort.signal.aborted) return;
        var hotels = (result && result.hotels) || [];
        if (!hotels.length) {
          console.warn(
            '[Hotelbeds] Sin hoteles tras filtro.',
            'occ:', result.occ,
            'rawApi:', result.rawApiCount,
            'pool:', result.poolSize
          );
          renderNoAvailabilityForDates(result && result.poolSize, result && result.occ, result && result.rawApiCount);
          return;
        }
        var hb = { hotels: { hotels: hotels, total: hotels.length } };
        window.__HB_LAST_AVAIL__ = hb;
        window.__HB_LAST_AVAIL_OCC__ = occ;
        window.__HB_LAST_AVAIL_RANGE__ = { checkIn: range.checkIn, checkOut: range.checkOut };
        var widenSeedKey = [range.checkIn, range.checkOut, occ.rooms, occ.adults, occ.children || 0].join('|');
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
        if (!hb) return;
        renderHotelbedsResults(hb, []);
      })
      .catch(function (err) {
        if (thisAbort && thisAbort.signal && thisAbort.signal.aborted) return;
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
    // Funnel-selected rateKey (revalidated) has priority.
    var selectedRateKey = (fd.get('hb_selected_rate_key') || '').trim();
    var adults = Math.max(1, parseInt((fd.get('hb_occ_adults') || fd.get('tamanio_grupo') || '2'), 10) || 2);
    var roomsCount = Math.max(1, parseInt((fd.get('hb_occ_rooms') || Math.ceil(adults / 2)), 10) || 1);

    var funnelReady = (fd.get('hb_funnel_ready') || '').trim() === '1';
    var selectedHotel = (fd.get('hb_selected_hotel_code') || '').trim();
    var rateValidated = (fd.get('hb_rate_validated') || '').trim() === '1';
    if (selectedHotel && !funnelReady) {
      if (rateValidated) {
        return Promise.reject(
          new Error(
            'Pulsa «Confirmar hotel» en la sección Hotelbeds (debajo de la tarifa elegida) y después «Reservar paquete».'
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

    function doBooking(finalRateKey) {
      var hotelForOffer = selectedHotel || getActiveHotelCodeForBooking(fd, noches, cfg);
      var offerForOcc = hotelForOffer ? findOfferByRateKey(hotelForOffer, finalRateKey) : null;
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
      return postHb({ action: 'booking', booking: booking, packageLabel: pkgLabel }).then(function (res) {
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

  function shouldIgnoreHotelbedsFormRefresh(target) {
    if (!target) return false;
    var name = target.name || '';
    var id = target.id || '';
    if (name === 'hb-funnel-rate-pick') return true;
    if (name.indexOf('hb_') === 0) return true;
    if (id === 'hb-funnel-inline-adults' || id === 'hb-funnel-inline-rooms') return true;
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
