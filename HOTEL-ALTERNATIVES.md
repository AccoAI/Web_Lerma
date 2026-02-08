# Alternativas a Hotelbeds para alojamiento

Comparativa rápida para el paquete Fin de Semana y configuradores (Lerma/Burgos).

## Resumen

| Opción | Complejidad | Control en tu web | Reserva | Comisión |
|--------|-------------|-------------------|--------|----------|
| **Widget / Affiliate Booking.com** | Muy baja | Solo búsqueda → enlace | En Booking.com | Sí (25–40% de su comisión) |
| **Amadeus (Hotel List + Search)** | Media (similar a Hotelbeds) | Precios en tiempo real en tu página | En tu flujo o redirección | Depende del contrato |
| **Expedia (demand-side)** | Media–alta | Depende del producto affiliate | En Expedia o tu flujo | Sí (affiliate) |
| **Hotelbeds (actual)** | Alta (API + mTLS en prod) | Precios en tiempo real | En tu flujo | Depende del contrato |

---

## 1. Widget / Affiliate de Booking.com (la más sencilla)

**Ventajas**
- Sin backend: solo insertar un widget o enlace en tu HTML.
- Sin API keys en tu servidor, sin mTLS, sin mantener códigos de hotel.
- Booking.com gestiona disponibilidad, precios y reserva.
- Comisión por reservas (programa Affiliate, p.ej. via Awin/CJ).
- Muy rápido de integrar (horas, no semanas).

**Inconvenientes**
- El usuario sale de tu web para completar la reserva en Booking.com.
- No puedes mostrar el precio “dentro” de tu resumen de paquete (solo “reserva hotel aquí” o precios fijos/estimados).

**Cómo empezar**
1. Registrarse en [partnerships.booking.com](https://partnerships.booking.com/) (Affiliate).
2. Obtener Affiliate ID y (según región) enlazar con Awin o CJ Affiliate.
3. Añadir en tu página:
   - **Search Box** (widget oficial, destino predefinido p.ej. Lerma/Burgos), o
   - Enlaces de afiliado a búsquedas por destino/fechas.

En el configurador de Fin de Semana podrías:
- Mantener la selección “hotel por noche” (Alisa, Parador, etc.) con **precios fijos** de `precios-data.js`.
- Añadir un bloque: “Ver disponibilidad y precios en tiempo real en **Booking.com**” con el widget o enlace affiliate (destino Lerma/Burgos, fechas del formulario).

---

## 2. Amadeus (Hotel List + Hotel Search)

**Ventajas**
- APIs REST bien documentadas (Hotel List, Hotel Search, opcional Hotel Booking).
- No exigen mTLS en producción (a diferencia de Hotelbeds).
- Puedes mostrar disponibilidad y precios en tiempo real en tu web, de forma similar a Hotelbeds.
- Más de 150.000 hoteles; cubren Lerma/Burgos.

**Inconvenientes**
- Necesitas cuenta en [developers.amadeus.com](https://developers.amadeus.com/), API Key y Secret.
- Tienes que mapear “tus” hoteles (Alisa, Parador, etc.) a **Amadeus property IDs** (equivalente a los códigos Hotelbeds).
- Implementación de backend (proxy en `/api/amadeus-...`) similar en esfuerzo a tu actual `hotelbeds-availability`, pero sin mTLS.

**Flujo típico**
1. **Hotel List API**: buscar hoteles por ciudad/coordenadas → obtener `hotelId` (código Amadeus).
2. **Hotel Search API**: con `hotelId`, fechas y ocupación → disponibilidad y precios.
3. Opcional: **Hotel Booking API** para cerrar la reserva, o redirigir a otro canal.

Si quieres sustituir Hotelbeds por Amadeus, el cambio sería: nuevo backend que llame a Amadeus en lugar de Hotelbeds, y en el front sustituir llamadas a `/api/hotelbeds-availability` por `/api/amadeus-availability`, manteniendo la misma idea de “precios en tiempo real” en el configurador.

---

## 3. Expedia

- **Expedia Partner Solutions (Supply)**: APIs pensadas para **hoteles** que envían inventario a Expedia. No es el caso típico de una web de paquetes que solo quiere “mostrar y enlazar” hoteles.
- **Expedia Affiliate / demand-side**: existen programas de afiliados para enlazar a Expedia; la integración técnica suele ser enlaces o widgets, no siempre una API de disponibilidad en tiempo real como la que tienes con Hotelbeds.
- Si solo quieres “enlace + comisión”, un enlace affiliate de Expedia puede ser sencillo; si quieres precios en tiempo real en tu página, hay que valorar si tienen API pública para tu perfil (affiliate/demand).

---

## Recomendación práctica

1. **Si priorizas “más sencillo” y aceptas que la reserva sea en Booking.com**  
   → **Widget / enlaces de Booking.com Affiliate**.  
   Mantienes en tu paquete la lógica de “hotel por noche” con precios fijos (o texto “desde X €”) y añades un bloque claro: “Comprueba disponibilidad y precio en Booking.com” con el widget o enlace con tus fechas/destino.

2. **Si quieres seguir mostrando precios en tiempo real en tu web como ahora con Hotelbeds, pero evitar mTLS y complejidad**  
   → **Amadeus** (Hotel List + Hotel Search) como sustitución técnica.  
   Es un trabajo similar al que ya tienes (proxy API + códigos de hotel), pero sin el requisito de certificado cliente en producción.

3. **Expedia**  
   Tiene más sentido como canal affiliate (enlaces/widget) que como sustitución directa de la API de disponibilidad de Hotelbeds, a menos que confirmes con ellos un producto API para tu caso de uso.

Si indicas si prefieres “todo en tu web con precios en tiempo real” o “más simple con reserva en Booking.com”, se puede bajar al detalle (por ejemplo: dónde poner el widget en `paquete-fin-semana.html` o esquema de endpoints para Amadeus).