/**
 * Página de detalle de torneo (torneo.html).
 * Lee el torneo guardado en sessionStorage (torneoSeleccionado) y muestra todos los campos recibidos de la plataforma.
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

    function val(v) {
        if (v == null) return '';
        if (typeof v === 'boolean') return v ? 'Sí' : 'No';
        var s = String(v).trim();
        return s !== '' ? s : '';
    }

    function row(label, value) {
        if (value == null || value === '') return '';
        if (typeof value === 'boolean') value = value ? 'Sí' : 'No';
        return '<p class="torneo-detalle-campo"><strong>' + esc(label) + '</strong> ' + esc(String(value)) + '</p>';
    }

    function block(title, content) {
        if (!content) return '';
        return '<div class="torneo-detalle-bloque"><h3 class="torneo-detalle-bloque-titulo">' + esc(title) + '</h3>' + content + '</div>';
    }

    function parsePrecio(v) {
        if (v == null) return null;
        if (typeof v === 'number' && !isNaN(v) && v >= 0) return v;
        var s = String(v).replace(/[^\d,.]/g, '').replace(',', '.');
        var n = parseFloat(s);
        return isNaN(n) || n < 0 ? null : n;
    }

    function isSocioLoggedIn() {
        try {
            return sessionStorage.getItem('areaSocioLoggedIn') === '1';
        } catch (e) {
            return false;
        }
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

        var titulo = val(t.titulo) || 'Torneo';
        if (document.title) document.title = titulo + ' - Golf Lerma';

        var html = '';
        var imgUrl = safeImgSrc(t.foto || t.imagen);
        if (imgUrl) {
            html += '<div class="torneo-detalle-imagen-wrap"><img src="' + esc(imgUrl) + '" alt="' + esc(titulo) + '" class="torneo-detalle-imagen"></div>';
        }
        html += '<h1 class="torneo-detalle-titulo">' + esc(titulo) + '</h1>';

        html += row('Fecha', t.fechas);
        if (val(t.fechaInicio)) html += row('Fecha inicio', t.fechaInicio);
        if (val(t.fechaFin)) html += row('Fecha fin', t.fechaFin);
        html += row('Modalidad', t.modalidad);
        html += row('Premios', t.premios);
        if (val(t.jornadas)) html += row('Jornadas', t.jornadas);
        if (val(t.tipoEvento)) html += row('Tipo de evento', t.tipoEvento);

        if (val(t.descripcion)) {
            html += '<div class="torneo-detalle-descripcion">' + esc(t.descripcion) + '</div>';
        }

        var config = '';
        config += row('Tipo de salida', t.tipoSalida);
        if (t.handicapLimitado === true || t.handicapLimitado === false) config += row('Hándicap limitado', t.handicapLimitado ? 'Sí' : 'No');
        config += row('Límite hándicap', t.handicapLimite != null && t.handicapLimite !== '' ? (typeof t.handicapLimite === 'number' ? 'Máx. ' + t.handicapLimite : t.handicapLimite) : '');
        config += row('Categorías de juego', t.categoriasJuego);
        config += row('Comité de competición', t.comiteCompeticion);
        if (config) html += block('Configuración deportiva', config);

        var logistica = '';
        logistica += row('Welcome Pack', t.welcomePack);
        logistica += row('Picnic / Carpa hoyo 9', t.picnicCarpa);
        logistica += row('Cóctel / Entrega de premios', t.coctelEntregaPremios);
        if (logistica) html += block('Logística y hospitality', logistica);

        var precios = '';
        precios += row('Precio Socio', t.precioSocio);
        precios += row('Precio No Socio', t.precioNoSocio);
        precios += row('Precio Correspondencia', t.precioCorrespondencia);
        if (precios) html += block('Precios', precios);

        var patrocinio = '';
        patrocinio += row('Patrocinador principal', t.patrocinadorPrincipal);
        if (val(t.patrocinadorPrincipalLogo)) {
            var logoUrl = safeImgSrc(t.patrocinadorPrincipalLogo);
            if (logoUrl) patrocinio += '<p class="torneo-detalle-campo"><strong>Logo patrocinador</strong> <img src="' + esc(logoUrl) + '" alt="" style="max-width:120px;height:auto;"></p>';
            else patrocinio += row('Logo patrocinador', t.patrocinadorPrincipalLogo);
        }
        patrocinio += row('Colaboradores', t.colaboradores);
        if (patrocinio) html += block('Marketing y patrocinio', patrocinio);

        var inscripciones = '';
        inscripciones += row('Fecha límite inscripción', t.fechaLimiteInscripcion);
        inscripciones += row('Nº máximo jugadores', t.numeroMaxJugadores != null && t.numeroMaxJugadores !== '' ? String(t.numeroMaxJugadores) : '');
        if (val(t.linkPago)) inscripciones += '<p class="torneo-detalle-campo"><strong>Link de pago</strong> <a href="' + esc(safeHref(t.linkPago)) + '" target="_blank" rel="noopener noreferrer">' + esc(t.linkPago) + '</a></p>';
        inscripciones += row('Política de cancelación', t.politicaCancelacion);
        if (inscripciones) html += block('Inscripciones', inscripciones);

        var otros = '';
        otros += row('Sede', t.sede);
        otros += row('Oferta de alojamiento', t.ofertaAlojamiento);
        if (val(t.urlReglamentoPdf)) otros += '<p class="torneo-detalle-campo"><strong>Reglamento (PDF)</strong> <a href="' + esc(safeHref(t.urlReglamentoPdf)) + '" target="_blank" rel="noopener noreferrer">Descargar</a></p>';
        if (otros) html += block('Otros', otros);

        if (val(t.galeriaImagenes)) {
            var urls = t.galeriaImagenes.split(/\r?\n/).filter(function (u) { return u.trim(); });
            if (urls.length) {
                var gal = '<div class="torneo-detalle-galeria">';
                urls.forEach(function (u) {
                    var src = safeImgSrc(u.trim());
                    if (src) gal += '<img src="' + esc(src) + '" alt="" class="torneo-detalle-galeria-img">';
                });
                gal += '</div>';
                html += block('Galería', gal);
            }
        }

        var keysMostrados = { titulo: 1, foto: 1, imagen: 1, fechas: 1, fechaInicio: 1, fechaFin: 1, modalidad: 1, premios: 1, jornadas: 1, tipoEvento: 1, descripcion: 1, tipoSalida: 1, handicapLimitado: 1, handicapLimite: 1, categoriasJuego: 1, comiteCompeticion: 1, welcomePack: 1, picnicCarpa: 1, coctelEntregaPremios: 1, precioSocio: 1, precioNoSocio: 1, precioCorrespondencia: 1, patrocinadorPrincipal: 1, patrocinadorPrincipalLogo: 1, colaboradores: 1, galeriaImagenes: 1, fechaLimiteInscripcion: 1, linkPago: 1, politicaCancelacion: 1, sede: 1, ofertaAlojamiento: 1, urlReglamentoPdf: 1, enlace: 1, numeroMaxJugadores: 1 };
        var resto = '';
        Object.keys(t).forEach(function (key) {
            if (keysMostrados[key]) return;
            var v = t[key];
            if (v == null || v === '') return;
            if (typeof v === 'object') return;
            var label = key.replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); }).trim();
            resto += row(label, typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v));
        });
        if (resto) html += block('Más información', resto);

        var precioSocio = parsePrecio(t.precioSocio);
        var precioNoSocio = parsePrecio(t.precioNoSocio);
        var tienePrecio = (precioSocio != null && precioSocio > 0) || (precioNoSocio != null && precioNoSocio > 0);
        var esSocio = isSocioLoggedIn();
        var precioEuros = null;
        if (tienePrecio) {
            precioEuros = esSocio
                ? (precioSocio != null && precioSocio > 0 ? precioSocio : precioNoSocio)
                : (precioNoSocio != null && precioNoSocio > 0 ? precioNoSocio : precioSocio);
        }

        if (tienePrecio && precioEuros != null && precioEuros > 0) {
            var ctaText = 'Reservar tu plaza' + (esSocio ? ' (tarifa socio)' : '');
            html += '<p class="torneo-detalle-cta"><button type="button" class="torneo-detalle-btn torneo-detalle-btn-pago" data-precio="' + esc(String(precioEuros)) + '" data-titulo="' + esc(t.titulo || 'Torneo') + '">' + esc(ctaText) + '</button></p>';
        } else {
            var ctaHref = 'index.html?asunto=Inscripcion%20torneo%20' + encodeURIComponent(t.titulo || 'Torneo') + '#contacto';
            html += '<p class="torneo-detalle-cta"><a href="' + esc(ctaHref) + '" class="torneo-detalle-btn">Reservar tu plaza – Contactar</a></p>';
        }

        contenedor.innerHTML = html;

        var btnPago = contenedor.querySelector('.torneo-detalle-btn-pago');
        if (btnPago) {
            btnPago.addEventListener('click', function () {
                var precio = parseFloat(btnPago.getAttribute('data-precio'), 10);
                var tituloTorneo = btnPago.getAttribute('data-titulo') || 'Torneo';
                if (!precio || precio < 0.5) {
                    alert('Importe no válido. Contacte con el club.');
                    return;
                }
                var amountCents = Math.round(precio * 100);
                if (amountCents < 50) {
                    alert('El importe mínimo es 0,50 €.');
                    return;
                }
                btnPago.disabled = true;
                btnPago.textContent = 'Procesando…';
                var base = window.location.origin || '';
                fetch(base + '/api/crear-pago', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amountCents: amountCents,
                        modo: 'unico',
                        numParticipantes: 1,
                        paquete: 'torneo',
                        tituloTorneo: tituloTorneo
                    })
                })
                    .then(function (r) {
                        return r.text().then(function (text) {
                            if (!r.ok) {
                                var errMsg = 'Error al crear el pago';
                                try {
                                    var j = JSON.parse(text);
                                    if (j && j.error) errMsg = j.error;
                                } catch (e) {
                                    if (text && text.length < 200) errMsg = text;
                                }
                                throw new Error(errMsg);
                            }
                            try {
                                return JSON.parse(text);
                            } catch (e) {
                                throw new Error('Respuesta inválida del servidor');
                            }
                        });
                    })
                    .then(function (data) {
                        if (data && data.url) {
                            window.location.href = data.url;
                        } else {
                            throw new Error('No se recibió enlace de pago');
                        }
                    })
                    .catch(function (err) {
                        alert('Error: ' + (err.message || 'No se pudo iniciar el pago. Contacte con el club.'));
                        btnPago.disabled = false;
                        btnPago.textContent = esSocio ? 'Reservar tu plaza (tarifa socio)' : 'Reservar tu plaza';
                    });
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
