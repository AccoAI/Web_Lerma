/**
 * Bloque "Reservar mesa" en paquete fin de semana: pestañas por restaurante,
 * enlace externo y embed (TheFork) cuando el proveedor lo permite.
 */
(function () {
    var RESTAURANTES = [
        {
            id: 'alfoz',
            nombre: 'El Alfoz',
            zona: 'Burgos',
            texto: 'Cocina de mercado en el entorno del Arlanzón. La reserva se completa en CoverManager.',
            url: 'https://www.covermanager.com/reserve/module_restaurant/restaurante-alfoz-de-burgos/spanish',
            iframe: null
        },
        {
            id: 'lali',
            nombre: 'Restaurante Golf Lerma (Lali)',
            zona: 'Lerma',
            texto: 'Club social en el campo. Reserva por teléfono o consulta la ficha en El Campo.',
            url: 'el-campo.html#restaurante',
            telefono: '947171215',
            iframe: null
        },
        {
            id: 'cobo',
            nombre: 'Cobo Estratos',
            zona: 'Burgos',
            texto: 'Alta cocina. Reserva online en CoverManager.',
            url: 'https://www.covermanager.com/reservation/module_restaurant/restaurante-coboestratos/spanish',
            iframe: null
        },
        {
            id: 'fabrica',
            nombre: 'La Fábrica',
            zona: 'Burgos',
            texto: 'Reserva con el widget de TheFork. Si el visor no carga, usa el enlace.',
            url: 'https://widget.thefork.com/en-GB/d8abb8d7-ecfa-4db4-8aff-089ed282986d?step=date',
            iframe: 'https://widget.thefork.com/en-GB/d8abb8d7-ecfa-4db4-8aff-089ed282986d?step=date',
            iframeAlto: 620
        },
        {
            id: 'favorita',
            nombre: 'La Favorita',
            zona: 'Burgos',
            texto: 'Tapeo y cocina castellana. Reserva en CoverManager.',
            url: 'https://www.covermanager.com/reservation/module_restaurant/restaurante-lafavoritadeburgos/spanish',
            iframe: null
        },
        {
            id: 'onirica',
            nombre: 'Onírica',
            zona: 'Burgos',
            texto: 'Experiencia gastronómica. Reserva en CoverManager.',
            url: 'https://www.covermanager.com/reservation/module_restaurant/restaurante-onirica/spanish',
            iframe: null
        },
        {
            id: 'parador',
            nombre: 'Parador de Lerma',
            zona: 'Lerma',
            texto: 'Reserva con el widget oficial de TheFork.',
            url: 'https://widgets.thefork.com/es/restaurant/28130/default',
            iframe: 'https://widgets.thefork.com/es/restaurant/28130/default',
            iframeAlto: 650
        }
    ];

    function escapeHtml(s) {
        if (!s) return '';
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    function isAbsoluteUrl(u) {
        return /^https?:\/\//i.test(u || '');
    }

    function init() {
        var root = document.getElementById('restaurantes-paquete-widget');
        if (!root) return;

        var panelIdPrefix = 'restaurante-paquete-panel-';

        var intro = document.createElement('p');
        intro.className = 'restaurantes-paquete-intro';
        intro.innerHTML = 'Opcional: reserva mesa directamente con cada establecimiento. Las opciones <strong>Comida / Cena</strong> de arriba sirven para calcular el paquete (Lerma o Burgos); la mesa la gestionas tú con el restaurante.';

        var tablist = document.createElement('div');
        tablist.className = 'restaurantes-paquete-tabs';
        tablist.setAttribute('role', 'tablist');
        tablist.setAttribute('aria-label', 'Restaurantes para reservar');

        var panelHost = document.createElement('div');
        panelHost.className = 'restaurantes-paquete-panel-host';

        RESTAURANTES.forEach(function (r, idx) {
            var tab = document.createElement('button');
            tab.type = 'button';
            tab.className = 'restaurantes-paquete-tab';
            tab.setAttribute('role', 'tab');
            tab.id = 'tab-' + r.id;
            tab.setAttribute('aria-controls', panelIdPrefix + r.id);
            tab.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
            tab.setAttribute('tabindex', idx === 0 ? '0' : '-1');
            tab.textContent = r.nombre;
            tablist.appendChild(tab);

            var panel = document.createElement('div');
            panel.className = 'restaurantes-paquete-panel';
            panel.id = panelIdPrefix + r.id;
            panel.setAttribute('role', 'tabpanel');
            panel.setAttribute('aria-labelledby', 'tab-' + r.id);
            panel.hidden = idx !== 0;

            var meta = document.createElement('p');
            meta.className = 'restaurante-paquete-meta';
            meta.textContent = r.zona || '';
            panel.appendChild(meta);

            var p = document.createElement('p');
            p.className = 'restaurante-paquete-desc';
            p.textContent = r.texto;
            panel.appendChild(p);

            if (r.telefono) {
                var digits = String(r.telefono).replace(/\D/g, '');
                var disp = digits.length === 9
                    ? digits.replace(/^(\d{3})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4')
                    : r.telefono;
                var telP = document.createElement('p');
                telP.className = 'restaurante-paquete-tel';
                telP.innerHTML = '<strong>Teléfono:</strong> <a href="tel:+34' + escapeHtml(digits) + '">' + escapeHtml(disp) + '</a>';
                panel.appendChild(telP);
            }

            var actions = document.createElement('div');
            actions.className = 'restaurante-paquete-actions';

            var a = document.createElement('a');
            a.className = 'btn-restaurante-paquete-reserva';
            a.href = r.url;
            if (isAbsoluteUrl(r.url)) {
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
            }
            a.textContent = r.telefono && !isAbsoluteUrl(r.url) ? 'Ir a El Campo · Restaurante' : 'Abrir reserva online';
            actions.appendChild(a);
            panel.appendChild(actions);

            if (r.iframe) {
                var wrap = document.createElement('div');
                wrap.className = 'restaurante-paquete-iframe-wrap';
                var ifr = document.createElement('iframe');
                ifr.setAttribute('title', 'Reserva — ' + r.nombre);
                ifr.src = r.iframe;
                ifr.loading = 'lazy';
                var alto = r.iframeAlto || 640;
                ifr.style.height = alto + 'px';
                wrap.appendChild(ifr);
                var nota = document.createElement('p');
                nota.className = 'restaurante-paquete-iframe-nota';
                nota.textContent = '¿Ves la ventana en blanco? Usa «Abrir reserva online»; algunos navegadores bloquean widgets de terceros.';
                wrap.appendChild(nota);
                panel.appendChild(wrap);
            }

            panelHost.appendChild(panel);
        });

        root.appendChild(intro);
        root.appendChild(tablist);
        root.appendChild(panelHost);

        var tabs = tablist.querySelectorAll('.restaurantes-paquete-tab');
        var panels = panelHost.querySelectorAll('.restaurantes-paquete-panel');

        function selectTab(index) {
            tabs.forEach(function (t, i) {
                var on = i === index;
                t.setAttribute('aria-selected', on ? 'true' : 'false');
                t.setAttribute('tabindex', on ? '0' : '-1');
                panels[i].hidden = !on;
            });
        }

        tablist.addEventListener('click', function (e) {
            var btn = e.target.closest('.restaurantes-paquete-tab');
            if (!btn || !tablist.contains(btn)) return;
            var i = Array.prototype.indexOf.call(tabs, btn);
            if (i >= 0) selectTab(i);
        });

        tablist.addEventListener('keydown', function (e) {
            var keys = { ArrowRight: 1, ArrowLeft: -1, Home: 'home', End: 'end' };
            if (!keys[e.key]) return;
            e.preventDefault();
            var i = Array.prototype.indexOf.call(tabs, document.activeElement);
            if (i < 0) i = 0;
            var next = i;
            if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
            else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
            else if (e.key === 'Home') next = 0;
            else if (e.key === 'End') next = tabs.length - 1;
            tabs[next].focus();
            selectTab(next);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
