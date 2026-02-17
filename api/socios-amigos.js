/**
 * GET /api/socios-amigos -> lista de amigos del socio (header X-Socio-Id)
 * POST /api/socios-amigos -> añadir amigo. Body: { amigo_id }. Header: X-Socio-Id
 */
import { createClient } from '@supabase/supabase-js';

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getSocioId(request) {
  return request.headers.get('X-Socio-Id') || request.headers.get('x-socio-id') || '';
}

export async function GET(request) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return jsonResponse({ error: 'Supabase no configurado' }, 500);
  }

  const socioId = getSocioId(request).trim();
  if (!socioId) {
    return jsonResponse({ error: 'Sesión requerida (X-Socio-Id)' }, 401);
  }

  try {
    const supabase = createClient(url, key);
    const { data: links, error: errLinks } = await supabase
      .from('socio_amigos')
      .select('amigo_id')
      .eq('socio_id', socioId);

    if (errLinks) {
      console.error('socios-amigos GET', errLinks);
      return jsonResponse({ error: 'Error al cargar amigos' }, 500);
    }

    const amigoIds = (links || []).map((l) => l.amigo_id).filter(Boolean);
    if (amigoIds.length === 0) {
      return jsonResponse({ amigos: [] });
    }

    const { data: socios, error: errSocios } = await supabase
      .from('socios')
      .select('id, nombre_completo, handicap, tipo_socio, usuario')
      .in('id', amigoIds)
      .order('nombre_completo');

    if (errSocios) {
      console.error('socios-amigos GET socios', errSocios);
      return jsonResponse({ amigos: [] });
    }

    return jsonResponse({ amigos: socios || [] });
  } catch (e) {
    console.error('socios-amigos GET', e);
    return jsonResponse({ error: 'Error en el servidor' }, 500);
  }
}

export async function POST(request) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return jsonResponse({ error: 'Supabase no configurado' }, 500);
  }

  const socioId = getSocioId(request).trim();
  if (!socioId) {
    return jsonResponse({ error: 'Sesión requerida (X-Socio-Id)' }, 401);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const amigoId = (body.amigo_id || '').trim();
    if (!amigoId) {
      return jsonResponse({ error: 'amigo_id requerido' }, 400);
    }
    if (amigoId === socioId) {
      return jsonResponse({ error: 'No puedes añadirte a ti mismo' }, 400);
    }

    const supabase = createClient(url, key);
    const { error } = await supabase.from('socio_amigos').insert({
      socio_id: socioId,
      amigo_id: amigoId,
    });

    if (error) {
      if (error.code === '23505') {
        return jsonResponse({ ok: true, message: 'Ya es tu amigo' });
      }
      console.error('socios-amigos POST', error);
      return jsonResponse({ error: 'Error al añadir amigo' }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('socios-amigos POST', e);
    return jsonResponse({ error: 'Error en el servidor' }, 500);
  }
}
