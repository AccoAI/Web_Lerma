/**
 * URL de búsqueda Rentcars con fechas (mismo patrón que rentalcars.com/search-results).
 * @param {{ pickup: string, dropoff: string, requestorid?: string, locationName?: string }} opts — fechas YYYY-MM-DD
 */
export function buildRentcarsSearchUrl(opts) {
  const pickup = (opts && opts.pickup) || '';
  const dropoff = (opts && opts.dropoff) || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickup) || !/^\d{4}-\d{2}-\d{2}$/.test(dropoff)) {
    return null;
  }

  const pu = parseIsoDate(pickup);
  const drop = parseIsoDate(dropoff);
  if (!pu || !drop) return null;

  const loc = (opts.locationName || 'Madrid, España').trim();
  const requestorid = (opts.requestorid || '10695').trim();

  const params = new URLSearchParams({
    requestorid,
    utm_source: 'web-lerma.vercel.app',
    utm_medium: 'afiliado-embed',
    location: 'City',
    dropLocation: 'City',
    driversAge: '30',
    puDay: String(pu.day),
    puMonth: String(pu.month),
    puYear: String(pu.year),
    doDay: String(drop.day),
    doMonth: String(drop.month),
    doYear: String(drop.year),
    puHour: '10',
    puMinute: '0',
    doHour: '10',
    doMinute: '0',
    ftsType: 'C',
    ftsLocationName: loc,
    ftsDropLocationName: loc,
  });

  return `https://www.rentcars.com/es/search-results?${params.toString()}`;
}

function parseIsoDate(iso) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return {
    year: parseInt(m[1], 10),
    month: parseInt(m[2], 10),
    day: parseInt(m[3], 10),
  };
}
