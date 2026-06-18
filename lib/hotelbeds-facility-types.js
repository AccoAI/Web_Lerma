/**
 * Catálogo global de instalaciones Hotelbeds (Content API /types/facilities).
 * Los hoteles a veces devuelven facility sin texto; aquí resolvemos código(+grupo) → descripción.
 */
import { createHash } from 'crypto';
import { hotelbedsFetch } from './hotelbeds-mtls.js';

function getSignature(apiKey, secret) {
  const ts = Math.floor(Date.now() / 1000);
  const str = apiKey + secret + ts;
  return createHash('sha256').update(str, 'utf8').digest('hex');
}

function strDesc(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'object' && v.content != null) return String(v.content).trim();
  return '';
}

let cachedMap = null;
let cachedKey = '';

/**
 * @returns {Promise<Map<string, string>>} claves "group:code", "code" (solo si único / primera aparición)
 */
export async function loadFacilityTypeDescriptionMap(apiKey, secret, baseUrl, language) {
  const lang = language || 'CAS';
  const cacheKey = `${baseUrl}|${lang}`;
  if (cachedMap && cachedKey === cacheKey) return cachedMap;

  const map = new Map();
  let from = 1;
  const pageSize = 1000;
  let pages = 0;
  const maxPages = 50;

  while (pages < maxPages) {
    const to = from + pageSize - 1;
    const params = new URLSearchParams({
      fields: 'all',
      language: lang,
      from: String(from),
      to: String(to),
      useSecondaryLanguage: 'false',
    });
    const res = await hotelbedsFetch(`${baseUrl}/hotel-content-api/1.0/types/facilities?${params}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Api-key': apiKey,
        'X-Signature': getSignature(apiKey, secret),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || `types/facilities HTTP ${res.status}`);
    }
    const facilities = Array.isArray(data.facilities) ? data.facilities : [];
    if (facilities.length === 0) break;

    for (const row of facilities) {
      const code = row.code != null ? row.code : row.facilityCode;
      const g = row.facilityGroupCode;
      const desc = strDesc(row.description);
      if (desc === '' || code == null) continue;
      const cs = String(code);
      if (g != null && g !== '') {
        map.set(`${g}:${cs}`, desc);
      }
      if (!map.has(cs)) {
        map.set(cs, desc);
      }
    }

    pages += 1;
    if (facilities.length < pageSize) break;
    from += pageSize;
  }

  cachedMap = map;
  cachedKey = cacheKey;
  return map;
}

/** Para tests o reinicio manual del proceso */
export function clearFacilityTypeCache() {
  cachedMap = null;
  cachedKey = '';
}
