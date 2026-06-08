/**
 * Solicitud de reserva (bautismos / clases): fecha, hora, personas, campo, contacto.
 * body[data-reserva-tipo="bautismos"|"clases-golf"]
 */
(function () {
    'use strict';

    function t(key, fallback) {
        if (window.i18n && window.i18n.t) {
            var v = window.i18n.t(key);
            if (v && v !== key) return v;
        }
        return fallback;
    }

    function campoLabel(val) {
        if (val === 'lerma') return t('campo_lerma', 'Golf Lerma');
        if (val === 'saldana') return t('campo_saldana', 'Saldaña Golf');
        return '—';
    }

    function getBtnLabel(tipoVal) {
        if (tipoVal === 'bautismos') return t('btn_reserva_bautismos', 'Solicitar bautismo de golf');
        if (tipoVal === 'clases-golf') return t('btn_reserva_clases', 'Solicitar clases de golf');
        return t('btn_enviar_solicitud', 'Enviar solicitud');
    }

    function formatFecha(iso) {
        if (!iso) return '—';
        var p = iso.split('-');
        if (p.length !== 3) return iso;
        return p[2] + '/' + p[1] + '/' + p[0];
    }

    document.addEventListener('DOMContentLoaded', function () {
        var tipo = (document.body.getAttribute('data-reserva-tipo') || '').trim();
        if (!tipo) return;

        var form = document.getElementById('formReservaSolicitud');
        var resumenDiv = document.getElementById('resumen-solicitud');
        var btn = document.getElementById('btnReservaSolicitud');
        var feedback = document.getElementById('reservaSolicitudFeedback');
        var fechaInput = document.getElementById('reserva-fecha');
        var numInput = document.getElementById('reserva-num-personas');

        if (fechaInput) {
            var today = new Date();
            var min = today.getFullYear() + '-' +
                String(today.getMonth() + 1).padStart(2, '0') + '-' +
                String(today.getDate()).padStart(2, '0');
            fechaInput.setAttribute('min', min);
        }

        if (numInput) {
            var minus = form && form.querySelector('.reserva-personas-minus');
            var plus = form && form.querySelector('.reserva-personas-plus');
            if (minus) {
                minus.addEventListener('click', function () {
                    var n = Math.max(1, parseInt(numInput.value || '1', 10) - 1);
                    numInput.value = String(n);
                    actualizarResumen();
                });
            }
            if (plus) {
                plus.addEventListener('click', function () {
                    var n = Math.min(54, parseInt(numInput.value || '1', 10) + 1);
                    numInput.value = String(n);
                    actualizarResumen();
                });
            }
        }

        if (typeof window.initHoraSalidaPickers === 'function') {
            window.initHoraSalidaPickers(form);
        }

        function actualizarResumen() {
            if (!form || !resumenDiv) return;
            var fd = new FormData(form);
            var fecha = (fd.get('fecha') || '').trim();
            var hora = (fd.get('hora') || '').trim();
            var num = parseInt(fd.get('num_personas') || '0', 10);
            var campo = (fd.get('campo') || '').trim();

            if (!fecha && !hora && !campo && num < 1) {
                resumenDiv.innerHTML = '<p>' + t('resumen_completa', 'Completa las opciones para ver el resumen') + '</p>';
                return;
            }

            var html = '<div class="resumen-items">';
            html += '<p><strong>' + t('reserva_fecha', 'Fecha') + ':</strong> ' + formatFecha(fecha) + '</p>';
            html += '<p><strong>' + t('reserva_hora', 'Hora') + ':</strong> ' + (hora || '—') + '</p>';
            html += '<p><strong>' + t('label_num_personas', 'Número de personas') + ':</strong> ' + (num > 0 ? num : '—') + '</p>';
            html += '<p><strong>' + t('reserva_campo', 'Campo') + ':</strong> ' + campoLabel(campo) + '</p>';
            html += '</div>';
            html += '<p class="reserva-solicitud-resumen-nota">' + t('reserva_sin_pago_nota', 'Solicitud sin pago en la web. Tras tramitarla, le indicaremos cómo formalizar el pago si fuera necesario.') + '</p>';
            resumenDiv.innerHTML = html;
        }

        if (form) {
            form.addEventListener('change', actualizarResumen);
            form.addEventListener('input', actualizarResumen);
            actualizarResumen();

            form.addEventListener('submit', function (e) {
                e.preventDefault();
                if (!form.reportValidity()) return;

                var fd = new FormData(form);
                var prefijo = (fd.get('contacto_prefijo') || '+34').trim();
                var movil = (fd.get('contacto_movil') || '').trim();
                var telefono = movil ? (prefijo + ' ' + movil).trim() : '';

                var payload = {
                    tipo: tipo,
                    fecha: (fd.get('fecha') || '').trim(),
                    hora: (fd.get('hora') || '').trim(),
                    num_personas: parseInt(fd.get('num_personas') || '0', 10),
                    campo: (fd.get('campo') || '').trim(),
                    contacto_nombre: (fd.get('contacto_nombre') || '').trim(),
                    contacto_email: (fd.get('contacto_email') || '').trim(),
                    contacto_telefono: telefono,
                };

                if (payload.num_personas < 1) {
                    alert(t('reserva_error_personas', 'Indique al menos una persona.'));
                    return;
                }

                feedback.hidden = true;
                feedback.className = 'empresa-form-feedback';
                var textoOriginal = getBtnLabel(tipo);
                btn.disabled = true;
                btn.textContent = t('promo_enviando', 'Enviando…');

                fetch('/api/reserva-solicitud', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
                    .then(function (r) { return r.json().catch(function () { return {}; }); })
                    .then(function (data) {
                        if (data.ok) {
                            feedback.textContent = t(
                                'reserva_solicitud_ok',
                                'Solicitud enviada correctamente. Tramitaremos su petición y nos pondremos en contacto con usted lo antes posible.'
                            );
                            feedback.className = 'empresa-form-feedback empresa-form-feedback-ok';
                            form.reset();
                            if (numInput) numInput.value = '1';
                            actualizarResumen();
                        } else {
                            feedback.textContent = data.error || t('promo_error', 'No se pudo enviar. Inténtelo de nuevo.');
                            feedback.className = 'empresa-form-feedback empresa-form-feedback-error';
                        }
                        feedback.hidden = false;
                    })
                    .catch(function () {
                        feedback.textContent = t('promo_error_red', 'Error de conexión. Inténtelo de nuevo o contacte por teléfono (947 56 46 30).');
                        feedback.className = 'empresa-form-feedback empresa-form-feedback-error';
                        feedback.hidden = false;
                    })
                    .finally(function () {
                        btn.disabled = false;
                        btn.textContent = textoOriginal;
                    });
            });
        }
    });
})();
