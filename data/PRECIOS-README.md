# Precios - Listado para actualizar

Edita el archivo **`js/precios-data.js`** para cambiar los precios. Este archivo alimenta todos los configuradores de paquetes.

**No hace falta base de datos.** Los precios se leen desde este archivo JavaScript al cargar la página.

## Qué está conectado

- **Fin de Semana:** green fees (por día/campo), hoteles, comidas, descuento pack
- **Correspondencias:** siguen en `correspondencias-data.js` (clubs con acuerdo)
- Las tarifas de correspondencia se aplican automáticamente cuando el usuario elige su club

## Estructura en `precios-data.js`

### greenFees
Precio del green fee por persona cuando **no** hay correspondencia (€).
- `lerma.laborable` / `lerma.finDeSemana`
- `saldana.laborable` / `saldana.finDeSemana`

### hoteles
Hoteles por ciudad con precio por noche (€).
- `lerma`: Hotel Alisa, CERES, Parador
- `burgos`: Silken, Palacio Blasones, Hotel Centro

### comida
Precio por comida/cena por persona (€).
- `lerma`: Club Social Golf Lerma
- `burgos`: Restaurantes en Burgos

### ancillaries
Servicios adicionales (€).
- `buggy`, `carritoMano`, `carritoElectrico`
- `cuboChampagne`, `cuboCervezas`, `cuboVinoBlanco`

### paquetes
Parámetros por paquete.
- `finSemana`: descuentoPorcentaje, greenFeesIncluidos
- `cochinillo`: precioBasePorPersona
- `pausaDrive`: hoyos9, hoyos18Buggy

## Cómo funciona el resumen

- Si eliges 3 noches → 3 salidas de green fee, 3 noches de hotel y comidas según lo elegido
- Precios de hotel: suma de cada noche según el hotel elegido
- Comidas: Lerma o Burgos según opción
- Correspondencias: si el club tiene acuerdo, se usa el precio de `correspondencias-data.js`

---

**Para actualizar precios:** edita `js/precios-data.js` con tus valores reales y despliega de nuevo.
