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
  /** Oferta curada Hotelbeds (códigos Content API BRG). Lerma pueblo: vacío hasta añadir códigos. */
  var ALLOWED_HOTEL_CODES = {
    lerma: {},
    burgos: { '87356': 1, '23103': 1, '934': 1 },
  };
  var CURATED_HOTEL_LABELS = {
    '87356': 'Silken Gran Teatro',
    '23103': 'NH Collection Palacio de Burgos',
    '934': 'Hotel Maria Luisa',
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
    window.__HB_RATE_OFFERS_BY_CODE__ = null;
    window.__HB_FUNNEL_LAST__ = null;
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
      parts.push('Tarifa empaquetada (paquete Hotelbeds, no solo alojamiento suelto)');
    } else {
      parts.push('Solo alojamiento (sin paquete)');
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
      parts.push('Texto legal completo al pulsar «Ver condiciones y precio final»');
    }
    if (offer.rateExtrasPaid && offer.rateExtrasPaid.length) {
      parts.push(offer.rateExtrasPaid.join(' · '));
    }
    if (offer.paymentType) {
      parts.push('Pago: ' + offer.paymentType);
    }
    return truncateText(parts.join(' · '), 280);
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
      netValue: rateNetAmount(rate),
    };
    offer.listHint = rateOfferListHint(offer);
    return offer;
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
    if (hotel && hotel.code != null) {
      window.__HB_RATE_OFFERS_OMITTED__ = window.__HB_RATE_OFFERS_OMITTED__ || {};
      window.__HB_RATE_OFFERS_OMITTED__[String(hotel.code)] = deduped.omitted;
    }
    return deduped.offers;
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

  function getOccupancyFromFormData(fd) {
    if (!fd || !fd.get) return { adults: 2, rooms: 1, children: 0 };
    var adults = clamp(getInt(fd.get('hb_occ_adults') || fd.get('tamanio_grupo'), 2), 1, 54);
    var rooms = clamp(getInt(fd.get('hb_occ_rooms') || Math.ceil(adults / 2), 1), 1, 20);
    return { adults: adults, rooms: rooms, children: 0 };
  }

  function getOccupancyFromTamanioGrupo(fd) {
    if (!fd || !fd.get) return null;
    var raw = String(fd.get('tamanio_grupo') || '').trim();
    if (!raw) return null;
    var adults = clamp(getInt(raw, 2), 1, 54);
    return {
      adults: adults,
      rooms: clamp(Math.ceil(adults / 2), 1, 20),
      children: 0,
    };
  }

  /** Listado inicial: misma ocupación que el funnel (tamaño de grupo) cuando exista. */
  function getListOccupancyForAvailability(fd) {
    if (!fd || !fd.get) return { adults: 2, rooms: 1, children: 0 };
    if (String(fd.get('hb_occ_adults') || '').trim()) return getOccupancyFromFormData(fd);
    var fromGroup = getOccupancyFromTamanioGrupo(fd);
    if (fromGroup) return fromGroup;
    return { adults: 2, rooms: 1, children: 0 };
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
    return Promise.all(
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
      })
      .catch(function () {
        window.__HB_CONTENT_BY_CODE = {};
      });
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
      '<article class="hotelbeds-card hotelbeds-card--selectable" role="button" tabindex="0" data-hb-hotel-code="' + escapeHtml(code) + '">' +
      imgHtml +
      '<div class="hotelbeds-card-main">' +
      '<header class="hotelbeds-card-head">' +
      renderStarsBadge(catLabel, catStars) +
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

  function splitAdultsIntoRooms(adults, rooms) {
    adults = Math.max(1, adults | 0);
    rooms = Math.max(1, rooms | 0);
    // Default: distribute 2 per room, remainder 1.
    var alloc = new Array(rooms).fill(0);
    var left = adults;
    for (var i = 0; i < rooms; i++) {
      var take = left >= 2 ? 2 : 1;
      alloc[i] = take;
      left -= take;
      if (left <= 0) break;
    }
    // If adults > rooms*2, cap distribution and leave remainder in last room.
    if (left > 0) {
      alloc[rooms - 1] += left;
    }
    return alloc.map(function (x) { return Math.max(1, x); });
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
      '  <button type="button" class="hb-hotel-funnel-btn hb-hotel-funnel-btn--secondary" id="hb-funnel-inline-check" disabled>Ver condiciones y precio final</button>' +
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
  }

  function markRateValidated(form, rateKey, rateType) {
    ensureHotelFunnelHiddenInputs(form);
    form.querySelector('input[name="hb_selected_rate_key"]').value = String(rateKey || '');
    form.querySelector('input[name="hb_selected_rate_type"]').value = String(rateType || '');
    form.querySelector('input[name="hb_rate_validated"]').value = '1';
    form.querySelector('input[name="hb_funnel_ready"]').value = '';
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
      box.innerHTML = '<p class="hb-funnel-small">Selecciona fechas y pulsa «Ver condiciones y precio final» para cargar tarifas.</p>';
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
    if (omitted > 0) {
      html +=
        '<p class="hb-funnel-small">Se ocultan ' +
        omitted +
        ' tarifa(s) HB equivalentes; se muestra la más barata de cada grupo.</p>';
    }
    html += '<ul class="hb-funnel-rate-list">';
    offers.forEach(function (o, idx) {
      var label = (o.roomName || 'Habitación') + ' · ' + (o.boardName || o.boardCode || 'Régimen');
      if (o.price) label += ' · Total estancia ' + o.price;
      label += ' · ' + o.rateType;
      var hint = o.listHint || rateOfferListHint(o);
      html +=
        '<li><label class="hb-funnel-rate-pick"><input type="radio" name="hb-funnel-rate-pick" value="' +
        escapeHtml(o.rateKey) +
        '" data-rate-type="' +
        escapeHtml(o.rateType) +
        '"' +
        (idx === checkedIdx ? ' checked' : '') +
        '><span class="hb-funnel-rate-pick__body"><span class="hb-funnel-rate-pick__main">' +
        escapeHtml(label) +
        '</span>' +
        (hint
          ? '<span class="hb-funnel-rate-pick__sub">' + escapeHtml(hint) + '</span>'
          : '') +
        '</span></label></li>';
    });
    html += '</ul>';
    box.innerHTML = html;
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
      btnConfirm.disabled = !hotelCode || !isRateValidated();
      btnConfirm.title =
        hotelCode && !isRateValidated()
          ? 'Primero pulsa «Ver condiciones y precio final».'
          : '';
      if (!hotelCode) {
        hotelLine.textContent = 'Elige un hotel para continuar.';
        host.__hbRatesHotel = '';
        return;
      }
      hotelLine.textContent = hotelNameForCode(hotelCode);
      var ratesBox = host.querySelector('#hb-funnel-inline-rates');
      var hasList = ratesBox && ratesBox.querySelector('input[name="hb-funnel-rate-pick"]');
      if (hasList && host.__hbRatesHotel === hotelCode) return;
      var priorKey = getSelectedRateKeyFromFunnel(host, form);
      host.__hbRatesHotel = hotelCode;
      renderFunnelRateChoices(host, hotelCode, priorKey);
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
        form.querySelector('input[name="hb_rate_validated"]').value = '';
        form.querySelector('input[name="hb_funnel_ready"]').value = '';
        var offer = getPickedOfferFromFunnel(host, getSelectedHotelCode());
        if (offer) {
          form.querySelector('input[name="hb_selected_rate_key"]').value = offer.rateKey;
          form.querySelector('input[name="hb_selected_rate_type"]').value = offer.rateType;
        }
        btnConfirm.disabled = true;
      });

      function resetFunnelValidation() {
        form.querySelector('input[name="hb_rate_validated"]').value = '';
        form.querySelector('input[name="hb_funnel_ready"]').value = '';
        refreshUiState();
      }
      adultsInp.addEventListener('input', resetFunnelValidation);
      roomsInp.addEventListener('input', resetFunnelValidation);

      btnCheck.addEventListener('click', function () {
        var hotelCode = getSelectedHotelCode();
        if (!hotelCode) return;
        var checkInOut = getCheckInCheckOut(new FormData(form));
        if (!checkInOut) {
          result.innerHTML = '<p class="hb-funnel-warn">Selecciona fechas antes.</p>';
          return;
        }
        var adults = clamp(getInt(adultsInp.value, adultsDefault), 1, 54);
        var rooms = clamp(getInt(roomsInp.value, roomsDefault), 1, 20);
        adultsInp.value = String(adults);
        roomsInp.value = String(rooms);

        var previousRateKey = getSelectedRateKeyFromFunnel(host, form);
        setSelectedHotelInHiddenInputs(form, hotelCode, '', adults, rooms, '');
        refreshUiState();

        result.textContent = 'Consultando disponibilidad...';
        btnCheck.disabled = true;

        var base = window.location.origin || '';
        var occ = { rooms: rooms, adults: adults, children: 0 };
        var cacheKey = buildAvailCacheKey(checkInOut.checkIn, checkInOut.checkOut, occ, hotelCode);
        var cached = window.__HB_FUNNEL_LAST__ && window.__HB_FUNNEL_LAST__.key === cacheKey ? window.__HB_FUNNEL_LAST__.av : null;
        var avPromise = cached
          ? Promise.resolve(cached)
          : fetchJson(base + '/api/hotelbeds-availability', {
              checkIn: checkInOut.checkIn,
              checkOut: checkInOut.checkOut,
              rooms: rooms,
              adults: adults,
              children: 0,
              hotelCodes: [String(hotelCode)],
            }).then(function (av) {
              if (!av || av.error) throw new Error(av && av.error ? av.error : 'Availability sin respuesta válida');
              window.__HB_FUNNEL_LAST__ = { key: cacheKey, av: av };
              return av;
            });

        avPromise
          .then(function (av) {
            var hotel = findHotelInAvailability(av, hotelCode);
            if (!hotel) {
              var listOcc = window.__HB_LAST_AVAIL_OCC__;
              var occMismatch =
                listOcc &&
                (listOcc.adults !== adults || listOcc.rooms !== rooms);
              if (occMismatch) {
                throw new Error(
                  'Sin disponibilidad para ' +
                    adults +
                    ' adulto(s) en ' +
                    rooms +
                    ' habitación(es). Las tarifas del listado eran para ' +
                    listOcc.adults +
                    ' adulto(s) en ' +
                    listOcc.rooms +
                    ' habitación(es); ajusta la ocupación o cambia fechas.'
                );
              }
              throw new Error('Sin disponibilidad para ese hotel y ocupación.');
            }
            var offers = collectRateOffersFromHotel(hotel);
            if (!offers.length) throw new Error('No hay tarifas para esa ocupación.');
            window.__HB_RATE_OFFERS_BY_CODE__ = window.__HB_RATE_OFFERS_BY_CODE__ || {};
            window.__HB_RATE_OFFERS_BY_CODE__[String(hotelCode)] = offers;
            host.__hbRatesHotel = String(hotelCode);
            renderFunnelRateChoices(host, hotelCode, previousRateKey);
            var offer = getPickedOfferFromFunnel(host, hotelCode);
            if (!offer) throw new Error('Selecciona una tarifa.');
            if (offer.rateType === 'RECHECK') {
              return fetchJson(base + '/api/hotelbeds-availability', { action: 'checkrates', rooms: [{ rateKey: offer.rateKey }] }).then(function (cr) {
                if (!cr || cr.ok !== true) {
                  throw new Error((cr && (cr.hotelbedsError || cr.error)) || 'CheckRate falló');
                }
                return offerFromCheckrateData(cr.data, offer);
              });
            }
            return offer;
          })
          .then(function (offer) {
            markRateValidated(form, offer.rateKey, offer.rateType);
            form.querySelector('input[name="hb_occ_adults"]').value = String(adults);
            form.querySelector('input[name="hb_occ_rooms"]').value = String(rooms);
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
          result.innerHTML = '<p class="hb-funnel-warn">Antes revisa condiciones y precio final.</p>';
          return;
        }
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
      var root = document.getElementById(o.preciosBlockId || 'hotelbeds-precios-block');
      if (root) {
        wireHotelFunnelInlineHandlers(root, form);
        var host = root.querySelector('#hb-hotel-funnel-inline');
        if (host) {
          var ai = host.querySelector('#hb-funnel-inline-adults');
          var ri = host.querySelector('#hb-funnel-inline-rooms');
          syncFunnelAdultsFromGroup(host, form, ai, ri, true);
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
    return fetch(base + '/api/hotelbeds-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkIn: checkIn,
        checkOut: checkOut,
        rooms: (occ && occ.rooms) || 1,
        adults: (occ && occ.adults) || 2,
        children: (occ && occ.children) || 0,
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
    var out = [];
    var seen = {};
    ['lerma', 'burgos'].forEach(function (zona) {
      var bucket = ALLOWED_HOTEL_CODES[zona] || {};
      Object.keys(bucket).forEach(function (code) {
        if (!seen[code]) {
          seen[code] = 1;
          out.push(code);
        }
      });
    });
    return out;
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
    if (window.__HB_API_DOWN__) {
      return (
        '<p class="hotelbeds-note">No se pudo consultar tarifas en tiempo real (' +
        escapeHtml(window.__HB_API_DOWN__) +
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
    window.__HB_API_DOWN__ = err && err.message ? err.message : 'Error de conexión';
    setBookingWidgetVisible(true);
    fetchHotelbedsListHotels()
      .then(function (list) {
        renderFullHotelListFromContent(list);
      })
      .catch(function () {
        renderFullHotelListFromContent(buildStaticCatalogHotels());
      });
  }

  var DEFAULT_PRICE_PER_NIGHT = 75;

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
        if (!byCode[code]) {
          byCode[code] = true;
          all.push({ code: code, name: h.name || ('Hotel ' + code), city: h.city || '' });
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
    if (allowedCodes.length > 0) {
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
    hotelList.forEach(function (h) {
      var name = (typeof h.name === 'string' ? h.name : (h.name && h.name.content) ? h.name.content : '') || ('Hotel ' + h.code);
      var ciudad = cityForCode(h.code, h);
      var opt = { v: 'hb-' + h.code, l: name, p: DEFAULT_PRICE_PER_NIGHT };
      if (ciudad === 'lerma') lerma.push(opt); else burgos.push(opt);
    });
    window.HOTELBEDS_DYNAMIC_OPTS = { lerma: lerma, burgos: burgos };
    setBookingWidgetVisible(true);
    var totalHotels = lerma.length + burgos.length;
    var priceStr = DEFAULT_PRICE_PER_NIGHT + ' €/noche (orientativo)';
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

  function renderHotelbedsResults(data, selectedHotels) {
    window.HOTELBEDS_DYNAMIC_OPTS = null;
    var hotels = ((data.hotels && data.hotels.hotels) || []).filter(function (h) {
      return shouldListHotel(h);
    });
    if (hotels.length === 0) {
      fetchHotelbedsListHotels()
        .then(function (list) {
          renderFullHotelListFromContent(list);
        })
        .catch(function () {
          renderFullHotelListFromContent(buildStaticCatalogHotels());
        });
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
    // Hotelbeds Availability suele devolver minRate como total de la estancia.
    // Para evitar confusión, mostramos total estancia + (aprox) por noche según nº de noches.
    var noches = 1;
    try {
      var fdTmp = getFormData();
      var nTmp = fdTmp && fdTmp.get ? parseInt(fdTmp.get('noches') || '1', 10) : 1;
      if (nTmp && nTmp > 0) noches = nTmp;
    } catch (e0) { /* ignore */ }
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
      var priceStr = '—';
      if (rate != null) {
        var total = Math.round(rate * 100) / 100;
        if (noches >= 2) {
          var pn = Math.round((total / noches) * 100) / 100;
          priceStr = total + ' € (estancia) · ' + pn + ' €/noche';
        } else {
          priceStr = total + ' € (estancia)';
        }
      }
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
    bindSelectableHotelCards();
    triggerResumenUpdate();
    document.dispatchEvent(new CustomEvent('hotelbeds-dynamic-ready'));
  }

  function renderHotelbedsResultsByDestination(data) {
    var hotels = ((data.hotels && data.hotels.hotels) || []).filter(function (h) {
      return shouldListHotel(h);
    });
    if (hotels.length === 0) {
      fetchHotelbedsListHotels().then(function (list) {
        renderFullHotelListFromContent(list);
      }).catch(function () {
        renderFullHotelListFromContent(buildStaticCatalogHotels());
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
    var noches = 1;
    try {
      var fdTmp = getFormData();
      var nTmp = fdTmp && fdTmp.get ? parseInt(fdTmp.get('noches') || '1', 10) : 1;
      if (nTmp && nTmp > 0) noches = nTmp;
    } catch (e0) { /* ignore */ }
    hotels.forEach(function (h) {
      var code = String(h.code);
      var key = 'hb-' + code;
      var rate = live[key];
      var priceStr = '—';
      if (rate != null) {
        var total = Math.round(rate * 100) / 100;
        if (noches >= 2) {
          var pn = Math.round((total / noches) * 100) / 100;
          priceStr = total + ' € (estancia) · ' + pn + ' €/noche';
        } else {
          priceStr = total + ' € (estancia)';
        }
      }
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
    bindSelectableHotelCards();
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
    window.__HB_API_DOWN__ = '';

    var cfg = window.HOTELBEDS_CONFIG;
    var selectedCodes = cfg && cfg.getCodesForSelectedHotels ? cfg.getCodesForSelectedHotels(formData, noches) : [];
    var curatedCodes = getAllowedHotelCodeList();

    var occ = getListOccupancyForAvailability(formData);
    var queryCodes = selectedCodes.length > 0 ? selectedCodes : curatedCodes;
    var hbPromise = queryCodes.length > 0
      ? fetchHotelbeds(range.checkIn, range.checkOut, queryCodes, occ)
      : fetchHotelbedsByDestination(range.checkIn, range.checkOut, occ);

    hbPromise
      .then(function (hb) {
        if (hb && hb.error) {
          throw new Error(typeof hb.error === 'string' ? hb.error : (hb.error && hb.error.message) || 'Hotelbeds error');
        }
        window.__HB_LAST_AVAIL__ = hb;
        window.__HB_LAST_AVAIL_OCC__ = occ;
        window.__HB_RATE_BY_CODE = indexRatesByHotelCode(hb);
        return loadHotelContentEnrichment().then(function () {
          return hb;
        });
      })
      .then(function (hb) {
        if (queryCodes.length > 0) {
          renderHotelbedsResults(hb, selectedCodes);
        } else {
          renderHotelbedsResultsByDestination(hb);
        }
      })
      .catch(function (err) {
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
    if (selectedHotel && !funnelReady) {
      return Promise.reject(new Error('Confirma el hotel en la sección Hotelbeds antes de pagar.'));
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
      var booking = {
        holder: {
          name: nameParts.name,
          surname: nameParts.surname,
          email: mail,
          phone: phone,
        },
        rooms: (function () {
          var alloc = splitAdultsIntoRooms(adults, roomsCount);
          var out = [];
          for (var i = 0; i < alloc.length; i++) {
            out.push({
              rateKey: finalRateKey,
              paxes: buildPaxesForRoom(i + 1, alloc[i], nameParts.name, nameParts.surname),
            });
          }
          return out;
        })(),
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
