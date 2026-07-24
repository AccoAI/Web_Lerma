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

/** URL base Hotelbeds: host mTLS si hay cert/key; si no, host estándar. */
export function hotelbedsBaseUrl() {
  const isProd = process.env.HOTELBEDS_ENV === 'production';
  const creds = getMtlsCreds();
  if (creds) {
    return isProd ? 'https://api-mtls.hotelbeds.com' : 'https://api-mtls.test.hotelbeds.com';
  }
  return isProd ? 'https://api.hotelbeds.com' : 'https://api.test.hotelbeds.com';
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
    // Evitar gzip opaco: Node https no descomprime solo; pedimos texto plano cuando se pueda.
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
              const text = decoded.toString('utf8');
              resolve(makeFetchLikeResponse(status, text));
            })
            .catch((err) => {
              // Si falla descompresión, devolver bytes crudos como texto para depurar
              resolve(makeFetchLikeResponse(status, raw.toString('utf8')));
              void err;
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

/**
 * Fetch a Hotelbeds: usa mTLS si HOTELBEDS_MTLS_CERT + HOTELBEDS_MTLS_KEY están definidos.
 * Respuesta compatible con fetch (ok, status, text, json).
 */
export async function hotelbedsFetch(url, { method = 'GET', headers, body, timeoutMs } = {}) {
  const creds = getMtlsCreds();
  if (creds) {
    return nodeFetchMtls(url, { method, headers, body, timeoutMs, ...creds });
  }
  const controller = new AbortController();
  const tid = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    return await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
  } finally {
    if (tid) clearTimeout(tid);
  }
}
