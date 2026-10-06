/**
 * Reenvío WhatsApp de la guía: desactivado.
 * Las notificaciones las gestiona el midend (Brevo). La descarga PDF sigue en la página de confirmación.
 */

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET() {
  return json({ error: 'Método no permitido' }, 405);
}

export async function POST() {
  return json(
    {
      ok: false,
      error:
        'El envío WhatsApp desde la web está desactivado. Las notificaciones las gestiona el midend (Brevo). Usa «Descargar guía PDF» en la confirmación.',
      code: 'MIDEND_OWNED',
    },
    410
  );
}
