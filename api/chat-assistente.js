/**
 * Vercel Serverless: chat del asistente de Golf Lerma con Gemini
 * POST /api/chat-assistente
 * Body: { message: string, history?: { role: "user"|"model", content: string }[] }
 *
 * Variables de entorno en Vercel:
 *   GEMINI_API_KEY - API key de Google AI Studio (https://aistudio.google.com/apikey)
 *   CHAT_SYSTEM_PROMPT (opcional) - Instrucciones del asistente; si no existe se usa un prompt por defecto
 */

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const DEFAULT_SYSTEM_PROMPT = `Eres el asistente de Golf Lerma (y Saldaña Golf). Respondes en el mismo idioma que el usuario.
Ayudas con: horarios, reservas, precios, paquetes, torneos, cómo hacerte socio, ubicación y contacto.
Datos útiles: teléfono (+34) 947 56 46 30; Golf Lerma en Autovía Madrid-Burgos km 195,5, Lerma (Burgos); Saldaña en Urbanización Golf Saldaña, Saldaña de Burgos.
Sé breve, amable y orienta a la web para reservas y más información cuando sea apropiado.`;

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET() {
  return jsonResponse(
    { error: 'Método no permitido', hint: 'Use POST con { message, history? }' },
    405
  );
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY no configurada');
    return jsonResponse({ error: 'Asistente no configurado' }, 500);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return jsonResponse({ error: 'Falta el mensaje' }, 400);
    }

    const systemPrompt =
      typeof process.env.CHAT_SYSTEM_PROMPT === 'string' && process.env.CHAT_SYSTEM_PROMPT.trim()
        ? process.env.CHAT_SYSTEM_PROMPT.trim()
        : DEFAULT_SYSTEM_PROMPT;

    const contents = history
      .filter((m) => m && (m.role === 'user' || m.role === 'model') && typeof m.content === 'string')
      .map((m) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    contents.push({ role: 'user', parts: [{ text: message }] });

    const payload = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    };

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemini API error', res.status, errText);
      let userMessage = 'No se pudo obtener respuesta del asistente. Inténtalo más tarde.';
      let errorDetail = null;
      try {
        const errJson = JSON.parse(errText);
        const msg = errJson?.error?.message || errJson?.message || errText.slice(0, 200);
        errorDetail = msg;
        if (res.status === 400 || res.status === 403 || res.status === 401) {
          userMessage = 'Configuración del asistente incorrecta. Comprueba la API key de Gemini en Vercel (GEMINI_API_KEY).';
        }
      } catch (_) {}
      return jsonResponse(
        { error: userMessage, errorDetail: errorDetail || undefined },
        502
      );
    }

    const data = await res.json();
    const candidate = data.candidates && data.candidates[0];
    const parts = candidate && candidate.content && candidate.content.parts;
    const text = parts && parts[0] && parts[0].text;

    if (!text) {
      console.error('Gemini response sin texto', JSON.stringify(data).slice(0, 500));
      return jsonResponse(
        { error: 'El asistente no devolvió respuesta. Prueba de nuevo.' },
        502
      );
    }

    return jsonResponse({ reply: text.trim() });
  } catch (e) {
    console.error('chat-assistente error', e);
    return jsonResponse(
      { error: 'Error al conectar con el asistente. Inténtalo más tarde.' },
      500
    );
  }
}
