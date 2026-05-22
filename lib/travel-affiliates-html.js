/**
 * Bloque HTML/texto de logística post-reserva (email webhook).
 * URLs: AFFILIATE_RENTALCARS_URL y AFFILIATE_SKYSCANNER_URL en Vercel (mismas que js/travel-affiliates.js).
 */

function escapeAttr(url) {
  return String(url).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function getTravelAffiliateUrls() {
  const pick = (key) => {
    const v = process.env[key];
    return typeof v === 'string' ? v.trim() : '';
  };
  return {
    rentalcars: pick('AFFILIATE_RENTALCARS_URL'),
    skyscanner: pick('AFFILIATE_SKYSCANNER_URL'),
  };
}

export function buildTravelLogisticsHtml() {
  const { rentalcars, skyscanner } = getTravelAffiliateUrls();
  if (!rentalcars && !skyscanner) return '';

  let links = '';
  if (skyscanner) {
    links += `<li style="margin:0.5em 0;"><a href="${escapeAttr(skyscanner)}" style="color:#2c5530;font-weight:600;">✈️ Buscar vuelos a Madrid</a></li>`;
  }
  if (rentalcars) {
    links += `<li style="margin:0.5em 0;"><a href="${escapeAttr(rentalcars)}" style="color:#2c5530;font-weight:600;">🚙 Alquilar coche en Rentcars (SUV / furgoneta recomendada)</a></li>`;
  }

  return (
    `<div style="margin-top:24px;padding:16px;background:#f4f8f4;border-radius:8px;border:1px solid #d0e0d0;">` +
    `<h3 style="margin:0 0 8px;color:#2c5530;font-size:1.05rem;">Organiza tu viaje</h3>` +
    `<p style="margin:0 0 12px;line-height:1.5;">Para moverte con comodidad entre Madrid, Lerma y Saldaña, te sugerimos reservar vuelo y coche por tu cuenta. ` +
    `Si viajas con palos de golf, un <strong>SUV o furgoneta (clase V)</strong> suele ser lo más práctico en el maletero.</p>` +
    `<ul style="margin:0;padding-left:1.2em;">${links}</ul>` +
    `</div>`
  );
}

export function buildTravelLogisticsPlainText() {
  const { rentalcars, skyscanner } = getTravelAffiliateUrls();
  if (!rentalcars && !skyscanner) return '';

  const lines = [
    '',
    '--- Organiza tu viaje ---',
    'Para Madrid, Lerma y Saldaña: reserva vuelo y coche por tu cuenta.',
    'Con palos de golf, recomendamos SUV o furgoneta (clase V).',
  ];
  if (skyscanner) lines.push('Vuelos a Madrid: ' + skyscanner);
  if (rentalcars) lines.push('Alquiler de coche: ' + rentalcars);
  return lines.join('\n');
}
