/**
 * API unificada de socios (login, listado, amigos) + marcador en vivo
 * (reescrito desde /api/marcador para no superar el limite de funciones Vercel).
 *
 * Rutas legacy via rewrites en vercel.json:
 *   POST /api/socios-login   -> ?action=login
 *   GET  /api/socios-list    -> ?action=list
 *   GET/POST /api/socios-amigos -> ?action=amigos
 *   GET/POST /api/marcador  -> ?action=marcador
 */
import { createClient } from '@supabase/supabase-js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Socio-Id',
};

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function getAction(request) {
  return new URL(request.url).searchParams.get('action') || '';
}

function getSocioId(request) {
  return request.headers.get('X-Socio-Id') || request.headers.get('x-socio-id') || '';
}

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function normalizeCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
}

async function handleMarcadorGet(request) {
  const code = normalizeCode(new URL(request.url).searchParams.get('code'));
  if (!code) return jsonResponse({ error: 'Falta el codigo' }, 400);

  const supabase = getSupabase();
  if (!supabase) {
    return jsonResponse(
      { error: 'Marcador no configurado (falta Supabase en el servidor)' },
      503,
    );
  }

  try {
    const { data, error } = await supabase
      .from('live_marcadores')
      .select('payload')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      console.error('marcador GET', error);
      return jsonResponse({
        error: 'No se ha podido leer el marcador',
        hint: 'Ejecuta supabase/schema-live-marcadores.sql en Supabase',
        detail: error.message || String(error),
      }, 500);
    }
    if (!data?.payload) return jsonResponse({ error: 'No hay partida con ese codigo' }, 404);
    return jsonResponse(data.payload);
  } catch (e) {
    console.error('marcador GET throw', e);
    return jsonResponse({
      error: 'No se ha podido leer el marcador',
      hint: 'Revisa SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY y la tabla live_marcadores',
      detail: e?.message || String(e),
    }, 500);
  }
}

async function handleMarcadorPost(request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return jsonResponse({ error: 'JSON invalido' }, 400);
  }
  const code = normalizeCode(body.code);
  if (!code) return jsonResponse({ error: 'Falta el codigo' }, 400);

  const payload = { ...body, code };
  const supabase = getSupabase();
  if (!supabase) {
    return jsonResponse(
      { error: 'Marcador no configurado (falta Supabase en el servidor)' },
      503,
    );
  }

  const { error } = await supabase.from('live_marcadores').upsert({
    code,
    payload,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error('marcador POST', error);
    return jsonResponse(
      {
        error: 'No se ha podido guardar el marcador',
        hint: 'Ejecuta supabase/schema-live-marcadores.sql en Supabase',
        detail: error.message,
      },
      500,
    );
  }
  return jsonResponse({ ok: true, code });
}

async function handleLogin(request) {
  const supabase = getSupabase();
  if (!supabase) return jsonResponse({ error: 'Supabase no configurado' }, 500);

  try {
    const body = await request.json().catch(() => ({}));
    const usuario = (body.usuario || '').trim();
    const password = (body.password || '').trim();
    if (!usuario) return jsonResponse({ error: 'Usuario requerido' }, 400);

    const { data: socios, error: err } = await supabase
      .from('socios')
      .select('id, nombre_completo, dni, handicap, fecha_socio, tipo_socio, grupo_socio, email, usuario')
      .eq('usuario', usuario)
      .limit(1);

    if (err) {
      console.error('socios login supabase', err);
      return jsonResponse({ error: 'Error al verificar credenciales' }, 500);
    }

    const socio = socios && socios[0];
    if (!socio) return jsonResponse({ error: 'Usuario o contraseña incorrectos' }, 401);

    const passOk = password === 'golf2024';
    if (!passOk) return jsonResponse({ error: 'Usuario o contraseña incorrectos' }, 401);

    return jsonResponse({ ok: true, socio });
  } catch (e) {
    console.error('socios login', e);
    return jsonResponse({ error: 'Error en el servidor' }, 500);
  }
}

