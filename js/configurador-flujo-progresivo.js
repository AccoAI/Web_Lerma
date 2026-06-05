/**
 * Revela secciones del configurador una a una; las bloqueadas no se muestran (ni título ni avisos).
 */
(function () {
    'use strict';

    function isTamanioGrupoCompleto() {
        var tg = document.getElementById('tamanio-grupo');
        if (!tg) return false;
        var n = parseInt(tg.value, 10);
        return !isNaN(n) && n >= 1;
    }

    function getConfigFlowSteps(form) {
        if (!form) return [];
        return Array.prototype.slice.call(
            form.querySelectorAll(':scope > .configurador-seccion, :scope > .forma-pago-block')
        );
    }

    function isConfigStepOptional(step) {
        if (!step) return true;
        if (step.classList.contains('servicios-adicionales-section')) return true;
        if (step.classList.contains('tienda-golf-section')) return true;
        if (step.classList.contains('campeonato-extra-section')) return true;
        if (step.getAttribute('data-config-optional') === 'true') return true;
        if (step.querySelector('#comida-por-dia-wrap') && !step.classList.contains('configurador-seccion--menus-opco')) {
            return true;
        }
        return false;
    }

    function isConfigPasoMenusOpcoCompleto(form, fd) {
        if (!document.body.classList.contains('pack-golf-comida')) return true;
        var count = (fd.getAll('fechas[]') || []).length;
        if (count < 1) return false;
        for (var d = 1; d <= count; d++) {
            var opc = (fd.get('comida_opcion_dia_' + d) || '').trim();
            var menuId = (fd.get('comida_menu_id_' + d) || '').trim();
            if (!menuId && opc.indexOf('club:') === 0) menuId = opc.replace(/^club:/, '');
            if (!menuId) return false;
        }
        return true;
    }

    function isConfigPasoHotelCompleto(form, fd) {
        var wrap = document.getElementById('configurador-hotel-wrap');
        if (!wrap) return true;
        var noches = parseInt(fd.get('noches') || '0', 10);
        if (noches < 1) return false;
        if (String(fd.get('hb_funnel_ready') || '').trim() === '1') return true;
        for (var i = 1; i <= noches; i++) {
            if ((fd.get('hotel-noche-' + i) || '').trim()) return true;
        }
        return false;
    }

    function isConfigPasoGolfCompleto(form, fd) {
        if (!form) return false;
        if (typeof window.getConfigPrereqState !== 'function') return false;
        var state = window.getConfigPrereqState(form);
        if (!state.personas || !state.fechas) return false;
        if (!document.getElementById('dias-campos-container-finsemana')) return true;
        var count = (fd.getAll('fechas[]') || []).length;
        if (count < 1) return false;
        var packGolfComida = document.body.classList.contains('pack-golf-comida');
        if (packGolfComida) {
            for (var i = 1; i <= count; i++) {
                if (!(fd.get('campo-dia-' + i) || '').trim()) return false;
            }
            return true;
        }
        for (var j = 1; j <= count; j++) {
            if ((fd.get('campo-dia-' + j) || '').trim()) return true;
        }
        return false;
    }

    function isConfigStepComplete(step, form, fd, stepIndex) {
        if (isConfigStepOptional(step)) return true;
        if (step.classList.contains('configurador-seccion--fechas')) {
            return isConfigPasoGolfCompleto(form, fd);
        }
        if (step.id === 'configurador-hotel-wrap') {
            return isConfigPasoHotelCompleto(form, fd);
        }
        if (step.classList.contains('configurador-seccion--menus-opco')) {
            return isConfigPasoMenusOpcoCompleto(form, fd);
        }
        if (stepIndex === 0 && step.querySelector('.calendario-dias-container') && !step.classList.contains('configurador-seccion--fechas')) {
            var fechas = fd.getAll('fechas[]') || [];
            if (fechas.length < 1) return false;
            var horaInp = step.querySelector('[name="hora_salida"]');
            if (horaInp && horaInp.required && !(fd.get('hora_salida') || '').trim()) return false;
            return true;
        }
        if (step.querySelector('#tamanio-grupo') && !step.classList.contains('configurador-seccion--fechas')) {
            return isTamanioGrupoCompleto();
        }
        if (step.querySelector('#num-adultos') || step.querySelector('#num-jovenes')) {
            var adultos = parseInt(fd.get('num_adultos') || '0', 10) || 0;
            var jovenes = parseInt(fd.get('num_jovenes') || '0', 10) || 0;
            return (adultos + jovenes) >= 1;
        }
        if (step.querySelector('#calendario-dias-bautismos')) {
            return (fd.getAll('fechas[]') || []).length >= 1 && !!(fd.get('hora_salida') || '').trim();
        }
        return true;
    }

    function syncFechasGolfGate(form) {
        if (!form) return;
        var golfSec = form.querySelector('.fechas-golf-section');
        if (!golfSec) return;
        var ready = isTamanioGrupoCompleto();
        golfSec.hidden = !ready;
        var espera = form.querySelector('#fechas-golf-espera-personas');
        if (espera) espera.hidden = true;
        var body = form.querySelector('#fechas-golf-body');
        if (body && ready) body.hidden = false;
    }

    function isPackFlujoProgresivoPorPasos() {
        return document.body.classList.contains('pack-golf-comida');
    }

    function updateConfiguradorFlujoProgresivo(formOrId) {
        var form = typeof formOrId === 'string'
            ? document.getElementById(formOrId)
            : (formOrId || document.getElementById('configuradorForm'));
        if (!form || !form.classList.contains('configurador-form')) return;
        if (form.getAttribute('data-config-flow-off') === 'true') return;

        form.classList.add('configurador-form--flujo-progresivo');
        var steps = getConfigFlowSteps(form);
        if (!steps.length) return;

        var fd = new FormData(form);
        var packPorPasos = isPackFlujoProgresivoPorPasos();
        var golfCompleto = isConfigPasoGolfCompleto(form, fd);
        var desbloquearTodasTrasGolf = !packPorPasos && golfCompleto;

        form.classList.toggle('configurador-form--flujo-todas-tras-golf', desbloquearTodasTrasGolf);

        if (desbloquearTodasTrasGolf) {
            var yaDesbloqueado = form.getAttribute('data-config-todas-tras-golf') === '1';
            for (var u = 0; u < steps.length; u++) {
                var stepAll = steps[u];
                stepAll.hidden = false;
                if (stepAll.classList.contains('configurador-seccion--fechas')) {
                    syncFechasGolfGate(form);
                }
            }
            if (!yaDesbloqueado && typeof window.syncConfiguradorContenidoPostGolf === 'function') {
                window.syncConfiguradorContenidoPostGolf(form);
            }
            form.setAttribute('data-config-todas-tras-golf', '1');
        } else {
            form.removeAttribute('data-config-todas-tras-golf');
            var unlockNext = true;

            for (var i = 0; i < steps.length; i++) {
                var step = steps[i];
                var isFechas = step.classList.contains('configurador-seccion--fechas');

                if (isFechas) {
                    step.hidden = false;
                    syncFechasGolfGate(form);
                } else if (unlockNext) {
                    step.hidden = false;
                } else {
                    step.hidden = true;
                }

                if (!unlockNext) continue;

                if (!isConfigStepComplete(step, form, fd, i)) {
                    unlockNext = false;
                }
            }
        }

        if (typeof window.refreshConfiguradorFormNav === 'function') {
            window.refreshConfiguradorFormNav(form);
        }
    }

    function bindForm(form) {
        if (!form || form.getAttribute('data-config-flow-bound') === '1') return;
        form.setAttribute('data-config-flow-bound', '1');

        function refresh() {
            updateConfiguradorFlujoProgresivo(form);
        }

        form.addEventListener('change', refresh);
        form.addEventListener('input', refresh);
        document.addEventListener('i18n:changed', refresh);
        refresh();
    }

    function initAll() {
        document.querySelectorAll('form.configurador-form').forEach(bindForm);
    }

    window.isConfigPasoGolfCompleto = isConfigPasoGolfCompleto;
    window.isConfigPasoHotelCompleto = isConfigPasoHotelCompleto;
    window.isConfigPasoMenusOpcoCompleto = isConfigPasoMenusOpcoCompleto;
    window.updateConfiguradorFlujoProgresivo = updateConfiguradorFlujoProgresivo;
    window.syncFechasGolfGate = syncFechasGolfGate;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }
})();
