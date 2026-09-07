/**
 * Marcador en vivo: la app publica el snapshot; la pagina /marcador.html lo lee.
 * GET  /api/marcador?code=ABC123
 * POST /api/marcador  { code, ...snapshot }
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function tmpPath(code) {
  return `/tmp/marcador-${code}.json`;
}

function readTmp(code) {
  try {
    return JSON.parse(fs.readFileSync(tmpPath(code), 'utf8'));
  } catch {
    return null;
  }
}

function writeTmp(code, payload) {
  try {
    fs.writeFileSync(tmpPath(code), JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

function normalizeCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(request) {
  const code = normalizeCode(new URL(request.url).searchParams.get('code'));
  if (!code) return jsonResponse({ error: 'Falta el codigo' }, 400);

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('live_marcadores')
      .select('payload')
      .eq('code', code)
      .maybeSingle();
    if (error) {
      console.error('marcador GET', error);
      const tmp = readTmp(code);
      if (tmp) return jsonResponse(tmp);
      return jsonResponse({ error: 'No se ha podido leer el marcador' }, 500);
    }
    if (!data?.payload) return jsonResponse({ error: 'No hay partida con ese codigo' }, 404);
    return jsonResponse(data.payload);
  }

  const tmp = readTmp(code);
  if (!tmp) return jsonResponse({ error: 'No hay partida con ese codigo' }, 404);
  return jsonResponse(tmp);
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return jsonResponse({ error: 'JSON invalido' }, 400);
  }
  const code = normalizeCode(body.code);
  if (!code) return jsonResponse({ error: 'Falta el codigo' }, 400);

  const payload = { ...body, code };
  writeTmp(code, payload);

  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('live_marcadores').upsert({
      code,
      payload,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error('marcador POST', error);
      return jsonResponse({ ok: true, stored: 'tmp', warning: error.message });
    }
  }

  return jsonResponse({ ok: true, code });
}
