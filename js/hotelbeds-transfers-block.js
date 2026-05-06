/**
 * Bloque opcional "Transfer (Hotelbeds)" en paquetes con alojamiento.
 * - Ping: mismo proxy que transfers-cert.html → GET /api/hotelbeds-transfers?ping=1
 * - Presupuesto en vivo: GET /api/hotelbeds-transfers?… (availability simple)
 */
(function () {
  var ROUTE_PRESETS = [
    { label: 'MAD → Burgos (RGS)', fromType: 'IATA', fromCode: 'MAD', toType: 'IATA', toCode: 'RGS' },
    { label: 'Burgos (RGS) → MAD', fromType: 'IATA', fromCode: 'RGS', toType: 'IATA', toCode: 'MAD' },
    { label: 'MAD → Valladolid (VLL)', fromType: 'IATA', fromCode: 'MAD', toType: 'IATA', toCode: 'VLL' },
  ];

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

  function injectLiveUi(block) {
    var det = block.querySelector('.transfer-hb-detalles');
    if (!det || det.querySelector('.transfer-hb-live-wrap')) return;

    var intro = document.createElement('p');
    intro.className = 'transfer-hb-live-intro';
    intro.textContent =
      'Presupuesto en vivo con el mismo proxy que la certificación: indica tipo y código de origen/destino (doc. Hotelbeds: IATA, ATLAS, GIATA, GPS). La fecha/hora del tramo se rellena desde tu calendario cuando hay fechas seleccionadas.';

    var presets = document.createElement('div');
    presets.className = 'transfer-hb-presets';
    presets.setAttribute('aria-label', 'Rutas de ejemplo');

    var codes = document.createElement('div');
    codes.className = 'transfer-hb-codes-grid';

    function addField(labelText, name, defVal, inputType) {
      var wrap = document.createElement('label');
      wrap.className = 'transfer-hb-code-field';
      var span = document.createElement('span');
      span.textContent = labelText;
      wrap.appendChild(span);
      var inp = document.createElement(inputType || 'input');
      if (!inputType || inputType === 'input') {
        inp.type = 'text';
        inp.value = defVal || '';
      }
      inp.setAttribute('data-transfer-field', name);
      wrap.appendChild(inp);
      codes.appendChild(wrap);
      return inp;
    }

    var langEl = addField('Idioma API', 'language', 'es');
    var ftEl = addField('fromType', 'fromType', 'IATA');
    var fcEl = addField('fromCode', 'fromCode', 'MAD');
    var ttEl = addField('toType', 'toType', 'IATA');
    var tcEl = addField('toCode', 'toCode', 'RGS');

    var dtWrap = document.createElement('label');
    dtWrap.className = 'transfer-hb-code-field transfer-hb-code-field--full';
    var dtSpan = document.createElement('span');
    dtSpan.textContent = 'Salida del transfer (fecha y hora local)';
    dtWrap.appendChild(dtSpan);
    var dtEl = document.createElement('input');
    dtEl.type = 'datetime-local';
    dtEl.setAttribute('data-transfer-field', 'outbound');
    dtWrap.appendChild(dtEl);
    codes.appendChild(dtWrap);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-transfer-hb-search';
    btn.textContent = 'Buscar disponibilidad y precios';

    var hiddenRk = document.createElement('input');
    hiddenRk.type = 'hidden';
    hiddenRk.name = 'transfer_hb_rate_key';
    hiddenRk.value = '';

    var results = document.createElement('div');
    results.className = 'transfer-hb-results';
    results.setAttribute('aria-live', 'polite');

    var live = document.createElement('div');
    live.className = 'transfer-hb-live-wrap';
    live.appendChild(intro);
    live.appendChild(presets);
    live.appendChild(codes);
    live.appendChild(btn);
    live.appendChild(hiddenRk);
    live.appendChild(results);

    det.appendChild(live);

    ROUTE_PRESETS.forEach(function (pr) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'transfer-hb-preset-btn';
      b.textContent = pr.label;
      b.addEventListener('click', function () {
        ftEl.value = pr.fromType;
        fcEl.value = pr.fromCode;
        ttEl.value = pr.toType;
        tcEl.value = pr.toCode;
      });
      presets.appendChild(b);
    });

    function syncOutboundDefault() {
      var form = getForm(block);
      var iso = defaultOutboundFromCalendar(form);
      if (!iso) return;
      var localVal = iso.slice(0, 16);
      if (!dtEl.value) dtEl.value = localVal;
    }

    btn.addEventListener('click', function () {
      var form = getForm(block);
      syncOutboundDefault();
      var outbound = dtEl.value.trim();
      if (!outbound) {
        results.innerHTML =
          '<p class="transfer-hb-results-msg transfer-hb-results-msg--warn">Indica fecha y hora de salida del transfer (o selecciona antes fechas en el calendario).</p>';
        return;
      }
      var outboundIso = outbound;
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(outbound)) {
        outboundIso = outbound + ':00';
      }

      var paxEl = block.querySelector('input[name="transfer_hb_pax"]');
      var adults = Math.max(1, parseInt(paxEl && paxEl.value ? paxEl.value : '2', 10) || 2);

      var qs = new URLSearchParams({
        language: (langEl.value || 'es').trim(),
        fromType: (ftEl.value || 'IATA').trim(),
        fromCode: (fcEl.value || '').trim(),
        toType: (ttEl.value || 'IATA').trim(),
        toCode: (tcEl.value || '').trim(),
        outbound: outboundIso,
        inbound: '',
        adults: String(adults),
        children: '0',
        infants: '0',
      });

      if (!(qs.get('fromCode') && qs.get('toCode'))) {
        results.innerHTML =
          '<p class="transfer-hb-results-msg transfer-hb-results-msg--warn">Completa fromCode y toCode (o usa un acceso rápido arriba).</p>';
        return;
      }

      results.innerHTML = '<p class="transfer-hb-results-msg">Buscando en Hotelbeds…</p>';
      btn.disabled = true;

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
          renderServices(results, hiddenRk, data, block);
        })
        .catch(function () {
          results.innerHTML =
            '<p class="transfer-hb-results-msg transfer-hb-results-msg--warn">Error de red al consultar el proxy de transfers.</p>';
        })
        .then(function () {
          btn.disabled = false;
        });
    });

    var cb = block.querySelector('input[name="transfer_hb_interes"]');
    if (cb) {
      cb.addEventListener('change', function () {
        if (cb.checked) syncOutboundDefault();
      });
    }
  }

  function renderServices(container, hiddenRateKey, res, block) {
    var pickName = 'transfer_hb_svc_pick_' + (block && block.getAttribute ? block.getAttribute('data-hb-transfer-page') || 'x' : 'x');
    hiddenRateKey.value = '';
    container.innerHTML = '';

    if (!res || res.ok === false) {
      var err = document.createElement('p');
      err.className = 'transfer-hb-results-msg transfer-hb-results-msg--warn';
      var detail =
        res && res.error === 'missing_credentials'
          ? 'Faltan credenciales de Transfer en el servidor.'
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
      empty.className = 'transfer-hb-results-msg';
      empty.textContent = 'Respuesta sin datos de servicios.';
      container.appendChild(empty);
      return;
    }

    var services = [];
    if (Array.isArray(data.routes) && data.routes.length) {
      data.routes.forEach(function (route) {
        var svcs = normalizeServiceList(route.services);
        svcs.forEach(function (s) {
          services.push(s);
        });
      });
    } else {
      var raw = data.services && data.services.service != null ? data.services.service : data.service;
      if (raw == null) {
        var n = document.createElement('p');
        n.className = 'transfer-hb-results-msg';
        n.textContent = 'No hay servicios en la respuesta para esta ruta (prueba otros códigos o fecha).';
        container.appendChild(n);
        return;
      }
      services = normalizeServiceList(raw);
    }

    if (!services.length) {
      var z = document.createElement('p');
      z.className = 'transfer-hb-results-msg';
      z.textContent = 'Sin servicios disponibles para los parámetros indicados.';
      container.appendChild(z);
      return;
    }

    var list = document.createElement('div');
    list.className = 'transfer-hb-svc-list';

    services.forEach(function (s, idx) {
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
        if (radio.checked && s.rateKey) hiddenRateKey.value = s.rateKey;
      });
      pick.appendChild(radio);
      pick.appendChild(document.createTextNode(' Usar este servicio para la solicitud'));
      card.appendChild(pick);
      list.appendChild(card);
    });

    container.appendChild(list);
  }

  function bindBlock(block) {
    var cb = block.querySelector('input[name="transfer_hb_interes"]');
    var det = block.querySelector('.transfer-hb-detalles');
    if (!cb || !det) return;
    function sync() {
      det.hidden = !cb.checked;
      if (cb.checked) injectLiveUi(block);
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
