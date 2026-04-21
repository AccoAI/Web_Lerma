# Hotelbeds certification — email drafts and checklist

Use this when contacting Hotelbeds (e.g. **apitude@hotelbeds.com**). Replace all `[…]` placeholders before sending. **Do not put live API secrets in email**; use their secure process or the attached form.

Official reference: [Certification process (HBX Group)](https://developer.hotelbeds.com/documentation/hotels/knowledge-base/certification-process/).

The **source of truth** is always the official URL above (not a static export).

**Certification base URL (Vercel Production):** `https://web-lerma.vercel.app`

We currently use our **Vercel production URL** for certification and tester access. A **custom domain** may be added later; the **integration and API routes** (`/api/hotelbeds-availability`, etc.) remain the same.

---

## Estado del código frente a la guía de certificación (Hotels)

Use this table internally and with Hotelbeds **only with honest wording**. Last reviewed against repo: **availability + UI pricing** implemented; **CheckRate, Hotelbeds Booking, and voucher metadata from the package flow** are not fully wired yet.

| Área (guía) | Requisito principal | Estado en repo | Notas / archivos |
|-------------|---------------------|----------------|------------------|
| **1 Technical** | Requests well-formed; GZIP where applicable | **Parcial** | Proxy `api/hotelbeds-availability.js` uses `fetch` + standard headers. Confirm explicit **Accept-Encoding: gzip** if auditors require it. |
| **2.1–2.2 Workflow** | Availability → (CheckRate if needed) → Booking; **no** redundant Availability before CheckRate/Booking | **No cumplido** (booking HB ausente) | No hay llamada a `…/checkrates` ni a `…/bookings` (hoteles) en el flujo de paquetes. `js/stripe-pago.js` no envía `hotelbedsVoucher` a `crear-pago`. |
| **2.3** | Max hotels per availability call within limit | **Parcial** | Con `hotelCodes` en body se agrupan; `js/precios-data.js` tiene `hotelbedsCode: null` en hoteles por defecto → a menudo se usa **destino** (dos llamadas BUR/BUR2) en `js/hotelbeds-paquetes.js`. |
| **2.5–2.6 CheckRate** | Solo si `rateType=RECHECK`; batch hasta 10 | **No implementado** | No hay `RECHECK` / `BOOKABLE` en el código del front. |
| **2.7 Promotions** | Mostrar promociones de tarifa | **No** en UI actual | Lista de precios resumida; no se pintan `promotions` por rate. |
| **3.1** | Precio, habitación, régimen, hotel, paginación… | **Parcial** | Se muestran nombre + precio (minRate / primer rate); no hay selector granular de **cada** rateKey / room / board desde HB en el HTML de paquetes. |
| **3.2–3.4** | Pax / niños / multi-room | **Parcial** | `fetchAvailability` usa ocupación simple (rooms/adults/children) en `api/hotelbeds-availability.js`; UI de grupo en formularios, no mapeo completo multi-occupancy HB. |
| **3.6 sourceMarket** | Si se pide, solo para ese mercado | **No** en request | El POST de disponibilidad no añade `sourceMarket` hoy. |
| **3.8 Cancellation policies** | Mostrar o declarar que no | **No** en UI | Declarar por escrito a Hotelbeds si no se muestran. |
| **3.9 Rate comments** | Antes de confirmar; Content o CheckRate | **No** | No implementado en el flujo de paquetes. |
| **3.11 Booking timeout ≥ 60 s** | Cliente booking | **N/A** hasta haber booking | Cuando exista `fetch` a `/bookings`, configurar timeout ≥ 60 s. |
| **4 Voucher** | Documento completo al cliente | **Infra lista, flujo incompleto** | `api/webhook-stripe.js` + `lib/hotelbeds-voucher-html.js` generan HTML si hay metadata `hb_*`; eso requiere `hotelbedsVoucher` en `POST /api/crear-pago` — hoy **no** lo rellena `iniciarPagoStripe`. |
| **5 Content** | Uso correcto de Content API | **Parcial** | `api/hotelbeds-list-hotels.js` + listados para desplegables; no es catálogo completo al estilo guía. |
| **6 Live** | Booking + cancel en LIVE | **Post-certificación** | Tras llaves LIVE y acuerdo con HB. |

**Conclusión:** Podéis certificar **parte técnica de disponibilidad y uso del proxy**, pero **no** afirmar en correo que ya cumplís el workflow completo §2–§4 hasta implementar CheckRate condicional, Booking con `rateKey`, y paso de datos al voucher (o acordar un alcance explícito con `apitude@hotelbeds.com`).

---

## 4. Certification & Environment (short block for forms / email)

Use this block when a form asks for URL + environment in one section. **List all package/configurator pages** where Hotelbeds pricing or booking applies so testers do not miss a flow.

**Base URL:** `https://web-lerma.vercel.app`

**Test pages (all pages with Hotelbeds accommodation integration):**

- `https://web-lerma.vercel.app/paquete-fin-semana.html`
- `https://web-lerma.vercel.app/paquete-golf-vino.html`
- `https://web-lerma.vercel.app/paquete-36-hoyos.html` *(hotel block when the user selects **exactly two** stay dates)*
- `https://web-lerma.vercel.app/configurador-ryder.html`
- `https://web-lerma.vercel.app/configurador-torneos.html`

**Direct API test:** `POST https://web-lerma.vercel.app/api/hotelbeds-availability`

**Connectivity:** `GET https://web-lerma.vercel.app/api/hotelbeds-availability?status=1`

**Credentials:** We use **API Key + Secret** (server-side only). Credentials will be shared via **[INSERT YOUR SECURE CHANNEL HERE]**.

**Environment:** **[test / production — as agreed with Hotelbeds]**. (`HOTELBEDS_ENV` on Vercel.)

**Infrastructure:** Hosted on **Vercel** (serverless). We are aware of **mTLS** requirements and will follow your guidance for the production environment.

**Login:** **[No login required for these public configurators / or provide test credentials if applicable.]**

---

## English email (ready to paste)

**Subject:** Hotelbeds certification — integration details (ADRINOS SL / Golf Lerma)

Dear Tanya,

Thank you for the certification instructions. We have reviewed the [Certification process](https://developer.hotelbeds.com/documentation/hotels/knowledge-base/certification-process/) on the developer portal and aligned our description with your workflow and checklist.

Please find below the information you request for starting certification (workflow, commercial decisions, URL, authentication, payment, language, and isolation of HBX product). Contact: **[your email]**; credentials will be shared via **[your preferred secure channel / the attached form — not in plain email]**.

### Workflow (distribution channel) — **current integration (honest)**

We operate a **single B2C channel** for regional golf/stay packages on our website.

1. **Availability** — Implemented today: we call `POST …/hotel-api/1.0/hotels` **only from our server-side proxy** (`POST https://web-lerma.vercel.app/api/hotelbeds-availability`). The browser never holds Hotelbeds credentials; we authenticate with **Api-key** and **X-Signature** (HMAC). The UI uses an **800 ms debounce** to minimise unnecessary availability calls. We show **live prices** (from `minRate` or the first returned rate) in the package/configurator pages listed below.

2. **CheckRate** — **Not yet wired in our UI/API path.** We intend to follow your rule (§2.5): **CheckRate only when the chosen rate has `rateType=RECHECK`**, and **no** CheckRate for `BOOKABLE`, with **batched** CheckRate when multiple RECHECK rates apply (§2.6). We will not repeat Availability redundantly before CheckRate/Booking (§2.1–2.2).

3. **Confirmation (Booking)** — **Not yet wired end-to-end from the public package flow.** We collect payment via **Stripe** (`POST /api/crear-pago` + Payment Links). Our backend **can** attach Hotelbeds voucher fields to Stripe metadata when `hotelbedsVoucher` is supplied to `crear-pago`, and the **webhook** can email an HTML voucher (`/api/webhook-stripe` + `lib/hotelbeds-voucher-html.js`), but the **default** `iniciarPagoStripe` flow does **not** yet send `hotelbedsVoucher` or call Hotelbeds **`/bookings`**. We will implement Booking after payment (or the order you require), **`rateKey`** from Availability/CheckRate as per your workflow, and a **≥ 60 s** timeout on the Booking client (§3.11).

**Volume / batching (availability) today:**

- **One** availability request when querying by **explicit hotel codes** (when `hotelbedsCode` is configured per hotel), within your limits.
- **Two sequential** availability requests when querying by **destination** (**BUR** and **BUR2**), merged and **deduplicated** client-side (geographic scope of our product).

**Other Hotelbeds calls:** We use **`GET https://web-lerma.vercel.app/api/hotelbeds-list-hotels`** for hotel lists where needed.

**Technical:** Server-side requests use your expected headers. **[Confirm GZIP / Accept-Encoding with your stack before claiming it explicitly.]**

### Commercial decisions

Our offer is a **specialised regional golf/stay product** (Lerma and Burgos area). We scope searches to **destinations BUR and BUR2** and/or **configured hotel codes** that match that geographic scope. We display **rates and hotel names** (and, where we surface them, **room/board** and **promotions**) as returned by the API, without **undisclosed** filtering to manipulate which contracted properties appear beyond this product scope.

**If you apply any deliberate limitation** (e.g. not showing every board type on the package UI), disclose it explicitly during certification.

**Source market:** **[If you send `sourceMarket`: state code and that prices are only shown to that market. If you do not use it: “We do not use sourceMarket on availability requests.”]**

**Opaque / packaged rates:** **[If you never book rates with `packaging: true` for standalone hotel-only sale, say so. If you might, explain combination with package per rule 3.5.]**

### Cancellation policies, rate comments, promotions

**Cancellation policies (§3.8):** Today we **do not** surface HB cancellation policies in the package UI. Please treat this as **not displayed** during review unless we add it before certification.

**Rate comments (§3.9):** **Not implemented** in the package path yet (no Content RateComments / CheckRate consumption before confirmation).

**Promotions (§2.7):** **Not displayed** in the current price list UI.

### Voucher (confirmed bookings) — **target vs today**

**Target (§4):** For confirmed HB hotel stays, a voucher with reference, dates, room/board, pax, supplier payment line, etc.

**Today:** Voucher HTML for hotels is implemented in **`/api/webhook-stripe`** using **`lib/hotelbeds-voucher-html.js`** when Stripe metadata contains **`hb_*`** fields produced from **`hotelbedsVoucher`** in **`POST /api/crear-pago`**. That metadata path is **not** populated by the default package payment button today; it is ready for wiring once Booking is integrated.

### Content API

**[Choose what is true]** We use **[e.g. hotel list / hotel detail via `hotelbeds-list-hotels` and/or specific Content API calls]** for **[brief purpose]**. **[If static text/images are not from Content API, say so.]** We do **not** rely on another hotel **content** provider for HBX-certified content; optional **Booking.com** links may appear as a **fallback** for users when live rates are not shown — **not** a parallel HBX availability feed.

### Certification URLs

**Base URL:** `https://web-lerma.vercel.app`  
We use this **Vercel production URL** for certification; a **custom domain** may follow without changing paths or API behaviour.

**Key pages (configurators / packages with accommodation):**

- `https://web-lerma.vercel.app/paquete-fin-semana.html`
- `https://web-lerma.vercel.app/paquete-golf-vino.html`
- `https://web-lerma.vercel.app/paquete-36-hoyos.html` *(accommodation UI when the user selects **exactly two** stay dates)*
- `https://web-lerma.vercel.app/configurador-ryder.html`
- `https://web-lerma.vercel.app/configurador-torneos.html`

**Direct API test:** `POST https://web-lerma.vercel.app/api/hotelbeds-availability`  
Example: `{"checkIn":"YYYY-MM-DD","checkOut":"YYYY-MM-DD","rooms":1,"adults":2,"destinationCode":"BUR"}` or `"hotelCodes":["…"]`.

**Connectivity:** `GET https://web-lerma.vercel.app/api/hotelbeds-availability?status=1`

**Login:** **[“No login is required for testers on these pages.” / or provide test user if applicable.]**

### Authentication & environment

**API Key + Secret** are used **server-side only** for **X-Signature**. Test credentials via **[secure channel]**.  
**Environment for certification:** **[test / production — as agreed]**. (`HOTELBEDS_ENV` selects test vs production host.)

### Payment information

**Merchant model:** **ADRINOS SL** collects **package payment** from the end customer via **Stripe** on our website. After a **successful payment**, our backend performs **Hotelbeds confirmation** as described above. **Settlement with Hotelbeds** is handled under our **commercial agreement**.

### Language

The **UI is primarily Spanish**. We can provide a **short English test guide** on request (which URL, suggested dates **15–20 days** ahead for Burgos/Lerma test availability, and where live prices and confirmation steps appear).

### Multiple suppliers — isolating HBX Group product

**Live hotel availability and booking** for these packages use **Hotelbeds (HBX Group)** only. **Optional Booking.com links** may appear as a **fallback** for users when live rates are not shown; they are **not** a parallel API feed for our Hotelbeds integration or certification path.

### Infrastructure

Hosting is **serverless (Vercel)**. We are aware of **mTLS** and other production requirements and will follow **your guidance** for the environment you specify.

### Other aspects

We are happy to complete **any attached forms** and to adjust details (voucher fields, cancellation display, Content API scope) to match your checklist during the review.

Kind regards,  
**[Your name]**  
ADRINOS SL / Golf Lerma  
**[Email / phone]**

---

## Spanish version (optional)

**Asunto:** Certificación Hotelbeds — detalles de integración (ADRINOS SL / Golf Lerma)

Estimada Tanya,

Gracias por la información sobre la certificación. Hemos revisado el [proceso de certificación](https://developer.hotelbeds.com/documentation/hotels/knowledge-base/certification-process/) y adjuntamos los datos solicitados.

**Flujo (real hoy):** Disponibilidad vía proxy (`/api/hotelbeds-availability`), precios en vivo en paquetes, debounce 800 ms. **CheckRate y Booking HB aún no conectados** al flujo público de pago; voucher por correo cuando existan metadatos `hb_*` en Stripe. Ver tabla *Estado del código* arriba. **Objetivo certificación:** CheckRate solo si `RECHECK`; booking con `rateKey`; timeout ≥ 60 s.

**URLs base:** `https://web-lerma.vercel.app` (Vercel Production; dominio propio posible después sin cambiar rutas API).

**Páginas:** `paquete-fin-semana.html`, `paquete-golf-vino.html`, `paquete-36-hoyos.html` (dos fechas para alojamiento), `configurador-ryder.html`, `configurador-torneos.html`.

**Comercial:** ámbito BUR/BUR2 y códigos configurados; sin filtros ocultos fuera del producto.

**Pago:** modelo merchant; liquidación con Hotelbeds según contrato.

**Credenciales / entorno:** **[canal seguro]** / **[test o producción]**.

**Idioma:** web en español; guía breve en inglés disponible.

**Proveedores:** solo Hotelbeds para disponibilidad/reserva del paquete; enlaces Booking.com opcionales como respaldo, no feed alternativo.

Quedamos a vuestra disposición.

Un saludo,  
**[Nombre]**

---

## Placeholders you must resolve before sending

| Placeholder | Notes |
|-------------|--------|
| `[your email]`, `[Your name]`, `[Email / phone]` | Contact details |
| Secure channel for credentials | Not plain email |
| **GZIP / Technical** line | Only claim explicit compression if true |
| **Source market** | One fixed sentence: yes + market, or “we do not use” |
| **Opaque / packaged rates** | Must match real behaviour |
| **Cancellation policies** | Display vs not display |
| **Content API** | Honest list (`hotelbeds-list-hotels`, etc.) |
| **Voucher** | **Infra:** `/api/webhook-stripe` + `hb_*` metadata from `hotelbedsVoucher` in `POST /api/crear-pago`. **Gap:** `js/stripe-pago.js` does not send `hotelbedsVoucher` yet; Hotelbeds `/bookings` not called from package flow. |
| **Login** | None or test user |
| **test / production** | As agreed with Hotelbeds |

**Implementation note:** Align code with §2.5 (**CheckRate only if `rateType=RECHECK`**) before claiming full workflow in writing. The English template above is now **honest about current vs planned** behaviour; do not revert to aspirational wording until Booking + metadata are wired.

---

## Quick fill-in checklist

| Item | Your value |
|------|------------|
| Production URL | `https://web-lerma.vercel.app` (update if project moves) |
| Test vs prod Hotelbeds API | |
| Secure channel for API key/secret | |
| Contact name / email | |

After sending, keep a copy of the completed PDF and the exact URL you gave them.
