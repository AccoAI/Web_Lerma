/**
 * Mapea la respuesta JSON de Hotelbeds Booking API (/bookings) al shape esperado por
 * buildHotelbedsVoucherHtml / voucherToStripeMetadata.
 *
 * La API puede anidar datos bajo `booking` o devolver el objeto reserva en la raíz;
 * habitaciones suelen ir en `hotel.rooms` con `paxes` y `rates[].rateComments`.
 */

function str(v) {
  if (v == null) return '';
  return String(v).trim();
}

function joinName(parts) {
  return parts.map((p) => str(p)).filter(Boolean).join(' ').trim();
}

function hotelAddressFromHotel(hotel) {
  if (!hotel || typeof hotel !== 'object') return '';
  const a = hotel.address;
  if (typeof a === 'string') return a.trim();
  if (a && typeof a === 'object') {
    if (a.content) return str(a.content);
    const line = [a.line1, a.line2, a.zipCode, a.city, a.country].filter(Boolean).join(', ');
    if (line) return line;
  }
  return str(hotel.addressLine) || str(hotel.fullAddress);
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

function cancellationSummaryFromBooking(b) {
  const mp = b.modificationPolicies;
  if (mp && typeof mp === 'object') {
    if (mp.cancellation) return str(mp.cancellation);
    if (mp.description) return str(mp.description);
  }
  const rooms = b.hotel?.rooms;
  if (Array.isArray(rooms) && rooms[0]?.cancellationPolicies) {
    const pol = rooms[0].cancellationPolicies;
    if (typeof pol === 'string') return pol;
    if (Array.isArray(pol)) {
      return pol
        .map((x) => (x && typeof x === 'object' ? str(x.text || x.amount || x.from) : str(x)))
        .filter(Boolean)
        .join('; ');
    }
  }
  return '';
}

/**
 * @param {object} raw - Cuerpo JSON de respuesta Booking (p. ej. { booking: { ... } })
 * @returns {object|null} Objeto compatible con buildHotelbedsVoucherHtml o null si falta referencia/hotel mínimo
 */
export function mapHotelbedsBookingToVoucherData(raw) {
  const b = raw?.booking && typeof raw.booking === 'object' ? raw.booking : raw;
  if (!b || typeof b !== 'object') return null;

  const bookingReference = str(b.reference || b.bookingReference);
  if (!bookingReference) return null;

  const hotel = b.hotel && typeof b.hotel === 'object' ? b.hotel : {};
  const hotelName = str(hotel.name);
  const hotelAddress = hotelAddressFromHotel(hotel);
  if (!hotelName || !hotelAddress) return null;

  const rooms = Array.isArray(hotel.rooms) ? hotel.rooms : [];
  const firstRoom = rooms[0] || {};

  const checkIn = str(firstRoom.checkIn || b.checkIn || hotel.checkIn);
  const checkOut = str(firstRoom.checkOut || b.checkOut || hotel.checkOut);

  const roomType = str(firstRoom.roomType || firstRoom.name || firstRoom.roomDescription) || '—';
  const boardType =
    str(firstRoom.boardName || firstRoom.boardDescription || firstRoom.boardCode) || '—';

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
    supplierName,
    supplierVat,
    operatingCompanyName,
    packageName: '',
  };
}
