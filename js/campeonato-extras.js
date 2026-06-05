/**
 * Paquete Campeonato Burgos: extras secciones 6–8 (precios por jugador, importes, lead time 20 días).
 */
(function () {
    'use strict';

    var LEAD_DAYS_MIN = 20;

    function getForm() {
        return document.getElementById('configuradorForm');
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

    function t(key, fallback) {
        if (window.i18n && window.i18n.t) {
            var v = window.i18n.t(key);
            if (v && v !== key) return v;
        }
        return fallback;
    }

    function syncLeadTimeOptions(form) {
        if (!form || !document.body.classList.contains('pack-campeonato-burgos')) return;
        var ok = leadTimeOk(form);
        var days = daysUntilFirstFecha(form);
        form.querySelectorAll('[data-camp-lead-time]').forEach(function (card) {
            var cb = card.querySelector('input[type="checkbox"]');
            var hint = card.querySelector('.campeonato-opcion-card__lead-hint');
            if (!cb) return;
            if (ok) {
                card.classList.remove('campeonato-opcion-card--blocked');
                cb.disabled = false;
                if (hint) hint.hidden = true;
            } else {
                card.classList.add('campeonato-opcion-card--blocked');
                cb.checked = false;
                cb.disabled = true;
                if (hint) {
                    hint.hidden = false;
                    var textEl = hint.querySelector('.campeonato-opcion-card__lead-text') || hint;
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
        form.querySelectorAll('.campeonato-opcion-card--importe').forEach(function (card) {
            var cb = card.querySelector('input[type="checkbox"]');
            var inp = card.querySelector('.campeonato-importe-input');
            if (!inp) return;
            var on = cb && cb.checked && !cb.disabled;
            inp.disabled = !on;
            if (!on) inp.value = '';
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
        if (formData.get('camp_cava_puros')) {
            out.cava += (anc.cavaPuros || 40);
        }

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

        form.addEventListener('change', refresh);
        form.addEventListener('input', function (e) {
            if (e.target && e.target.classList && e.target.classList.contains('campeonato-importe-input')) refresh();
        });
        document.addEventListener('i18n:changed', refresh);
        refresh();
    }

    function setCampeonatoExtraFoto(slot, src, alt) {
        if (!slot || !src) return;
        var el = document.querySelector('[data-camp-foto="' + slot + '"]');
        if (!el) return;
        var img = document.createElement('img');
        img.src = src;
        img.alt = alt || '';
        el.innerHTML = '';
        el.appendChild(img);
        el.hidden = false;
    }

    window.calcCampeonatoExtras = calcCampeonatoExtras;
    window.syncCampeonatoExtrasUi = syncCampeonatoExtrasUi;
    window.setCampeonatoExtraFoto = setCampeonatoExtraFoto;

    function init() {
        if (!document.body.classList.contains('pack-campeonato-burgos')) return;
        var form = getForm();
        if (form) bindForm(form);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
