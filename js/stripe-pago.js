/**
 * Integración Stripe Payment Links - Golf Lerma
 */
(function () {
  'use strict';

  var SHARE_STORAGE_KEY = 'golf_lerma_stripe_share_pending';

  var NOMBRES_PAQUETE = {
    'fin-semana': 'Paquete Golf Burgos',
    'golf-burgos': 'Paquete Golf Burgos',
    cochinillo: 'Paquete Golf + Cochinillo',
    'golf-vino': 'Golf Canalla',
    'golf-canalla': 'Golf Canalla',
    '36-hoyos': 'Golf Ilimitado en Burgos',
    'golf-ilimitado': 'Golf Ilimitado en Burgos',
    'pausa-drive': 'Pausa & Drive',
    'tour-boogie': 'Tour en boogie',
    bautismos: 'Bautismos de golf',
    ryder: 'Ryder Cup',
    torneos: 'Configurador Torneos',
    'primera-cuota': 'Primera cuota socio - Golf Lerma',
  };

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function nombrePaqueteLabel(paquete, custom) {
    if (custom) return custom;
    return NOMBRES_PAQUETE[paquete] || 'el paquete de golf';
  }

  function parseTotalFromResumen() {
    var cell = document.querySelector('.configurador-resumen .resumen-total td:last-child');
    if (!cell) return 0;
    var t = (cell.textContent || '').replace(/€/g, '').replace(',', '.').trim();
    return parseFloat(t) || 0;
  }

  function buildSharePayload(opts) {
    var num = Math.max(1, opts.numParticipantes || 1);
    var total = Number(opts.totalEuros) || 0;
    var porPersona = num > 1 ? (total / num).toFixed(2) : total.toFixed(2);
    return {
      url: opts.url,
      numParticipantes: num,
      porPersona: porPersona,
      paquete: opts.paquete || '',
      nombrePaquete: nombrePaqueteLabel(opts.paquete, opts.nombrePaquete),
    };
  }

  function buildWhatsAppText(payload) {
    return (
      '¡Hola! Esta es tu parte a pagar por ' +
      payload.nombrePaquete +
      ': ' +
      payload.porPersona +
      ' €.\n\n' +
      'Paga con tarjeta de forma segura aquí:\n' +
      payload.url +
      '\n\n' +
      '¡Nos vemos en el campo! ⛳'
    );
  }

  function whatsAppShareUrl(text) {
    return 'https://wa.me/?text=' + encodeURIComponent(text);
  }

  function saveSharePending(payload) {
    try {
      sessionStorage.setItem(SHARE_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      /* ignore */
    }
  }

  function readSharePending() {
    try {
      var raw = sessionStorage.getItem(SHARE_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function clearSharePending() {
    try {
      sessionStorage.removeItem(SHARE_STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function wireCopyButton(overlay, url) {
    var btn = overlay.querySelector('#stripe-pago-copiar');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var input = overlay.querySelector('#stripe-pago-url-input');
      if (!input) return;
      input.select();
      input.setSelectionRange(0, 99999);
      var self = this;
      function done() {
        self.textContent = '¡Copiado!';
        setTimeout(function () {
          self.textContent = 'Copiar enlace';
        }, 2000);
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(input.value).then(done);
        } else {
          document.execCommand('copy');
          done();
        }
      } catch (err) {
        if (navigator.clipboard) navigator.clipboard.writeText(input.value).then(done);
      }
    });
  }

  function openModal(html, onMount) {
    var overlay = document.createElement('div');
    overlay.className = 'stripe-pago-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    function cerrar() {
      overlay.remove();
      document.body.style.overflow = '';
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) cerrar();
    });
    var cerrarBtn = overlay.querySelector('#stripe-pago-cerrar');
    if (cerrarBtn) cerrarBtn.addEventListener('click', cerrar);

    if (typeof onMount === 'function') onMount(overlay, cerrar);
    return overlay;
  }

  /** Paso 2: compartir enlace con el grupo (WhatsApp + copiar). */
  function mostrarModalCompartirGrupo(payload) {
    var p = payload || {};
    var url = (p.url || '').trim();
    if (!url) return;

    var waText = buildWhatsAppText(p);
    var waHref = whatsAppShareUrl(waText);
    var otros = Math.max(0, (p.numParticipantes || 1) - 1);

    openModal(
      '<div class="stripe-pago-modal">' +
      '<h3 id="stripe-modal-titulo">Comparte el enlace con tu grupo</h3>' +
      '<p class="stripe-pago-modal-lead">Cada participante paga <strong>' +
      escapeHtml(p.porPersona) +
      ' €</strong> con el mismo enlace.</p>' +
      (otros > 0
        ? '<p>Envía el enlace a las otras <strong>' +
          otros +
          '</strong> personas del grupo:</p>'
        : '<p>Envía este enlace a quien deba pagar su parte:</p>') +
      '<div class="stripe-pago-modal-actions">' +
      '<input type="text" readonly value="' +
      escapeHtml(url) +
      '" id="stripe-pago-url-input" class="stripe-pago-url-input" aria-label="Enlace de pago">' +
      '<a class="btn-reservar-paquete stripe-pago-btn-whatsapp" id="stripe-pago-whatsapp" href="' +
      escapeHtml(waHref) +
      '" target="_blank" rel="noopener noreferrer">Enviar por WhatsApp</a>' +
      '<button type="button" id="stripe-pago-copiar" class="btn-reservar-paquete stripe-pago-btn-secondary">Copiar enlace</button>' +
      '</div>' +
      '<p class="stripe-pago-modal-hint">El mensaje de WhatsApp incluye el texto: «Esta es tu parte a pagar por ' +
      escapeHtml(p.nombrePaquete) +
      '…»</p>' +
      '<button type="button" id="stripe-pago-cerrar" class="stripe-pago-cerrar">Cerrar</button>' +
      '</div>',
      function (overlay) {
        wireCopyButton(overlay, url);
      }
    );
  }

  window.mostrarModalCompartirGrupo = mostrarModalCompartirGrupo;

  /** Tras pago confirmado en confirmacion-reserva.html */
  window.tryMostrarCompartirGrupoTrasPago = function (paymentPaid) {
    if (!paymentPaid) return;
    var pending = readSharePending();
    if (!pending || !pending.url) return;
    clearSharePending();
    setTimeout(function () {
      mostrarModalCompartirGrupo(pending);
    }, 600);
  };

  /** Paso 1 (pago por persona): pagar primero, compartir después. */
  function mostrarModalPagarPrimero(payload) {
    var p = payload;
    var url = (p.url || '').trim();
    if (!url) return;

    saveSharePending(p);

    openModal(
      '<div class="stripe-pago-modal">' +
      '<h3 id="stripe-modal-titulo">Paso 1: Paga tu parte</h3>' +
      '<p class="stripe-pago-modal-lead">Tu importe: <strong>' +
      escapeHtml(p.porPersona) +
      ' €</strong></p>' +
      '<p>Primero completa <strong>tu pago</strong>. En la pantalla de confirmación podrás enviar el enlace al resto del grupo (' +
      p.numParticipantes +
      ' personas en total).</p>' +
      '<div class="stripe-pago-modal-actions">' +
      '<button type="button" id="stripe-pago-ir-pagar" class="btn-reservar-paquete">Pagar ahora (' +
      escapeHtml(p.porPersona) +
      ' €)</button>' +
      '</div>' +
      '<p class="stripe-pago-modal-alt">' +
      '<button type="button" class="stripe-pago-link-btn" id="stripe-pago-solo-compartir">Solo compartir enlace (sin pagar aún)</button>' +
      '</p>' +
      '<button type="button" id="stripe-pago-cerrar" class="stripe-pago-cerrar">Cancelar</button>' +
      '</div>',
      function (overlay, cerrar) {
        overlay.querySelector('#stripe-pago-ir-pagar').addEventListener('click', function () {
          window.location.href = url;
        });
        overlay.querySelector('#stripe-pago-solo-compartir').addEventListener('click', function () {
          cerrar();
          mostrarModalCompartirGrupo(p);
        });
      }
    );
  }

  function addDaysIso(iso, days) {
    var d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  window.collectPaqueteTripDates = function (formId) {
    var form = formId ? document.getElementById(formId) : null;
    if (!form) return null;
    var fd = new FormData(form);
    var fechas = fd
      .getAll('fechas[]')
      .map(function (s) {
        return String(s).trim();
      })
      .filter(function (s) {
        return /^\d{4}-\d{2}-\d{2}$/.test(s);
      });
    fechas.sort();
    if (!fechas.length) return null;
    var pickup = fechas[0];
    var lastNight = fechas[fechas.length - 1];
    var dropoff = addDaysIso(lastNight, 1);
    var noches = parseInt(fd.get('noches'), 10);
    if (fechas.length === 1 && noches > 1) {
      dropoff = addDaysIso(pickup, noches);
    }
    return {
      pickup: pickup,
      dropoff: dropoff,
      pickupLocation: 'Madrid, España',
    };
  };

  window.iniciarPagoStripe = function (options) {
    var totalEuros = options.totalEuros;
    var modo = options.modo || 'unico';
    var numParticipantes = Math.max(1, options.numParticipantes || 1);
    var paquete = options.paquete || 'paquete';
    var submitButton = options.submitButton || null;

    if (!totalEuros || totalEuros <= 0) {
      alert('No se puede proceder: el importe total debe ser mayor que 0. Completa las opciones del paquete.');
      return;
    }

    var amountCents = Math.round(totalEuros * 100);
    if (amountCents < 50) {
      alert('El importe mínimo es 0,50 €.');
      return;
    }

    var textoOriginal = '';
    if (submitButton) {
      submitButton.disabled = true;
      textoOriginal = submitButton.textContent;
      submitButton.textContent = 'Procesando...';
    }

    var strictHb = options.hotelbedsStrictPrebook === true || window.HOTELBEDS_STRICT_PREBOOK === true;
    if (options.formId) {
      var hbForm = document.getElementById(options.formId);
      if (hbForm) {
        var hbReady = hbForm.querySelector('input[name="hb_funnel_ready"]');
        if (hbReady && String(hbReady.value || '').trim() === '1') strictHb = true;
      }
    }

    var prebook = Promise.resolve(null);
    if (typeof window.tryHotelbedsBookForStripe === 'function' && window.HOTELBEDS_SKIP_PREBOOK !== true) {
      prebook = window
        .tryHotelbedsBookForStripe({
          paquete: paquete,
          formId: options.formId,
        })
        .catch(function (err) {
          if (strictHb) {
            return Promise.reject(err);
          }
          console.warn('[Hotelbeds] Sin pre-reserva antes de Stripe:', err && err.message ? err.message : err);
          return null;
        });
    }

    prebook
      .then(function (hotelbedsVoucher) {
        var body = {
          amountCents: amountCents,
          modo: modo,
          numParticipantes: numParticipantes,
          paquete: paquete,
        };
        if (options.tituloTorneo) body.tituloTorneo = options.tituloTorneo;
        if (options.nombrePaquete) body.nombrePaquete = options.nombrePaquete;
        if (hotelbedsVoucher && typeof hotelbedsVoucher === 'object') {
          body.hotelbedsVoucher = hotelbedsVoucher;
        }
        var tripDates = options.tripDates;
        if (!tripDates && options.formId && typeof window.collectPaqueteTripDates === 'function') {
          tripDates = window.collectPaqueteTripDates(options.formId);
        }
        if (tripDates && tripDates.pickup) {
          body.tripDates = tripDates;
        }
        if (options.formId && typeof window.collectPaqueteEmbedContextForPayment === 'function') {
          var embedContext = window.collectPaqueteEmbedContextForPayment(options.formId);
          if (embedContext && embedContext.dateISO) {
            body.embedContext = embedContext;
          }
        }
        return fetch('/api/crear-pago', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      })
      .then(function (r) {
        return r.text().then(function (text) {
          if (!r.ok) {
            var errMsg = 'Error del servidor';
            try {
              var j = JSON.parse(text);
              if (j && j.error) errMsg = j.error;
            } catch (e2) {
              if (r.status === 404) errMsg = 'La pasarela de pago no está disponible. ¿Estás en el servidor desplegado?';
              else if (text && text.length < 200) errMsg = text;
            }
            throw new Error(errMsg);
          }
          try {
            return JSON.parse(text);
          } catch (e3) {
            throw new Error('Respuesta inválida del servidor');
          }
        });
      })
      .then(function (data) {
        if (modo === 'por_persona') {
          var sharePayload = buildSharePayload({
            url: data.url,
            numParticipantes: numParticipantes,
            totalEuros: totalEuros,
            paquete: paquete,
            nombrePaquete: options.nombrePaquete,
          });
          mostrarModalPagarPrimero(sharePayload);
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = textoOriginal;
          }
        } else {
          window.location.href = data.url;
        }
      })
      .catch(function (err) {
        alert('Error al crear el enlace de pago: ' + (err.message || 'Por favor, contacte con nosotros.'));
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = textoOriginal;
        }
      });
  };

  window.getTotalFromResumen = parseTotalFromResumen;
})();
