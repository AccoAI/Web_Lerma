/**
 * Transfer Hotelbeds en paquetes: bloque de presupuesto rápido.
 * - Ping: GET /api/hotelbeds-transfers?ping=1
 * - Availability simple: GET /api/hotelbeds-transfers?... (MAD ↔ GPS Lerma/Burgos)
 *
 * Requisitos del cliente:
 * - Dos opciones por sentido (IDA / VUELTA).
 * - Destino siempre Lerma o Burgos.
 * - Fecha/hora: primera fecha (ida) y última fecha (vuelta) del calendario.
 */
(function () {
  var MAD = { type: 'IATA', code: 'MAD', label: 'Madrid (MAD)' };
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

  function fetchAvailability(block, resultsEl, hiddenRateKey, from, to, outboundIso) {
    var paxEl = block.querySelector('input[name=\"transfer_hb_pax\"]');
    var adults = Math.max(1, parseInt(paxEl && paxEl.value ? paxEl.value : '2', 10) || 2);

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

  function ensureQuickUi(block) {
    if (block.querySelector('.transfer-hb-quick')) return;

    var form = getForm(block);

    var hiddenRateKey = document.createElement('input');
    hiddenRateKey.type = 'hidden';
    hiddenRateKey.name = 'transfer_hb_rate_key';
    hiddenRateKey.value = '';
    block.appendChild(hiddenRateKey);

    var quick = document.createElement('div');
    quick.className = 'transfer-hb-quick';

    var head = document.createElement('div');
    head.className = 'transfer-hb-quick-head';
    var title = document.createElement('h4');
    title.className = 'transfer-hb-quick-title';
    title.textContent = 'Presupuesto rápido (Hotelbeds Transfers)';
    var sub = document.createElement('p');
    sub.className = 'transfer-hb-quick-sub';
    sub.textContent = 'Origen fijo: Madrid (MAD). Destino: Lerma o Burgos. Fechas: primera (ida) y última (vuelta) del calendario.';
    head.appendChild(title);
    head.appendChild(sub);

    var dates = document.createElement('div');
    dates.className = 'transfer-hb-quick-dates';
    dates.innerHTML = '<span>Ida:</span> <strong class=\"transfer-hb-date-ida\">—</strong> <span>Vuelta:</span> <strong class=\"transfer-hb-date-vuelta\">—</strong>';

    function syncDates() {
      var rng = pickCalendarRange(form);
      var ida = rng.first ? rng.first : '';
      var vuelta = rng.last && rng.last !== rng.first ? rng.last : rng.last;
      var idaEl = dates.querySelector('.transfer-hb-date-ida');
      var vEl = dates.querySelector('.transfer-hb-date-vuelta');
      if (idaEl) idaEl.textContent = ida ? formatDate(ida) : '—';
      if (vEl) vEl.textContent = vuelta ? formatDate(vuelta) : '—';
    }
    syncDates();

    var grid = document.createElement('div');
    grid.className = 'transfer-hb-quick-grid';

    function mkCard(label, from, to, whenFn) {
      var card = document.createElement('div');
      card.className = 'transfer-hb-quick-card';
      var h = document.createElement('div');
      h.className = 'transfer-hb-quick-card-head';
      var l = document.createElement('span');
      l.className = 'transfer-hb-quick-card-label';
      l.textContent = label;
      var route = document.createElement('span');
      route.className = 'transfer-hb-quick-card-route';
      route.textContent = from.label + ' → ' + to.label;
      h.appendChild(l);
      h.appendChild(route);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-transfer-hb-quick';
      btn.textContent = 'Ver disponibilidad y precios';

      var out = document.createElement('div');
      out.className = 'transfer-hb-quick-results';
      out.setAttribute('aria-live', 'polite');

      btn.addEventListener('click', function () {
        var iso = whenFn();
        if (!iso) {
          out.innerHTML =
            '<p class=\"transfer-hb-modal-msg transfer-hb-modal-msg--warn\">Selecciona antes las fechas en el calendario.</p>';
          return;
        }
        fetchAvailability(block, out, hiddenRateKey, from, to, iso);
      });

      card.appendChild(h);
      card.appendChild(btn);
      card.appendChild(out);
      return card;
    }

    var idaBurgos = mkCard('IDA', MAD, ZONAS.burgos, function () {
      return defaultOutboundFromCalendar(form);
    });
    var idaLerma = mkCard('IDA', MAD, ZONAS.lerma, function () {
      return defaultOutboundFromCalendar(form);
    });
    var vueltaBurgos = mkCard('VUELTA', ZONAS.burgos, MAD, function () {
      return defaultReturnFromCalendar(form);
    });
    var vueltaLerma = mkCard('VUELTA', ZONAS.lerma, MAD, function () {
      return defaultReturnFromCalendar(form);
    });

    grid.appendChild(idaBurgos);
    grid.appendChild(idaLerma);
    grid.appendChild(vueltaBurgos);
    grid.appendChild(vueltaLerma);

    quick.appendChild(head);
    quick.appendChild(dates);
    quick.appendChild(grid);

    var apiLine = block.querySelector('.hotelbeds-transfer-api-line');
    if (apiLine && apiLine.parentNode) {
      apiLine.parentNode.insertBefore(quick, apiLine.nextSibling);
    } else {
      block.insertBefore(quick, block.firstChild);
    }

    // Re-sincronizar fechas cuando cambian inputs típicos.
    if (form) {
      form.addEventListener('change', syncDates);
      form.addEventListener('input', syncDates);
    }
  }

  function bindBlock(block) {
    ensureQuickUi(block);
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
