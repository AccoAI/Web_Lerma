/**
 * URL pública del sitio (confirmación post-pago, enlaces en email).
 * Prioridad: PUBLIC_SITE_URL → VERCEL_URL → cabeceras del request.
 */
export function resolvePublicBaseUrl(request) {
  const fromEnv = (process.env.PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');
  if (fromEnv) {
    return /^https?:\/\//i.test(fromEnv) ? fromEnv : `https://${fromEnv}`;
  }

  const vercel = (process.env.VERCEL_URL || '').trim().replace(/\/$/, '');
  if (vercel) {
    return `https://${vercel}`;
  }

  if (request) {
    const origin = request.headers.get('origin');
    if (origin && /^https?:\/\//i.test(origin)) {
      return origin.replace(/\/$/, '');
    }
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        const u = new URL(referer);
        return `${u.protocol}//${u.host}`;
      } catch {
        /* ignore */
      }
    }
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (host) {
      const proto = (request.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim();
      return `${proto}://${host}`.replace(/\/$/, '');
    }
  }

  return '';
}

export function confirmacionReservaUrl(request, sessionId) {
  const base = resolvePublicBaseUrl(request);
  if (!base || !sessionId) return '';
  return `${base}/confirmacion-reserva.html?session_id=${encodeURIComponent(sessionId)}`;
}
