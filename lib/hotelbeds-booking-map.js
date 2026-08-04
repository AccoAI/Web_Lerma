/**
 * Mapea la respuesta JSON de Hotelbeds Booking API (/bookings) al shape esperado por
 * buildHotelbedsVoucherHtml / voucherToStripeMetadata.
 *
 * La API puede anidar datos bajo `booking` o devolver el objeto reserva en la raíz;
 * habitaciones suelen ir en `hotel.rooms` con `paxes` y `rates[].rateComments`.
 */

function str(v) {
  if (v == null) return '';
  if (typeof v === 'object' && v.content != null) return String(v.content).trim();
  return String(v).trim();
}

function hotelNameFromHotel(hotel) {
  if (!hotel || typeof hotel !== 'object') return '';
  return str(hotel.name) || str(hotel.hotelName) || str(hotel.description);
}

function hotelAddressFromHotel(hotel) {
  if (!hotel || typeof hotel !== 'object') return '';
  const a = hotel.address;
  if (typeof a === 'string' && a.trim()) return a.trim();
  if (a && typeof a === 'object') {
    if (a.content) return str(a.content);
    const line = [a.line1, a.line2, a.street, a.zipCode, a.city, a.country]
      .map((x) => str(x))
      .filter(Boolean)
      .join(', ');
    if (line) return line;
  }
  const direct = str(hotel.addressLine) || str(hotel.fullAddress);
  if (direct) return direct;

  const zone = str(hotel.zoneName);
  const dest = str(hotel.destinationName);
  const destCode = str(hotel.destinationCode).toUpperCase();
  const parts = [zone, dest].filter(Boolean);
  if (parts.length) return [...new Set(parts)].join(', ');
  if (destCode === 'BRG') return 'Burgos, España';
  if (destCode) return destCode;
  return 'España';
}

/** @returns {string} Motivo si no se puede mapear (vacío = mapeable). */
export function voucherMapFailureReason(raw) {
  const b = extractBookingRoot(raw);
  if (!b) return 'Respuesta sin objeto booking';
  if (!str(b.reference || b.bookingReference)) return 'Sin referencia de reserva (reference)';
  const hotel = b.hotel && typeof b.hotel === 'object' ? b.hotel : {};
  if (!hotelNameFromHotel(hotel)) return 'Sin nombre de hotel en la respuesta';
  return '';
}

function extractBookingRoot(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.booking && typeof raw.booking === 'object') return raw.booking;
  if (Array.isArray(raw.bookings) && raw.bookings.length && typeof raw.bookings[0] === 'object') {
    return raw.bookings[0];
  }
  if (raw.reference || raw.bookingReference || raw.hotel) return raw;
  return null;
}

function joinName(parts) {
  return parts.map((p) => str(p)).filter(Boolean).join(' ').trim();
}

function collectRateComments(rooms) {
  const out = [];
  if (!Array.isArray(rooms)) return out;
  for (const room of rooms) {
    const rates = room.rates || room.rate || [];
    const rateList = Array.isArray(rates) ? rates : [rates];
    for (const rate of rateList) {
      if (!rate || typeof rate !== 'object') continue;
      const rc = rate.rateComments ?? rate.rateComment;
      if (Array.isArray(rc)) {
        for (const c of rc) {
          if (typeof c === 'string') out.push(c);
          else if (c && typeof c === 'object' && c.text) out.push(str(c.text));
        }
      } else if (typeof rc === 'string') {
        out.push(rc);
      }
    }
    if (room.rateComments && typeof room.rateComments === 'string') {
      out.push(room.rateComments);
    }
  }
  return [...new Set(out.map((s) => str(s)).filter(Boolean))];
}

function collectPaxFromRooms(rooms, leadNameNorm) {
  const additionalPaxNames = [];
  const childrenAges = [];
  if (!Array.isArray(rooms)) return { additionalPaxNames, childrenAges };

  for (const room of rooms) {
    const paxes = room.paxes || room.pax || [];
    const list = Array.isArray(paxes) ? paxes : [paxes];
    for (const p of list) {
      if (!p || typeof p !== 'object') continue;
      const type = str(p.type || p.roomPaxType || p.paxType).toUpperCase();
      const full = joinName([p.name, p.surname]);
      const norm = full.toLowerCase();

      if (type === 'CH' || type === 'CHILD' || type === 'CHILDREN') {
        if (p.age != null && p.age !== '') childrenAges.push(str(p.age));
        else if (full) additionalPaxNames.push(`${full} (child)`);
        continue;
      }
      if (!full || norm === leadNameNorm) continue;
      additionalPaxNames.push(full);
    }
  }
  return { additionalPaxNames, childrenAges };
}

