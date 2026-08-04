# Borrador respuesta a Hotelbeds — impuestos excluidos / certificación

**Asunto:** Re: Certificación — impuestos excluidos por subtipo + mapeo 90% (ADRINOS SL / Golf Lerma)

---

Buenas tardes,

Gracias por la revisión y por el resumen de puntos.

### Obligatorio — Impuestos excluidos por subtipo

En nuestra integración **ya mostramos** los impuestos y cargos no incluidos (con subtipo e importe) junto a cada tarifa en el funnel de reserva, en las fichas de hotel cuando aplica, y en el voucher de confirmación.

En las pruebas con la Api Key de **test**, las respuestas de Availability / CheckRate **no incluyen el nodo `taxes`** en las tarifas (p. ej. la reserva de prueba Abba Burgos `102-20934799`). Según vuestra documentación de [Tax Breakdown](https://developer.hotelbeds.com/documentation/hotels/knowledge-base/tax-breakdown/), esta funcionalidad está **desactivada por defecto** y debe activarse en la Api Key.

Os pedimos, por favor, que activéis en nuestra Api Key de test (y, cuando proceda, en live) el desglose:

- **Not included taxes** con **Concept Breakdown** (`type` + `subType`, p. ej. Resort Fee, Cleaning Fee, City Tax, etc.)

Así podremos verificar en UI el bloque «Impuestos / cargos no incluidos» junto a cada tarifa con datos reales. Cuando esté activo, hacemos una reserva de prueba y os avisamos para la re-revisión.

### Obligatorio — Mapeo ≥ 90% producto distribuible

Quedamos anotados: lo revisaréis cuando tengamos las **Api Keys de live**. A nivel técnico, el destino que consultamos es **BRG** (Content API + Availability sobre el catálogo del destino; en UI priorizamos un ranking comercial de hoteles con disponibilidad).

### Recomendado

Valoramos e iremos incorporando de forma progresiva: imágenes y descripción Content, instalaciones, cancelación vía Apitude, Booking List/Detail, HCN (PULL/Push), Exclusive Deal, Offers y descarga automática de estáticos. El multi-room lo tenemos parcialmente cubierto en availability; lo reforzaremos si hace falta en la misma reserva.

Quedamos a la espera de la activación del Tax Breakdown y a vuestra disposición para cualquier duda.

Un saludo,  
Víctor Adrián Lozano  
ADRINOS SL / Golf Lerma  
[email / teléfono]

---

## Notas internas (no enviar)

- UI: `paidExtrasFromRate` + bloque `.hb-funnel-rate-taxes` junto a cada tarifa del funnel; voucher vía `excludedTaxesFromRate`.
- Sin `taxes` en la response, no hay nada que pintar: no es un bug de front.
- Pedir activación a TAM / apitude: **Concept Breakdown + Not Included**.
- Tras activación: redeploy no hace falta si ya está el código; sí una prueba E2E con un hotel que devuelva Resort Fee / City Tax.
- Mapping 90%: no bloquea ahora; esperar live keys.
