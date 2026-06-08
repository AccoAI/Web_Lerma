/**
 * API unificada de socios (login, listado, amigos).
 * Rutas legacy vía rewrites en vercel.json:
 *   POST /api/socios-login   -> ?action=login
 *   GET  /api/socios-list    -> ?action=list
 *   GET/POST /api/socios-amigos -> ?action=amigos
 */
import { createClient } from '@supabase/supabase-js';

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
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

export async function GET(request) {
  const action = getAction(request);
  if (action === 'list') return handleList(request);
  if (action === 'amigos') return handleAmigosGet(request);
  return jsonResponse({ error: 'Use action=list o action=amigos' }, 405);
}

export async function POST(request) {
  const action = getAction(request);
  if (action === 'login') return handleLogin(request);
  if (action === 'amigos') return handleAmigosPost(request);
  return jsonResponse({ error: 'Use action=login o action=amigos' }, 405);
}
