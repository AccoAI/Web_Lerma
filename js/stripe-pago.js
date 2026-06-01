/**
 * Integración Stripe Payment Links - Golf Lerma
 * Obtiene el total del resumen y crea el enlace de pago vía API
 */
(function () {
  'use strict';

  function parseTotalFromResumen() {
    var cell = document.querySelector('.configurador-resumen .resumen-total td:last-child');
    if (!cell) return 0;
    var t = (cell.textContent || '').replace(/€/g, '').replace(',', '.').trim();
    return parseFloat(t) || 0;
  }

  function mostrarModalEnlacePago(url, numParticipantes, totalEuros) {
    var porPersona = numParticipantes > 1 ? (totalEuros / numParticipantes).toFixed(2) : totalEuros.toFixed(2);
    var overlay = document.createElement('div');
    overlay.className = 'stripe-pago-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'stripe-modal-titulo');
    overlay.innerHTML =
      '<div class="stripe-pago-modal">' +
      '<h3 id="stripe-modal-titulo">Enlace de pago para compartir</h3>' +
      '<p>Comparte este enlace con los ' + numParticipantes + ' participantes para que cada uno abone su parte (' + porPersona + ' €):</p>' +
      '<div class="stripe-pago-modal-actions">' +
      '<input type="text" readonly value="' + url.replace(/"/g, '&quot;') + '" id="stripe-pago-url-input" class="stripe-pago-url-input">' +
      '<button type="button" id="stripe-pago-copiar" class="btn-reservar-paquete">Copiar enlace</button>' +
      '</div>' +
      '<p style="margin-top:1rem;"><a href="' + url.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener noreferrer" class="btn-reservar-paquete">Ir a pagar ahora</a></p>' +
      '<button type="button" id="stripe-pago-cerrar" class="stripe-pago-cerrar">Cerrar</button>' +
      '</div>';
    document.body.appendChild(overlay);

    function cerrar() {
      overlay.remove();
      document.body.style.overflow = '';
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) cerrar();
    });
    overlay.querySelector('#stripe-pago-cerrar').addEventListener('click', cerrar);
    overlay.querySelector('#stripe-pago-copiar').addEventListener('click', function () {
      var input = overlay.querySelector('#stripe-pago-url-input');
      input.select();
      input.setSelectionRange(0, 99999);
      try {
        document.execCommand('copy');
        this.textContent = '¡Copiado!';
        var self = this;
        setTimeout(function () { self.textContent = 'Copiar enlace'; }, 2000);
      } catch (err) {
        navigator.clipboard.writeText(input.value).then(function () {
          overlay.querySelector('#stripe-pago-copiar').textContent = '¡Copiado!';
        });
      }
    });

    document.body.style.overflow = 'hidden';
  }

  function addDaysIso(iso, days) {
    var d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  /** Fechas del paquete (fechas[] / noches) para metadata Stripe y Rentcars post-pago. */
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
          mostrarModalEnlacePago(data.url, numParticipantes, totalEuros);
          if (submitButton) { submitButton.disabled = false; submitButton.textContent = textoOriginal; }
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
