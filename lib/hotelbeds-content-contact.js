/**
 * Contacto hotel (teléfono, dirección) desde Content API — fallback para voucher.
 */
import { createHash } from 'crypto';
import { hotelbedsContentBaseUrl, hotelbedsFetch } from './hotelbeds-mtls.js';

function getSignature(apiKey, secret) {
  const ts = Math.floor(Date.now() / 1000);
  const str = apiKey + secret + ts;
  return createHash('sha256').update(str, 'utf8').digest('hex');
}

function str(v) {
  if (v == null) return '';
  if (typeof v === 'object' && v.content != null) return String(v.content).trim();
  return String(v).trim();
}

export function contactFromContentHotel(h) {
  if (!h || typeof h !== 'object') return { phone: '', fullAddress: '' };
  const phones = Array.isArray(h.phones) ? h.phones : h.phone ? [h.phone] : [];
  let phone = '';
  for (const p of phones) {
    if (typeof p === 'string' && p.trim()) {
      phone = p.trim();
      break;
    }
    if (p && typeof p === 'object') {
      const n = str(p.phoneNumber || p.number || p.phone);
      if (n) {
        phone = n;
        break;
      }
    }
  }
  if (!phone) phone = str(h.phone || h.contactPhone || h.telephone);

  const a = h.address;
  if (typeof a === 'string' && a.trim()) return { phone, fullAddress: a.trim() };
  let fullAddress = '';
  if (a && typeof a === 'object') {
    if (a.content) fullAddress = str(a.content);
    else {
      fullAddress = [a.street, a.number, a.line1, a.line2, a.zipCode, a.city, a.state, a.country]
        .map((x) => str(x))
        .filter(Boolean)
        .join(', ');
    }
  }
  if (!fullAddress) fullAddress = str(h.addressLine) || str(h.fullAddress);
  return { phone, fullAddress };
}

/**
 * @returns {Promise<{phone:string,fullAddress:string}|null>}
 */
export async function fetchHotelContentContact(apiKey, secret, hotelCode, lang = 'CAS') {
  const code = String(hotelCode || '').trim();
  if (!code) return null;
  const baseUrl = hotelbedsContentBaseUrl();
  const params = new URLSearchParams({
    codes: code,
    fields: 'all',
    language: lang,
    from: '1',
    to: '1',
  });
  const res = await hotelbedsFetch(`${baseUrl}/hotel-content-api/1.0/hotels?${params}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Api-key': apiKey,
      'X-Signature': getSignature(apiKey, secret),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  const hotels = Array.isArray(data.hotels) ? data.hotels : [];
  const h = hotels.find((x) => String(x.code) === code) || hotels[0];
  if (!h) return null;
  return contactFromContentHotel(h);
}
