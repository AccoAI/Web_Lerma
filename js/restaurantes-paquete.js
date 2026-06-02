/**
 * Datos y UI del selector de restaurantes (zonas + pestañas + iframe).
 * Se monta dentro de #comida-restaurante-picker-root al elegir una comida/cena del paquete.
 */
(function () {
    var RESTAURANTES = [
        { id: 'parador', nombre: 'Parador de Lerma', zona: 'Lerma', area: 'lerma', precioPack: 'lerma', precioNivel: '€€€', tipoComida: 'Castellano', texto: 'Reserva con el widget oficial de TheFork.', url: 'https://widget.thefork.com/en-GB/e1f7b394-0e58-4166-9eef-3b5ba2f1c529?step=date', iframeAlto: 650 },
        { id: 'lali', nombre: 'Restaurante Golf Lerma (Lali)', zona: 'Lerma', area: 'lerma', precioPack: 'lerma', precioNivel: '€€€', tipoComida: 'Castellano', soloComida: true, texto: 'Solo comidas (almuerzo), no cenas. Reserva por teléfono; abajo tienes la fecha y los comensales según tu paquete.', reservaInhouse: true, telefono: '947171215', urlInfo: 'el-campo.html#restaurante', iframeAlto: 640 },
        { id: 'alfoz', nombre: 'El Alfoz', zona: 'Saldaña', area: 'saldana', precioPack: 'burgos', precioNivel: '€€', tipoComida: 'Castellano', texto: 'Cocina de mercado. Reserva en CoverManager.', url: 'https://www.covermanager.com/reserve/module_restaurant/restaurante-alfoz-de-burgos/spanish', iframeAlto: 720 },
        { id: 'cobo', nombre: 'Cobo Estratos', zona: 'Burgos', area: 'burgos', precioPack: 'burgos', precioNivel: '€€€€', tipoComida: 'Estrella Michelin', texto: 'Alta cocina. Reserva en CoverManager.', url: 'https://www.covermanager.com/reservation/module_restaurant/restaurante-coboestratos/spanish', iframeAlto: 720 },
        { id: 'fabrica', nombre: 'La Fábrica', zona: 'Burgos', area: 'burgos', precioPack: 'burgos', precioNivel: '€€€', tipoComida: 'Española', texto: 'Reserva con TheFork.', url: 'https://widget.thefork.com/en-GB/d8abb8d7-ecfa-4db4-8aff-089ed282986d?step=date', iframeAlto: 620 },
        { id: 'favorita', nombre: 'La Favorita', zona: 'Burgos', area: 'burgos', precioPack: 'burgos', precioNivel: '€€€', tipoComida: 'Tapeo / asador', texto: 'Tapeo y cocina castellana. CoverManager.', url: 'https://www.covermanager.com/reservation/module_restaurant/restaurante-lafavoritadeburgos/spanish', iframeAlto: 720 },
        { id: 'onirica', nombre: 'Onírica', zona: 'Burgos', area: 'burgos', precioPack: 'burgos', precioNivel: '€€€', tipoComida: 'Vanguardia', texto: 'Experiencia gastronómica. CoverManager.', url: 'https://www.covermanager.com/reservation/module_restaurant/restaurante-onirica/spanish', iframeAlto: 720 }
    ];

    var AREAS = [
        { id: 'lerma', label: 'Lerma' },
        { id: 'saldana', label: 'Saldaña' },
        { id: 'burgos', label: 'Burgos' }
    ];

    window.RESTAURANTES_PAQUETE_DATA = RESTAURANTES;

    window.getRestaurantePaqueteById = function (id) {
        if (!id) return null;
        for (var i = 0; i < RESTAURANTES.length; i++) {
            if (RESTAURANTES[i].id === id) return RESTAURANTES[i];
        }
        return null;
    };

    /** Si el usuario está eligiendo cena, excluye restaurantes marcados soloComida (p. ej. Lali). */
    function restauranteDisponibleParaTipoServicio(r, tipoServicio) {
        if (!r) return false;
        if (r.soloComida && tipoServicio === 'cena') return false;
        return true;
    }

    function escapeHtml(s) {
        if (!s) return '';
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    function formatFechaReservaPaquete(iso) {
        if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return '—';
        try {
            var d = new Date(iso + 'T12:00:00');
            var t = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            return t.charAt(0).toUpperCase() + t.slice(1);
        } catch (e) {
            return '—';
        }
    }

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

    /**
     * Sincroniza iframe con el formulario del paquete (fecha del día elegido + tamaño del grupo).
     * CoverManager (motor module_restaurant): el servidor solo rellena day_pre/people_pre con day=YYYY-MM-DD y people=N (no usa ?date=).
     * TheFork (widget/widgets): date + comensales. El wizard ha usado distintos nombres en query (guests, covers, partySize…); se envían alias compatibles.
     */
    function applyPaqueteEmbedSyncToUrl(urlString, ctx) {
        if (!urlString || !ctx || !ctx.dateISO || ctx.partySize == null) return urlString;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ctx.dateISO))) return urlString;
        try {
            var u = new URL(urlString);
            var h = (u.hostname || '').toLowerCase().replace(/^www\./, '');
            if (h.indexOf('covermanager.') >= 0) {
                u.searchParams.set('day', ctx.dateISO);
                u.searchParams.set('people', String(ctx.partySize));
                // Datos del titular (si el proveedor los soporta; si no, se ignoran).
                if (ctx.holderName) u.searchParams.set('name', String(ctx.holderName));
                if (ctx.holderEmail) u.searchParams.set('email', String(ctx.holderEmail));
                if (ctx.holderPhone) u.searchParams.set('phone', String(ctx.holderPhone));
                u.searchParams.delete('date');
                return u.toString();
            }
            if (h.indexOf('thefork.') >= 0) {
                u.searchParams.set('date', ctx.dateISO);
                var p = String(ctx.partySize);
                u.searchParams.set('partySize', p);
                u.searchParams.set('guests', p);
                u.searchParams.set('covers', p);
                u.searchParams.set('nbGuests', p);
                u.searchParams.set('party', p);
                u.searchParams.set('diners', p);
                u.searchParams.set('people', p);
                // Datos del titular (si el widget los soporta; si no, se ignoran).
                if (ctx.holderName) u.searchParams.set('name', String(ctx.holderName));
                if (ctx.holderEmail) u.searchParams.set('email', String(ctx.holderEmail));
                if (ctx.holderPhone) u.searchParams.set('phone', String(ctx.holderPhone));
                return u.toString();
            }
        } catch (e) { /* URL relativa u otro */ }
        return urlString;
    }

    window.applyPaqueteEmbedSyncToUrl = applyPaqueteEmbedSyncToUrl;

    /**
     * @param {HTMLElement} container - vacío; aquí se pinta categorías + tabs + panel
     * @returns {{ setCategoria: function(string), getCurrentRestaurant: function(): object|null, getSelectedIndex: function(): number }}
     */
    window.mountRestaurantePaquetePicker = function (container) {
        if (!container) return null;

        container.innerHTML = '';
        container.className = (container.className + ' restaurantes-paquete-picker-inner').trim();

        var catRow = document.createElement('div');
        catRow.className = 'restaurantes-paquete-categorias';
        catRow.setAttribute('role', 'group');
        catRow.setAttribute('aria-label', 'Zona');

        var tablist = document.createElement('div');
        tablist.className = 'restaurantes-paquete-tabs';
        tablist.setAttribute('role', 'tablist');
        tablist.setAttribute('aria-label', 'Restaurantes');

        var visibleList = [];
        var tabs = [];
        var categoryButtons = [];
        var currentVisibleIndex = 0;

        var panel = document.createElement('div');
        panel.className = 'restaurantes-paquete-panel restaurantes-paquete-panel-unica';
        panel.id = 'restaurantes-paquete-panel-picker';
        panel.setAttribute('role', 'tabpanel');

        var meta = document.createElement('p');
        meta.className = 'restaurante-paquete-meta';

        var fichaInfo = document.createElement('div');
        fichaInfo.className = 'restaurante-paquete-ficha';
        fichaInfo.setAttribute('aria-label', 'Precio y tipo de cocina');

        var pDesc = document.createElement('p');
        pDesc.className = 'restaurante-paquete-desc';

        var telP = document.createElement('p');
        telP.className = 'restaurante-paquete-tel';
        telP.style.display = 'none';

        var inhouseEl = document.createElement('div');
        inhouseEl.className = 'restaurante-paquete-inhouse';
        inhouseEl.style.display = 'none';
        inhouseEl.setAttribute('hidden', '');

        var wrap = document.createElement('div');
        wrap.className = 'restaurante-paquete-iframe-wrap';
        var ifr = document.createElement('iframe');
        ifr.className = 'restaurante-paquete-iframe';
        ifr.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
        wrap.appendChild(ifr);

        panel.appendChild(meta);
        panel.appendChild(fichaInfo);
        panel.appendChild(pDesc);
        panel.appendChild(inhouseEl);
        panel.appendChild(telP);
        panel.appendChild(wrap);

        container.appendChild(catRow);
        container.appendChild(tablist);
        container.appendChild(panel);

        function aplicarRestaurante(index) {
            var r = visibleList[index];
            if (!r) return;
            currentVisibleIndex = index;
            panel.setAttribute('aria-labelledby', 'tab-rp-' + r.id);
            meta.textContent = r.zona || '';
            pDesc.textContent = r.texto || '';

            if (r.precioNivel || r.tipoComida) {
                fichaInfo.style.display = '';
                fichaInfo.innerHTML =
                    (r.precioNivel ? '<span class="restaurante-paquete-precio" title="Rango de precio orientativo">' + escapeHtml(r.precioNivel) + '</span>' : '') +
                    (r.precioNivel && r.tipoComida ? '<span class="restaurante-paquete-ficha-sep" aria-hidden="true">·</span>' : '') +
                    (r.tipoComida ? '<span class="restaurante-paquete-tipo">' + escapeHtml(r.tipoComida) + '</span>' : '');
            } else {
                fichaInfo.style.display = 'none';
                fichaInfo.innerHTML = '';
            }

            if (r.reservaInhouse) {
                telP.style.display = 'none';
                telP.innerHTML = '';
                wrap.style.display = 'none';
                inhouseEl.style.display = 'block';
                inhouseEl.removeAttribute('hidden');
                ifr.removeAttribute('src');

                var ctxIH = typeof window.getPaqueteEmbedContext === 'function' ? window.getPaqueteEmbedContext() : null;
                var fechaLbl = formatFechaReservaPaquete(ctxIH && ctxIH.dateISO);
                var paxNum = ctxIH && ctxIH.partySize != null ? ctxIH.partySize : null;
                var paxLbl = paxNum == null ? '—' : (paxNum === 1 ? '1 persona' : paxNum + ' personas');
                var digIH = r.telefono ? String(r.telefono).replace(/\D/g, '') : '';
                var dispIH = digIH.length === 9
                    ? digIH.replace(/^(\d{3})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4')
                    : (r.telefono || '');
                var infoHref = r.urlInfo ? absolutizarUrl(r.urlInfo) : '';
                var partsIH = [
                    '<p class="restaurante-paquete-inhouse-intro">Datos para tu llamada (tomados de este formulario):</p>',
                    '<ul class="restaurante-paquete-inhouse-datos" role="list">',
                    '<li><span class="restaurante-paquete-inhouse-k">Fecha</span> <span class="restaurante-paquete-inhouse-v">' + escapeHtml(fechaLbl) + '</span></li>',
                    '<li><span class="restaurante-paquete-inhouse-k">Comensales</span> <span class="restaurante-paquete-inhouse-v">' + escapeHtml(paxLbl) + '</span></li>',
                    '</ul>',
                    '<p class="restaurante-paquete-inhouse-cta-wrap">',
                    digIH
                        ? ('<a class="btn-restaurante-paquete-reservar" href="tel:+34' + escapeHtml(digIH) + '">Llamar para reservar · ' + escapeHtml(dispIH) + '</a>')
                        : '<span class="restaurante-paquete-inhouse-sintel">Añade un teléfono de contacto en datos del restaurante.</span>',
                    '</p>'
                ];
                if (infoHref) {
                    partsIH.push('<p class="restaurante-paquete-inhouse-mas"><a href="' + escapeHtml(infoHref) + '">Horarios y ficha del restaurante</a></p>');
                }
                inhouseEl.innerHTML = partsIH.join('');
            } else {
                inhouseEl.style.display = 'none';
                inhouseEl.setAttribute('hidden', '');
                inhouseEl.innerHTML = '';
                wrap.style.display = '';

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
                var raw = absolutizarUrl(srcEmbed);
                var syncCtx = typeof window.getPaqueteEmbedContext === 'function' ? window.getPaqueteEmbedContext() : null;
                ifr.src = applyPaqueteEmbedSyncToUrl(raw, syncCtx);
            }
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
            var tipoSlot = (window.__paqueteEmbedSlot && window.__paqueteEmbedSlot.tipo) || '';
            visibleList = RESTAURANTES.filter(function (r) {
                return r.area === areaId && restauranteDisponibleParaTipoServicio(r, tipoSlot);
            });
            categoryButtons.forEach(function (b) {
                var on = b.dataset.area === areaId;
                b.classList.toggle('is-active', on);
                b.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
            tablist.innerHTML = '';
            tabs = [];
            if (!visibleList.length) {
                meta.textContent = '';
                fichaInfo.style.display = 'none';
                fichaInfo.innerHTML = '';
                pDesc.textContent = 'No hay restaurantes en esta zona para el servicio elegido (comida o cena). Prueba otra zona.';
                telP.style.display = 'none';
                telP.innerHTML = '';
                inhouseEl.style.display = 'none';
                inhouseEl.setAttribute('hidden', '');
                inhouseEl.innerHTML = '';
                wrap.style.display = '';
                ifr.removeAttribute('src');
                return;
            }
            visibleList.forEach(function (r, idx) {
                var tab = document.createElement('button');
                tab.type = 'button';
                tab.className = 'restaurantes-paquete-tab';
                tab.setAttribute('role', 'tab');
                tab.id = 'tab-rp-' + r.id;
                tab.setAttribute('aria-controls', 'restaurantes-paquete-panel-picker');
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

        ifr.addEventListener('load', function () {
            try {
                container.dispatchEvent(new CustomEvent('restaurante-iframe-loaded', { bubbles: true, detail: { iframe: ifr } }));
            } catch (err) { /* ignore */ }
        });

        function selectRestaurantById(id) {
            var r = null;
            for (var j = 0; j < RESTAURANTES.length; j++) {
                if (RESTAURANTES[j].id === id) {
                    r = RESTAURANTES[j];
                    break;
                }
            }
            if (!r) return false;
            var tipoSlot = (window.__paqueteEmbedSlot && window.__paqueteEmbedSlot.tipo) || '';
            if (!restauranteDisponibleParaTipoServicio(r, tipoSlot)) return false;
            setCategoria(r.area);
            for (var k = 0; k < visibleList.length; k++) {
                if (visibleList[k].id === id) {
                    selectTab(k);
                    return true;
                }
            }
            return false;
        }

        return {
            setCategoria: setCategoria,
            selectRestaurantById: selectRestaurantById,
            getIframe: function () {
                return ifr;
            },
            refreshCurrentEmbed: function () {
                if (visibleList.length && currentVisibleIndex >= 0) aplicarRestaurante(currentVisibleIndex);
            },
            getCurrentRestaurant: function () {
                return visibleList[currentVisibleIndex] || null;
            },
            getSelectedIndex: function () { return currentVisibleIndex; }
        };
    };
})();
