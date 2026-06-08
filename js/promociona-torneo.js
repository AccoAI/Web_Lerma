/**
 * Formulario público: solicitud para promocionar un torneo.
 */
(function () {
    'use strict';

    var MAX_FOTO_BYTES = 2.5 * 1024 * 1024;

    function t(key, fallback) {
        if (window.i18n && window.i18n.t) {
            var v = window.i18n.t(key);
            if (v && v !== key) return v;
        }
        return fallback;
    }

    function readFileAsDataUrl(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function collectPayload(form) {
        var fd = new FormData(form);
        var data = {};
        fd.forEach(function (value, key) {
            if (key === 'foto_archivo' || key === 'handicap_limitado') return;
            data[key] = typeof value === 'string' ? value.trim() : value;
        });
        data.handicap_limitado = !!fd.get('handicap_limitado');
        return data;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var form = document.getElementById('formPromocionaTorneo');
        if (!form) return;

        var btn = document.getElementById('formPromocionaTorneoBtn');
        var feedback = document.getElementById('formPromocionaTorneoFeedback');
        var fotoInput = document.getElementById('promo-foto-archivo');
        var fotoPreview = document.getElementById('promo-foto-preview');
        var handicapCheck = document.getElementById('promo-handicap-limitado');
        var handicapWrap = document.getElementById('promo-limite-handicap-wrap');

        if (handicapCheck && handicapWrap) {
            function syncHandicap() {
                handicapWrap.hidden = !handicapCheck.checked;
                var inp = handicapWrap.querySelector('input');
                if (inp) {
                    if (handicapCheck.checked) inp.removeAttribute('disabled');
                    else inp.setAttribute('disabled', 'disabled');
                }
            }
            handicapCheck.addEventListener('change', syncHandicap);
            syncHandicap();
        }

        if (fotoInput && fotoPreview) {
            fotoInput.addEventListener('change', function () {
                var file = fotoInput.files && fotoInput.files[0];
                if (!file) {
                    fotoPreview.hidden = true;
                    fotoPreview.innerHTML = '';
                    return;
                }
                if (file.size > MAX_FOTO_BYTES) {
                    fotoInput.value = '';
                    fotoPreview.hidden = true;
                    alert(t('promo_foto_max', 'La foto no puede superar 2,5 MB.'));
                    return;
                }
                var url = URL.createObjectURL(file);
                fotoPreview.innerHTML =
                    '<img src="' + url + '" alt="" class="promo-torneo-foto-preview__img">' +
                    '<span class="promo-torneo-foto-preview__name">' + file.name + '</span>';
                fotoPreview.hidden = false;
            });
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!form.reportValidity()) return;

            var payload = collectPayload(form);
            var file = fotoInput && fotoInput.files && fotoInput.files[0];

            feedback.hidden = true;
            feedback.className = 'empresa-form-feedback';
            var textoOriginal = btn.textContent;
            btn.disabled = true;
            btn.textContent = t('promo_enviando', 'Enviando…');

            function send(body) {
                return fetch('/api/promociona-torneo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                })
                    .then(function (r) { return r.json().catch(function () { return {}; }); })
                    .then(function (data) {
                        if (data.ok) {
                            feedback.textContent = t(
                                'promo_ok',
                                'Solicitud enviada correctamente. El club revisará los datos y le contactará lo antes posible. La publicación en la web, si procede, será posterior a esa revisión.'
                            );
                            feedback.className = 'empresa-form-feedback empresa-form-feedback-ok';
                            form.reset();
                            if (fotoPreview) {
                                fotoPreview.hidden = true;
                                fotoPreview.innerHTML = '';
                            }
                            if (handicapCheck && handicapWrap) {
                                handicapWrap.hidden = true;
                            }
                        } else {
                            feedback.textContent = data.error || t('promo_error', 'No se pudo enviar. Inténtelo de nuevo.');
                            feedback.className = 'empresa-form-feedback empresa-form-feedback-error';
                        }
                        feedback.hidden = false;
                    })
                    .catch(function () {
                        feedback.textContent = t(
                            'promo_error_red',
                            'Error de conexión. Inténtelo de nuevo o contacte por teléfono (947 56 46 30).'
                        );
                        feedback.className = 'empresa-form-feedback empresa-form-feedback-error';
                        feedback.hidden = false;
                    })
                    .finally(function () {
                        btn.disabled = false;
                        btn.textContent = textoOriginal;
                    });
            }

            if (file) {
                readFileAsDataUrl(file)
                    .then(function (dataUrl) {
                        payload.foto_base64 = dataUrl;
                        payload.foto_filename = file.name;
                        return send(payload);
                    })
                    .catch(function () {
                        btn.disabled = false;
                        btn.textContent = textoOriginal;
                        feedback.textContent = t('promo_foto_error', 'No se pudo leer la imagen seleccionada.');
                        feedback.className = 'empresa-form-feedback empresa-form-feedback-error';
                        feedback.hidden = false;
                    });
            } else {
                send(payload);
            }
        });
    });
})();
