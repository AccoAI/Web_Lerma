# Hotelbeds certification — email drafts and checklist

Use this when contacting Hotelbeds (e.g. **apitude@hotelbeds.com**). Replace all `[…]` placeholders before sending. **Do not put live API secrets in email**; use their secure process or the attached form.

Official reference: [Certification process (HBX Group)](https://developer.hotelbeds.com/documentation/hotels/knowledge-base/certification-process/).

The **source of truth** is always the official URL above (not a static export).

**Certification base URL (Vercel Production):** `https://web-lerma.vercel.app`

We currently use our **Vercel production URL** for certification and tester access. A **custom domain** may be added later; the **integration and API routes** (`/api/hotelbeds-availability`, etc.) remain the same.

---

## Estado del código frente a la guía de certificación (Hotels)

Use this table internally and with Hotelbeds **only with honest wording**. Last reviewed against repo: **availability + UI pricing**; **CheckRate (solo RECHECK), Booking y `hotelbedsVoucher` → Stripe** en el flujo de paquetes que cargan `js/hotelbeds-paquetes.js` + `js/stripe-pago.js` (ver notas de alcance).

| Área (guía) | Requisito principal | Estado en repo | Notas / archivos |
|-------------|---------------------|----------------|------------------|
| **1 Technical** | Requests well-formed; GZIP where applicable | **Parcial** | Proxy `api/hotelbeds-availability.js` uses `fetch` + standard headers. Confirm explicit **Accept-Encoding: gzip** if auditors require it. |
| **2.1–2.2 Workflow** | Availability → (CheckRate if needed) → Booking; **no** redundant Availability before CheckRate/Booking | **Parcial** | Tras disponibilidad, el front guarda `rateKey` por código (`js/hotelbeds-paquetes.js`). Antes de Stripe: **CheckRate** solo si la tarifa elegida es `RECHECK`; luego **Booking** vía el mismo proxy (`action: checkrates` / `action: booking`). **Orden comercial:** reserva HB **antes** del enlace Stripe para poder adjuntar voucher en metadata (si falla HB, el pago puede seguir sin voucher salvo `HOTELBEDS_STRICT_PREBOOK`). |
| **2.3** | Max hotels per availability call within limit | **Parcial** | Con `hotelCodes` en body se agrupan; `js/precios-data.js` tiene `hotelbedsCode: null` en hoteles por defecto → a menudo se usa **destino** (dos llamadas BUR/BUR2) en `js/hotelbeds-paquetes.js`. |
| **2.5–2.6 CheckRate** | Solo si `rateType=RECHECK`; batch hasta 10 | **Parcial** | Se prioriza tarifa **BOOKABLE** al indexar; si la elegida es **RECHECK**, una habitación → un `checkrates`. Multitarifa / hasta 10 en un solo batch: **no** desde el flujo paquete aún. |
| **2.7 Promotions** | Mostrar promociones de tarifa | **No** en UI actual | Lista de precios resumida; no se pintan `promotions` por rate. |
| **3.1** | Precio, habitación, régimen, hotel, paginación… | **Parcial** | Se muestran nombre + precio (minRate / primer rate); no hay selector granular de **cada** rateKey / room / board desde HB en el HTML de paquetes. |
| **3.2–3.4** | Pax / niños / multi-room | **Parcial** | `fetchAvailability` usa ocupación simple (rooms/adults/children) en `api/hotelbeds-availability.js`; el **booking** desde paquetes envía **1 habitación / 1 adulto** (titular `usuario[1]`). Sin mapeo completo multi-occupancy HB. |
| **3.6 sourceMarket** | Si se pide, solo para ese mercado | **No** en request | El POST de disponibilidad no añade `sourceMarket` hoy. |
| **3.8 Cancellation policies** | Mostrar o declarar que no | **No** en UI | Declarar por escrito a Hotelbeds si no se muestran. |
| **3.9 Rate comments** | Antes de confirmar; Content o CheckRate | **No** | No implementado en el flujo de paquetes. |
| **3.11 Booking timeout ≥ 60 s** | Cliente booking | **Sí (servidor)** | `api/hotelbeds-availability.js`: timeout **65 s** en POST `/bookings`. |
| **4 Voucher** | Documento completo al cliente | **Parcial** | `js/stripe-pago.js` envía **`hotelbedsVoucher`** a `POST /api/crear-pago` cuando `tryHotelbedsBookForStripe` devuelve datos (páginas con `hotelbeds-paquetes.js`). `api/webhook-stripe.js` + `lib/hotelbeds-voucher-html.js` generan el HTML si hay `hb_*`. Páginas **sin** bloque Hotelbeds no rellenan voucher. |
| **5 Content** | Uso correcto de Content API | **Parcial** | `api/hotelbeds-list-hotels.js` + listados para desplegables; no es catálogo completo al estilo guía. |
| **6 Live** | Booking + cancel en LIVE | **Post-certificación** | Tras llaves LIVE y acuerdo con HB. |

**Conclusión:** Podéis afirmar **Availability + CheckRate condicional + Booking + envío de voucher a Stripe** en el flujo de paquetes con alojamiento HB **cuando** el usuario tiene fechas, hotel con `rateKey` en la última disponibilidad y datos del titular. Seguís con **lagunas** (promociones, políticas cancelación en UI, rate comments, multi-room/pax, `sourceMarket`, GZIP explícito) — aclaradlas en correo o completadlas antes de la revisión.

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

2. **CheckRate** — Implemented on the **package payment path** when the selected rate requires it: our client (`js/hotelbeds-paquetes.js`) prefers **BOOKABLE** rates when indexing availability; if the chosen rate is **`rateType=RECHECK`**, we call **`POST …/checkrates`** through the same server proxy (`POST /api/hotelbeds-availability` with `action: "checkrates"`). We do **not** call CheckRate for BOOKABLE-only paths. **Batch CheckRate (up to 10)** for multiple RECHECK rooms is **not** wired from the package UI yet.

3. **Confirmation (Booking)** — Implemented for **package pages that load our Hotelbeds pricing script**: before redirecting to **Stripe** (`POST /api/crear-pago` + Payment Links), the browser calls our proxy with **`action: "booking"`** and the **`rateKey`** from the last Availability response (or from CheckRate when RECHECK). The proxy uses a **≥ 60 s** server-side timeout (**65 s**) on **`/hotel-api/1.0/bookings`** (§3.11). **Commercial order:** we confirm the **Hotelbeds booking first**, then create the Stripe Payment Link including **`hotelbedsVoucher`** in the JSON body so **`hb_*` metadata** can be stored and the **webhook** (`/api/webhook-stripe` + `lib/hotelbeds-voucher-html.js`) can email the HTML voucher. If Hotelbeds pre-book fails, payment may still proceed **without** voucher metadata unless strict mode is enabled (`HOTELBEDS_STRICT_PREBOOK` / `hotelbedsStrictPrebook`). **Scope limits:** we currently send **one room / one adult (lead guest from `usuario[1]`)** from the package form; pages **without** `hotelbeds-paquetes.js` do not trigger this path.

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

**Today:** Voucher HTML for hotels is implemented in **`/api/webhook-stripe`** using **`lib/hotelbeds-voucher-html.js`** when Stripe metadata contains **`hb_*`** fields produced from **`hotelbedsVoucher`** in **`POST /api/crear-pago`**. On package pages with **`js/hotelbeds-paquetes.js`**, **`js/stripe-pago.js`** calls **`window.tryHotelbedsBookForStripe`** before **`crear-pago`** and passes the returned voucher when Booking succeeds.

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

**Merchant model:** **ADRINOS SL** collects **package payment** from the end customer via **Stripe** on our website. For configured **Hotelbeds accommodation** flows, we typically **confirm the Hotelbeds booking on the server proxy first** (so voucher data can be attached to the Stripe session), then the customer completes payment on Stripe. **Settlement with Hotelbeds** is handled under our **commercial agreement**.

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

**Flujo (real hoy):** Disponibilidad vía proxy (`/api/hotelbeds-availability`), precios en vivo en paquetes con `hotelbeds-paquetes.js`, debounce 800 ms. Antes de Stripe: **CheckRate** solo si la tarifa es `RECHECK`; **Booking** con `rateKey` y timeout servidor **65 s**; si hay voucher, **`crear-pago`** recibe `hotelbedsVoucher` y el webhook puede enviar el HTML. Ver tabla *Estado del código* y límites (1 hab. / titular). Páginas sin script Hotelbeds no hacen pre-reserva.

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
| **Voucher** | **Infra:** `/api/webhook-stripe` + `hb_*` from `hotelbedsVoucher` in `POST /api/crear-pago`. **Paquetes con HB:** `stripe-pago.js` + `tryHotelbedsBookForStripe` en `hotelbeds-paquetes.js`. **Sin script HB en la página:** no voucher. |
| **Login** | None or test user |
| **test / production** | As agreed with Hotelbeds |

**Implementation note:** Re-read the **English** workflow block before sending; disclose **gaps** still marked **No / Parcial** in the Spanish table (promotions, cancellation UI, rate comments, `sourceMarket`, multi-room, GZIP if required).

---

## Quick fill-in checklist

| Item | Your value |
|------|------------|
| Production URL | `https://web-lerma.vercel.app` (update if project moves) |
| Test vs prod Hotelbeds API | |
| Secure channel for API key/secret | |
| Contact name / email | |

After sending, keep a copy of the completed PDF and the exact URL you gave them.
