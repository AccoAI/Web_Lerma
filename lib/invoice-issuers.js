/**
 * Emisores de factura del paquete (un cobro Stripe → varias facturas).
 * Cobra siempre: Club de Golf Lerma SA (explotadora / Stripe).
 */
export const INVOICE_ISSUERS = {
  golf: {
    id: 'golf',
    legalName: 'CLUB DE GOLF LERMA SA',
    nif: 'A-09115668',
    ivaPct: 0,
    series: 'CGL',
    conceptDefault: 'Green fees y servicios del club',
    address: 'Autovía Madrid-Burgos, km. 195,5 · Lerma · Burgos',
    phone: '(+34) 947 56 46 30',
  },
  comida: {
    id: 'comida',
    legalName: 'LALIATM SL',
    nif: 'B-40280422',
    ivaPct: 21,
    series: 'LAL',
    conceptDefault: 'Restauración / menús Casa Club',
    address: 'Lerma · Burgos',
    phone: '',
  },
  hotel: {
    id: 'hotel',
    legalName: 'Hotelbeds Spain SLU',
    nif: 'B-28916765',
    ivaPct: 10,
    series: 'HBS',
    conceptDefault: 'Alojamiento',
    address: '',
    phone: '',
  },
};

/** Precios de venta al público = IVA incluido. Devuelve base + cuota IVA. */
export function splitGrossByVat(grossEuros, ivaPct) {
  const gross = Math.round(Number(grossEuros) * 100) / 100;
  if (!gross || gross <= 0) return { gross: 0, base: 0, iva: 0 };
  if (!ivaPct || ivaPct <= 0) return { gross, base: gross, iva: 0 };
  const base = Math.round((gross / (1 + ivaPct / 100)) * 100) / 100;
  const iva = Math.round((gross - base) * 100) / 100;
  return { gross, base, iva };
}

/**
 * Reparte el descuento de pack de forma proporcional entre buckets
 * y ajusta céntimos para que la suma = totalCents.
 */
export function allocateDiscountedBuckets(buckets, totalAfterDiscountEuros) {
  const entries = Object.entries(buckets || {}).map(([k, v]) => [k, Math.max(0, Number(v) || 0)]);
  const sumBefore = entries.reduce((s, [, v]) => s + v, 0);
  const target = Math.round(Number(totalAfterDiscountEuros) * 100) / 100;
  if (sumBefore <= 0 || target <= 0) {
    const zero = {};
    entries.forEach(([k]) => {
      zero[k] = 0;
    });
    return zero;
  }
  const out = {};
  let allocated = 0;
  const keys = entries.map(([k]) => k);
  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      out[k] = Math.round((target - allocated) * 100) / 100;
    } else {
      const share = Math.round(((entries[i][1] / sumBefore) * target) * 100) / 100;
      out[k] = share;
      allocated += share;
    }
  });
  return out;
}

export function eurosToCents(euros) {
  return Math.max(0, Math.round(Number(euros) * 100) || 0);
}

export function centsToEuros(cents) {
  return Math.round(Number(cents) || 0) / 100;
}
