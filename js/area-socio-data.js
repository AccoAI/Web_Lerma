/**
 * Datos mock para el Área Socio.
 * En producción estos vendrían del backend / integración con simulador.
 */
window.AREA_SOCIO_DATA = {
  /** Top 10 ranking (público en widget; completo en dashboard) */
  rankingTop10: [
    { pos: 1, nombre: 'Roberto M.', score: 68, campo: 'Lerma', fecha: '2025-01-28' },
    { pos: 2, nombre: 'Ana G.', score: 69, campo: 'Saldaña', fecha: '2025-01-27' },
    { pos: 3, nombre: 'Carlos L.', score: 70, campo: 'Lerma', fecha: '2025-01-26' },
    { pos: 4, nombre: 'María S.', score: 71, campo: 'Simulador', fecha: '2025-01-25' },
    { pos: 5, nombre: 'Pablo V.', score: 72, campo: 'Saldaña', fecha: '2025-01-24' },
    { pos: 6, nombre: 'Laura F.', score: 72, campo: 'Lerma', fecha: '2025-01-23' },
    { pos: 7, nombre: 'Miguel T.', score: 73, campo: 'Simulador', fecha: '2025-01-22' },
    { pos: 8, nombre: 'Elena R.', score: 73, campo: 'Saldaña', fecha: '2025-01-21' },
    { pos: 9, nombre: 'Javier B.', score: 74, campo: 'Lerma', fecha: '2025-01-20' },
    { pos: 10, nombre: 'Sara N.', score: 74, campo: 'Simulador', fecha: '2025-01-19' }
  ],

  /** Hall of Fame (categorías) */
  hallOfFame: {
    mejorTarjetaMes: { nombre: 'Roberto M.', score: 68, campo: 'Lerma', premio: 'Premio físico al ganador' },
    consistencia: { nombre: 'Ana G.', desviacion: 1.2, desc: 'Menor desviación media entre sus vueltas' },
    mostImproved: { nombre: 'Pablo V.', mejora: '-4 golpes', desc: 'Mayor mejora esta semana' }
  },

  /** Feed Amigos y Rivales (mock) */
  feed: [
    { tipo: 'rival', texto: 'Tu amigo Ana G. acaba de superar tu mejor tarjeta en Lerma por 2 golpes.', fecha: 'Hace 2 h' },
    { tipo: 'logro', texto: '¡Has alcanzado el nivel Gold!', fecha: 'Ayer' },
    { tipo: 'rival', texto: 'Carlos L. ha igualado tu score en Saldaña. ¿Te atreves a responder?', fecha: 'Ayer' },
    { tipo: 'logro', texto: 'Logro desbloqueado: 10 partidas en simulador este mes.', fecha: 'Hace 3 días' }
  ],

  /** Perfil del socio logueado (mock) */
  miPerfil: {
    nombre: 'Socio Demo',
    usuario: 'socio',
    nivel: 'Gold',
    nivelDesc: 'Según tus tiempos respecto al récord del campo',
    handicap: 18.5,
    evolucion: [
      { mes: 'Oct', handicap: 20.2 },
      { mes: 'Nov', handicap: 19.5 },
      { mes: 'Dic', handicap: 19.0 },
      { mes: 'Ene', handicap: 18.5 }
    ],
    camposMasJugados: [
      { nombre: 'Golf Lerma', partidas: 12 },
      { nombre: 'Saldaña Golf', partidas: 8 },
      { nombre: 'Simulador Burgos', partidas: 6 }
    ],
    mejorScore: 74,
    ultimaPartida: 'Saldaña · 76 golpes · 28 Ene'
  },

  /** Niveles gamificación */
  niveles: [
    { id: 'rookie', label: 'Rookie', desc: 'Recién llegado' },
    { id: 'silver', label: 'Silver', desc: 'Según tiempos vs récord' },
    { id: 'gold', label: 'Gold', desc: 'Según tiempos vs récord' },
    { id: 'platinum', label: 'Platinum', desc: 'Según tiempos vs récord' },
    { id: 'alien', label: 'Alien', desc: 'Top 1% del centro' }
  ]
};
