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
    bolasPersonalizadasCampeonato: 8,
    poloPersonalizadoCampeonato: 45,
    packCanallaPremio: 8,
    copaGanadorLerma: 50,
    bonoTiendaCampeonato: 30,
    cavaPuros: 40,
    puroDavidoffNo5: 40,
    champagneVeuveClicquot: 60,
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

  /** Extras Campeonato Burgos (secciones 6–8) */
  campeonatoExtras: {
    equipo: [
      { id: 'bolas', tipo: 'checkboxPorJugador', precioKey: 'bolasPersonalizadasCampeonato', i18n: 'camp_bolas_personalizadas', i18nDetalle: 'camp_bolas_precio_detalle', fallback: 'Bolas personalizadas', imagen: 'FOTOS/campeonato/bolas-personalizadas.png', inputName: 'camp_bolas_personalizadas', leadTime: 20 },
      { id: 'polos', tipo: 'checkboxPorJugador', precioKey: 'poloPersonalizadoCampeonato', i18n: 'camp_equipacion_polos', i18nDetalle: 'camp_polos_precio_detalle', fallback: 'Equipación personalizada (polos)', imagen: 'FOTOS/campeonato/polos-personalizados.png', inputName: 'camp_equipacion_polos', leadTime: 20 }
    ],
    premios: [
      { id: 'bote', tipo: 'importe', i18n: 'camp_bote_efectivo', i18nDesc: 'camp_bote_efectivo_desc', fallback: 'Bote efectivo al ganador', imagen: 'FOTOS/campeonato/bote-efectivo.png', checkboxName: 'camp_bote_efectivo', inputName: 'camp_bote_efectivo_eur', inputId: 'camp-bote-eur' },
      { id: 'bono', tipo: 'importe', i18n: 'camp_bono_tienda', i18nDesc: 'camp_bono_tienda_desc', fallback: 'Bono de tienda Club Golf Lerma', imagen: 'FOTOS/campeonato/bono-tienda.png', checkboxName: 'camp_bono_tienda', inputName: 'camp_bono_tienda_eur', inputId: 'camp-bono-eur' },
      { id: 'canalla', tipo: 'checkboxPorJugador', precioKey: 'packCanallaPremio', i18n: 'camp_pack_canalla', i18nDetalle: 'camp_pack_canalla_detalle', fallback: 'Pack canalla', imagen: 'FOTOS/campeonato/pack-canalla.png', inputName: 'camp_pack_canalla', leadTime: 20 },
      { id: 'copa', tipo: 'counter', precioKey: 'copaGanadorLerma', i18n: 'camp_copa_ganador', i18nDesc: 'camp_copa_ganador_detalle', fallback: 'Copa ganador Golf Lerma', imagen: 'FOTOS/campeonato/copa-ganador.png', inputName: 'camp_copa_ganador', inputId: 'camp-copa-ganador', leadTime: 20 }
    ],
    cava: [
      { id: 'montecristo', tipo: 'counter', precioKey: 'puroDavidoffNo5', i18n: 'camp_puros_montecristo', i18nDesc: 'camp_puros_montecristo_detalle', fallback: 'Montecristo Nº 5', imagen: 'FOTOS/campeonato/montecristo-5.png', inputName: 'camp_puros_davidoff', inputId: 'camp-puros-davidoff' },
      { id: 'champagne', tipo: 'counter', precioKey: 'champagneVeuveClicquot', i18n: 'camp_champagne_veuve', i18nDesc: 'camp_champagne_veuve_detalle', fallback: 'Veuve Clicquot', imagen: 'FOTOS/campeonato/champagne.png', inputName: 'camp_champagne_veuve', inputId: 'camp-champagne-veuve' }
    ]
  },

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
