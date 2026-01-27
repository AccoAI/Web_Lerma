/**
 * Datos de correspondencias: clubs con acuerdo y precios green fee.
 * Editar este array para mantener la lista. Si se añade weekend, usar greenFeeLermaSabado / greenFeeSaldanaSabado.
 */
const CORRESPONDENCIAS_DATA = {
  clubs: [
    { id: "rcg-herrería", nombre: "Real Club de Golf La Herrería", greenFeeLerma: 35, greenFeeSaldana: 32 },
    { id: "cg-retamares", nombre: "Club de Golf Retamares", greenFeeLerma: 38, greenFeeSaldana: 35 },
    { id: "cg-villafranca", nombre: "Club de Golf Villafranca del Castillo", greenFeeLerma: 36, greenFeeSaldana: 33 },
    { id: "rcg-sevilla", nombre: "Real Club de Golf de Sevilla", greenFeeLerma: 40, greenFeeSaldana: 37 },
    { id: "cg-negralejo", nombre: "Club de Golf Negralejo", greenFeeLerma: 35, greenFeeSaldana: 32 }
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
