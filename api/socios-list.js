/**
 * GET /api/socios-list?q=nombre
 * Lista socios para buscador / añadir amigos. Requiere header X-Socio-Id (opcional, para excluirse).
 */
import { createClient } from '@supabase/supabase-js';

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST() {
  return jsonResponse({ error: 'Use GET con ?q= para buscar' }, 405);
}

export async function GET(request) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return jsonResponse({ error: 'Supabase no configurado' }, 500);
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    const supabase = createClient(url, key);
    let query = supabase
      .from('socios')
      .select('id, nombre_completo, handicap, tipo_socio, grupo_socio, usuario')
      .order('nombre_completo');

    if (q.length >= 2) {
      query = query.or('nombre_completo.ilike.%' + q + '%,usuario.ilike.%' + q + '%');
    }

    const { data, error } = await query.limit(50);

    if (error) {
      console.error('socios-list', error);
      return jsonResponse({ error: 'Error al listar socios' }, 500);
    }

    return jsonResponse({ socios: data || [] });
  } catch (e) {
    console.error('socios-list', e);
    return jsonResponse({ error: 'Error en el servidor' }, 500);
  }
}
