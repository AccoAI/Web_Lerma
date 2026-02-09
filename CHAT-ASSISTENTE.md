# Asistente de chat (Gemini) - Golf Lerma

El chatbot de la web está conectado a **Google Gemini** (LLM). Las respuestas las genera la IA en tiempo real; no son respuestas preestablecidas.

## 1. Obtener API key de Gemini

1. Entra en [Google AI Studio](https://aistudio.google.com/apikey)
2. Inicia sesión con tu cuenta Google
3. Crea una API key y cópiala

## 2. Variables de entorno en Vercel

En el proyecto de Vercel: **Settings > Environment Variables** añade:

| Nombre | Descripción |
|--------|-------------|
| `GEMINI_API_KEY` | **(Obligatoria)** La API key de Google AI Studio |
| `CHAT_SYSTEM_PROMPT` | **(Opcional)** Instrucciones del asistente (ver abajo) |

- **Environment**: Production (y Preview si quieres probar en deploys de preview)
- Después de guardar, haz **Redeploy** para que tome las variables.

## 3. Personalizar las instrucciones del asistente

Puedes definir cómo debe comportarse el asistente con la variable **`CHAT_SYSTEM_PROMPT`**.

- Si **no** la configuras, se usa un prompt por defecto (asistente de Golf Lerma con datos de contacto, horarios, reservas, etc.).
- Si la configuras, ese texto se envía al modelo como “system instruction”. Aquí puedes pegar las instrucciones que tengas en un **Gem** de Google o en un **GPT** de OpenAI (adaptando el texto al contexto de Golf Lerma si hace falta).

Ejemplo de valor para `CHAT_SYSTEM_PROMPT` (multilínea en Vercel se pone en una sola línea con `\n` o en el editor de variables):

```
Eres el asistente de Golf Lerma. Respondes siempre en el idioma del usuario.
Instrucciones: sé breve, amable, da datos de contacto (+34) 947 56 46 30 y orienta a la web para reservas.
No inventes precios ni horarios concretos; indica que los consulten en la web o por teléfono.
```

Así puedes crear luego un Gem en Google AI Studio (o un GPT en ChatGPT), copiar sus instrucciones y pegarlas en `CHAT_SYSTEM_PROMPT` para que el chat de la web use el mismo “personaje” y reglas.

## 4. Pruebas locales

Con `vercel dev`:

1. Crea un archivo `.env` en la raíz (no lo subas a git)
2. Añade: `GEMINI_API_KEY=tu_api_key`
3. Opcional: `CHAT_SYSTEM_PROMPT=Tu texto de instrucciones aquí`

## 5. Si ves "No se pudo obtener respuesta del asistente"

- **En Vercel**: Comprueba que `GEMINI_API_KEY` esté bien configurada (Settings → Environment Variables) y que hayas hecho **Redeploy** después de añadirla.
- **API key**: Debe ser de [Google AI Studio](https://aistudio.google.com/apikey), no de Google Cloud. Cópiala sin espacios.
- **Detalle del error**: Abre la consola del navegador (F12 → pestaña Consola). Si la API devuelve un error de Gemini, verás ahí el mensaje exacto (por ejemplo clave inválida, cuota, etc.).

## 6. Endpoint

- **POST** `/api/chat-assistente`
- **Body**: `{ "message": "texto del usuario", "history": [ { "role": "user", "content": "..." }, { "role": "model", "content": "..." } ] }`
- **Respuesta**: `{ "reply": "texto de la IA" }` o `{ "error": "mensaje" }`

El frontend (`js/chatbot.js`) mantiene el historial de la conversación y lo envía en cada petición para que el modelo tenga contexto.

---

**Nota**: Si pruebas en local sin `vercel dev`, la ruta `/api/chat-assistente` no existirá y verás un error de red. Ejecuta `vercel dev` y abre la web desde la URL que indique (por ejemplo `http://localhost:3000`) para que el chat llame al API correctamente.
