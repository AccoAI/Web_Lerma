# Área Socio con Supabase

El **área socio** sigue en **este mismo proyecto** (misma web, mismo repo). La base de datos está en **Supabase** y el front se conecta mediante **API routes en Vercel** que llaman a Supabase con la clave de servicio (más seguro que usar la anon key en el navegador con permisos amplios).

## 1. Esquema en Supabase

En **Supabase** > **SQL Editor** ejecuta el contenido de:

**`supabase/schema-area-socio.sql`**

Incluye:

| Tabla | Descripción |
|-------|-------------|
| **socios** | nombre_completo, dni, handicap, fecha_socio, tipo_socio, grupo_socio, email, usuario, password_hash |
| **green_fees** | socio_id, fecha, tipo_green_fee (ej. L12M), pago, resultado (opcional) |
| **socio_amigos** | socio_id, amigo_id (relación muchos a muchos) |

Tras ejecutar el script tendrás datos dummy (socio demo, Roberto, Ana, etc.) y algunas filas de green_fees y amigos.

## 2. Variables de entorno (Vercel)

En el proyecto de Vercel añade:

| Nombre | Descripción |
|--------|-------------|
| `SUPABASE_URL` | URL del proyecto (ej. `https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (Supabase > Settings > API). **No** uses la anon key para operaciones sensibles en el servidor. |

Para desarrollo local, pon las mismas en `.env.local`.

## 3. Dónde va el código

- **Base de datos y lógica de negocio:** Supabase (tablas + RLS si quieres).
- **API (lista socios, amigos, perfil, añadir amigo):** En **este repo**, en `/api`, por ejemplo:
  - `api/socios-list.js` – listado/búsqueda de socios (protegido por sesión o token).
  - `api/socios-amigos.js` – GET mis amigos, POST añadir amigo, DELETE quitar.
  - `api/socios-perfil.js` – GET perfil del socio logueado (por sesión o por id).
  - `api/socios-green-fees.js` – GET green fees del socio (por fecha, etc.).

- **Front:** Sigue siendo `area-socio.html` + `js/area-socio.js` (y si quieres `js/area-socio-data.js` solo como fallback). El JS llama a esas APIs en lugar de usar solo datos mock.

Así todo (web pública + área socio) vive en **el mismo código** y el mismo deploy; solo añades rutas API y sustituyes el origen de datos en el área socio.

## 4. Login de socios

Opciones:

- **A)** Mantener login mock (usuario/contraseña en sesión) y que las APIs comprueben una cookie o token que tú generes al hacer login (por ejemplo comparando usuario + contraseña contra `socios.usuario` y `socios.password_hash` en una ruta `api/socios-login.js` que use la service role).
- **B)** Migrar a **Supabase Auth** (email/magic link o usuario/contraseña gestionado por Supabase) y que el front use el JWT de Supabase; las APIs pueden validar ese JWT y usar RLS con el usuario de Supabase.

Recomendación: empezar con **A** (login en API que consulta `socios` y devuelve un token o cookie de sesión) para no tocar aún el flujo de registro; luego se puede pasar a **B** si quieres Supabase Auth.

## 5. Row Level Security (RLS) en Supabase

Si en el futuro expones la **anon key** desde el front (por ejemplo para leer solo “perfil público” de socios), conviene activar RLS en las tablas y políticas que permitan solo lo necesario. Mientras las llamadas vayan desde **tus APIs** con **service role**, no es obligatorio RLS para ese flujo; sí es buena práctica para cualquier acceso directo desde el cliente con anon key.

## 6. Resumen de flujos desde área socio

- **Listado / buscador de socios:** el socio logueado abre “Socios” o “Añadir amigo”; el front llama a `GET /api/socios-list?q=...`; la API con service role hace `SELECT` sobre `socios` (filtro por nombre o DNI) y devuelve lista (por ejemplo id, nombre, handicap, tipo_socio; sin datos sensibles).
- **Añadir amigo:** el socio elige a otro desde el listado; el front llama a `POST /api/socios-amigos` con `{ amigo_id: "uuid" }`; la API inserta en `socio_amigos(socio_id, amigo_id)` (socio_id = el logueado).
- **Ver mis amigos:** `GET /api/socios-amigos` devuelve los socios enlazados en `socio_amigos` para el socio logueado (con datos clave: nombre, handicap, última actividad si lo tienes).
- **Ver todos los socios (listado o buscador):** misma `GET /api/socios-list` con o sin `q`; la API devuelve los socios que quieras mostrar (con RLS o filtros en la query para no exponer más de lo necesario).

Los **green fees por fecha** se pueden listar en “Mi perfil” o en una sección “Mis partidas” con `GET /api/socios-green-fees` (o incluido en perfil) leyendo de la tabla `green_fees` filtrada por `socio_id`.

Cuando quieras, el siguiente paso puede ser: añadir una de las APIs (por ejemplo `socios-list` y `socios-amigos`) en este repo y conectar el JS del área socio a esas rutas.
