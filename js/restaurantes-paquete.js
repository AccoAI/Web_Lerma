/**
 * Bloque "Reservar mesa" en paquete fin de semana: zona, pestañas e iframe incrustado.
 */
(function () {
    /** area: lerma | saldana | burgos — agrupa el contexto del viaje */
    var RESTAURANTES = [
        {
            id: 'parador',
            nombre: 'Parador de Lerma',
            zona: 'Lerma',
            area: 'lerma',
            texto: 'Reserva con el widget oficial de TheFork.',
            url: 'https://widgets.thefork.com/es/restaurant/28130/default',
            iframeAlto: 650
        },
        {
            id: 'lali',
            nombre: 'Restaurante Golf Lerma (Lali)',
            zona: 'Lerma',
            area: 'lerma',
            texto: 'Club social en el campo. Teléfono de reservas y ficha del restaurante (misma web).',
            url: 'el-campo.html#restaurante',
            telefono: '947171215',
            iframeAlto: 640
        },
        {
            id: 'alfoz',
            nombre: 'El Alfoz',
            zona: 'Saldaña',
            area: 'saldana',
            texto: 'Cocina de mercado en el entorno del Arlanzón. Completa la reserva en el marco inferior.',
            url: 'https://www.covermanager.com/reserve/module_restaurant/restaurante-alfoz-de-burgos/spanish',
            iframeAlto: 720
        },
        {
            id: 'cobo',
            nombre: 'Cobo Estratos',
            zona: 'Burgos',
            area: 'burgos',
            texto: 'Alta cocina. Reserva online en el visor de CoverManager.',
            url: 'https://www.covermanager.com/reservation/module_restaurant/restaurante-coboestratos/spanish',
            iframeAlto: 720
        },
        {
            id: 'fabrica',
            nombre: 'La Fábrica',
            zona: 'Burgos',
            area: 'burgos',
            texto: 'Reserva con el widget de TheFork.',
            url: 'https://widget.thefork.com/en-GB/d8abb8d7-ecfa-4db4-8aff-089ed282986d?step=date',
            iframeAlto: 620
        },
        {
            id: 'favorita',
            nombre: 'La Favorita',
            zona: 'Burgos',
            area: 'burgos',
            texto: 'Tapeo y cocina castellana. Reserva en CoverManager.',
            url: 'https://www.covermanager.com/reservation/module_restaurant/restaurante-lafavoritadeburgos/spanish',
            iframeAlto: 720
        },
        {
            id: 'onirica',
            nombre: 'Onírica',
            zona: 'Burgos',
            area: 'burgos',
            texto: 'Experiencia gastronómica. Reserva en CoverManager.',
            url: 'https://www.covermanager.com/reservation/module_restaurant/restaurante-onirica/spanish',
            iframeAlto: 720
        }
    ];

    var AREAS = [
        { id: 'lerma', label: 'Lerma' },
        { id: 'saldana', label: 'Saldaña' },
        { id: 'burgos', label: 'Burgos' }
    ];

    function escapeHtml(s) {
        if (!s) return '';
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    /** URL que cargamos en el iframe (misma que la reserva salvo que en el futuro haya un embed dedicado). */
    function urlIframe(r) {
        return (r.iframe != null ? r.iframe : r.url) || '';
    }

    function absolutizarUrl(href) {
        if (!href) return '';
        try {
            return new URL(href, window.location.href).href;
        } catch (e) {
            return href;
        }
    }

    function init() {
        var root = document.getElementById('restaurantes-paquete-widget');
        if (!root) return;

        var intro = document.createElement('p');
        intro.className = 'restaurantes-paquete-intro';
        intro.innerHTML = 'Opcional: elige <strong>zona</strong> y restaurante; reserva en el visor embebido. Las opciones <strong>Comida / Cena</strong> de arriba siguen sirviendo para el importe del paquete.';

        var catRow = document.createElement('div');
        catRow.className = 'restaurantes-paquete-categorias';
        catRow.setAttribute('role', 'group');
        catRow.setAttribute('aria-label', 'Zona del paquete');

        var tablist = document.createElement('div');
        tablist.className = 'restaurantes-paquete-tabs';
        tablist.setAttribute('role', 'tablist');
        tablist.setAttribute('aria-label', 'Restaurantes para reservar');

        var visibleList = [];
        var tabs = [];
        var categoryButtons = [];

        var panel = document.createElement('div');
        panel.className = 'restaurantes-paquete-panel restaurantes-paquete-panel-unica';
        panel.id = 'restaurantes-paquete-panel';
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', 'tab-rp-parador');

        var meta = document.createElement('p');
        meta.className = 'restaurante-paquete-meta';

        var pDesc = document.createElement('p');
        pDesc.className = 'restaurante-paquete-desc';

        var telP = document.createElement('p');
        telP.className = 'restaurante-paquete-tel';
        telP.style.display = 'none';

        var wrap = document.createElement('div');
        wrap.className = 'restaurante-paquete-iframe-wrap';
        var ifr = document.createElement('iframe');
        ifr.id = 'restaurantes-paquete-iframe';
        ifr.className = 'restaurante-paquete-iframe';
        ifr.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
        wrap.appendChild(ifr);

        var nota = document.createElement('p');
        nota.className = 'restaurante-paquete-iframe-nota';
        nota.textContent = '¿Pantalla en blanco? Algunos proveedores bloquean el visor embebido; prueba otro navegador o dispositivo.';

        panel.appendChild(meta);
        panel.appendChild(pDesc);
        panel.appendChild(telP);
        panel.appendChild(wrap);
        panel.appendChild(nota);

        root.appendChild(intro);
        root.appendChild(catRow);
        root.appendChild(tablist);
        root.appendChild(panel);

        function aplicarRestaurante(index) {
            var r = visibleList[index];
            if (!r) return;

            panel.setAttribute('aria-labelledby', 'tab-rp-' + r.id);
            meta.textContent = r.zona || '';
            pDesc.textContent = r.texto || '';

            if (r.telefono) {
                var digits = String(r.telefono).replace(/\D/g, '');
                var disp = digits.length === 9
                    ? digits.replace(/^(\d{3})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4')
                    : r.telefono;
                telP.style.display = '';
                telP.innerHTML = '<strong>Teléfono:</strong> <a href="tel:+34' + escapeHtml(digits) + '">' + escapeHtml(disp) + '</a>';
            } else {
                telP.style.display = 'none';
                telP.innerHTML = '';
            }

            var srcEmbed = urlIframe(r);
            var alto = r.iframeAlto != null ? r.iframeAlto : 700;
            ifr.style.height = alto + 'px';
            ifr.setAttribute('title', 'Reserva — ' + r.nombre);
            ifr.src = absolutizarUrl(srcEmbed);
        }

        function selectTab(index) {
            if (!tabs.length || index < 0 || index >= tabs.length) return;
            tabs.forEach(function (t, i) {
                var on = i === index;
                t.setAttribute('aria-selected', on ? 'true' : 'false');
                t.setAttribute('tabindex', on ? '0' : '-1');
            });
            aplicarRestaurante(index);
        }

        function setCategoria(areaId) {
            visibleList = RESTAURANTES.filter(function (r) { return r.area === areaId; });
            categoryButtons.forEach(function (b) {
                var on = b.dataset.area === areaId;
                b.classList.toggle('is-active', on);
                b.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
            tablist.innerHTML = '';
            tabs = [];
            visibleList.forEach(function (r, idx) {
                var tab = document.createElement('button');
                tab.type = 'button';
                tab.className = 'restaurantes-paquete-tab';
                tab.setAttribute('role', 'tab');
                tab.id = 'tab-rp-' + r.id;
                tab.setAttribute('aria-controls', 'restaurantes-paquete-panel');
                tab.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
                tab.setAttribute('tabindex', idx === 0 ? '0' : '-1');
                tab.textContent = r.nombre;
                tablist.appendChild(tab);
            });
            tabs = Array.prototype.slice.call(tablist.querySelectorAll('.restaurantes-paquete-tab'));
            selectTab(0);
        }

        AREAS.forEach(function (a) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'restaurante-paquete-cat-btn';
            b.textContent = a.label;
            b.dataset.area = a.id;
            b.setAttribute('aria-pressed', 'false');
            catRow.appendChild(b);
            categoryButtons.push(b);
        });

        catRow.addEventListener('click', function (e) {
            var btn = e.target.closest('.restaurante-paquete-cat-btn');
            if (!btn || !catRow.contains(btn)) return;
            var aid = btn.dataset.area;
            if (aid) setCategoria(aid);
        });

        setCategoria('lerma');

        tablist.addEventListener('click', function (e) {
            var btn = e.target.closest('.restaurantes-paquete-tab');
            if (!btn || !tablist.contains(btn)) return;
            var i = tabs.indexOf(btn);
            if (i >= 0) selectTab(i);
        });

        tablist.addEventListener('keydown', function (e) {
            if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
            e.preventDefault();
            if (!tabs.length) return;
            var i = tabs.indexOf(document.activeElement);
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
