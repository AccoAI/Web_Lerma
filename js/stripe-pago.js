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

    fetch('/api/crear-pago', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountCents: amountCents,
        modo: modo,
        numParticipantes: numParticipantes,
        paquete: paquete
      })
    })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || 'Error'); });
        return r.json();
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
