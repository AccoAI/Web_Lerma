/**
 * Transfer Hotelbeds en paquetes: ping + modal transporte hacia/desde Lerma o Burgos.
 * Disponibilidad: GET /api/hotelbeds-transfers. Puntos zona = GPS centro (IATA local no siempre en catálogo HB).
 */
(function () {
  /** Centro aproximado por ciudad (Transfer API · tipo GPS, código lat,lon). */
  var ZONA_GPS = {
    lerma: { toType: 'GPS', toCode: '42.0270,-3.7545', label: 'Lerma (centro)' },
    burgos: { toType: 'GPS', toCode: '42.3408,-3.6997', label: 'Burgos (centro)' },
  };

  function zonaHb(key) {
    return ZONA_GPS[key === 'lerma' ? 'lerma' : 'burgos'];
  }

  /** Orígenes habituales hacia la zona (solo IATA). */
  var ORIGINS_IN = [
    { label: 'Madrid-Barajas (MAD)', code: 'MAD' },
    { label: 'Valladolid (VLL)', code: 'VLL' },
    { label: 'Bilbao (BIO)', code: 'BIO' },
    { label: 'Santander (SDR)', code: 'SDR' },
    { label: 'Zaragoza (ZAZ)', code: 'ZAZ' },
  ];

  /** Destinos habituales saliendo desde Lerma/Burgos. */
  var DESTINATIONS_OUT = [
    { label: 'Madrid-Barajas (MAD)', code: 'MAD' },
    { label: 'Valladolid (VLL)', code: 'VLL' },
    { label: 'Bilbao (BIO)', code: 'BIO' },
    { label: 'Barcelona (BCN)', code: 'BCN' },
  ];

  var escapeModalBound = false;
  function ensureEscapeClosesModal() {
    if (escapeModalBound) return;
    escapeModalBound = true;
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape') return;
      document.querySelectorAll('.transfer-hb-modal').forEach(function (m) {
        if (!m.hidden) {
          m.hidden = true;
          document.body.classList.remove('transfer-hb-modal-open');
        }
      });
    });
  }

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
    if (!form) return '12:00';
    var t =
      (form.querySelector('#hora-salida-torneos') && form.querySelector('#hora-salida-torneos').value) ||
      (form.querySelector('#hora-salida') && form.querySelector('#hora-salida').value) ||
      (form.querySelector('input[name="hora_salida"]') && form.querySelector('input[name="hora_salida"]').value) ||
      '';
    if (t && /^\d{1,2}:\d{2}$/.test(t)) return t.length === 5 ? t : t;
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
    var pickName = 'transfer_hb_svc_pick_' + (block && block.getAttribute ? block.getAttribute('data-hb-transfer-page') || 'x' : 'x');
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

  function runAvailability(block, hiddenRk, els, resultsEl, btnSearch) {
    var form = getForm(block);
    var outboundRaw = els.dt.value.trim();
    if (!outboundRaw) {
      var hint = defaultOutboundFromCalendar(form);
      if (hint) {
        els.dt.value = hint.slice(0, 16);
        outboundRaw = els.dt.value.trim();
      }
    }
    if (!outboundRaw) {
      resultsEl.innerHTML =
        '<p class="transfer-hb-modal-msg transfer-hb-modal-msg--warn">Selecciona antes las fechas del viaje en el calendario (arriba), o indica fecha y hora del transfer aquí.</p>';
      return;
    }

    var outboundIso = outboundRaw;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(outboundRaw)) {
      outboundIso = outboundRaw + ':00';
    }

    var zonaKey = els.zonaSel && els.zonaSel.value === 'lerma' ? 'lerma' : 'burgos';
    if (els.zonaHidden) els.zonaHidden.value = zonaKey;
    var zonaPt = zonaHb(zonaKey);

    var mode = els.mode.value === 'from_zona' ? 'from_zona' : 'to_zona';
    var fromType = 'IATA';
    var fromCode = '';
    var toType = 'IATA';
    var toCode = '';

    if (mode === 'to_zona') {
      fromCode = els.originSel.value === '__custom__' ? (els.originCustom.value || '').trim().toUpperCase() : els.originSel.value;
      toType = zonaPt.toType;
      toCode = zonaPt.toCode;
    } else {
      fromType = zonaPt.toType;
      fromCode = zonaPt.toCode;
      toCode = els.destOut.value === '__custom__' ? (els.destCustom.value || '').trim().toUpperCase() : els.destOut.value;
    }

    if (!fromCode || !toCode) {
      resultsEl.innerHTML =
        '<p class="transfer-hb-modal-msg transfer-hb-modal-msg--warn">Indica origen y destino (o código IATA en «Otro»).</p>';
      return;
    }

    var paxEl = block.querySelector('input[name="transfer_hb_pax"]');
    var adults = Math.max(1, parseInt(paxEl && paxEl.value ? paxEl.value : '2', 10) || 2);
    if (els.paxSync && els.paxSync.value) {
      adults = Math.max(1, parseInt(els.paxSync.value, 10) || adults);
      if (paxEl) paxEl.value = String(adults);
    }

    var qs = new URLSearchParams({
      language: (els.lang.value || 'en').trim(),
      fromType: fromType,
      fromCode: fromCode,
      toType: toType,
      toCode: toCode,
      outbound: outboundIso,
      inbound: '',
      adults: String(adults),
      children: '0',
      infants: '0',
    });

    resultsEl.innerHTML = '<p class="transfer-hb-modal-msg">Consultando Hotelbeds…</p>';
    btnSearch.disabled = true;

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
        renderServices(resultsEl, hiddenRk, data, block);
      })
      .catch(function () {
        resultsEl.innerHTML =
          '<p class="transfer-hb-modal-msg transfer-hb-modal-msg--warn">Error de red al consultar transfers.</p>';
      })
      .then(function () {
        btnSearch.disabled = false;
      });
  }

  function openModal(root, focusEl) {
    root.hidden = false;
    document.body.classList.add('transfer-hb-modal-open');
    if (focusEl && focusEl.focus) focusEl.focus();
  }

  function closeModal(root) {
    root.hidden = true;
    document.body.classList.remove('transfer-hb-modal-open');
  }

  function setupTransferModal(block) {
    if (block.querySelector('.transfer-hb-modal-launch-wrap')) return;

    var hiddenRk = document.createElement('input');
    hiddenRk.type = 'hidden';
    hiddenRk.name = 'transfer_hb_rate_key';
    hiddenRk.value = '';
    block.appendChild(hiddenRk);

    var zonaHidden = document.createElement('input');
    zonaHidden.type = 'hidden';
    zonaHidden.name = 'transfer_hb_zona';
    zonaHidden.value = 'burgos';
    block.appendChild(zonaHidden);

    var launchWrap = document.createElement('div');
    launchWrap.className = 'transfer-hb-modal-launch-wrap';
    var openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'btn-transfer-hb-modal-open';
    openBtn.textContent = 'Transporte desde / hacia Lerma o Burgos — ver disponibilidad Hotelbeds';
    var launchHint = document.createElement('p');
    launchHint.className = 'transfer-hb-modal-launch-hint';
    launchHint.textContent =
      'Elige Lerma o Burgos como punto de la zona; Hotelbeds usa GPS centro (los IATA locales no siempre están en Transfer). La fecha/hora sale de tu calendario cuando ya hay fechas.';
    launchWrap.appendChild(openBtn);
    launchWrap.appendChild(launchHint);

    var apiLine = block.querySelector('.hotelbeds-transfer-api-line');
    if (apiLine && apiLine.parentNode) {
      apiLine.parentNode.insertBefore(launchWrap, apiLine.nextSibling);
    } else {
      block.insertBefore(launchWrap, block.firstChild);
    }

    var uid = block.getAttribute('data-hb-transfer-page') || 'x';
    var modal = document.createElement('div');
    modal.className = 'transfer-hb-modal';
    modal.setAttribute('hidden', '');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'transfer-hb-modal-title-' + uid);

    var backdrop = document.createElement('div');
    backdrop.className = 'transfer-hb-modal-backdrop';
    backdrop.tabIndex = -1;

    var panel = document.createElement('div');
    panel.className = 'transfer-hb-modal-panel';

    var head = document.createElement('div');
    head.className = 'transfer-hb-modal-head';
    var title = document.createElement('h4');
    title.id = 'transfer-hb-modal-title-' + uid;
    title.className = 'transfer-hb-modal-title';
    title.textContent = 'Transfer hacia / desde Lerma o Burgos';
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'transfer-hb-modal-close';
    closeBtn.setAttribute('aria-label', 'Cerrar');
    closeBtn.textContent = '\u00d7';
    head.appendChild(title);
    head.appendChild(closeBtn);

    var destNote = document.createElement('p');
    destNote.className = 'transfer-hb-modal-note';
    destNote.textContent =
      'La zona de estancia es siempre Lerma o Burgos: abajo eliges cuál. Hotelbeds recibe el punto como GPS centro de esa ciudad (Transfer API). Para dirección exacta de hotel, ATLAS/GIATA en transfers-cert o en notas.';

    var zonaRow = document.createElement('div');
    zonaRow.className = 'transfer-hb-modal-field';
    var zonaLab = document.createElement('label');
    zonaLab.textContent = 'Zona de destino / origen en tu viaje';
    var zonaSel = document.createElement('select');
    zonaSel.className = 'transfer-hb-modal-select';
    zonaSel.setAttribute('aria-label', 'Lerma o Burgos');
    zonaSel.innerHTML =
      '<option value="burgos">Burgos — centro ciudad (GPS)</option>' +
      '<option value="lerma">Lerma — centro población (GPS)</option>';
    zonaSel.addEventListener('change', function () {
      zonaHidden.value = zonaSel.value;
    });
    zonaLab.appendChild(zonaSel);
    zonaRow.appendChild(zonaLab);

    var modeRow = document.createElement('div');
    modeRow.className = 'transfer-hb-modal-field';
    var modeLab = document.createElement('label');
    modeLab.textContent = 'Sentido';
    var modeSel = document.createElement('select');
    modeSel.className = 'transfer-hb-modal-select';
    modeSel.innerHTML =
      '<option value="to_zona">Llego a la zona elegida (aeropuerto u otro punto → Lerma o Burgos)</option>' +
      '<option value="from_zona">Salgo de la zona elegida (Lerma o Burgos → otro destino)</option>';
    modeLab.appendChild(modeSel);
    modeRow.appendChild(modeLab);

    var rowIn = document.createElement('div');
    rowIn.className = 'transfer-hb-modal-field transfer-hb-modal-field--in';
    var oLab = document.createElement('label');
    oLab.textContent = 'Origen (IATA)';
    var oSel = document.createElement('select');
    oSel.className = 'transfer-hb-modal-select';
    var o0 = document.createElement('option');
    o0.value = '';
    o0.textContent = 'Elige aeropuerto / ciudad…';
    oSel.appendChild(o0);
    ORIGINS_IN.forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o.code;
      opt.textContent = o.label;
      oSel.appendChild(opt);
    });
    var ocust = document.createElement('option');
    ocust.value = '__custom__';
    ocust.textContent = 'Otro (código IATA)';
    oSel.appendChild(ocust);
    var oCustom = document.createElement('input');
    oCustom.type = 'text';
    oCustom.className = 'transfer-hb-modal-input transfer-hb-modal-input--custom';
    oCustom.placeholder = 'Ej. OVD';
    oCustom.maxLength = 4;
    oCustom.style.marginTop = '0.35rem';
    oCustom.hidden = true;
    oSel.addEventListener('change', function () {
      oCustom.hidden = oSel.value !== '__custom__';
    });
    oLab.appendChild(oSel);
    oLab.appendChild(oCustom);
    rowIn.appendChild(oLab);

    var rowOut = document.createElement('div');
    rowOut.className = 'transfer-hb-modal-field transfer-hb-modal-field--out';
    rowOut.hidden = true;
    var dLab = document.createElement('label');
    dLab.textContent = 'Destino fuera de Lerma/Burgos (IATA)';
    var dSel = document.createElement('select');
    dSel.className = 'transfer-hb-modal-select';
    var d0 = document.createElement('option');
    d0.value = '';
    d0.textContent = 'Elige destino…';
    dSel.appendChild(d0);
    DESTINATIONS_OUT.forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o.code;
      opt.textContent = o.label;
      dSel.appendChild(opt);
    });
    var dcust = document.createElement('option');
    dcust.value = '__custom__';
    dcust.textContent = 'Otro (código IATA)';
    dSel.appendChild(dcust);
    var dCustom = document.createElement('input');
    dCustom.type = 'text';
    dCustom.className = 'transfer-hb-modal-input transfer-hb-modal-input--custom';
    dCustom.placeholder = 'Ej. MAD';
    dCustom.maxLength = 4;
    dCustom.style.marginTop = '0.35rem';
    dCustom.hidden = true;
    dSel.addEventListener('change', function () {
      dCustom.hidden = dSel.value !== '__custom__';
    });
    dLab.appendChild(dSel);
    dLab.appendChild(dCustom);
    rowOut.appendChild(dLab);

    modeSel.addEventListener('change', function () {
      var fromB = modeSel.value === 'from_zona';
      rowIn.hidden = fromB;
      rowOut.hidden = !fromB;
    });

    var dtRow = document.createElement('div');
    dtRow.className = 'transfer-hb-modal-field';
    var dtLab = document.createElement('label');
    dtLab.textContent = 'Fecha y hora del transfer (salida)';
    var dt = document.createElement('input');
    dt.type = 'datetime-local';
    dt.className = 'transfer-hb-modal-datetime';
    dtLab.appendChild(dt);
    dtRow.appendChild(dtLab);

    var paxRow = document.createElement('div');
    paxRow.className = 'transfer-hb-modal-field';
    var paxLab = document.createElement('label');
    paxLab.textContent = 'Pasajeros';
    var paxSync = document.createElement('input');
    paxSync.type = 'number';
    paxSync.min = '1';
    paxSync.max = '54';
    paxSync.value = '2';
    paxSync.className = 'transfer-hb-modal-pax';
    paxLab.appendChild(paxSync);
    paxRow.appendChild(paxLab);

    var langRow = document.createElement('div');
    langRow.className = 'transfer-hb-modal-field';
    var langLab = document.createElement('label');
    langLab.textContent = 'Idioma petición API (Hotelbeds)';
    var langSel = document.createElement('select');
    langSel.className = 'transfer-hb-modal-select';
    langSel.innerHTML =
      '<option value="en">English — recomendado (doc. / catálogo)</option>' +
      '<option value="es">Español</option>';
    langSel.value = 'en';
    langLab.appendChild(langSel);
    langRow.appendChild(langLab);

    var searchBtn = document.createElement('button');
    searchBtn.type = 'button';
    searchBtn.className = 'btn-transfer-hb-modal-search';
    searchBtn.textContent = 'Buscar disponibilidad y precios';

    var results = document.createElement('div');
    results.className = 'transfer-hb-modal-results';
    results.setAttribute('aria-live', 'polite');

    panel.appendChild(head);
    panel.appendChild(destNote);
    panel.appendChild(zonaRow);
    panel.appendChild(modeRow);
    panel.appendChild(rowIn);
    panel.appendChild(rowOut);
    panel.appendChild(dtRow);
    panel.appendChild(paxRow);
    panel.appendChild(langRow);
    panel.appendChild(searchBtn);
    panel.appendChild(results);

    modal.appendChild(backdrop);
    modal.appendChild(panel);
    document.body.appendChild(modal);

    var els = {
      mode: modeSel,
      zonaSel: zonaSel,
      zonaHidden: zonaHidden,
      originSel: oSel,
      originCustom: oCustom,
      destOut: dSel,
      destCustom: dCustom,
      dt: dt,
      paxSync: paxSync,
      lang: langSel,
    };

    function syncModalFromForm() {
      var form = getForm(block);
      var iso = defaultOutboundFromCalendar(form);
      if (iso) dt.value = iso.slice(0, 16);
      var pe = block.querySelector('input[name="transfer_hb_pax"]');
      if (pe && pe.value) paxSync.value = pe.value;
    }

    openBtn.addEventListener('click', function () {
      syncModalFromForm();
      zonaHidden.value = zonaSel.value;
      if (modeSel.value === 'to_zona' && !oSel.value) {
        oSel.value = 'MAD';
      }
      if (modeSel.value === 'from_zona' && !dSel.value) {
        dSel.value = 'MAD';
      }
      openModal(modal, zonaSel);
    });

    closeBtn.addEventListener('click', function () {
      closeModal(modal);
    });
    backdrop.addEventListener('click', function () {
      closeModal(modal);
    });

    searchBtn.addEventListener('click', function () {
      runAvailability(block, hiddenRk, els, results, searchBtn);
    });

    var cb = block.querySelector('input[name="transfer_hb_interes"]');
    if (cb) {
      cb.addEventListener('change', syncModalFromForm);
    }
  }

  function bindBlock(block) {
    setupTransferModal(block);
    var cb = block.querySelector('input[name="transfer_hb_interes"]');
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
    ensureEscapeClosesModal();
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
