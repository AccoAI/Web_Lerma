/**
 * URL pública del sitio (confirmación post-pago, enlaces en email).
 * Nunca redirige a URLs de preview de Vercel (victors-projects-…).
 */

const DEFAULT_PRODUCTION_URL = 'https://web-lerma.vercel.app';

function parseBaseUrl(raw) {
  const s = (raw || '').trim().replace(/\/$/, '');
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

/** Preview / branch deploy de Vercel (no usar para clientes). */
export function isVercelPreviewHost(hostname) {
  if (!hostname) return false;
  const h = String(hostname).toLowerCase();
  if (h === 'web-lerma.vercel.app') return false;
  if (!h.endsWith('.vercel.app')) return false;
  return (
    h.includes('victors-projects') ||
    /-[a-z0-9]{10,}-[a-z0-9-]+\.vercel\.app$/i.test(h) ||
    process.env.VERCEL_ENV === 'preview'
  );
}

/**
 * PUBLIC_SITE_URL con subdominio test.* suele apuntar a un dominio sin DNS aún.
 * Mientras no exista, usamos el fallback (web-lerma.vercel.app).
 * Cuando test.golflermaysaldana.com esté en DNS, pon ALLOW_TEST_PUBLIC_SITE=1 en Vercel.
 */
function resolvePublicSiteFromEnv() {
  const publicSite = parseBaseUrl(process.env.PUBLIC_SITE_URL);
  if (!publicSite) return '';
  try {
    const host = new URL(publicSite).hostname.toLowerCase();
    if (host.startsWith('test.') && process.env.ALLOW_TEST_PUBLIC_SITE !== '1') {
      console.warn(
        `[site-base-url] PUBLIC_SITE_URL ignorada (${host}): sin DNS o en prueba. ` +
          'Usa https://web-lerma.vercel.app o define ALLOW_TEST_PUBLIC_SITE=1 cuando el dominio resuelva.'
      );
      return '';
    }
  } catch {
    return '';
  }
  return publicSite;
}

export function resolvePublicBaseUrl(request) {
  const publicSite = resolvePublicSiteFromEnv();
  if (publicSite) return publicSite;

  const productionDefault =
    parseBaseUrl(process.env.SITE_PRODUCTION_URL) || DEFAULT_PRODUCTION_URL;

  if (process.env.VERCEL_ENV === 'production') {
    const prod =
      parseBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
      parseBaseUrl(process.env.VERCEL_URL);
    if (prod) {
      try {
        if (!isVercelPreviewHost(new URL(prod).hostname)) return prod;
      } catch {
        return prod;
      }
    }
  }

  if (request) {
    const origin = request.headers.get('origin');
    if (origin) {
      try {
        const u = new URL(origin);
        if (!isVercelPreviewHost(u.hostname)) return u.origin;
      } catch {
        /* ignore */
      }
    }
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        const u = new URL(referer);
        if (!isVercelPreviewHost(u.hostname)) return u.origin;
      } catch {
        /* ignore */
      }
    }
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (host) {
      const hostname = host.split(',')[0].trim().split(':')[0];
      if (!isVercelPreviewHost(hostname)) {
        const proto = (request.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim();
        return `${proto}://${hostname}`;
      }
    }
  }

  return productionDefault;
}

export function confirmacionReservaUrl(request, sessionId) {
  const base = resolvePublicBaseUrl(request);
  if (!base || !sessionId) return '';
  return `${base}/confirmacion-reserva.html?session_id=${encodeURIComponent(sessionId)}`;
}
