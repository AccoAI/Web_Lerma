/**
 * Facturas HTML (sin SaaS): una por emisor / tipo de IVA.
 * Se envían por Resend tras el pago. Numeración: SERIE-YYYY-sufijo sesión Stripe.
 */
import {
  INVOICE_ISSUERS,
  splitGrossByVat,
  centsToEuros,
} from './invoice-issuers.js';

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatEur(n) {
  return (Math.round(Number(n) * 100) / 100).toFixed(2).replace('.', ',');
}

function invoiceNumber(series, sessionId, year) {
  const suffix = String(sessionId || 'X')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-8)
    .toUpperCase() || '00000000';
  return `${series}-${year}-${suffix}`;
}

/**
 * @param {object} opts
 * @param {'golf'|'comida'|'hotel'} opts.kind
 * @param {number} opts.grossCents - total IVA incluido (céntimos)
 * @param {string} opts.sessionId
 * @param {string} [opts.customerName]
 * @param {string} [opts.customerEmail]
 * @param {string} [opts.packageName]
 * @param {string} [opts.paidAtIso]
 */
export function buildInvoiceHtml(opts) {
  const issuer = INVOICE_ISSUERS[opts.kind];
  if (!issuer) return '';
  const gross = centsToEuros(opts.grossCents);
  if (gross <= 0) return '';

  const { base, iva } = splitGrossByVat(gross, issuer.ivaPct);
  const paidAt = opts.paidAtIso ? new Date(opts.paidAtIso) : new Date();
  const year = paidAt.getFullYear();
  const fecha = paidAt.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const num = invoiceNumber(issuer.series, opts.sessionId, year);
  const buyerName = opts.customerName || 'Cliente';
  const buyerEmail = opts.customerEmail || '';

  return `
<div style="font-family:Georgia,serif;max-width:640px;margin:24px auto;padding:24px;border:1px solid #ccc;color:#222;background:#fff;">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#666;">Factura</p>
  <h2 style="margin:0 0 16px;font-size:20px;font-weight:normal;">${escapeHtml(num)}</h2>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px;">
    <tr>
      <td style="vertical-align:top;width:50%;padding-right:12px;">
        <strong>Emisor</strong><br>
        ${escapeHtml(issuer.legalName)}<br>
        NIF ${escapeHtml(issuer.nif)}
        ${issuer.address ? `<br>${escapeHtml(issuer.address)}` : ''}
        ${issuer.phone ? `<br>${escapeHtml(issuer.phone)}` : ''}
      </td>
      <td style="vertical-align:top;width:50%;">
        <strong>Cliente</strong><br>
        ${escapeHtml(buyerName)}
        ${buyerEmail ? `<br>${escapeHtml(buyerEmail)}` : ''}
      </td>
    </tr>
  </table>
  <p style="font-size:14px;margin:0 0 12px;"><strong>Fecha:</strong> ${escapeHtml(fecha)}
  ${opts.packageName ? `<br><strong>Referencia paquete:</strong> ${escapeHtml(opts.packageName)}` : ''}
  ${opts.sessionId ? `<br><strong>Pago Stripe:</strong> ${escapeHtml(opts.sessionId)}` : ''}
  </p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">Concepto</th>
        <th style="text-align:right;padding:8px;border-bottom:1px solid #ddd;">Base</th>
        <th style="text-align:right;padding:8px;border-bottom:1px solid #ddd;">IVA ${issuer.ivaPct}%</th>
        <th style="text-align:right;padding:8px;border-bottom:1px solid #ddd;">Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(issuer.conceptDefault)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatEur(base)} €</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatEur(iva)} €</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatEur(gross)} €</td>
      </tr>
    </tbody>
  </table>
  <p style="text-align:right;font-size:16px;margin:12px 0 0;"><strong>Total factura: ${formatEur(gross)} €</strong></p>
  <p style="font-size:11px;color:#666;margin:20px 0 0;line-height:1.4;">
    Documento generado automáticamente tras el pago del paquete.
    El cobro único lo realiza Club de Golf Lerma SA (explotadora).
    Esta factura corresponde al tramo de ${escapeHtml(issuer.legalName)} (IVA ${issuer.ivaPct}%).
  </p>
</div>`;
}

export function buildInvoicePlainText(opts) {
  const issuer = INVOICE_ISSUERS[opts.kind];
  if (!issuer) return '';
  const gross = centsToEuros(opts.grossCents);
  if (gross <= 0) return '';
  const { base, iva } = splitGrossByVat(gross, issuer.ivaPct);
  const paidAt = opts.paidAtIso ? new Date(opts.paidAtIso) : new Date();
  const num = invoiceNumber(issuer.series, opts.sessionId, paidAt.getFullYear());
  return (
    `FACTURA ${num}\n` +
    `Emisor: ${issuer.legalName} · NIF ${issuer.nif}\n` +
    `Cliente: ${opts.customerName || 'Cliente'}${opts.customerEmail ? ` <${opts.customerEmail}>` : ''}\n` +
    `Concepto: ${issuer.conceptDefault}\n` +
    `Base: ${base.toFixed(2)} € | IVA ${issuer.ivaPct}%: ${iva.toFixed(2)} € | Total: ${gross.toFixed(2)} €\n` +
    `Pago Stripe: ${opts.sessionId || ''}\n`
  );
}

/**
 * Construye HTML+texto de todas las facturas con importe > 0.
 * @param {{ golfCents?:number, comidaCents?:number, hotelCents?:number, sessionId:string, customerName?:string, customerEmail?:string, packageName?:string, paidAtIso?:string }} meta
 */
export function buildAllInvoicesFromMeta(meta) {
  const kinds = [
    ['golf', meta.golfCents],
    ['comida', meta.comidaCents],
    ['hotel', meta.hotelCents],
  ];
  let html = '';
  let text = '';
  const emitted = [];
  for (const [kind, cents] of kinds) {
    const c = Math.max(0, parseInt(cents, 10) || 0);
    if (c < 1) continue;
    const opts = {
      kind,
      grossCents: c,
      sessionId: meta.sessionId,
      customerName: meta.customerName,
      customerEmail: meta.customerEmail,
      packageName: meta.packageName,
      paidAtIso: meta.paidAtIso,
    };
    html += buildInvoiceHtml(opts);
    text += buildInvoicePlainText(opts) + '\n';
    emitted.push(kind);
  }
  return { html, text, emitted };
}
