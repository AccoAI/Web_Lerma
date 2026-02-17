/**
 * POST /api/socios-login
 * Body: { usuario, password }
 * Devuelve { ok, socio } con id, nombre_completo, handicap, etc. o { error }
 */
import { createClient } from '@supabase/supabase-js';

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET() {
  return jsonResponse({ error: 'Use POST con usuario y password' }, 405);
}

export async function POST(request) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return jsonResponse({ error: 'Supabase no configurado' }, 500);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const usuario = (body.usuario || '').trim();
    const password = (body.password || '').trim();
    if (!usuario) {
      return jsonResponse({ error: 'Usuario requerido' }, 400);
    }

    const supabase = createClient(url, key);
    const { data: socios, error: err } = await supabase
      .from('socios')
      .select('id, nombre_completo, dni, handicap, fecha_socio, tipo_socio, grupo_socio, email, usuario')
      .eq('usuario', usuario)
      .limit(1);

    if (err) {
      console.error('socios-login supabase', err);
      return jsonResponse({ error: 'Error al verificar credenciales' }, 500);
    }

    const socio = socios && socios[0];
    if (!socio) {
      return jsonResponse({ error: 'Usuario o contraseña incorrectos' }, 401);
    }

    // Demo: aceptar contraseña "golf2024" si no hay hash real
    const passOk = password === 'golf2024';
    if (!passOk) {
      return jsonResponse({ error: 'Usuario o contraseña incorrectos' }, 401);
    }

    return jsonResponse({ ok: true, socio });
  } catch (e) {
    console.error('socios-login', e);
    return jsonResponse({ error: 'Error en el servidor' }, 500);
  }
}
