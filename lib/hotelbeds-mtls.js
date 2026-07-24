import https from 'node:https';
import zlib from 'node:zlib';
import { promisify } from 'node:util';

const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);
const brotliDecompress = promisify(zlib.brotliDecompress);

/** Lee certificado y clave mTLS desde variables de entorno (PEM con \\n literales). */
export function getMtlsCreds() {
  const raw = (v) => (process.env[v] || '').replace(/\\n/g, '\n').trim();
  const cert = raw('HOTELBEDS_MTLS_CERT');
  const key = raw('HOTELBEDS_MTLS_KEY');
  return cert && key ? { cert, key } : null;
}

function isProdEnv() {
  return process.env.HOTELBEDS_ENV === 'production';
}

/**
 * Host Hotel API (availability / checkrate / booking).
 * Con cert mTLS → api-mtls…; si no → api…
 */
export function hotelbedsBaseUrl() {
  const creds = getMtlsCreds();
  if (creds) {
    return isProdEnv() ? 'https://api-mtls.hotelbeds.com' : 'https://api-mtls.test.hotelbeds.com';
  }
  return isProdEnv() ? 'https://api.hotelbeds.com' : 'https://api.test.hotelbeds.com';
}

/**
 * Host Content API (fotos, facilities, contacto).
 * El host mTLS suele devolver 404 en /hotel-content-api — usar siempre el host estándar.
 */
export function hotelbedsContentBaseUrl() {
  return isProdEnv() ? 'https://api.hotelbeds.com' : 'https://api.test.hotelbeds.com';
}

function isContentApiUrl(url) {
  return /hotel-content-api/i.test(String(url || ''));
}

/** Si alguien pasó base mTLS + path content, reescribe al host estándar. */
export function resolveHotelbedsRequestUrl(url) {
  const s = String(url || '');
  if (!isContentApiUrl(s)) return s;
  try {
    const u = new URL(s);
    if (/api-mtls/i.test(u.hostname)) {
      u.hostname = isProdEnv() ? 'api.hotelbeds.com' : 'api.test.hotelbeds.com';
      return u.toString();
    }
  } catch {
    /* keep original */
  }
  return s;
}

async function decodeBodyBuffer(buf, encoding) {
  const enc = String(encoding || '')
    .toLowerCase()
    .trim();
  if (!enc || enc === 'identity') return buf;
  if (enc.includes('gzip') || enc.includes('x-gzip')) return gunzip(buf);
  if (enc.includes('deflate')) return inflate(buf);
  if (enc.includes('br')) return brotliDecompress(buf);
  return buf;
}

function makeFetchLikeResponse(status, text) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
    json: () => {
      try {
        return Promise.resolve(JSON.parse(text));
      } catch (err) {
        const preview = String(text || '')
          .slice(0, 80)
          .replace(/[^\x20-\x7E]/g, '?');
        return Promise.reject(
          new Error(
            (err && err.message ? err.message : 'JSON parse failed') +
              (preview ? ` (body: ${preview})` : '')
          )
        );
      }
    },
  };
}

function nodeFetchMtls(url, { method, headers, body, timeoutMs, cert, key }) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const agent = new https.Agent({ cert, key });
    const reqHeaders = { ...(headers || {}) };
    if (!reqHeaders['Accept-Encoding'] && !reqHeaders['accept-encoding']) {
      reqHeaders['Accept-Encoding'] = 'identity';
    }
    const req = https.request(
      {
        hostname: u.hostname,
        port: parseInt(u.port || '443', 10),
        path: u.pathname + u.search,
        method: method || 'GET',
        headers: reqHeaders,
        agent,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks);
          const status = res.statusCode || 0;
          const encoding = res.headers['content-encoding'];
          decodeBodyBuffer(raw, encoding)
            .then((decoded) => {
              resolve(makeFetchLikeResponse(status, decoded.toString('utf8')));
            })
            .catch(() => {
              resolve(makeFetchLikeResponse(status, raw.toString('utf8')));
            });
        });
      }
    );
    req.on('error', reject);
    if (timeoutMs) req.setTimeout(timeoutMs, () => req.destroy(new Error('mTLS timeout')));
    if (body) req.write(body);
    req.end();
  });
}

async function plainFetch(url, { method = 'GET', headers, body, timeoutMs } = {}) {
  const controller = new AbortController();
  const tid = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    const text = await res.text();
    return makeFetchLikeResponse(res.status, text);
  } finally {
    if (tid) clearTimeout(tid);
  }
}

/**
 * Fetch a Hotelbeds.
 * - Hotel API: mTLS si hay cert/key.
 * - Content API: host estándar + fetch normal (api-mtls…/hotel-content-api → 404).
 */
export async function hotelbedsFetch(url, { method = 'GET', headers, body, timeoutMs } = {}) {
  const resolved = resolveHotelbedsRequestUrl(url);
  if (isContentApiUrl(resolved)) {
    return plainFetch(resolved, { method, headers, body, timeoutMs });
  }
  const creds = getMtlsCreds();
  if (creds) {
    return nodeFetchMtls(resolved, { method, headers, body, timeoutMs, ...creds });
  }
  return plainFetch(resolved, { method, headers, body, timeoutMs });
}
