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

  /* Hoteles: precio por noche (€). hotelbedsCode / amadeusHotelId = códigos para precios en tiempo real */
  hoteles: {
    lerma: [
      { id: 'alisa', nombre: 'Hotel Alisa', precioPorNoche: 65, hotelbedsCode: null, amadeusHotelId: null },
      { id: 'ceres', nombre: 'Hotel CERES', precioPorNoche: 70, hotelbedsCode: null, amadeusHotelId: null },
      { id: 'parador', nombre: 'Parador de Lerma', precioPorNoche: 95, hotelbedsCode: null, amadeusHotelId: null }
    ],
    burgos: [
      { id: 'silken', nombre: 'Silken', precioPorNoche: 55, hotelbedsCode: null, amadeusHotelId: null },
      { id: 'palacio-blasones', nombre: 'Palacio de los Blasones', precioPorNoche: 60, hotelbedsCode: null, amadeusHotelId: null },
      { id: 'hotel-centro', nombre: 'Hotel Centro', precioPorNoche: 50, hotelbedsCode: null, amadeusHotelId: null }
    ]
  },

  /* Comida/cena (€ por servicio por persona) — reservas externas fuera del pack */
  comida: { lerma: 22, burgos: 25 },

  /** Menús Casa Club Lerma (solo comidas; se cobran en el paquete, €/persona) */
  casaClubMenus: [
    { id: 'huevos', label: 'Menú huevos con morcilla', precioPorPersona: 16, imagen: 'FOTOS/menus/menu-huevos.png' },
    { id: 'hamburguesa', label: 'Menú hamburguesa', precioPorPersona: 16, imagen: 'FOTOS/menus/menu-hamburguesa.png' },
    { id: 'cochinillo', label: 'Menú cordero/cochinillo', precioPorPersona: 40, imagen: 'FOTOS/menus/menu-cochinillo.png' },
  ],

  /* Servicios adicionales (€) */
  ancillaries: {
    buggy: 15,
    carritoMano: 3,
    carritoElectrico: 5,
    cuboChampagne: 40,
    cuboCervezas: 15,
    cuboVinoBlanco: 26,
    bolasPersonalizadas: 25,
    equipacionEquipos: 35,
    gestionTrofeos: 50,
    premioEconomico: 0,
    guantesGolf: 13,
    paqueteTees: 4,
    paqueteBolas: 35
  },

  /** Tienda de golf (paquete Burgos; contadores por producto, no por día) */
  tiendaGolfProductos: [
    { id: 'guantes', precioKey: 'guantesGolf', i18n: 'tienda_guantes', fallback: 'Guantes de Golf', imagen: 'FOTOS/00108427603926____1__1200x1200.avif', inputName: 'tienda_guantes', inputId: 'tienda-guantes' },
    { id: 'tees', precioKey: 'paqueteTees', i18n: 'tienda_tees', fallback: 'Paquete de Tees', imagen: 'FOTOS/tourteepro_1.jpg', inputName: 'tienda_tees', inputId: 'tienda-tees' },
    { id: 'bolas', precioKey: 'paqueteBolas', i18n: 'tienda_bolas', fallback: 'Paquete de Bolas', imagen: 'FOTOS/picture.jpg', inputName: 'tienda_bolas', inputId: 'tienda-bolas' },
  ],

  /** Tarjetas servicios adicionales por día (buggies / carritos) */
  ancillaryServicios: [
    { id: 'buggy', precioKey: 'buggy', i18n: 'anc_buggies', fallback: 'Buggies', imagen: 'FOTOS/servicios/buggy.png', field: 'buggy', inputPrefix: 'ancillary_buggy_dia_', inputIdPrefix: 'ancillary-buggy-dia-' },
    { id: 'carritoMano', precioKey: 'carritoMano', i18n: 'anc_carrito_mano', fallback: 'Carrito de mano', imagen: 'FOTOS/servicios/carrito-mano.png', field: 'mano', inputPrefix: 'ancillary_carrito_mano_dia_', inputIdPrefix: 'ancillary-carrito-mano-dia-' },
    { id: 'carritoElectrico', precioKey: 'carritoElectrico', i18n: 'anc_carrito_electrico', fallback: 'Carrito eléctrico', imagen: 'FOTOS/servicios/carrito-electrico.png', field: 'elec', inputPrefix: 'ancillary_carrito_electrico_dia_', inputIdPrefix: 'ancillary-carrito-elec-dia-' },
  ],

  /* Parámetros por paquete */
  paquetes: {
    /** lali: prepago en el pack (€/persona y por reserva comida/cena en Lali); el resto de mesas se pagan en el restaurante */
    finSemana: { descuentoPorcentaje: 15, greenFeesIncluidos: 2, laliComidaPrecioPorPersona: 35 },
    cochinillo: { precioBasePorPersona: 55 },
    pausaDrive: { precioCerrado: 50, recargaZunder: 15 },
    golfVino: { descuentoPorcentaje: 10 },
    tourBoogie: { precioBasePorPersona: 20 },
    bautismos: { adultos: 15, jovenes: 10 },
    ryder: { transporteDesdeMadrid: 400 }
  }
};
