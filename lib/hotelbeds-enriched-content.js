/**
 * Mapea un hotel del Hotel Content API (fields=all) a un objeto ligero para la UI.
 * https://developer.hotelbeds.com/documentation/hotels/content-api/
 */

function str(v) {
  if (v == null) return '';
  return typeof v === 'string' ? v.trim() : (v && v.content ? String(v.content).trim() : '');
}

/** Hotelbeds suele usar códigos como 4EST / 5EST (estrellas). */
export function parseStarsFromHotelCategoryCode(categoryCode) {
  if (categoryCode == null || categoryCode === '') return null;
  const s = String(categoryCode).trim().toUpperCase();
  const m = s.match(/^([1-5])\s*EST$/);
  return m ? parseInt(m[1], 10) : null;
}

function lookupFacilityCatalog(map, f) {
  if (!map || typeof map.get !== 'function') return '';
  const c = f.facilityCode != null ? String(f.facilityCode) : f.code != null ? String(f.code) : '';
  const g = f.facilityGroupCode != null ? String(f.facilityGroupCode) : '';
  if (!c) return '';
  if (g && map.get(`${g}:${c}`)) return map.get(`${g}:${c}`);
  const byCode = map.get(c);
  return typeof byCode === 'string' ? byCode : '';
}

function facilityLabel(f, facilityMap) {
  if (!f || typeof f !== 'object') return '';
  const direct =
    str(f.description) ||
    str(f.facilityDescription) ||
    str(f.facilityName) ||
    str(f.name);
  if (direct) return direct;
  const fromCatalog = lookupFacilityCatalog(facilityMap, f);
  if (fromCatalog) return fromCatalog;
  const code = f.facilityCode != null ? f.facilityCode : f.code;
  return code != null ? 'Código ' + code : '';
}

/** Hotelbeds marca instalaciones de pago de varias formas según versión. */
function facilityHasFee(f) {
  if (!f || typeof f !== 'object') return false;
  if (f.indFee === true || f.indFee === 1 || f.indFee === '1') return true;
  if (f.fee === true || (typeof f.fee === 'number' && f.fee > 0)) return true;
  if (f.amount != null && Number(f.amount) > 0) return true;
  if (f.charge && String(f.charge).toLowerCase() === 'true') return true;
  return false;
}

function collectFacilities(facilityList, facilityMap) {
  const all = [];
  const paid = [];
  if (!Array.isArray(facilityList)) return { all, paid };
  for (const f of facilityList) {
    const label = facilityLabel(f, facilityMap);
    if (!label) continue;
    all.push({ label, paid: facilityHasFee(f) });
    if (facilityHasFee(f)) paid.push(label);
  }
  return { all, paid };
}

/**
 * @param {string} path - path de la API (p. ej. /xx/..../foto.jpg) o URL absoluta
 * @param {'bigger'|'small'|'medium'|'xl'} size
 */
export function giataPhotoUrl(path, size = 'bigger') {
  if (!path || typeof path !== 'string') return '';
  const t = path.trim();
  if (/^https?:\/\//i.test(t)) return t;
  const p = t.startsWith('/') ? t : `/${t}`;
  return `https://photos.hotelbeds.com/giata/${size}${p}`;
}

/**
 * @param {object} h - hotel crudo del Content API
 * @returns {object} registro enriquecido (siempre con code)
 */
export function mapContentHotelForUi(h, facilityMap) {
  if (!h || typeof h !== 'object') return { code: null };
  const getStr = (v) => (typeof v === 'string' ? v : (v && v.content) ? String(v.content) : '') || '';
  const code = h.code != null ? String(h.code) : null;
  const name = getStr(h.name) || getStr(h.description) || (code ? `Hotel ${code}` : '');
  const city = getStr(h.city) || getStr(h.destinationName) || '';

  const cat = h.category && typeof h.category === 'object' ? h.category : {};
  const categoryNameRaw =
    getStr(cat.description) || getStr(cat.name) || getStr(h.accommodationType) || '';
  const categoryCode = cat.code != null ? String(cat.code) : h.categoryCode != null ? String(h.categoryCode) : '';
  const categoryStars = parseStarsFromHotelCategoryCode(categoryCode);
  let starsLabel = categoryNameRaw;
  if (!starsLabel && categoryStars != null) {
    starsLabel = `${categoryStars} estrellas`;
  } else if (!starsLabel && categoryCode) {
    starsLabel = `Categoría ${categoryCode}`;
  }

  const descLong = getStr(h.description) || getStr(h.name) || '';
  const descriptionShort = descLong.length > 140 ? descLong.slice(0, 137) + '…' : descLong;

  const imgs = Array.isArray(h.images) ? h.images : [];
  const first = imgs[0] || null;
  const path = first && (first.path || first.pathName);
  const imageUrl = path ? giataPhotoUrl(String(path), 'bigger') : '';

  const hotelF = collectFacilities(h.facilities, facilityMap);
  const roomF = { all: [], paid: [] };
  if (Array.isArray(h.rooms)) {
    for (const room of h.rooms) {
      const rf = collectFacilities(room.roomFacilities || room.facilities, facilityMap);
      roomF.all.push(...rf.all);
      roomF.paid.push(...rf.paid);
    }
  }

  const hotelFacilitiesLabels = hotelF.all.map((x) => x.label);
  const roomFacilitiesLabels = roomF.all.map((x) => x.label);
  const paidFacilities = [...new Set([...hotelF.paid, ...roomF.paid])];

  return {
    code,
    name,
    city,
    categoryCode,
    categoryStars: categoryStars != null ? categoryStars : undefined,
    categoryName: starsLabel,
    imageUrl,
    descriptionShort,
    hotelFacilities: hotelFacilitiesLabels,
    roomFacilities: roomFacilitiesLabels,
    /** Solo instalaciones con coste adicional (obligatorio mostrar en certificación). */
    facilitiesWithCharge: paidFacilities,
  };
}
