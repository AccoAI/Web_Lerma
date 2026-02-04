/**
 * Precios centralizados para todos los paquetes y configuradores.
 * Edita este archivo para actualizar los precios en la web.
 * Se usa en: Fin de Semana, Cochinillo, Golf y Vino, 36 Hoyos, Pausa & Drive, Tour Boogie, Ryder, Torneos.
 */
window.PRECIOS_DATA = {
  /* Green fees sin correspondencia (€ por persona). Laborable = lun-vie, finDeSemana = sáb/dom */
  greenFees: {
    lerma: { laborable: 33, finDeSemana: 44 },
    saldana: { laborable: 33, finDeSemana: 44 }
  },

  /* Hoteles: precio por noche (€). hotelbedsCode = código en Hotelbeds (rellenar para precios en tiempo real) */
  hoteles: {
    lerma: [
      { id: 'alisa', nombre: 'Hotel Alisa', precioPorNoche: 65, hotelbedsCode: null },
      { id: 'ceres', nombre: 'Hotel CERES', precioPorNoche: 70, hotelbedsCode: null },
      { id: 'parador', nombre: 'Parador de Lerma', precioPorNoche: 95, hotelbedsCode: null }
    ],
    burgos: [
      { id: 'silken', nombre: 'Silken', precioPorNoche: 55, hotelbedsCode: null },
      { id: 'palacio-blasones', nombre: 'Palacio de los Blasones', precioPorNoche: 60, hotelbedsCode: null },
      { id: 'hotel-centro', nombre: 'Hotel Centro', precioPorNoche: 50, hotelbedsCode: null }
    ]
  },

  /* Comida/cena (€ por servicio por persona) */
  comida: { lerma: 22, burgos: 25 },

  /* Servicios adicionales (€) */
  ancillaries: {
    buggy: 15,
    carritoMano: 3,
    carritoElectrico: 5,
    cuboChampagne: 40,
    cuboCervezas: 15,
    cuboVinoBlanco: 26
  },

  /* Parámetros por paquete */
  paquetes: {
    finSemana: { descuentoPorcentaje: 15, greenFeesIncluidos: 2 },
    cochinillo: { precioBasePorPersona: 55 },
    pausaDrive: { precioCerrado: 50 },
    golfVino: { descuentoPorcentaje: 10 },
    tourBoogie: { precioBasePorPersona: 20 },
    bautismos: { adultos: 15, jovenes: 10 }
  }
};
