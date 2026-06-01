/**
 * Recibo de pago (estilo Stripe) en confirmacion-reserva.html.
 */
(function () {
  'use strict';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatMoney(amount, currency) {
    if (amount == null || isNaN(amount)) return '—';
    var cur = (currency || 'eur').toLowerCase();
    try {
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency: cur.toUpperCase() }).format(
        amount
      );
    } catch (e) {
      return amount.toFixed(2).replace('.', ',') + ' €';
    }
  }

  function renderStripeReceipt(containerId, receipt) {
    var el = document.getElementById(containerId);
    if (!el || !receipt) return;

    var rows = [];
    if (receipt.amount_total != null) {
      rows.push(['Importe pagado', formatMoney(receipt.amount_total, receipt.currency)]);
    }
    if (receipt.created_at) {
      rows.push(['Fecha y hora', escapeHtml(receipt.created_at)]);
    }
    if (receipt.payment_method) {
      rows.push(['Método de pago', escapeHtml(receipt.payment_method)]);
    }
    if (receipt.customer_name) {
      rows.push(['Titular', escapeHtml(receipt.customer_name)]);
    }
    if (receipt.customer_email) {
      rows.push(['Correo', escapeHtml(receipt.customer_email)]);
    }
    if (receipt.payment_status === 'paid') {
      rows.push(['Estado', '<span class="confirmacion-recibo-estado confirmacion-recibo-estado--paid">Pagado</span>']);
    }

    var lineHtml = '';
    if (receipt.line_items && receipt.line_items.length) {
      lineHtml = '<div class="confirmacion-recibo-lineas"><p class="confirmacion-recibo-lineas-titulo">Detalle</p><ul>';
      receipt.line_items.forEach(function (item) {
        lineHtml +=
          '<li><span>' +
          escapeHtml(item.description || 'Concepto') +
          '</span>' +
          (item.amount != null
            ? '<span>' + formatMoney(item.amount, receipt.currency) + '</span>'
            : '') +
          '</li>';
      });
      lineHtml += '</ul></div>';
    }

    var tableRows = rows
      .map(function (r) {
        return '<tr><th scope="row">' + r[0] + '</th><td>' + r[1] + '</td></tr>';
      })
      .join('');

    el.innerHTML =
      '<div class="confirmacion-recibo-stripe">' +
      '<p class="confirmacion-recibo-stripe-kicker">Recibo de Stripe</p>' +
      '<table class="confirmacion-recibo-tabla"><tbody>' +
      tableRows +
      '</tbody></table>' +
      lineHtml +
      (receipt.session_id
        ? '<p class="confirmacion-recibo-id">ID de sesión: <code>' +
          escapeHtml(receipt.session_id) +
          '</code></p>'
        : '') +
      '</div>';
    el.hidden = false;
  }

  window.renderPostBookingReceipt = renderStripeReceipt;
})();
