/**
 * Bloque "Opciones para comer" en confirmacion-reserva.html (post-pago).
 * Requiere js/restaurantes-paquete.js (RESTAURANTES_PAQUETE_DATA).
 */
(function () {
  'use strict';

  var ZONAS = [
    { id: 'lerma', label: 'Lerma' },
    { id: 'saldana', label: 'Saldaña' },
    { id: 'burgos', label: 'Burgos' },
  ];

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function reservaBtnHtml(r) {
    if (r.reservaInhouse && r.telefono) {
      var digits = String(r.telefono).replace(/\D/g, '');
      return (
        '<a class="btn-reservar-paquete post-restaurant-btn" href="tel:+34' +
        escapeHtml(digits) +
        '">Llamar para reservar · ' +
        escapeHtml(r.telefono) +
        '</a>'
      );
    }
    if (r.url) {
      return (
        '<a class="btn-reservar-paquete post-restaurant-btn" href="' +
        escapeHtml(r.url) +
        '" target="_blank" rel="noopener noreferrer">Reservar online</a>'
      );
    }
    return '';
  }

  function renderPostBookingRestaurants(containerId) {
    var list = window.RESTAURANTES_PAQUETE_DATA;
    var el = document.getElementById(containerId);
    if (!el || !list || !list.length) return;

    var html =
      '<h2 class="post-travel-title">Opciones para comer</h2>' +
      '<p class="post-travel-intro">Reserva mesa en Lerma, Saldaña o Burgos. Elige restaurante y completa la reserva en el enlace (TheFork, CoverManager) o por teléfono en el club.</p>';

    ZONAS.forEach(function (zona) {
      var items = list.filter(function (r) {
        return r.area === zona.id;
      });
      if (!items.length) return;

      html += '<section class="post-restaurant-zona"><h3 class="post-restaurant-zona-title">' + escapeHtml(zona.label) + '</h3><ul class="post-restaurant-list">';

      items.forEach(function (r) {
        var meta = [];
        if (r.precioNivel) meta.push(r.precioNivel);
        if (r.tipoComida) meta.push(r.tipoComida);
        if (r.soloComida) meta.push('Solo comidas (almuerzo)');

        html +=
          '<li class="post-restaurant-card">' +
          '<p class="post-restaurant-name">' +
          escapeHtml(r.nombre) +
          '</p>';
        if (meta.length) {
          html += '<p class="post-restaurant-meta">' + escapeHtml(meta.join(' · ')) + '</p>';
        }
        if (r.texto) {
          html += '<p class="post-restaurant-desc">' + escapeHtml(r.texto) + '</p>';
        }
        var btn = reservaBtnHtml(r);
        if (btn) html += '<div class="post-restaurant-actions">' + btn + '</div>';
        if (r.urlInfo) {
          html +=
            '<p class="post-restaurant-more"><a href="' +
            escapeHtml(r.urlInfo) +
            '">Horarios y ficha</a></p>';
        }
        html += '</li>';
      });

      html += '</ul></section>';
    });

    el.innerHTML = html;
    el.hidden = false;
  }

  window.renderPostBookingRestaurants = renderPostBookingRestaurants;
})();
