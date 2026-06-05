/**
 * Paquete Campeonato Burgos: secciones 6–8 con tarjetas ancillary-service-card.
 */
(function () {
    'use strict';

    var LEAD_DAYS_MIN = 20;
    var CONTAINER_IDS = {
        equipo: 'campeonato-equipo-container',
        premios: 'campeonato-premios-container',
        cava: 'campeonato-cava-container'
    };

    function getForm() {
        return document.getElementById('configuradorForm');
    }

    function getCampeonatoConfig() {
        var p = (typeof getPrecios === 'function') ? getPrecios() : (window.PRECIOS_DATA || {});
        return p.campeonatoExtras || { equipo: [], premios: [], cava: [] };
    }

    function t(key, fallback) {
        if (window.i18n && window.i18n.t) {
            var v = window.i18n.t(key);
            if (v && v !== key) return v;
        }
        return fallback;
    }

    function esc(s) {
        if (s == null || s === '') return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;');
    }

    function htmlFoto(imagen, blockClass) {
        if (typeof window.htmlTarjetaFotoMedia === 'function') {
            return window.htmlTarjetaFotoMedia(imagen, blockClass);
        }
        if (!imagen) {
            return '<span class="' + blockClass + '__media" aria-hidden="true"></span>';
        }
        return (
            '<span class="' + blockClass + '__media" aria-hidden="true">' +
            '<img class="' + blockClass + '__photo" src="' + esc(imagen) + '" alt="" loading="lazy" decoding="async">' +
            '</span>'
        );
    }

    function htmlLeadHint() {
        return (
            '<p class="ancillary-service-card__lead-hint" hidden role="alert">' +
            '<span class="ancillary-service-card__lead-icon" aria-hidden="true">⚠</span>' +
            '<span class="ancillary-service-card__lead-text">' + esc(t('camp_lead_time_20', 'Solo disponible con 20 días o más de antelación respecto a la fecha de llegada.')) + '</span>' +
            '</p>'
        );
    }

    function readFormState(form) {
        if (!form) return {};
        var fd = new FormData(form);
        var cfg = getCampeonatoConfig();
        var state = {};
        ['equipo', 'premios', 'cava'].forEach(function (section) {
            (cfg[section] || []).forEach(function (item) {
                if (item.tipo === 'counter') {
                    state[item.inputName] = Math.max(0, parseInt(fd.get(item.inputName) || '0', 10));
                } else if (item.tipo === 'importe') {
                    state[item.checkboxName] = !!fd.get(item.checkboxName);
                    state[item.inputName] = fd.get(item.inputName) || '';
                } else if (item.tipo === 'checkboxPorJugador') {
                    state[item.inputName] = !!fd.get(item.inputName);
                }
            });
        });
        return state;
    }

    function htmlCounterControls(item, qty) {
        return (
            '<div class="config-card-controls config-card-controls--solo-counter">' +
            '<div class="ancillary-counter-wrap config-card-counter">' +
            '<button type="button" class="ancillary-btn ancillary-btn-minus" aria-label="Reducir">−</button>' +
            '<input type="number" id="' + esc(item.inputId) + '" name="' + esc(item.inputName) + '" min="0" max="20" value="' + qty + '" class="ancillary-counter" readonly>' +
            '<button type="button" class="ancillary-btn ancillary-btn-plus" aria-label="Aumentar">+</button>' +
            '</div></div>'
        );
    }

    function htmlCheckboxToggle(name, checked, labelKey) {
        var label = t(labelKey || 'camp_incluir_opcion', 'Incluir en el pack');
        return (
            '<label class="ancillary-service-card__toggle">' +
            '<input type="checkbox" name="' + esc(name) + '" value="1"' + (checked ? ' checked' : '') + '>' +
            '<span>' + esc(label) + '</span>' +
            '</label>'
        );
    }

    function htmlImporteControls(item, checked, value) {
        var importeLbl = t('camp_importe_eur', 'Importe (€)');
        return (
            htmlCheckboxToggle(item.checkboxName, checked) +
            '<div class="ancillary-service-card__importe">' +
            '<label class="ancillary-service-card__importe-label" for="' + esc(item.inputId) + '">' + esc(importeLbl) + '</label>' +
            '<input type="number" id="' + esc(item.inputId) + '" name="' + esc(item.inputName) + '" class="campeonato-importe-input" min="0" step="1" inputmode="decimal" placeholder="0" value="' + esc(value) + '"' + (checked ? '' : ' disabled') + '>' +
            '</div>'
        );
    }

    function htmlCampeonatoCard(item, state) {
        var title = t(item.i18n, item.fallback || '');
        var selected = false;
        var attrs = ' class="ancillary-service-card ancillary-service-card--' + esc(item.id) + '"';
        attrs += ' data-camp-tipo="' + esc(item.tipo) + '"';

        if (item.leadTime) attrs += ' data-camp-lead-time="' + item.leadTime + '"';

        var body = '';
        if (item.tipo === 'counter') {
            var qty = state[item.inputName] || 0;
            selected = qty > 0;
            attrs += ' data-camp-input="' + esc(item.inputName) + '"';
            if (selected) attrs = attrs.replace(' class="', ' class="ancillary-service-card--selected ');
            body += '<span class="ancillary-service-card__title">' + esc(title) + '</span>';
            if (item.i18nDesc) {
                body += '<span class="ancillary-service-card__desc">' + esc(t(item.i18nDesc, '')) + '</span>';
            }
            body += '<span class="ancillary-precio" data-ancillary="' + esc(item.precioKey) + '"></span>';
            body += htmlCounterControls(item, qty);
            if (item.leadTime) body += htmlLeadHint();
        } else if (item.tipo === 'checkboxPorJugador') {
            selected = !!state[item.inputName];
            attrs += ' data-camp-input="' + esc(item.inputName) + '"';
            if (selected) attrs = attrs.replace(' class="', ' class="ancillary-service-card--selected ');
            body += '<span class="ancillary-service-card__title">' + esc(title) + '</span>';
            body += '<span class="ancillary-precio" data-ancillary="' + esc(item.precioKey) + '"></span>';
            if (item.i18nDetalle) {
                body += '<span class="ancillary-service-card__desc">' + esc(t(item.i18nDetalle, '')) + '</span>';
            }
            body += htmlCheckboxToggle(item.inputName, selected);
            if (item.leadTime) body += htmlLeadHint();
        } else if (item.tipo === 'importe') {
            selected = !!state[item.checkboxName];
            attrs += ' data-camp-input="' + esc(item.inputName) + '" data-camp-checkbox="' + esc(item.checkboxName) + '"';
            if (selected) attrs = attrs.replace(' class="', ' class="ancillary-service-card--selected ');
            body += '<span class="ancillary-service-card__title">' + esc(title) + '</span>';
            if (item.i18nDesc) {
                body += '<span class="ancillary-service-card__desc">' + esc(t(item.i18nDesc, '')) + '</span>';
            }
            body += htmlImporteControls(item, selected, state[item.inputName] || '');
        }

        return (
            '<article' + attrs + '>' +
            htmlFoto(item.imagen, 'ancillary-service-card') +
            '<div class="ancillary-service-card__content">' + body + '</div>' +
            '</article>'
        );
    }

    function renderSection(sectionKey, ariaFallback, state) {
        var container = document.getElementById(CONTAINER_IDS[sectionKey]);
        if (!container) return;
        var cfg = getCampeonatoConfig();
        var items = cfg[sectionKey] || [];
        state = state || {};
        var cards = '';
        for (var i = 0; i < items.length; i++) {
            cards += htmlCampeonatoCard(items[i], state);
        }
        var label = ariaFallback || sectionKey;
        container.innerHTML =
            '<div class="ancillary-service-grid campeonato-extras-grid" role="group" aria-label="' + esc(label) + '">' +
            cards +
            '</div>';
    }

    function renderCampeonatoExtras() {
        if (!document.body.classList.contains('pack-campeonato-burgos')) return;
        var form = getForm();
        var state = readFormState(form);
        renderSection('equipo', t('config_equipo_campeonato', 'Equipo personalizado'), state);
        renderSection('premios', t('config_premios_campeonato', 'Premios'), state);
        renderSection('cava', t('config_cava_puros_campeonato', 'Cava de puros & Champagne'), state);
        if (typeof window.fillAncillaryPrices === 'function') window.fillAncillaryPrices();
        if (window.i18n && typeof window.i18n.apply === 'function') window.i18n.apply();
    }

    function daysUntilFirstFecha(form) {
        if (!form) return null;
        var fechas = (new FormData(form).getAll('fechas[]') || []).filter(Boolean).sort();
        if (!fechas.length) return null;
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var start = new Date(fechas[0] + 'T12:00:00');
        start.setHours(0, 0, 0, 0);
        return Math.floor((start.getTime() - today.getTime()) / 86400000);
    }

    function leadTimeOk(form) {
        var d = daysUntilFirstFecha(form);
        return d !== null && d >= LEAD_DAYS_MIN;
    }

    function syncLeadTimeOptions(form) {
        if (!form || !document.body.classList.contains('pack-campeonato-burgos')) return;
        var ok = leadTimeOk(form);
        var days = daysUntilFirstFecha(form);
        form.querySelectorAll('.ancillary-service-card[data-camp-lead-time]').forEach(function (card) {
            var cb = card.querySelector('input[type="checkbox"]');
            var counter = card.querySelector('.ancillary-counter');
            var hint = card.querySelector('.ancillary-service-card__lead-hint');
            if (!cb && !counter) return;

            function setCounterBlocked(blocked) {
                if (!counter) return;
                if (blocked) {
                    counter.value = '0';
                    counter.disabled = true;
                    card.classList.remove('ancillary-service-card--selected');
                } else {
                    counter.disabled = false;
                }
                card.querySelectorAll('.ancillary-btn').forEach(function (btn) {
                    btn.disabled = blocked;
                });
            }

            if (ok) {
                card.classList.remove('ancillary-service-card--blocked');
                if (cb) cb.disabled = false;
                setCounterBlocked(false);
                if (hint) hint.hidden = true;
            } else {
                card.classList.add('ancillary-service-card--blocked');
                if (cb) {
                    cb.checked = false;
                    cb.disabled = true;
                    card.classList.remove('ancillary-service-card--selected');
                }
                setCounterBlocked(true);
                if (hint) {
                    hint.hidden = false;
                    var textEl = hint.querySelector('.ancillary-service-card__lead-text') || hint;
                    if (days === null) {
                        textEl.textContent = t('camp_lead_time_sin_fechas', 'Indica las fechas del campeonato (paso 1) para comprobar la antelación mínima de 20 días.');
                    } else {
                        textEl.textContent = t('camp_lead_time_20', 'Solo disponible con 20 días o más de antelación respecto a la fecha de llegada.');
                    }
                }
            }
        });
    }

    function syncImporteInputs(form) {
        if (!form) return;
        form.querySelectorAll('.ancillary-service-card[data-camp-tipo="importe"]').forEach(function (card) {
            var cbName = card.getAttribute('data-camp-checkbox');
            var cb = cbName ? form.querySelector('input[name="' + cbName + '"]') : null;
            var inp = card.querySelector('.campeonato-importe-input');
            if (!inp) return;
            var on = cb && cb.checked && !cb.disabled;
            inp.disabled = !on;
            if (!on) inp.value = '';
            card.classList.toggle('ancillary-service-card--selected', !!on);
        });
    }

    function syncCampeonatoExtrasUi(form) {
        form = form || getForm();
        if (!form) return;
        syncLeadTimeOptions(form);
        syncImporteInputs(form);
    }

    function numParticipantesFromFormData(formData, form) {
        var n = parseInt((formData.get('tamanio_grupo') || '').trim(), 10);
        if (!isNaN(n) && n >= 1) return n;
        if (form) {
            var usuarios = form.querySelectorAll('.usuario-form');
            if (usuarios.length) return Math.max(1, usuarios.length);
        }
        return 1;
    }

    function parseEuroInput(formData, name) {
        var raw = String(formData.get(name) || '').trim().replace(',', '.');
        var n = parseFloat(raw);
        return isNaN(n) || n < 0 ? 0 : n;
    }

    function calcCampeonatoExtras(formData, form) {
        var out = { equipo: 0, premios: 0, cava: 0 };
        if (!document.body.classList.contains('pack-campeonato-burgos')) return out;

        var precios = (typeof getPrecios === 'function') ? getPrecios() : (window.PRECIOS_DATA || {});
        var anc = precios.ancillaries || {};
        var n = numParticipantesFromFormData(formData, form);
        var leadOk = form ? leadTimeOk(form) : true;

        if (formData.get('camp_bolas_personalizadas') && leadOk) {
            out.equipo += (anc.bolasPersonalizadasCampeonato || 8) * n;
        }
        if (formData.get('camp_equipacion_polos') && leadOk) {
            out.equipo += (anc.poloPersonalizadoCampeonato || 45) * n;
        }
        if (formData.get('camp_bote_efectivo')) {
            out.premios += parseEuroInput(formData, 'camp_bote_efectivo_eur');
        }
        if (formData.get('camp_bono_tienda')) {
            out.premios += parseEuroInput(formData, 'camp_bono_tienda_eur');
        }
        if (formData.get('camp_pack_canalla') && leadOk) {
            out.premios += (anc.packCanallaPremio || 8) * n;
        }
        if (leadOk) {
            var qCopa = Math.max(0, parseInt(formData.get('camp_copa_ganador') || '0', 10));
            out.premios += qCopa * (anc.copaGanadorLerma || 50);
        }
        var qPuros = Math.max(0, parseInt(formData.get('camp_puros_davidoff') || '0', 10));
        var qChampagne = Math.max(0, parseInt(formData.get('camp_champagne_veuve') || '0', 10));
        out.cava += qPuros * (anc.puroDavidoffNo5 || anc.cavaPuros || 40);
        out.cava += qChampagne * (anc.champagneVeuveClicquot || 60);

        var round = (typeof roundEuros === 'function') ? roundEuros : function (x) { return Math.round(x * 100) / 100; };
        out.equipo = round(out.equipo);
        out.premios = round(out.premios);
        out.cava = round(out.cava);
        return out;
    }

    function bindForm(form) {
        if (!form || form.getAttribute('data-camp-extras-bound') === '1') return;
        form.setAttribute('data-camp-extras-bound', '1');

        function refresh() {
            syncCampeonatoExtrasUi(form);
            if (typeof window.actualizarResumen === 'function') window.actualizarResumen();
        }

        form.addEventListener('change', function (e) {
            var t = e.target;
            if (t && t.matches && t.matches('input[type="checkbox"][name^="camp_"]')) {
                var card = t.closest('.ancillary-service-card');
                if (card) card.classList.toggle('ancillary-service-card--selected', t.checked);
            }
            refresh();
        });
        form.addEventListener('input', function (e) {
            if (e.target && e.target.classList && e.target.classList.contains('campeonato-importe-input')) refresh();
        });
        document.addEventListener('i18n:changed', function () {
            renderCampeonatoExtras();
            syncCampeonatoExtrasUi(form);
        });
        refresh();
    }

    window.calcCampeonatoExtras = calcCampeonatoExtras;
    window.syncCampeonatoExtrasUi = syncCampeonatoExtrasUi;
    window.renderCampeonatoExtras = renderCampeonatoExtras;

    function init() {
        if (!document.body.classList.contains('pack-campeonato-burgos')) return;
        renderCampeonatoExtras();
        var form = getForm();
        if (form) bindForm(form);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
