/**
 * Página de detalle de torneo (torneo.html).
 * Lee el torneo guardado en sessionStorage (torneoSeleccionado) y muestra título, fecha, modalidad, premios, descripción, imagen y enlace.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'torneoSeleccionado';

    function esc(s) {
        if (s == null || s === '') return '';
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function safeHref(url) {
        var href = (url || '').trim();
        if (!href || /^\s*javascript\s*:/i.test(href) || /^\s*data\s*:/i.test(href)) return '';
        return href;
    }

    function safeImgSrc(src) {
        var s = (src || '').trim();
        if (!s || /^\s*javascript\s*:/i.test(s) || /^\s*data\s*:/i.test(s)) return '';
        return s;
    }

    function init() {
        var contenedor = document.getElementById('torneoDetalleContenido');
        var cargando = document.getElementById('torneoDetalleCargando');
        if (!contenedor) return;

        var json = null;
        try {
            json = sessionStorage.getItem(STORAGE_KEY);
        } catch (e) {}

        if (!json) {
            window.location.href = 'calendario-torneos.html';
            return;
        }

        var t;
        try {
            t = JSON.parse(json);
        } catch (e) {
            window.location.href = 'calendario-torneos.html';
            return;
        }

        if (cargando) cargando.remove();

        var titulo = (t.titulo || '').trim() || 'Torneo';
        if (document.title) document.title = titulo + ' - Golf Lerma';

        var html = '';
        var imgUrl = safeImgSrc(t.foto || t.imagen);
        if (imgUrl) {
            html += '<div class="torneo-detalle-imagen-wrap"><img src="' + esc(imgUrl) + '" alt="' + esc(titulo) + '" class="torneo-detalle-imagen"></div>';
        }
        html += '<h1 class="torneo-detalle-titulo">' + esc(titulo) + '</h1>';
        if ((t.fechas || '').trim()) {
            html += '<p class="torneo-detalle-fecha"><strong>Fecha:</strong> ' + esc((t.fechas || '').trim()) + '</p>';
        }
        if ((t.modalidad || '').trim()) {
            html += '<p class="torneo-detalle-modalidad"><strong>Modalidad:</strong> ' + esc((t.modalidad || '').trim()) + '</p>';
        }
        if ((t.premios || '').trim()) {
            html += '<p class="torneo-detalle-premios"><strong>Premios:</strong> ' + esc((t.premios || '').trim()) + '</p>';
        }
        if ((t.descripcion || '').trim()) {
            html += '<div class="torneo-detalle-descripcion">' + esc((t.descripcion || '').trim()) + '</div>';
        }
        var enlace = safeHref(t.enlace);
        if (enlace) {
            html += '<p class="torneo-detalle-cta"><a href="' + esc(enlace) + '" class="torneo-detalle-btn">Inscribirse / Más información</a></p>';
        }

        contenedor.innerHTML = html;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
