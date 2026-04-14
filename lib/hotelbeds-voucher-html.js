/**
 * Bono / voucher de alojamiento alineado con Hotelbeds certification §4 (voucher).
 * Usar desde webhook Stripe u otro servidor cuando exista confirmación Hotelbeds.
 *
 * Texto legal §4.5 (plantilla): payable through supplier, VAT, booking reference.
 * Valores por defecto del proveedor: env HOTELBEDS_VOUCHER_SUPPLIER_NAME, HOTELBEDS_VOUCHER_SUPPLIER_VAT
 */

export function escapeHtml(s) {
  if (s == null || s === '') return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {Object} o
 * @param {string} o.bookingReference - Referencia Hotelbeds (obligatoria para mostrar bono hotel)
 * @param {string} [o.agencyReference] - Referencia agencia / pedido interno
 * @param {string} o.hotelName
 * @param {string} [o.hotelCategory]
 * @param {string} o.hotelAddress
 * @param {string} [o.hotelDestination]
 * @param {string} [o.hotelPhone]
 * @param {string} o.checkIn - YYYY-MM-DD
 * @param {string} o.checkOut - YYYY-MM-DD
 * @param {string} o.roomType
 * @param {string} o.boardType
 * @param {string} o.leadPaxName
 * @param {string[]} [o.additionalPaxNames]
 * @param {string[]} [o.childrenAges] - ej. ["7", "10"]
 * @param {string} [o.rateComments]
 * @param {string} [o.cancellationSummary]
 * @param {string} [o.supplierName] - override env
 * @param {string} [o.supplierVat]
 * @param {string} [o.operatingCompanyName] - empresa operadora (§4.5); env HOTELBEDS_OPERATING_COMPANY
 * @param {string} [o.vatIncludedText] - ej. "VAT included" / mercado
 * @param {string} [o.packageName] - paquete golf (contexto)
 */
export function buildHotelbedsVoucherHtml(o) {
  const supplierName =
    (o.supplierName && String(o.supplierName).trim()) ||
    process.env.HOTELBEDS_VOUCHER_SUPPLIER_NAME ||
    'Hotelbeds';
  const supplierVat =
    (o.supplierVat && String(o.supplierVat).trim()) ||
    process.env.HOTELBEDS_VOUCHER_SUPPLIER_VAT ||
    '';
  const operatingCompanyName =
    (o.operatingCompanyName && String(o.operatingCompanyName).trim()) ||
    process.env.HOTELBEDS_OPERATING_COMPANY ||
    'ADRINOS SL';
  const vatIncludedText =
    (o.vatIncludedText && String(o.vatIncludedText).trim()) ||
    process.env.HOTELBEDS_VOUCHER_VAT_LINE ||
    'VAT included where applicable.';

  const ref = escapeHtml(o.bookingReference);
  const agency = o.agencyReference ? escapeHtml(o.agencyReference) : '';

  const addPax =
    Array.isArray(o.additionalPaxNames) && o.additionalPaxNames.length
      ? `<p><strong>Otros huéspedes:</strong> ${o.additionalPaxNames.map((n) => escapeHtml(n)).join(', ')}</p>`
      : '';

  const children =
    Array.isArray(o.childrenAges) && o.childrenAges.length
      ? `<p><strong>Menores (edades):</strong> ${o.childrenAges.map((a) => escapeHtml(a)).join(', ')}</p>`
      : '';

  const comments = o.rateComments
    ? `<div class="voucher-block"><h3>Observaciones de la tarifa</h3><p>${escapeHtml(o.rateComments).replace(/\n/g, '<br>')}</p></div>`
    : '';

  const cancel = o.cancellationSummary
    ? `<div class="voucher-block"><h3>Política de cancelación</h3><p>${escapeHtml(o.cancellationSummary).replace(/\n/g, '<br>')}</p></div>`
    : '';

  const vatLine = supplierVat ? `Supplier VAT / NIF: ${escapeHtml(supplierVat)}. ` : '';
  /** §4.5 Hotelbeds: línea legal obligatoria (inglés). */
  const legalMandatory = `Payable through ${escapeHtml(supplierName)}, acting as agent for the operating company ${escapeHtml(operatingCompanyName)}.`;
  const legalExtra = `${escapeHtml(vatIncludedText)} ${vatLine}Booking reference: ${ref}.`;

  const pkg = o.packageName
    ? `<p class="voucher-package"><strong>Paquete Golf Lerma:</strong> ${escapeHtml(o.packageName)}</p>`
    : '';

  const cin = o.checkIn ? escapeHtml(o.checkIn) : '—';
  const cout = o.checkOut ? escapeHtml(o.checkOut) : '—';

  return `
<div class="hotelbeds-voucher" style="font-family: Georgia, 'Times New Roman', serif; max-width: 640px; margin: 0 auto; color: #1a1a1a;">
  <div style="border: 2px solid #2c5530; padding: 24px; background: #fafafa;">
    <h1 style="margin: 0 0 8px; font-size: 22px; color: #2c5530;">Golf Lerma</h1>
    <h2 style="margin: 0 0 20px; font-size: 18px; font-weight: normal;">Bono de alojamiento / Hotel voucher</h2>
    ${pkg}
    <div class="voucher-block" style="margin: 16px 0; padding: 12px; background: #fff; border-left: 4px solid #2c5530;">
      <p style="margin: 0;"><strong>Referencia Hotelbeds / Booking reference:</strong> ${ref}</p>
      ${agency ? `<p style="margin: 8px 0 0;"><strong>Referencia agencia:</strong> ${agency}</p>` : ''}
    </div>
    <div class="voucher-block" style="margin: 16px 0;">
      <h3 style="margin: 0 0 8px; font-size: 15px;">Hotel</h3>
      <p style="margin: 4px 0;"><strong>${escapeHtml(o.hotelName)}</strong>${o.hotelCategory ? ` · ${escapeHtml(o.hotelCategory)}` : ''}</p>
      <p style="margin: 4px 0;">${escapeHtml(o.hotelAddress)}</p>
      ${o.hotelDestination ? `<p style="margin: 4px 0;">${escapeHtml(o.hotelDestination)}</p>` : ''}
      ${o.hotelPhone ? `<p style="margin: 4px 0;">Tel. ${escapeHtml(o.hotelPhone)}</p>` : ''}
    </div>
    <div class="voucher-block" style="margin: 16px 0;">
      <h3 style="margin: 0 0 8px; font-size: 15px;">Estancia</h3>
      <p style="margin: 4px 0;"><strong>Entrada / Check-in:</strong> ${cin}</p>
      <p style="margin: 4px 0;"><strong>Salida / Check-out:</strong> ${cout}</p>
      <p style="margin: 4px 0;"><strong>Habitación / Room:</strong> ${escapeHtml(o.roomType)}</p>
      <p style="margin: 4px 0;"><strong>Régimen / Board:</strong> ${escapeHtml(o.boardType)}</p>
    </div>
    <div class="voucher-block" style="margin: 16px 0;">
      <h3 style="margin: 0 0 8px; font-size: 15px;">Huéspedes / Guests</h3>
      <p style="margin: 4px 0;"><strong>Titular / Lead guest:</strong> ${escapeHtml(o.leadPaxName)}</p>
      ${addPax}
      ${children}
    </div>
    ${comments}
    ${cancel}
    <div class="voucher-legal" style="margin-top: 24px; padding: 14px; background: #eef2ee; font-size: 13px; line-height: 1.45;">
      <p style="margin: 0;"><strong>Información de pago / Payment information</strong></p>
      <p style="margin: 8px 0 0;">${legalMandatory}</p>
      <p style="margin: 8px 0 0;">${legalExtra}</p>
    </div>
    <p style="margin: 20px 0 0; font-size: 12px; color: #555;">Presenta este bono en recepción junto con un documento de identidad. For reception: please present this voucher with a valid ID.</p>
  </div>
</div>`.trim();
}

/**
 * Documento HTML completo listo para imprimir (Ctrl+P) o guardar como PDF desde el navegador.
 * Logo: env VOUCHER_LOGO_URL o ruta por defecto; si la imagen falla, el texto ADRINOS SL / Golf Lerma sigue visible.
 *
 * @param {string} innerHtml - fragmento devuelto por buildHotelbedsVoucherHtml
 * @param {{ title?: string, logoUrl?: string }} [opts]
 */
export function wrapHotelbedsVoucherDocument(innerHtml, opts = {}) {
  const title = escapeHtml(opts.title || 'Bono de confirmación — Golf Lerma');
  const logoUrl = (opts.logoUrl && String(opts.logoUrl).trim()) || process.env.VOUCHER_LOGO_URL || '/FOTOS/camiralgolf.svg';
  const logoSrc = escapeHtml(logoUrl);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    @media print {
      body { margin: 0; padding: 12px; }
      .no-print { display: none !important; }
      a[href]:after { content: none !important; }
    }
    body { font-family: Georgia, 'Times New Roman', serif; margin: 0; padding: 16px; background: #f0f0f0; }
    .voucher-shell { max-width: 720px; margin: 0 auto; }
    .voucher-brand { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #2c5530; }
    .voucher-brand img { max-height: 56px; width: auto; }
    .voucher-brand-text { flex: 1; }
    .voucher-brand-text strong { display: block; font-size: 14px; color: #2c5530; }
    .voucher-brand-text span { font-size: 12px; color: #555; }
  </style>
</head>
<body>
  <div class="no-print" style="max-width:720px;margin:0 auto 12px;font-size:13px;color:#333;">
    <p style="margin:0 0 8px;">Usa <strong>Imprimir</strong> (Ctrl+P) y guarda como PDF si lo necesitas.</p>
  </div>
  <div class="voucher-shell">
    <header class="voucher-brand">
      <img src="${logoSrc}" alt="Golf Lerma" width="180" height="48" onerror="this.style.display='none'">
      <div class="voucher-brand-text">
        <strong>ADRINOS SL · Golf Lerma</strong>
        <span>Confirmación de alojamiento / Accommodation voucher</span>
      </div>
    </header>
    ${innerHtml}
  </div>
</body>
</html>`;
}

/**
 * Misma información en texto plano (correo multipart).
 */
export function buildHotelbedsVoucherPlainText(o) {
  const supplierName =
    (o.supplierName && String(o.supplierName).trim()) ||
    process.env.HOTELBEDS_VOUCHER_SUPPLIER_NAME ||
    'Hotelbeds';
  const supplierVat =
    (o.supplierVat && String(o.supplierVat).trim()) ||
    process.env.HOTELBEDS_VOUCHER_SUPPLIER_VAT ||
    '';
  const operatingCompanyName =
    (o.operatingCompanyName && String(o.operatingCompanyName).trim()) ||
    process.env.HOTELBEDS_OPERATING_COMPANY ||
    'ADRINOS SL';
  const vatIncludedText =
    (o.vatIncludedText && String(o.vatIncludedText).trim()) ||
    process.env.HOTELBEDS_VOUCHER_VAT_LINE ||
    'VAT included where applicable.';

  const lines = [
    'GOLF LERMA — BONO DE ALOJAMIENTO / HOTEL VOUCHER',
    '================================================',
    '',
    o.packageName ? `Paquete: ${o.packageName}` : null,
    `Referencia Hotelbeds: ${o.bookingReference}`,
    o.agencyReference ? `Referencia agencia: ${o.agencyReference}` : null,
    '',
    'HOTEL',
    o.hotelName + (o.hotelCategory ? ` (${o.hotelCategory})` : ''),
    o.hotelAddress,
    o.hotelDestination || null,
    o.hotelPhone ? `Tel. ${o.hotelPhone}` : null,
    '',
    'ESTANCIA',
    `Check-in: ${o.checkIn || '—'}`,
    `Check-out: ${o.checkOut || '—'}`,
    `Habitación: ${o.roomType}`,
    `Régimen: ${o.boardType}`,
    '',
    'HUÉSPEDES',
    `Titular: ${o.leadPaxName}`,
  ].filter(Boolean);

  if (o.additionalPaxNames && o.additionalPaxNames.length) {
    lines.push(`Otros huéspedes: ${o.additionalPaxNames.join(', ')}`);
  }
  if (o.childrenAges && o.childrenAges.length) {
    lines.push(`Menores (edades): ${o.childrenAges.join(', ')}`);
  }
  if (o.rateComments) {
    lines.push('', 'OBSERVACIONES TARIFA', o.rateComments);
  }
  if (o.cancellationSummary) {
    lines.push('', 'CANCELACIÓN', o.cancellationSummary);
  }

  const vatPart = supplierVat ? `Supplier VAT / NIF: ${supplierVat}. ` : '';
  lines.push(
    '',
    'INFORMACIÓN DE PAGO',
    `Payable through ${supplierName}, acting as agent for the operating company ${operatingCompanyName}.`,
    `${vatIncludedText} ${vatPart}Booking reference: ${o.bookingReference}.`,
    '',
    'Presenta este bono en recepción con documento de identidad.'
  );

  return lines.join('\n');
}

const META_MAX = 500;

/**
 * Convierte metadata de Stripe (claves hb_*) en objeto para buildHotelbedsVoucher*.
 * Stripe limita valores a ~500 caracteres; usar hb_comments_2, hb_cancel_2 si hace falta.
 */
export function voucherDataFromStripeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return null;
  const ref = metadata.hb_booking_ref || metadata.hb_booking_reference;
  if (!ref || !String(ref).trim()) return null;

  const hotelName = metadata.hb_hotel_name || '';
  const hotelAddress = metadata.hb_hotel_address || '';
  if (!String(hotelName).trim() || !String(hotelAddress).trim()) return null;

  const joinLong = (a, b) => [a, b].filter(Boolean).join('\n').trim();

  return {
    bookingReference: String(ref).trim(),
    agencyReference: metadata.hb_agency_ref || '',
    hotelName: String(hotelName).trim(),
    hotelCategory: metadata.hb_hotel_category || '',
    hotelAddress: String(hotelAddress).trim(),
    hotelDestination: metadata.hb_hotel_destination || '',
    hotelPhone: metadata.hb_hotel_phone || '',
    checkIn: String(metadata.hb_check_in || '').trim(),
    checkOut: String(metadata.hb_check_out || '').trim(),
    roomType: String(metadata.hb_room || '').trim() || '—',
    boardType: String(metadata.hb_board || '').trim() || '—',
    leadPaxName: String(metadata.hb_lead_pax || '').trim() || '—',
    additionalPaxNames: metadata.hb_pax_extra
      ? String(metadata.hb_pax_extra)
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    childrenAges: metadata.hb_children_ages
      ? String(metadata.hb_children_ages)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    rateComments: joinLong(metadata.hb_rate_comments, metadata.hb_rate_comments_2),
    cancellationSummary: joinLong(metadata.hb_cancel, metadata.hb_cancel_2),
    supplierName: metadata.hb_supplier_name || '',
    supplierVat: metadata.hb_supplier_vat || '',
    operatingCompanyName: metadata.hb_operating_company || '',
    vatIncludedText: metadata.hb_vat_included_line || '',
    packageName: metadata.hb_package_label || '',
  };
}

/**
 * Pasa objeto voucher del cliente (crear-pago) a entradas metadata Stripe (truncadas).
 * @param {Object} v - mismo shape que buildHotelbedsVoucherHtml (snake o camel)
 */
export function voucherToStripeMetadata(v) {
  const slice = (s, max = META_MAX) =>
    s != null && s !== '' ? String(s).trim().slice(0, max) : undefined;

  const out = {};
  const ref = v.bookingReference || v.booking_reference;
  if (!ref) return out;

  out.hb_booking_ref = slice(ref, 120);
  if (v.agencyReference || v.agency_reference) out.hb_agency_ref = slice(v.agencyReference || v.agency_reference);
  if (v.hotelName || v.hotel_name) out.hb_hotel_name = slice(v.hotelName || v.hotel_name);
  if (v.hotelCategory || v.hotel_category) out.hb_hotel_category = slice(v.hotelCategory || v.hotel_category);
  if (v.hotelAddress || v.hotel_address) out.hb_hotel_address = slice(v.hotelAddress || v.hotel_address);
  if (v.hotelDestination || v.hotel_destination) out.hb_hotel_destination = slice(v.hotelDestination || v.hotel_destination);
  if (v.hotelPhone || v.hotel_phone) out.hb_hotel_phone = slice(v.hotelPhone || v.hotel_phone);
  if (v.checkIn || v.check_in) out.hb_check_in = slice(v.checkIn || v.check_in, 32);
  if (v.checkOut || v.check_out) out.hb_check_out = slice(v.checkOut || v.check_out, 32);
  if (v.roomType || v.room) out.hb_room = slice(v.roomType || v.room);
  if (v.boardType || v.board) out.hb_board = slice(v.boardType || v.board);
  if (v.leadPaxName || v.lead_pax) out.hb_lead_pax = slice(v.leadPaxName || v.lead_pax);
  if (v.additionalPaxNames || v.pax_extra) {
    const arr = v.additionalPaxNames || (typeof v.pax_extra === 'string' ? v.pax_extra.split('|') : []);
    out.hb_pax_extra = slice(Array.isArray(arr) ? arr.join('|') : String(arr));
  }
  if (v.childrenAges || v.children_ages) {
    const ca = v.childrenAges || v.children_ages;
    out.hb_children_ages = slice(Array.isArray(ca) ? ca.join(',') : String(ca), 80);
  }
  const rc = v.rateComments || v.rate_comments;
  if (rc) {
    const s = String(rc);
    out.hb_rate_comments = slice(s, META_MAX);
    if (s.length > META_MAX) out.hb_rate_comments_2 = slice(s.slice(META_MAX), META_MAX);
  }
  const cx = v.cancellationSummary || v.cancellation_summary;
  if (cx) {
    const s = String(cx);
    out.hb_cancel = slice(s, META_MAX);
    if (s.length > META_MAX) out.hb_cancel_2 = slice(s.slice(META_MAX), META_MAX);
  }
  if (v.supplierName || v.supplier_name) out.hb_supplier_name = slice(v.supplierName || v.supplier_name);
  if (v.supplierVat || v.supplier_vat) out.hb_supplier_vat = slice(v.supplierVat || v.supplier_vat);
  if (v.operatingCompanyName || v.operating_company) {
    out.hb_operating_company = slice(v.operatingCompanyName || v.operating_company, 200);
  }
  if (v.vatIncludedText || v.vat_included_line) {
    out.hb_vat_included_line = slice(v.vatIncludedText || v.vat_included_line, 200);
  }
  if (v.packageName || v.package_label) out.hb_package_label = slice(v.packageName || v.package_label, 200);

  return out;
}
