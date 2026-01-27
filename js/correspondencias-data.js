/**
 * Datos de correspondencias: clubs con acuerdo y precios green fee.
 * Fuente: CORRESPONDENCIAS_GOLFLERMA_GOLFSALDAÑA - Hoja 1.csv
 * LABORABLES -> greenFeeLerma | SÁB./FEST. -> greenFeeSaldana
 * Para regenerar: node scripts/generar-correspondencias.js
 */
const CORRESPONDENCIAS_DATA = {
  clubs: [
    { id: "abra-del-pas", nombre: "ABRA DEL PAS (Cantabria - Mogro)", greenFeeLerma: 16, greenFeeSaldana: 21 },
    { id: "augas-santas", nombre: "AUGAS SANTAS CLUB DE GOLF ( Lugo)", greenFeeLerma: 25, greenFeeSaldana: 35 },
    { id: "augusta-golf", nombre: "AUGUSTA GOLF (Calatayud)", greenFeeLerma: 28, greenFeeSaldana: 42 },
    { id: "la-barganiza", nombre: "LA BARGANIZA (Oviedo)", greenFeeLerma: 25, greenFeeSaldana: 40 },
    { id: "balneario-mondariz", nombre: "BALNEARIO DE MONDARIZ GOLF (Ponteveedra)", greenFeeLerma: 25, greenFeeSaldana: 25 },
    { id: "basozabal", nombre: "BASOZABAL CLUB DE GOLF ( Guipuzcoa)", greenFeeLerma: 25, greenFeeSaldana: 40 },
    { id: "castiello", nombre: "CASTIELLO CLUB DE GOLF (Gijón)", greenFeeLerma: 18, greenFeeSaldana: 35 },
    { id: "castillo-gorraiz", nombre: "CASTILLO DE GORRAIZ ( Navarra)", greenFeeLerma: 7, greenFeeSaldana: 9 },
    { id: "cierre-grande", nombre: "CIERRO GRANDE (Asturias)", greenFeeLerma: 15, greenFeeSaldana: 15 },
    { id: "ganguren-golf", nombre: "GANGUREN GOLF (Artxanda) (Vizcaya)", greenFeeLerma: 18, greenFeeSaldana: 35 },
    { id: "gijon-golf-llorea", nombre: "GIJON GOLF -LA LLOREA (Asturias)", greenFeeLerma: 19, greenFeeSaldana: 23 },
    { id: "golf-nestares", nombre: "GOLF NESTARES (Cantabria)", greenFeeLerma: 16, greenFeeSaldana: 21 },
    { id: "goiburu-golf", nombre: "GOIBURU GOLF (S. Sebastian)", greenFeeLerma: null, greenFeeSaldana: null },
    { id: "jaizkibel", nombre: "JAIZKIBEL/REAL GOLF DE SAN SEBASTIAN", greenFeeLerma: 25, greenFeeSaldana: 25 },
    { id: "laukariz", nombre: "LAUKARIZ CLUB DE CAMPO (Vizcaya)", greenFeeLerma: 25, greenFeeSaldana: 40 },
    { id: "la-ulzama", nombre: "LA ULZAMA CLUB DE GOLF (Navarra)", greenFeeLerma: 15.5, greenFeeSaldana: 35 },
    { id: "la-rasa-berbes", nombre: "LA RASA DE BERBES (Ribadesella)", greenFeeLerma: 16, greenFeeSaldana: 16 },
    { id: "larrabea", nombre: "LARRABEA CLUB DE GOLF (Alava)", greenFeeLerma: 10, greenFeeSaldana: 10 },
    { id: "las-caldas", nombre: "LAS CALDAS GOLF (Oviedo)", greenFeeLerma: 20, greenFeeSaldana: 30 },
    { id: "los-lagos", nombre: "LOS LAGOS (Zaragoza)", greenFeeLerma: 30, greenFeeSaldana: 42.5 },
    { id: "llanes", nombre: "LLANES CAMPO DE GOLF (Asturias)", greenFeeLerma: 18, greenFeeSaldana: 25 },
    { id: "matalenas", nombre: "MATALEÑAS GOLF (Santander)", greenFeeLerma: 17, greenFeeSaldana: 17 },
    { id: "meaztegui", nombre: "MEAZTEGUI GOLF CLUB (Bizcaya)", greenFeeLerma: 36.75, greenFeeSaldana: 51.25 },
    { id: "margas-golf", nombre: "MARGAS GOLF", greenFeeLerma: 30, greenFeeSaldana: 35 },
    { id: "ria-de-vigo", nombre: "RIA DE VIGO CLUB DE GOLF ( Ponteveedra)", greenFeeLerma: 25, greenFeeSaldana: 25 },
    { id: "senorio-zuasti", nombre: "SEÑORIO DE ZUASTI (Navarra)", greenFeeLerma: 25, greenFeeSaldana: 45 },
    { id: "santamarina", nombre: "SANTAMARINA GOLF", greenFeeLerma: null, greenFeeSaldana: null },
    { id: "villarias", nombre: "VILLARIAS", greenFeeLerma: 20, greenFeeSaldana: null },
    { id: "zarauz", nombre: "ZARAUZ CLUB DE GOLF (Guipuzcoa)", greenFeeLerma: 20, greenFeeSaldana: 40 },
    { id: "zuia", nombre: "ZUIA CLUB DE GOLF (Alava)", greenFeeLerma: 25, greenFeeSaldana: 45 },
    { id: "golf-xaz", nombre: "GOLF XAZ Oleiros (A Coruña)", greenFeeLerma: 15, greenFeeSaldana: 15 },
    { id: "golf-jundiz", nombre: "GOLF JUNDIZ Vitoria", greenFeeLerma: 16, greenFeeSaldana: 16 },
    { id: "la-penaza", nombre: "LA PEÑAZA REAL CLUB DE GOLF (Zaragoza)", greenFeeLerma: 49.5, greenFeeSaldana: 56 },
    { id: "uraburu", nombre: "URABURU GOLF (GALDACANO)", greenFeeLerma: 25, greenFeeSaldana: 40 },
    { id: "izki-golf", nombre: "IZKI GOLF ( Álava)", greenFeeLerma: 20, greenFeeSaldana: 35 },
    { id: "aldeamayor", nombre: "ALDEAMAYOR GOLF (Valladolid)", greenFeeLerma: 26, greenFeeSaldana: 36 },
    { id: "cabanillas", nombre: "CABANILLAS GOLF (Guadalajara)", greenFeeLerma: 32, greenFeeSaldana: 60 },
    { id: "golf-ciudad-real", nombre: "GOLF CIUDAD REAL", greenFeeLerma: 25, greenFeeSaldana: 35 },
    { id: "cuenca-golf", nombre: "CUENCA GOLF CLUB ( Cuenca)", greenFeeLerma: 20, greenFeeSaldana: 30 },
    { id: "la-dehesa", nombre: "LA DEHESA (Madrid)", greenFeeLerma: 30, greenFeeSaldana: null },
    { id: "entrepinos", nombre: "ENTREPINOS CLUB DE GOLF ( Valladolid)", greenFeeLerma: 15, greenFeeSaldana: 30 },
    { id: "la-faisanera", nombre: "LA FAISANERA GOLF (Segovia)", greenFeeLerma: 30, greenFeeSaldana: 40 },
    { id: "la-galera", nombre: "LA GALERA CLUB DE GOLF ( Valladolid)", greenFeeLerma: 18, greenFeeSaldana: 36 },
    { id: "guadiana-golf", nombre: "GUADIANA GOLF (Badajoz)", greenFeeLerma: 30, greenFeeSaldana: 30 },
    { id: "grijota", nombre: "GRIJOTA GOLF (Palencia)", greenFeeLerma: 17, greenFeeSaldana: 22 },
    { id: "isla-dos-aguas", nombre: "ISLA DOS AGUAS (Palencia)", greenFeeLerma: 14, greenFeeSaldana: 19 },
    { id: "la-herreria", nombre: "LA HERRERIA (Madrid)", greenFeeLerma: 25, greenFeeSaldana: 60 },
    { id: "leon-golf-cueto", nombre: "LEON GOLF EL CUETO", greenFeeLerma: 33, greenFeeSaldana: 45 },
    { id: "logrono-la-grajera", nombre: "LOGROÑO GOLF LA GRAJERA", greenFeeLerma: 26, greenFeeSaldana: 36 },
    { id: "lomas-bosque", nombre: "LOMAS BOSQUE GOLF (Madrid)", greenFeeLerma: 20, greenFeeSaldana: null },
    { id: "layos-golf", nombre: "LAYOS GOLF (Toledo)", greenFeeLerma: 25, greenFeeSaldana: 40 },
    { id: "naturavila-fresnillo", nombre: "NATURAVILA EL FRESNILLO GOLF (Avila)", greenFeeLerma: 25, greenFeeSaldana: 35 },
    { id: "norba-golf", nombre: "NORBA GOLF (Cáceres)", greenFeeLerma: 20, greenFeeSaldana: 35 },
    { id: "nuevo-club-madrid-las-matas", nombre: "NUEVO CLUB DE GOLF DE MADRID LAS MATAS (Madrid)", greenFeeLerma: 19, greenFeeSaldana: 36 },
    { id: "palomarejos", nombre: "PALOMAREJOS GOLF (Toledo)", greenFeeLerma: 25, greenFeeSaldana: 45 },
    { id: "pinaillas", nombre: "PINAILLAS CLUB DE GOLF (Albacete)", greenFeeLerma: 30, greenFeeSaldana: 40 },
    { id: "retamares", nombre: "RETAMARES CLUB (Madrid)", greenFeeLerma: 18, greenFeeSaldana: 35 },
    { id: "rioja-alta", nombre: "RIOJA ALTA (Logroño)", greenFeeLerma: 19, greenFeeSaldana: 19 },
    { id: "el-robledal", nombre: "EL ROBLEDAL GOLF (Madrid)", greenFeeLerma: 25, greenFeeSaldana: 35 },
    { id: "salamanca-zarapicos", nombre: "SALAMANCA ZARAPICOS GOLF (Salamanca)", greenFeeLerma: 30, greenFeeSaldana: 40 },
    { id: "sojuela", nombre: "SOJUELA GOLF (La Rioja)", greenFeeLerma: 27, greenFeeSaldana: 40 },
    { id: "soria-golf", nombre: "SORIA GOLF", greenFeeLerma: 20, greenFeeSaldana: 25 },
    { id: "sotoverde", nombre: "SOTOVERDE (VALLADOLID)", greenFeeLerma: 10, greenFeeSaldana: 15 },
    { id: "villamayor", nombre: "VILLAMAYOR GOLF (Salamanca)", greenFeeLerma: 30, greenFeeSaldana: 40 },
    { id: "la-valmuza", nombre: "LA VALMUZA GOLF (Salamanca)", greenFeeLerma: 25, greenFeeSaldana: 35 },
    { id: "altorreal", nombre: "ALTORREAL GOLF (Murcia)", greenFeeLerma: 35, greenFeeSaldana: 35 },
    { id: "arcos-golf-cadiz", nombre: "ARCOS GOLF (Cadiz)", greenFeeLerma: 45, greenFeeSaldana: 45 },
    { id: "barcelona-club", nombre: "BARCELONA CLUB DE GOLF", greenFeeLerma: 19, greenFeeSaldana: 35 },
    { id: "bonalba", nombre: "BONALBA CLUB DE GOLF ( Alicante)", greenFeeLerma: 35, greenFeeSaldana: 35 },
    { id: "bonmont", nombre: "BONMONT TERRES NOVES (Tarragona)", greenFeeLerma: 30, greenFeeSaldana: 30 },
    { id: "el-bosque-valencia", nombre: "EL BOSQUE CLUB DE GOLF (Valencia)", greenFeeLerma: 40, greenFeeSaldana: 45 },
    { id: "costa-teguise", nombre: "COSTA TEGUISE GOLF (LANZAROTE)", greenFeeLerma: 40.5, greenFeeSaldana: 40.5 },
    { id: "foressos", nombre: "FORESSOS GOLF (Valencia)", greenFeeLerma: 35, greenFeeSaldana: 40 },
    { id: "la-finca-algorfa", nombre: "LA FINCA - ALGORFA GOLF (Alicante)", greenFeeLerma: 55, greenFeeSaldana: 55 },
    { id: "golf-daro", nombre: "GOLF D´ARO - MAS NOU ( Girona)", greenFeeLerma: 18, greenFeeSaldana: 36 },
    { id: "llavaneras", nombre: "LLAVANERAS CLUB DE GOLF (Barcelona)", greenFeeLerma: 11, greenFeeSaldana: 22 },
    { id: "mosa-trajectum", nombre: "MOSA TRAJECTUM GOLF (Murcia)", greenFeeLerma: 42, greenFeeSaldana: 42 },
    { id: "marbella-golf-malaga", nombre: "MARBELLA GOLF (Málaga)", greenFeeLerma: 67, greenFeeSaldana: 79 },
    { id: "las-ramblas-orihuela", nombre: "LAS RAMBLAS DE ORIHUELA (Alicante)", greenFeeLerma: 48, greenFeeSaldana: 60 },
    { id: "rcg-las-palmas", nombre: "REAL CLUB DE GOLF DE LAS PALMAS (Gran Canaria)", greenFeeLerma: 12, greenFeeSaldana: 12 },
    { id: "el-saler", nombre: "EL SALER GOLF (Valencia)", greenFeeLerma: null, greenFeeSaldana: null },
    { id: "la-serena", nombre: "LA SERENA GOLF (Murcia)", greenFeeLerma: 32, greenFeeSaldana: 32 },
    { id: "terramar", nombre: "TERRAMAR CLUB DE GOLF (Barcelona)", greenFeeLerma: null, greenFeeSaldana: null },
    { id: "villamartin", nombre: "VILLAMARTIN GOLF (Alicante)", greenFeeLerma: 49, greenFeeSaldana: 49 },
    { id: "golf-la-roca", nombre: "GOLF LA ROCA ( Barcelona)", greenFeeLerma: 25, greenFeeSaldana: 40 },
    { id: "golf-son-parc", nombre: "GOLF SON PARC Menorca", greenFeeLerma: 30, greenFeeSaldana: 30 },
    { id: "alboran", nombre: "ALBORAN GOLF (Almería)", greenFeeLerma: 35, greenFeeSaldana: 35 },
    { id: "alcaidesa", nombre: "ALCAIDESA GOLF (Cadiz)", greenFeeLerma: 88, greenFeeSaldana: 60 },
    { id: "anoreta", nombre: "AÑORETA GOLF ( MALAGA)", greenFeeLerma: 45, greenFeeSaldana: 45 },
    { id: "arcos-golf-cadiz-sur", nombre: "ARCOS GOLF (Cádiz)", greenFeeLerma: 30, greenFeeSaldana: 40 },
    { id: "bavierra", nombre: "BAVIERA GOLF(Málaga)", greenFeeLerma: 52, greenFeeSaldana: 52 },
    { id: "bellavista", nombre: "BELLAVISTA CLUB DE GOLF ( Huelva)", greenFeeLerma: 37, greenFeeSaldana: 37 },
    { id: "cordoba-club", nombre: "CORDOBA CLUB DE GOLF", greenFeeLerma: 20, greenFeeSaldana: 30 },
    { id: "granada-corsarios", nombre: "GRANADA GOLF LOS CORSARIOS", greenFeeLerma: 45, greenFeeSaldana: 45 },
    { id: "golf-nuevo-portil", nombre: "GOLF NUEVO PORTIL (Cartaya, Huelva)", greenFeeLerma: 35, greenFeeSaldana: 35 },
    { id: "marbella-golf-sur", nombre: "MARBELLA GOLF (Málaga)", greenFeeLerma: 79, greenFeeSaldana: 79 },
    { id: "novo-santi-petri", nombre: "NOVO SANTI PETRI (Cadiz)", greenFeeLerma: 42, greenFeeSaldana: 42 },
    { id: "rio-real", nombre: "RIO REAL GOLF (Mabella)", greenFeeLerma: 71, greenFeeSaldana: 71 },
    { id: "valle-romano", nombre: "VALLE ROMANO (Estepona)", greenFeeLerma: null, greenFeeSaldana: null },
    { id: "villanueva-golf", nombre: "VILLANUEVA GOLF (Cadiz)", greenFeeLerma: 32, greenFeeSaldana: 32 },
    { id: "zaudin", nombre: "ZAUDIN GOLF (Sevilla)", greenFeeLerma: 35, greenFeeSaldana: null },
    { id: "golf-margaux", nombre: "GOLF MARGAUX", greenFeeLerma: 30, greenFeeSaldana: 30 },
    { id: "hossegor", nombre: "HOSSEGOR ( Francia)", greenFeeLerma: 18, greenFeeSaldana: 63 },
    { id: "moliets", nombre: "MOLIETS GOLF", greenFeeLerma: 37, greenFeeSaldana: 59.2 },
    { id: "montebelo", nombre: "MONTEBELO GOLFE (Portugal)", greenFeeLerma: 27, greenFeeSaldana: 35 },
    { id: "la-nivelle", nombre: "LA NIVELLE GOLF (Francia)", greenFeeLerma: null, greenFeeSaldana: null },
    { id: "pau-golf", nombre: "PAU GOLF (Francia)", greenFeeLerma: 10, greenFeeSaldana: 40 },
    { id: "quinta-do-vale", nombre: "QUINTA DO VALE GOLF (Portugal)", greenFeeLerma: 30, greenFeeSaldana: 30 },
    { id: "vidago", nombre: "VIDAGO GOLF (Portugal)", greenFeeLerma: 65, greenFeeSaldana: 65 },
    { id: "makila", nombre: "MAKILA GOLF CLUB Bayona", greenFeeLerma: null, greenFeeSaldana: null }
  ]
};

function getClubsCorrespondencia() {
  return CORRESPONDENCIAS_DATA.clubs || [];
}

function getClubById(id) {
  return (CORRESPONDENCIAS_DATA.clubs || []).find(function (c) { return c.id === id; });
}

function getPrecioGreenFee(clubId, campo) {
  var c = getClubById(clubId);
  if (!c) return null;
  if (campo === "lerma") return c.greenFeeLerma != null ? c.greenFeeLerma : null;
  if (campo === "saldana") return c.greenFeeSaldana != null ? c.greenFeeSaldana : null;
  return null;
}

function isCorrespondencia(clubId) {
  return !!getClubById(clubId);
}
