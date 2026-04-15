/**
 * Bloque opcional "Transfer (Hotelbeds)" en paquetes con alojamiento.
 * Marca .paquete-transfer-hb-block en el HTML; comprueba GET /api/hotelbeds-transfers-status?status=1
 */
(function () {
  function setBadge(el, text, state) {
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hotelbeds-transfer-api-badge--pending', 'hotelbeds-transfer-api-badge--ok', 'hotelbeds-transfer-api-badge--warn');
    el.classList.add(
      state === 'ok' ? 'hotelbeds-transfer-api-badge--ok' : state === 'warn' ? 'hotelbeds-transfer-api-badge--warn' : 'hotelbeds-transfer-api-badge--pending'
    );
  }

  function bindBlock(block) {
    var cb = block.querySelector('input[name="transfer_hb_interes"]');
    var det = block.querySelector('.transfer-hb-detalles');
    if (!cb || !det) return;
    function sync() {
      det.hidden = !cb.checked;
    }
    cb.addEventListener('change', sync);
    sync();
  }

  function pingApi() {
    var origin = typeof window !== 'undefined' && window.location && window.location.origin ? window.location.origin : '';
    var badges = document.querySelectorAll('.hotelbeds-transfer-api-badge');
    badges.forEach(function (b) {
      setBadge(b, 'Comprobando acceso Transfer API…', 'pending');
    });
    fetch(origin + '/api/hotelbeds-transfers-status?status=1')
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        var ok = !!(data && data.ok && data.httpStatus === 200);
        var msg = ok
          ? 'Hotelbeds Transfers: API accesible (' + (data.environment || 'test') + ').'
          : 'Hotelbeds Transfers: ' + (data.message || data.error || 'sin confirmar (revisa contrato Transfers o credenciales).');
        badges.forEach(function (b) {
          setBadge(b, msg, ok ? 'ok' : 'warn');
        });
      })
      .catch(function () {
        badges.forEach(function (b) {
          setBadge(b, 'No se pudo comprobar la API de transfers.', 'warn');
        });
      });
  }

  function init() {
    var blocks = document.querySelectorAll('.paquete-transfer-hb-block');
    if (!blocks.length) return;
    blocks.forEach(bindBlock);
    pingApi();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