async function handleList(request) {
  const supabase = getSupabase();
  if (!supabase) return jsonResponse({ error: 'Supabase no configurado' }, 500);

  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    let query = supabase
      .from('socios')
      .select('id, nombre_completo, handicap, tipo_socio, grupo_socio, usuario')
      .order('nombre_completo');

    if (q.length >= 2) {
      query = query.or('nombre_completo.ilike.%' + q + '%,usuario.ilike.%' + q + '%');
    }

    const { data, error } = await query.limit(50);

    if (error) {
      console.error('socios list', error);
      return jsonResponse({ error: 'Error al listar socios' }, 500);
    }

    return jsonResponse({ socios: data || [] });
  } catch (e) {
    console.error('socios list', e);
    return jsonResponse({ error: 'Error en el servidor' }, 500);
  }
}

async function handleAmigosGet(request) {
  const supabase = getSupabase();
  if (!supabase) return jsonResponse({ error: 'Supabase no configurado' }, 500);

  const socioId = getSocioId(request).trim();
  if (!socioId) return jsonResponse({ error: 'Sesión requerida (X-Socio-Id)' }, 401);

  try {
    const { data: links, error: errLinks } = await supabase
      .from('socio_amigos')
      .select('amigo_id')
      .eq('socio_id', socioId);

    if (errLinks) {
      console.error('socios amigos GET', errLinks);
      return jsonResponse({ error: 'Error al cargar amigos' }, 500);
    }

    const amigoIds = (links || []).map((l) => l.amigo_id).filter(Boolean);
    if (amigoIds.length === 0) return jsonResponse({ amigos: [] });

    const { data: socios, error: errSocios } = await supabase
      .from('socios')
      .select('id, nombre_completo, handicap, tipo_socio, usuario')
      .in('id', amigoIds)
      .order('nombre_completo');

    if (errSocios) {
      console.error('socios amigos GET socios', errSocios);
      return jsonResponse({ amigos: [] });
    }

    return jsonResponse({ amigos: socios || [] });
  } catch (e) {
    console.error('socios amigos GET', e);
    return jsonResponse({ error: 'Error en el servidor' }, 500);
  }
}

async function handleAmigosPost(request) {
  const supabase = getSupabase();
  if (!supabase) return jsonResponse({ error: 'Supabase no configurado' }, 500);

  const socioId = getSocioId(request).trim();
  if (!socioId) return jsonResponse({ error: 'Sesión requerida (X-Socio-Id)' }, 401);

  try {
    const body = await request.json().catch(() => ({}));
    const amigoId = (body.amigo_id || '').trim();
    if (!amigoId) return jsonResponse({ error: 'amigo_id requerido' }, 400);
    if (amigoId === socioId) return jsonResponse({ error: 'No puedes añadirte a ti mismo' }, 400);

    const { error } = await supabase.from('socio_amigos').insert({
      socio_id: socioId,
      amigo_id: amigoId,
    });

    if (error) {
      if (error.code === '23505') return jsonResponse({ ok: true, message: 'Ya es tu amigo' });
      console.error('socios amigos POST', error);
      return jsonResponse({ error: 'Error al añadir amigo' }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('socios amigos POST', e);
    return jsonResponse({ error: 'Error en el servidor' }, 500);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(request) {
  const action = getAction(request);
  if (action === 'marcador') return handleMarcadorGet(request);
  if (action === 'list') return handleList(request);
  if (action === 'amigos') return handleAmigosGet(request);
  return jsonResponse({ error: 'Use action=list, action=amigos o action=marcador' }, 405);
}

export async function POST(request) {
  const action = getAction(request);
  if (action === 'marcador') return handleMarcadorPost(request);
  if (action === 'login') return handleLogin(request);
  if (action === 'amigos') return handleAmigosPost(request);
  return jsonResponse({ error: 'Use action=login, action=amigos o action=marcador' }, 405);
}