function collectPaxTopLevel(paxes, leadNameNorm) {
  const additionalPaxNames = [];
  const childrenAges = [];
  if (!Array.isArray(paxes)) return { additionalPaxNames, childrenAges };
  for (const p of paxes) {
    if (!p || typeof p !== 'object') continue;
    const type = str(p.type || p.roomPaxType).toUpperCase();
    const full = joinName([p.name, p.surname]);
    const norm = full.toLowerCase();
    if (type === 'CH' || type === 'CHILD' || type === 'CHILDREN') {
      if (p.age != null && p.age !== '') childrenAges.push(str(p.age));
      else if (full) additionalPaxNames.push(`${full} (child)`);
    } else if (full && norm !== leadNameNorm) {
      additionalPaxNames.push(full);
    }
  }
  return { additionalPaxNames, childrenAges };
}

function formatPolicyDate(from) {
  if (!from) return '';
  const d = new Date(from);
  if (Number.isNaN(d.getTime())) return String(from);
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function cancellationFromRate(rate) {
  if (!rate || typeof rate !== 'object') return '';
  const pol = rate.cancellationPolicies;
  if (typeof pol === 'string') return pol.trim();
  if (!Array.isArray(pol)) return '';
  return pol
    .map((p) => {
      if (!p) return '';
      if (typeof p === 'string') return p;
      if (p.text) return str(p.text);
      const from = formatPolicyDate(p.from || p.date || '');
      const amount = p.amount != null ? p.amount : p.clientAmount;
      const cur = p.currency || 'EUR';
      if (from && amount != null) return `Gastos de cancelación ${amount} ${cur} desde ${from}`;
      if (from) return `Cancelación desde ${from}`;
      if (amount != null) return `Gastos de cancelación ${amount} ${cur}`;
      return '';
    })
    .filter(Boolean)
    .join(' · ');
}

function cancellationSummaryFromBooking(b) {
  const mp = b.modificationPolicies;
  if (mp && typeof mp === 'object') {
    if (mp.cancellation) return str(mp.cancellation);
    if (mp.description) return str(mp.description);
  }
  const rooms = b.hotel?.rooms;
  if (!Array.isArray(rooms)) return '';
  const parts = [];
  for (const room of rooms) {
    const pol = room?.cancellationPolicies;
    if (typeof pol === 'string' && pol.trim()) {
      parts.push(pol.trim());
      continue;
    }
    if (Array.isArray(pol)) {
      const line = pol
        .map((x) => (x && typeof x === 'object' ? str(x.text || x.amount || x.from) : str(x)))
        .filter(Boolean)
        .join('; ');
      if (line) parts.push(line);
      continue;
    }
    const rates = room?.rates || room?.rate || [];
    const rateList = Array.isArray(rates) ? rates : [rates];
    for (const rate of rateList) {
      const fromRate = cancellationFromRate(rate);
      if (fromRate) parts.push(fromRate);
    }
  }
  return [...new Set(parts.map((p) => str(p)).filter(Boolean))].join(' · ');
}

/** Impuestos/tasas excluidos del precio (no incluidos) con subtipo e importe. */
export function excludedTaxesFromRate(rate) {
  const out = [];
  if (!rate || typeof rate !== 'object') return out;
  const taxes = rate.taxes && (rate.taxes.taxes || rate.taxes);
  if (!Array.isArray(taxes)) return out;
  for (const tx of taxes) {
    if (!tx || typeof tx !== 'object') continue;
    if (tx.included === true) continue;
    const amt = tx.clientAmount != null ? tx.clientAmount : tx.amount;
    if (amt == null || amt === '' || Number(amt) === 0) continue;
    const subtype = str(tx.subType || tx.subtype);
    const type = str(tx.type);
    const desc = str(tx.description);
    const currency = str(tx.clientCurrency || tx.currency) || 'EUR';
    const label = subtype || desc || type || 'Cargo adicional';
    out.push({
      subtype: subtype || type || 'OTHER',
      type: type || '',
      description: desc || label,
      amount: String(amt),
      currency,
      label:
        subtype && type && subtype !== type
          ? `${subtype} (${type}) — ${amt} ${currency}`
          : subtype && desc && subtype !== desc
            ? `${subtype}: ${desc} — ${amt} ${currency}`
            : `${label} — ${amt} ${currency}`,
    });
  }
  return out;
}

function collectExcludedTaxesFromRooms(rooms) {
  const out = [];
  if (!Array.isArray(rooms)) return out;
  for (const room of rooms) {
    const rates = room?.rates || room?.rate || [];
    const rateList = Array.isArray(rates) ? rates : [rates];
    for (const rate of rateList) {
      out.push(...excludedTaxesFromRate(rate));
    }
  }
  const seen = new Set();
  return out.filter((t) => {
    const key = `${t.subtype}|${t.amount}|${t.currency}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractCheckrateHotel(checkrateData) {
  if (!checkrateData || typeof checkrateData !== 'object') return null;
  return checkrateData.hotel && typeof checkrateData.hotel === 'object'
    ? checkrateData.hotel
    : checkrateData;
}

/**
 * Completa el voucher con datos de CheckRate si Booking no los trae (certificación HB).
 * @param {object} voucher
 * @param {object} checkrateData - respuesta cruda de /checkrates
 */
export function enrichVoucherFromCheckrate(voucher, checkrateData) {
  if (!voucher || !checkrateData) return voucher;
  const hotel = extractCheckrateHotel(checkrateData);
  if (!hotel) return voucher;

  const rooms = Array.isArray(hotel.rooms) ? hotel.rooms : [];
  if (!voucher.cancellationSummary) {
    const cancel = cancellationSummaryFromBooking({ hotel: { rooms } });
    if (cancel) voucher.cancellationSummary = cancel;
  }
  const comments = collectRateComments(rooms);
  if (!voucher.rateComments && comments.length) {
    voucher.rateComments = comments.join('\n').trim();
  }
  const taxes = collectExcludedTaxesFromRooms(rooms);
  if (taxes.length && (!voucher.excludedTaxes || !voucher.excludedTaxes.length)) {
    voucher.excludedTaxes = taxes;
  }
  const firstRate = rooms[0]?.rates?.[0] || rooms[0]?.rate;
  const rate = Array.isArray(firstRate) ? firstRate[0] : firstRate;
  if (rate?.sellingRate != null && !voucher.sellingPrice) {
    voucher.sellingPrice = `${rate.sellingRate} ${str(rate.currency) || 'EUR'}`;
  }
  if (!voucher.hotelPhone) {
    voucher.hotelPhone = str(hotel.phone || hotel.contactPhone || hotel.telephone);
  }
  if (!voucher.hotelAddress || voucher.hotelAddress === 'Burgos, España' || voucher.hotelAddress === 'España') {
    const addr = hotelAddressFromHotel(hotel);
    if (addr && addr !== 'España') voucher.hotelAddress = addr;
  }
  return voucher;
}

/**
 * Completa teléfono/dirección desde Content API (cliente o servidor).
 * @param {object} voucher
 * @param {{phone?:string,fullAddress?:string}|null} contact
 */
export function enrichVoucherFromContent(voucher, contact) {
  if (!voucher || !contact) return voucher;
  if (!voucher.hotelPhone && contact.phone) voucher.hotelPhone = str(contact.phone);
  const weakAddr =
    !voucher.hotelAddress ||
    voucher.hotelAddress === 'Burgos, España' ||
    voucher.hotelAddress === 'España' ||
    voucher.hotelAddress.length < 12;
  if (weakAddr && contact.fullAddress) voucher.hotelAddress = str(contact.fullAddress);
  return voucher;
}

function extractHotelCodeFromBookingRaw(raw) {
  const b = extractBookingRoot(raw);
  const hotel = b?.hotel;
  if (!hotel || typeof hotel !== 'object') return null;
  const code = hotel.code != null ? hotel.code : hotel.hotelCode;
  return code != null ? String(code).trim() : null;
}

export { extractHotelCodeFromBookingRaw };

/**
 * @param {object} raw - Cuerpo JSON de respuesta Booking (p. ej. { booking: { ... } })
 * @returns {object|null} Objeto compatible con buildHotelbedsVoucherHtml o null si falta referencia/hotel mínimo
 */
export function mapHotelbedsBookingToVoucherData(raw) {
  const b = extractBookingRoot(raw);
  if (!b || typeof b !== 'object') return null;

  const bookingReference = str(b.reference || b.bookingReference);
  if (!bookingReference) return null;

  const hotel = b.hotel && typeof b.hotel === 'object' ? b.hotel : {};
  const hotelName = hotelNameFromHotel(hotel);
  if (!hotelName) return null;

  const hotelAddress = hotelAddressFromHotel(hotel);

  const rooms = Array.isArray(hotel.rooms) ? hotel.rooms : [];
  const firstRoom = rooms[0] || {};

  const checkIn = str(firstRoom.checkIn || b.checkIn || hotel.checkIn).slice(0, 10);
  const checkOut = str(firstRoom.checkOut || b.checkOut || hotel.checkOut).slice(0, 10);

  const roomType =
    str(firstRoom.roomType || firstRoom.name || firstRoom.roomDescription || firstRoom.code) || '—';
  const boardType =
    str(firstRoom.boardName || firstRoom.boardDescription || firstRoom.boardCode) ||
    str(firstRoom.rates?.[0]?.boardName || firstRoom.rate?.boardName) ||
    '—';

  const holder = b.holder && typeof b.holder === 'object' ? b.holder : {};
  const leadPaxName = joinName([holder.name, holder.surname]) || '—';
  const leadNorm = leadPaxName.toLowerCase();

  let additionalPaxNames = [];
  let childrenAges = [];

  const fromRooms = collectPaxFromRooms(rooms, leadNorm);
  additionalPaxNames.push(...fromRooms.additionalPaxNames);
  childrenAges.push(...fromRooms.childrenAges);

  if (b.paxes || b.pax) {
    const top = collectPaxTopLevel(b.paxes || b.pax, leadNorm);
    additionalPaxNames.push(...top.additionalPaxNames);
    childrenAges.push(...top.childrenAges);
  }

  additionalPaxNames = [...new Set(additionalPaxNames.map(str).filter(Boolean))];
  childrenAges = [...new Set(childrenAges.map(str).filter(Boolean))];

  const rateParts = collectRateComments(rooms);
  const rateComments = rateParts.join('\n').trim();

  const supplier = b.supplier && typeof b.supplier === 'object' ? b.supplier : {};
  const supplierName = str(supplier.name || supplier.company);
  const supplierVat = str(supplier.vatNumber || supplier.vat || supplier.taxNumber);

  const inv = b.invoiceCompany && typeof b.invoiceCompany === 'object' ? b.invoiceCompany : {};
  const operatingCompanyName =
    str(inv.name || inv.company || inv.companyName) ||
    process.env.HOTELBEDS_OPERATING_COMPANY ||
    'ADRINOS SL';

  const cancel = cancellationSummaryFromBooking(b);
  const excludedTaxes = collectExcludedTaxesFromRooms(rooms);
  const firstRate = firstRoom.rates?.[0] || firstRoom.rate;
  const rateObj = Array.isArray(firstRate) ? firstRate[0] : firstRate;
  const sellingPrice =
    rateObj?.sellingRate != null
      ? `${rateObj.sellingRate} ${str(rateObj.currency) || 'EUR'}`
      : '';

  return {
    bookingReference,
    agencyReference: str(b.clientReference),
    hotelName,
    hotelCategory: str(hotel.categoryName || hotel.categoryCode),
    hotelAddress,
    hotelDestination: str(hotel.destinationName),
    hotelPhone: str(hotel.phone || hotel.contactPhone || hotel.telephone),
    checkIn,
    checkOut,
    roomType,
    boardType,
    leadPaxName,
    additionalPaxNames,
    childrenAges,
    rateComments,
    cancellationSummary: cancel,
    excludedTaxes,
    sellingPrice,
    supplierName,
    supplierVat,
    operatingCompanyName,
    packageName: '',
  };
}
