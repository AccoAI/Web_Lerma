/**
 * Credenciales Hotelbeds para Transfer API (proxy + status).
 * Orden: claves dedicadas transfers → claves compartidas con Hotel API.
 *
 * Vercel / local: HOTELBEDS_TRANSFER_API_KEY + HOTELBEDS_TRANSFER_API_SECRET
 * o API_Key / HOTELBEDS_API_KEY + API_Secret / HOTELBEDS_API_SECRET
 */
export function getHotelbedsCredentialsTransfers() {
  const rawK =
    process.env.HOTELBEDS_TRANSFER_API_KEY ||
    process.env.API_Key ||
    process.env.HOTELBEDS_API_KEY;
  const rawS =
    process.env.HOTELBEDS_TRANSFER_API_SECRET ||
    process.env.API_Secret ||
    process.env.HOTELBEDS_API_SECRET;
  const apiKey = typeof rawK === 'string' ? rawK.trim() : rawK;
  const secret = typeof rawS === 'string' ? rawS.trim() : rawS;
  return { apiKey, secret };
}
