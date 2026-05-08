/**
 * Transfer Hotelbeds en paquetes: planificador de transfers.
 * - Ping: GET /api/hotelbeds-transfers?ping=1
 * - Availability simple: GET /api/hotelbeds-transfers?... (MAD ↔ GPS Lerma/Burgos)
 *
 * Requisitos del cliente:
 * - Origen libre (normalmente MAD/BIO/SDR...) y vuelta automática al origen.
 * - Fechas por defecto (primera/última del calendario) pero editables.
 * - Destinos por defecto según green fees (campo por día): Saldaña=Burgos, Lerma=Lerma.
 * - Noches por defecto en Burgos: si hay día en Lerma, sugerir Burgos↔Lerma (i/v) según el orden.
 */
(function () {
  var DEFAULT_ORIGIN = 'MAD';
  var ORIGIN_PRESETS = [
    { code: 'MAD', label: 'Madrid (MAD)' },
    { code: 'BIO', label: 'Bilbao (BIO)' },
    { code: 'SDR', label: 'Santander (SDR)' },
    { code: 'VLL', label: 'Valladolid (VLL)' },
    { code: 'OVD', label: 'Asturias (OVD)' },
  ];

  function iata(code) {
    return { type: 'IATA', code: String(code || '').trim().toUpperCase(), label: String(code || '').trim().toUpperCase() };
  }

  var ZONAS = {
    burgos: { type: 'GPS', code: '42.3408,-3.6997', label: 'Burgos (centro)' },
    lerma: { type: 'GPS', code: '42.0270,-3.7545', label: 'Lerma (centro)' },
  };

  function setBadge(el, text, state) {
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hotelbeds-transfer-api-badge--pending', 'hotelbeds-transfer-api-badge--ok', 'hotelbeds-transfer-api-badge--warn');
    el.classList.add(
      state === 'ok' ? 'hotelbeds-transfer-api-badge--ok' : state === 'warn' ? 'hotelbeds-transfer-api-badge--warn' : 'hotelbeds-transfer-api-badge--pending'
    );
  }

  function originBase() {
    return typeof window !== 'undefined' && window.location && window.location.origin ? window.location.origin : '';
  }

  function getForm(block) {
    return block && block.closest ? block.closest('form') : null;
  }

  function getFechasSorted(form) {
    if (!form || !form.querySelectorAll) return [];
    var fd = new FormData(form);
    if (!fd.getAll) return [];
    var list = fd.getAll('fechas[]');
    var dates = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i]) dates.push(String(list[i]));
    }
    dates.sort();
    return dates;
  }

  function pickTimeFromForm(form) {
    // Transfers: hora por defecto fija (no depende de tee-time).
    return '12:00';
  }

  function defaultOutboundFromCalendar(form) {
    var fechas = getFechasSorted(form);
    if (!fechas.length) return '';
    var day = fechas[0];
    var hm = pickTimeFromForm(form).split(':');
    var h = String(parseInt(hm[0], 10) || 12);
    var m = String(parseInt(hm[1], 10) || 0);
    if (h.length === 1) h = '0' + h;
    if (m.length === 1) m = '0' + m;
    return day + 'T' + h + ':' + m + ':00';
  }

  function defaultReturnFromCalendar(form) {
    var fechas = getFechasSorted(form);
    if (!fechas.length) return '';
    var day = fechas[fechas.length - 1];
    var hm = pickTimeFromForm(form).split(':');
    var h = String(parseInt(hm[0], 10) || 12);
    var m = String(parseInt(hm[1], 10) || 0);
    if (h.length === 1) h = '0' + h;
    if (m.length === 1) m = '0' + m;
    return day + 'T' + h + ':' + m + ':00';
  }

  function isoToLocalInput(iso) {
    if (!iso) return '';
    // ISO in this file is always YYYY-MM-DDTHH:mm:ss (no TZ)
    return String(iso).slice(0, 16);
  }

  function localInputToIso(v) {
    var s = String(v || '').trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return s + ':00';
    return s;
  }

  function getCamposPorDia(form) {
    if (!form) return [];
    var out = [];
    // Días se llaman campo-dia-1, campo-dia-2, ...
    for (var i = 1; i <= 10; i++) {
      var sel = form.querySelector('select[name="campo-dia-' + i + '"]');
      if (!sel) break;
      out.push(String(sel.value || '').trim());
    }
    return out;
  }

  function campoToZona(campoVal) {
    // Saldaña Golf es Burgos (zona)
    if (campoVal === 'lerma') return 'lerma';
    if (campoVal === 'saldana') return 'burgos';
    return '';
  }

  function computeSuggestedLegs(form, originCode) {
    var fechas = getFechasSorted(form);
    var campos = getCamposPorDia(form);
    var legs = [];
    if (!fechas.length) return legs;

    var firstIso = defaultOutboundFromCalendar(form); // includes time (12:00)
    var lastIso = defaultReturnFromCalendar(form); // includes time (12:00)
    var firstDate = fechas[0];
    var lastDate = fechas[fechas.length - 1];

    // Determine if any day is in Lerma.
    var zonasPorDia = [];
    for (var i = 0; i < fechas.length; i++) {
      zonasPorDia[i] = campoToZona(campos[i] || '');
    }
    var firstPlayZona = '';
    for (var j = 0; j < zonasPorDia.length; j++) { if (zonasPorDia[j]) { firstPlayZona = zonasPorDia[j]; break; } }
    var lastPlayZona = '';
    for (var k = zonasPorDia.length - 1; k >= 0; k--) { if (zonasPorDia[k]) { lastPlayZona = zonasPorDia[k]; break; } }

    // Default: arrival always to Burgos (noches en Burgos).
    legs.push({
      id: 'ida_burgos',
      title: 'IDA',
      label: 'Desde ' + originCode + ' a Burgos',
      from: iata(originCode),
      to: ZONAS.burgos,
      datetimeIso: firstIso || (firstDate ? firstDate + 'T12:00:00' : ''),
    });

    // If there is at least one Lerma day, suggest inter-city transfer(s).
    for (var d = 0; d < zonasPorDia.length; d++) {
      if (zonasPorDia[d] !== 'lerma') continue;
      var date = fechas[d];
      // Go Burgos -> Lerma that day (default 12:00).
      legs.push({
        id: 'burgos_lerma_' + (d + 1),
        title: 'TRAYECTO',
        label: 'Burgos → Lerma (día ' + (d + 1) + ')',
        from: ZONAS.burgos,
        to: ZONAS.lerma,
        datetimeIso: date ? date + 'T12:00:00' : '',
      });
      // If there is any later Burgos day (Saldaña) OR the return is from Burgos, suggest Lerma -> Burgos same day evening.
      var needsBackToBurgos = false;
      for (var dd = d + 1; dd < zonasPorDia.length; dd++) {
        if (zonasPorDia[dd] === 'burgos') { needsBackToBurgos = true; break; }
      }
      if (needsBackToBurgos) {
        legs.push({
          id: 'lerma_burgos_' + (d + 1),
          title: 'TRAYECTO',
          label: 'Lerma → Burgos (día ' + (d + 1) + ')',
          from: ZONAS.lerma,
          to: ZONAS.burgos,
          datetimeIso: date ? date + 'T12:00:00' : '',
        });
      }
    }

    // Return: from last play zona if defined, else from Burgos.
    var returnFrom = lastPlayZona === 'lerma' ? ZONAS.lerma : ZONAS.burgos;
    legs.push({
      id: 'vuelta_origen',
      title: 'VUELTA',
      label: (returnFrom === ZONAS.lerma ? 'Desde Lerma a ' : 'Desde Burgos a ') + originCode,
      from: returnFrom,
      to: iata(originCode),
      datetimeIso: lastIso || (lastDate ? lastDate + 'T12:00:00' : ''),
    });

    return legs;
  }

  function normalizeServiceList(servicesRoot) {
    if (servicesRoot == null) return [];
    if (Array.isArray(servicesRoot)) return servicesRoot;
    var raw = servicesRoot.service != null ? servicesRoot.service : servicesRoot;
    if (!Array.isArray(raw)) raw = [raw];
    return raw;
  }

  /** Extrae lista plana de servicios según varias formas de respuesta Availability (Hotelbeds). */
  function collectServicesFromAvailability(data) {
    if (!data || typeof data !== 'object') return [];
    if (Array.isArray(data.routes) && data.routes.length) {
      var all = [];
      data.routes.forEach(function (route) {
        normalizeServiceList(route.services).forEach(function (s) {
          all.push(s);
        });
      });
      return all;
    }
    if (data.service != null) return normalizeServiceList(data.service);
    if (Array.isArray(data.services)) return normalizeServiceList(data.services);
    if (data.services && typeof data.services === 'object') {
      if (data.services.service != null) return normalizeServiceList(data.services.service);
      if (Array.isArray(data.services.services)) return normalizeServiceList(data.services.services);
      if (data.services.rateKey != null || data.services.id != null) return normalizeServiceList(data.services);
    }
    return [];
  }

  function renderNoServicesHelp(container, data) {
    var wrap = document.createElement('div');
    wrap.className = 'transfer-hb-modal-empty';

    var p1 = document.createElement('p');
    p1.className = 'transfer-hb-modal-msg';
    p1.appendChild(
      document.createTextNode(
        'Hotelbeds no devolvió ningún servicio para esta ruta. En entorno '
      )
    );
    var st = document.createElement('strong');
    st.textContent = 'test';
    p1.appendChild(st);
    p1.appendChild(
      document.createTextNode(
        ' suele pasar: sin inventario para GPS+IATA, fecha sin cobertura o catálogo limitado. No es un fallo de tu web si la API contesta bien.'
      )
    );
    wrap.appendChild(p1);

    var ul = document.createElement('ul');
    ul.className = 'transfer-hb-modal-tips';
    var tips = [
      'Prueba otro origen IATA (p. ej. Valladolid VLL) u otra fecha/hora.',
      'Idioma de la petición: usa «English (API)» si no hay resultados con español.',
      'Comprueba la misma ruta en transfers-cert con los mismos parámetros.',
      'Para hotel concreto, ATLAS/GIATA en transfers-cert; aquí solo GPS centro Lerma/Burgos.',
    ];
    tips.forEach(function (t) {
      var li = document.createElement('li');
      li.textContent = t;
      ul.appendChild(li);
    });
    wrap.appendChild(ul);

    if (data && Array.isArray(data.errors) && data.errors.length) {
      var pe = document.createElement('p');
      pe.className = 'transfer-hb-modal-msg transfer-hb-modal-msg--warn';
      var e0 = data.errors[0];
      pe.textContent = 'Hotelbeds: ' + (e0 && (e0.message || e0.description) ? String(e0.message || e0.description) : JSON.stringify(e0));
      wrap.appendChild(pe);
    }

    var keys = data && typeof data === 'object' ? Object.keys(data).filter(function (k) {
      return k !== 'auditData';
    }) : [];
    if (keys.length) {
      var det = document.createElement('details');
      det.className = 'transfer-hb-modal-debug';
      var sum = document.createElement('summary');
      sum.textContent = 'Detalle técnico (depuración)';
      det.appendChild(sum);
      var pre = document.createElement('pre');
      pre.className = 'transfer-hb-modal-debug-pre';
      try {
        pre.textContent = JSON.stringify(data, null, 2).slice(0, 3500);
      } catch (e) {
        pre.textContent = String(keys);
      }
      det.appendChild(pre);
      wrap.appendChild(det);
    }

    container.appendChild(wrap);
  }

  function pickPrice(s) {
    if (!s || typeof s !== 'object') return '';
    var p = s.price;
    if (p && typeof p === 'object') {
      var amt =
        p.totalAmount != null ? p.totalAmount : p.amount != null ? p.amount : p.netAmount != null ? p.netAmount : null;
      if (amt != null) return String(amt) + ' ' + (p.currency || p.currencyCode || 'EUR');
    }
    if (s.totalAmount != null) return String(s.totalAmount) + ' ' + (s.currency || 'EUR');
    return '';
  }

  function renderServices(container, hiddenRateKey, res, block) {
    var pickName =
      'transfer_hb_svc_pick_' +
      (block && block.getAttribute ? block.getAttribute('data-hb-transfer-page') || 'x' : 'x');
    hiddenRateKey.value = '';
    container.innerHTML = '';

    if (!res || res.ok === false) {
      var err = document.createElement('p');
      err.className = 'transfer-hb-modal-msg transfer-hb-modal-msg--warn';
      var hbErrMsg = '';
      if (res && res.data && Array.isArray(res.data.errors) && res.data.errors.length) {
        var e0 = res.data.errors[0];
        hbErrMsg = (e0 && (e0.message || e0.description)) ? String(e0.message || e0.description) : '';
      }
      var detail =
        res && res.error === 'missing_credentials'
          ? 'Faltan credenciales de Transfer en el servidor.'
          : hbErrMsg
            ? hbErrMsg
            : res && res.data && res.data.error
              ? String(res.data.error)
              : res && res.snippet
                ? res.snippet
                : JSON.stringify(res || {}).slice(0, 280);
      err.textContent =
        'No se pudo obtener disponibilidad (' + (res && res.httpStatus != null ? res.httpStatus : '?') + '). ' + detail;
      if (res && res.httpStatus === 403) {
        err.textContent +=
          ' Si ves «Access…disallowed», pide a Hotelbeds activar Transfer API para tu clave (entorno test).';
      }
      if (res && res.diagnostic && res.diagnostic.likelyCause) {
        err.textContent += ' ' + res.diagnostic.likelyCause;
      }
      container.appendChild(err);
      return;
    }

    var data = res.data;
    if (!data) {
      var empty = document.createElement('p');
      empty.className = 'transfer-hb-modal-msg';
      empty.textContent = 'Respuesta sin datos de servicios.';
      container.appendChild(empty);
      return;
    }

    var services = collectServicesFromAvailability(data);

    if (!services.length) {
      renderNoServicesHelp(container, data);
      return;
    }

    var list = document.createElement('div');
    list.className = 'transfer-hb-svc-list';

    services.forEach(function (s) {
      var price = pickPrice(s);
      var card = document.createElement('article');
      card.className = 'transfer-hb-svc-card';
      var title =
        (s.transferType || 'Servicio') +
        (s.direction ? ' · ' + s.direction : '') +
        (s.id != null ? ' · id ' + s.id : '');
      var h = document.createElement('div');
      h.className = 'transfer-hb-svc-card-title';
      h.textContent = title;
      card.appendChild(h);
      if (price) {
        var p = document.createElement('div');
        p.className = 'transfer-hb-svc-card-price';
        p.textContent = price;
        card.appendChild(p);
      }
      var pick = document.createElement('label');
      pick.className = 'transfer-hb-svc-pick';
      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = pickName;
      radio.addEventListener('change', function () {
        if (radio.checked && s.rateKey) {
          hiddenRateKey.value = s.rateKey;
          var cb = block.querySelector('input[name="transfer_hb_interes"]');
          if (cb) cb.checked = true;
          var det = block.querySelector('.transfer-hb-detalles');
          if (det) det.hidden = false;
        }
      });
      pick.appendChild(radio);
      pick.appendChild(document.createTextNode(' Elegir para mi solicitud'));
      card.appendChild(pick);
      list.appendChild(card);
    });

    container.appendChild(list);
  }

  function formatDate(isoDate) {
    if (!isoDate) return '—';
    return String(isoDate);
  }

  function pickCalendarRange(form) {
    var fechas = getFechasSorted(form);
    if (!fechas.length) return { first: '', last: '' };
    return { first: fechas[0], last: fechas[fechas.length - 1] };
  }

  function fetchAvailability(block, resultsEl, hiddenRateKey, from, to, outboundIso, adultsOverride) {
    var paxEl = block.querySelector('input[name=\"transfer_hb_pax\"]');
    var adults = Math.max(1, parseInt(adultsOverride != null ? adultsOverride : (paxEl && paxEl.value ? paxEl.value : '2'), 10) || 2);

    var qs = new URLSearchParams({
      language: 'en',
      fromType: from.type,
      fromCode: from.code,
      toType: to.type,
      toCode: to.code,
      outbound: outboundIso,
      inbound: '',
      adults: String(adults),
      children: '0',
      infants: '0',
    });

    resultsEl.innerHTML = '<p class=\"transfer-hb-modal-msg\">Consultando Hotelbeds…</p>';
    fetch(originBase() + '/api/hotelbeds-transfers?' + qs.toString())
      .then(function (r) {
        return r.text().then(function (text) {
          try {
            return JSON.parse(text);
          } catch (e) {
            return { ok: false, parseError: true, snippet: text.slice(0, 400) };
          }
        });
      })
      .then(function (data) {
        renderServices(resultsEl, hiddenRateKey, data, block);
      })
      .catch(function () {
        resultsEl.innerHTML =
          '<p class=\"transfer-hb-modal-msg transfer-hb-modal-msg--warn\">Error de red al consultar transfers.</p>';
      });
  }

  function ensurePlannerUi(block) {
    if (block.querySelector('.transfer-hb-planner')) return;

    var form = getForm(block);
    var paxAutoSync = true;
    var originSelectedCode = DEFAULT_ORIGIN;

    var planner = document.createElement('div');
    planner.className = 'transfer-hb-planner';

    // Hidden rateKeys per leg.
    var hiddenWrap = document.createElement('div');
    hiddenWrap.className = 'transfer-hb-hidden';
    planner.appendChild(hiddenWrap);

    var head = document.createElement('div');
    head.className = 'transfer-hb-planner-head';
    head.innerHTML = '<h4 class=\"transfer-hb-planner-title\">Transfers sugeridos</h4><p class=\"transfer-hb-planner-sub\">Basados en fechas y green fees (Saldaña=Burgos). Puedes ajustar origen y horarios.</p>';

    var controls = document.createElement('div');
    controls.className = 'transfer-hb-planner-controls';

    // Origen libre: input con autocompletar (guarda IATA por debajo).
    var originField = document.createElement('div');
    originField.className = 'transfer-hb-field';
    var originLab = document.createElement('label');
    originLab.textContent = 'Ciudad / aeropuerto de origen';
    var originInput = document.createElement('input');
    originInput.type = 'text';
    originInput.className = 'transfer-hb-input';
    originInput.placeholder = 'Ej. Madrid, Bilbao, Santander…';
    originInput.autocomplete = 'off';
    originInput.spellcheck = false;
    originInput.value = ORIGIN_PRESETS[0] && ORIGIN_PRESETS[0].code === DEFAULT_ORIGIN ? ORIGIN_PRESETS[0].label : 'Madrid (MAD)';

    var originHidden = document.createElement('input');
    originHidden.type = 'hidden';
    originHidden.name = 'transfer_hb_origin_iata';
    originHidden.value = DEFAULT_ORIGIN;

    var originSuggest = document.createElement('div');
    originSuggest.className = 'transfer-hb-suggest';
    originSuggest.hidden = true;

    function norm(s) {
      return String(s || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    }

    function setOrigin(code, label) {
      originSelectedCode = String(code || '').trim().toUpperCase() || DEFAULT_ORIGIN;
      originHidden.value = originSelectedCode;
      originInput.value = label || originSelectedCode;
      originSuggest.hidden = true;
      renderLegs();
    }

    function renderOriginSuggestions(q) {
      var query = norm(q);
      originSuggest.innerHTML = '';
      if (!query) {
        originSuggest.hidden = true;
        return;
      }
      var matches = [];
      for (var i = 0; i < ORIGIN_PRESETS.length; i++) {
        var o = ORIGIN_PRESETS[i];
        var hay = norm(o.label + ' ' + o.code);
        if (hay.indexOf(query) >= 0) matches.push(o);
        if (matches.length >= 8) break;
      }
      if (!matches.length) {
        originSuggest.hidden = true;
        return;
      }
      matches.forEach(function (o) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'transfer-hb-suggest-item';
        btn.textContent = o.label;
        btn.addEventListener('click', function () {
          setOrigin(o.code, o.label);
        });
        originSuggest.appendChild(btn);
      });
      originSuggest.hidden = false;
    }

    originInput.addEventListener('input', function () {
      renderOriginSuggestions(originInput.value);
    });
    originInput.addEventListener('focus', function () {
      renderOriginSuggestions(originInput.value);
    });
    originInput.addEventListener('blur', function () {
      // Delay para permitir click en sugerencia.
      setTimeout(function () {
        originSuggest.hidden = true;
      }, 120);
    });
    originInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        // Si el usuario escribió exactamente un IATA de 3 letras, lo aceptamos.
        var t = String(originInput.value || '').trim().toUpperCase();
        var m = t.match(/\b([A-Z]{3})\b$/);
        if (m) {
          originSelectedCode = m[1];
          originHidden.value = originSelectedCode;
          renderLegs();
        }
      }
    });

    originLab.appendChild(originInput);
    originLab.appendChild(originHidden);
    originLab.appendChild(originSuggest);
    originField.appendChild(originLab);

    // Passengers override (optional)
    var paxField = document.createElement('div');
    paxField.className = 'transfer-hb-field';
    var paxLab = document.createElement('label');
    paxLab.textContent = 'Pasajeros';
    var pax = document.createElement('input');
    pax.type = 'number';
    pax.min = '1';
    pax.max = '54';
    pax.className = 'transfer-hb-input';
    pax.value = '2';
    pax.addEventListener('input', function () {
      paxAutoSync = false;
    });
    pax.addEventListener('change', function () {
      paxAutoSync = false;
      renderLegs();
    });
    paxLab.appendChild(pax);
    paxField.appendChild(paxLab);

    controls.appendChild(originField);
    controls.appendChild(paxField);

    var datesLine = document.createElement('div');
    datesLine.className = 'transfer-hb-planner-dates';
    datesLine.innerHTML = '<span>Ida (1ª fecha):</span> <strong class=\"hb-ida-date\">—</strong> <span>Vuelta (última):</span> <strong class=\"hb-vuelta-date\">—</strong>';

    var legsWrap = document.createElement('div');
    legsWrap.className = 'transfer-hb-legs';

    planner.appendChild(head);
    planner.appendChild(controls);
    planner.appendChild(datesLine);
    planner.appendChild(legsWrap);

    function getOriginCode() {
      return String(originHidden.value || originSelectedCode || DEFAULT_ORIGIN).trim().toUpperCase() || DEFAULT_ORIGIN;
    }

    function getDefaultPaxFromGolfGroup() {
      if (!form) return 2;
      var tg =
        form.querySelector('#tamanio-grupo') ||
        form.querySelector('#tamanio-grupo-torneos') ||
        form.querySelector('input[name="tamanio_grupo"]') ||
        null;
      var n = tg && tg.value != null ? parseInt(String(tg.value), 10) : 0;
      if (!n || n < 1) return 2;
      return Math.min(54, n);
    }

    function syncDates() {
      var fechas = getFechasSorted(form);
      var idaEl = datesLine.querySelector('.hb-ida-date');
      var vEl = datesLine.querySelector('.hb-vuelta-date');
      if (idaEl) idaEl.textContent = fechas[0] ? formatDate(fechas[0]) : '—';
      if (vEl) vEl.textContent = fechas.length ? formatDate(fechas[fechas.length - 1]) : '—';
    }

    function renderLegs() {
      syncDates();
      var originCode = getOriginCode() || DEFAULT_ORIGIN;
      if (paxAutoSync) {
        pax.value = String(getDefaultPaxFromGolfGroup());
      }
      var legs = computeSuggestedLegs(form, originCode);
      legsWrap.innerHTML = '';
      hiddenWrap.innerHTML = '';

      for (var i = 0; i < legs.length; i++) {
        (function (leg) {
          // hidden ratekey per leg
          var hidden = document.createElement('input');
          hidden.type = 'hidden';
          hidden.name = 'transfer_hb_rate_key_' + leg.id;
          hidden.value = '';
          hiddenWrap.appendChild(hidden);

          var card = document.createElement('div');
          card.className = 'transfer-hb-leg';

          var top = document.createElement('div');
          top.className = 'transfer-hb-leg-top';
          top.innerHTML =
            '<span class=\"transfer-hb-leg-badge\">' +
            leg.title +
            '</span><span class=\"transfer-hb-leg-label\">' +
            leg.label +
            '</span><span class=\"transfer-hb-leg-route\">' +
            leg.from.label +
            ' → ' +
            leg.to.label +
            '</span>';

          var dtRow = document.createElement('div');
          dtRow.className = 'transfer-hb-leg-controls';
          var dtLab = document.createElement('label');
          dtLab.textContent = 'Fecha y hora';
          var dt = document.createElement('input');
          dt.type = 'datetime-local';
          dt.className = 'transfer-hb-input';
          dt.value = isoToLocalInput(leg.datetimeIso);
          dtLab.appendChild(dt);

          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn-transfer-hb-leg';
          btn.textContent = 'Buscar disponibilidad';

          var out = document.createElement('div');
          out.className = 'transfer-hb-leg-results';
          out.setAttribute('aria-live', 'polite');

          btn.addEventListener('click', function () {
            var iso = localInputToIso(dt.value);
            if (!iso) {
              out.innerHTML =
                '<p class=\"transfer-hb-modal-msg transfer-hb-modal-msg--warn\">Indica fecha y hora (o selecciona fechas en el calendario).</p>';
              return;
            }
            fetchAvailability(block, out, hidden, leg.from, leg.to, iso, pax.value);
          });

          dtRow.appendChild(dtLab);
          dtRow.appendChild(btn);

          card.appendChild(top);
          card.appendChild(dtRow);
          card.appendChild(out);
          legsWrap.appendChild(card);
        })(legs[i]);
      }
    }

    // Estado inicial (ahora que datesLine/legsWrap existen).
    setOrigin(
      DEFAULT_ORIGIN,
      (ORIGIN_PRESETS[0] && ORIGIN_PRESETS[0].code === DEFAULT_ORIGIN) ? ORIGIN_PRESETS[0].label : 'Madrid (MAD)'
    );

    renderLegs();

    if (form) {
      form.addEventListener('change', renderLegs);
      form.addEventListener('input', function (e) {
        // if they change group size and pax wasn't manually overridden, resync.
        if (paxAutoSync) {
          var t = e && e.target;
          if (t && (t.id === 'tamanio-grupo' || t.id === 'tamanio-grupo-torneos' || t.name === 'tamanio_grupo')) {
            pax.value = String(getDefaultPaxFromGolfGroup());
          }
        }
        renderLegs();
      });
    }

    var apiLine = block.querySelector('.hotelbeds-transfer-api-line');
    if (apiLine && apiLine.parentNode) {
      apiLine.parentNode.insertBefore(planner, apiLine.nextSibling);
    } else {
      block.insertBefore(planner, block.firstChild);
    }
  }

  function bindBlock(block) {
    ensurePlannerUi(block);
    var cb = block.querySelector('input[name=\"transfer_hb_interes\"]');
    var det = block.querySelector('.transfer-hb-detalles');
    if (!cb || !det) return;
    function sync() {
      det.hidden = !cb.checked;
    }
    cb.addEventListener('change', sync);
    sync();
  }

  function pingApi() {
    var origin = originBase();
    var badges = document.querySelectorAll('.hotelbeds-transfer-api-badge');
    badges.forEach(function (b) {
      setBadge(b, 'Comprobando proxy Transfer API…', 'pending');
    });
    fetch(origin + '/api/hotelbeds-transfers?ping=1')
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        var ok = !!(data && data.ok === true);
        var msg = ok
          ? 'Hotelbeds Transfers: listo (' + (data.env === 'production' ? 'producción' : 'test') + ').'
          : 'Hotelbeds Transfers: ' + (data && data.error ? data.error : 'sin confirmar (credenciales).');
        badges.forEach(function (b) {
          setBadge(b, msg, ok ? 'ok' : 'warn');
        });
      })
      .catch(function () {
        badges.forEach(function (b) {
          setBadge(b, 'No se pudo contactar con /api/hotelbeds-transfers.', 'warn');
        });
      });
  }

  function init() {
    var blocks = document.querySelectorAll('.paquete-transfer-hb-block');
    if (!blocks.length) return;
    blocks.forEach(bindBlock);
    pingApi();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
