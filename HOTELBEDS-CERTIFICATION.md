# Hotelbeds certification — email drafts and checklist

Use this when contacting Hotelbeds (e.g. **apitude@hotelbeds.com**). Replace all `[…]` placeholders before sending. **Do not put live API secrets in email**; use their secure process or the attached form.

Official reference: [Certification process (HBX Group)](https://developer.hotelbeds.com/documentation/hotels/knowledge-base/certification-process/).

**Certification base URL (Vercel Production):** `https://web-lerma.vercel.app`

We currently use our **Vercel production URL** for certification and tester access. A **custom domain** may be added later; the **integration and API routes** (`/api/hotelbeds-availability`, etc.) remain the same.

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

### Workflow (distribution channel)

We operate a **single B2C channel** for regional golf/stay packages on our website. The technical flow is:

1. **Availability** — We call `POST …/hotel-api/1.0/hotels` **only from our server-side proxy** (`POST https://web-lerma.vercel.app/api/hotelbeds-availability`). The browser never holds Hotelbeds credentials; we authenticate with **Api-key** and **X-Signature** (HMAC). The UI uses an **800 ms debounce** to minimise unnecessary availability calls.

2. **CheckRate** — We follow your rule: **CheckRate is performed only when the selected rate from the availability response has `rateType=RECHECK`**. For rates with **`rateType=BOOKABLE`**, we use the **rateKey** from the availability response and proceed to confirmation **without** an extra CheckRate call. When multiple rates require CheckRate, we **batch up to the allowed limit per call** (as per your API).

3. **Confirmation (Booking)** — After successful **customer payment on our site (Stripe)**, our backend sends the **Booking** request (`/bookings`) with the appropriate **rateKey** (and CheckRate step only when required as above). We process the **Booking** response, store **Hotelbeds booking reference** and related details, and complete fulfilment as merchant.

**We do not repeat Availability** in the wrong place in the booking path: we avoid calling Availability again immediately before CheckRate or again before Booking in a redundant pattern, in line with sections 2.1–2.2 of your certification guide.

**Volume / batching (availability):**

- **One** availability request when querying by **explicit hotel codes** (mapped properties), with **as many hotels as practical in the same request** within your limits.
- **Two sequential** availability requests when querying by **destination** (**BUR** and **BUR2**), merged and **deduplicated** server-side (geographic scope of our product).

**Other Hotelbeds calls:** We may use **Content**-related data via **`GET https://web-lerma.vercel.app/api/hotelbeds-list-hotels`** where needed. The main path for **live pricing** is **Availability** as above.

**Technical:** Server-side requests are implemented per your API expectations; our stack handles **standard HTTP compression** as supported by our client. **[Adjust this sentence if you need to confirm explicit GZIP on outbound requests with your implementation.]**

**Booking confirmation timeout:** Our client timeout for the **booking confirmation** response is set to **at least 60 seconds**, per your requirement (section 3.11).

### Commercial decisions

Our offer is a **specialised regional golf/stay product** (Lerma and Burgos area). We scope searches to **destinations BUR and BUR2** and/or **configured hotel codes** that match that geographic scope. We display **rates and hotel names** (and, where we surface them, **room/board** and **promotions**) as returned by the API, without **undisclosed** filtering to manipulate which contracted properties appear beyond this product scope.

**If you apply any deliberate limitation** (e.g. not showing every board type on the package UI), disclose it explicitly during certification.

**Source market:** **[If you send `sourceMarket`: state code and that prices are only shown to that market. If you do not use it: “We do not use sourceMarket on availability requests.”]**

**Opaque / packaged rates:** **[If you never book rates with `packaging: true` for standalone hotel-only sale, say so. If you might, explain combination with package per rule 3.5.]**

### Cancellation policies, rate comments, promotions

**Cancellation policies:** **[Choose one]** We display **HBX Group cancellation policies** to the customer **before confirmation** as returned on the rate object, **without altering** them **/ OR** we do **not** surface them in the UI and ask that this be noted for certification (section 3.8).

**Rate comments:** Where **`rateCommentsId`** (or equivalent) applies, we ensure **comments are available to the customer before confirmation**, using **Content API RateComments** and/or **CheckRate** where your workflow requires it for **RECHECK** rates (section 3.9).

**Promotions:** We aim to surface **rate promotions** where present in the response (section 2.7 — recommendation).

### Voucher (confirmed bookings)

For **confirmed** hotel stays booked through Hotelbeds, we provide the customer with a **voucher / confirmation document** that includes, as applicable: **Hotelbeds booking reference**; **check-in / check-out**; **hotel name** and **address**; **room type** and **board type**; **lead guest / pax** details per room (and **children’s ages** if children are booked); **rate comments** where applicable; and recommended **payment/legal wording** on the voucher per your guidance (section 4).

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

**Flujo:** Disponibilidad vía proxy (`/api/hotelbeds-availability`). **CheckRate solo si `rateType=RECHECK`**; si `BOOKABLE`, confirmación con el **rateKey** de disponibilidad. Tras pago **Stripe**, **Booking** en servidor. No repetimos disponibilidad de forma redundante antes de CheckRate/Booking. Debounce 800 ms. **Timeout booking ≥ 60 s.**

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
| **Voucher** | Implemented in email via `/api/webhook-stripe` when Payment Link metadata includes Hotelbeds fields (`hb_*` from `hotelbedsVoucher` in `POST /api/crear-pago`). Map real BookingRS fields when booking API is wired. |
| **Login** | None or test user |
| **test / production** | As agreed with Hotelbeds |

**Implementation note:** If code currently **always** calls CheckRate before booking, align implementation with **`rateType=RECHECK` only**, or agree any exception in writing with Hotelbeds — the email above follows their published certification rules.

---

## Quick fill-in checklist

| Item | Your value |
|------|------------|
| Production URL | `https://web-lerma.vercel.app` (update if project moves) |
| Test vs prod Hotelbeds API | |
| Secure channel for API key/secret | |
| Contact name / email | |

After sending, keep a copy of the completed PDF and the exact URL you gave them.
