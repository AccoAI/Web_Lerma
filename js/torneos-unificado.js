/**
 * Envío unificado del configurador de torneos → API promociona-torneo.
 */
(function () {
  'use strict';

  var MAX_FOTO_BYTES = 2.5 * 1024 * 1024;
  var PROMO_KEYS = [
    'titulo', 'nombre_torneo', 'foto_url', 'descripcion', 'premios', 'tipo_evento',
    'jornadas', 'num_vueltas', 'tipo_salida', 'limite_handicap', 'categorias', 'comite',
    'welcome_pack', 'picnic_hoyo9', 'coctel_premios', 'precio_socio', 'precio_no_socio',
    'precio_correspondencia', 'patrocinador', 'logo_patrocinador_url', 'colaboradores',
    'galeria_urls', 'fecha_limite_inscripcion', 'cupo_max', 'link_pago', 'politica_cancelacion',
    'sede', 'url_reglamento', 'formato_competicion',
  ];

  var MODALIDAD_LABELS = {
    golf: 'Golf',
    'foot-golf': 'Foot Golf',
    'disc-golf': 'Disc Golf',
    'pitch-putt': 'Pitch and Putt',
  };

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function buildConfiguradorExtras(fd, form) {
    var fechas = fd.getAll('fechas[]') || [];
    var count = fechas.length;
    var lines = [];
    lines.push('Tipo: ' + (fd.get('tipo_torneo') === 'publico' ? 'Público (revisión club)' : 'Privado'));
    if (fechas.length) lines.push('Fechas calendario: ' + fechas.join(', '));
    if (fechas.length) {
      lines.push('Fecha inicio: ' + fechas[0]);
      lines.push('Fecha fin: ' + fechas[fechas.length - 1]);
    }
    for (var i = 1; i <= count; i++) {
      var c = fd.get('campo-dia-' + i);
      if (c) lines.push('Día ' + i + ' campo: ' + (c === 'lerma' ? 'Golf Lerma' : 'Saldaña Golf'));
    }
    var hs = fd.get('hora_salida') || '';
    if (!hs && count > 1) {
      var horas = [];
      for (var h = 1; h <= count; h++) {
        var hv = fd.get('hora_salida_dia_' + h);
        if (hv) horas.push('Día ' + h + ': ' + hv);
      }
      if (horas.length) hs = horas.join(' · ');
    }
    if (hs) lines.push('Hora salida: ' + hs);
    if (fd.get('tamanio_grupo')) lines.push('Tamaño grupo: ' + fd.get('tamanio_grupo'));
    if (fd.get('numero_grupos')) lines.push('Nº grupos: ' + fd.get('numero_grupos'));
    if (fd.get('handicap_grupo')) lines.push('Handicap grupo: ' + fd.get('handicap_grupo'));
    var mod = fd.get('modalidad');
    if (mod) {
      var modLbl = MODALIDAD_LABELS[mod] || mod;
      lines.push('Modalidad deporte: ' + modLbl);
    }
    var nNoches = parseInt(fd.get('noches') || '0', 10) || 0;
    if (nNoches >= 1) {
      var hotels = [];
      for (var n = 1; n <= nNoches; n++) {
        var hv2 = fd.get('hotel-noche-' + n);
        if (hv2) {
          var lbl = typeof window.etiquetaHotelSelect === 'function' ? window.etiquetaHotelSelect(hv2) : hv2;
          hotels.push('Noche ' + n + ': ' + lbl);
        }
      }
      if (hotels.length) lines.push('Alojamiento: ' + hotels.join(' · '));
    }
    var comidas = [];
    for (var ic = 1; ic <= count; ic++) {
      var com = (fd.get('comida_dia_' + ic) || '').trim();
      var cen = (fd.get('cena_dia_' + ic) || '').trim();
      if (com || cen) {
        var p = 'Día ' + ic + ':';
        if (com) p += ' comida ' + com;
        if (cen) p += (com ? ', ' : '') + 'cena ' + cen;
        comidas.push(p);
      }
    }
    if (comidas.length) lines.push('Comidas/cenas: ' + comidas.join(' · '));
    var anc = [];
    if (parseInt(fd.get('ancillary_buggy') || '0', 10) > 0) anc.push('Buggies: ' + fd.get('ancillary_buggy'));
    if (parseInt(fd.get('ancillary_carrito_mano') || '0', 10) > 0) anc.push('Carrito mano: ' + fd.get('ancillary_carrito_mano'));
    if (parseInt(fd.get('ancillary_carrito_electrico') || '0', 10) > 0) anc.push('Carrito eléctrico: ' + fd.get('ancillary_carrito_electrico'));
    var cubo = fd.get('ancillary_cubo_premium_boogie');
    if (cubo) anc.push('Cubo premium: ' + cubo);
    if (anc.length) lines.push('Servicios extra: ' + anc.join(', '));
    if (typeof getCorrespondenciaGrupos === 'function' && form) {
      var grupos = getCorrespondenciaGrupos(form);
      if (grupos.length) {
        lines.push('Correspondencias: ' + grupos.map(function (g) { return g.cantidad + ' × ' + g.label; }).join(', '));
      }
    }
  return lines.join('\n');
  }

  function buildPayload(form) {
    var fd = new FormData(form);
    var payload = {};
    PROMO_KEYS.forEach(function (key) {
      var val = fd.get(key);
      if (val != null && String(val).trim() !== '') payload[key] = String(val).trim();
    });
    payload.handicap_limitado = !!fd.get('handicap_limitado');

    var nombre = (fd.get('nombre_torneo') || '').trim();
    var contactoNombre = (fd.get('usuario[1][nombre]') || '').trim();
    var contactoEmail = (fd.get('usuario[1][correo]') || '').trim();
    var prefijo = (fd.get('usuario[1][movil_prefijo]') || '+34').trim();
    var movil = (fd.get('usuario[1][movil]') || '').trim();
    var contactoTel = movil ? (prefijo + ' ' + movil).trim() : '';

    if (!nombre) {
      var fechas = fd.getAll('fechas[]') || [];
      nombre = 'Torneo privado' + (contactoNombre ? ' – ' + contactoNombre : '') + (fechas[0] ? ' – ' + fechas[0] : '');
    }
    payload.nombre_torneo = nombre;
    payload.contacto_nombre = contactoNombre;
    payload.contacto_email = contactoEmail;
    payload.contacto_telefono = contactoTel;

    var fechas = fd.getAll('fechas[]') || [];
    if (fechas.length && !payload.fecha_inicio) payload.fecha_inicio = fechas[0];
    if (fechas.length > 1 && !payload.fecha_fin) payload.fecha_fin = fechas[fechas.length - 1];

    var mod = fd.get('modalidad');
    if (mod && !payload.formato_competicion) {
      payload.modalidad = MODALIDAD_LABELS[mod] || mod;
    } else if (payload.formato_competicion) {
      payload.modalidad = payload.formato_competicion;
    }

    payload.configurador_resumen = buildConfiguradorExtras(fd, form);
    payload.tipo_torneo = fd.get('tipo_torneo') || 'privado';
    return payload;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('configuradorTorneosForm');
    if (!form) return;

    var btn = document.getElementById('torneoFormSubmitBtn');
    var feedback = document.getElementById('torneoFormFeedback');
    var fotoInput = document.getElementById('torneo-foto-archivo');
    var fotoPreview = document.getElementById('torneo-foto-preview');
    var handicapCheck = document.getElementById('torneo-handicap-limitado');
    var handicapWrap = document.getElementById('torneo-limite-handicap-wrap');

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
          alert('La foto no puede superar 2,5 MB.');
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
      if (typeof window.validarTelefonosForm === 'function' && !window.validarTelefonosForm(form)) return;

      var fd = new FormData(form);
      var fechas = fd.getAll('fechas[]');
      if (!fechas || !fechas.length) {
        alert('Selecciona al menos una fecha en el calendario.');
        return;
      }
      var tipoTorneo = fd.get('tipo_torneo') || 'privado';
      if (tipoTorneo === 'publico') {
        var nombrePub = (fd.get('nombre_torneo') || '').trim();
        if (!nombrePub) {
          alert('Para un torneo público debes indicar el nombre del torneo (para la web).');
          var nombreInp = document.getElementById('nombre-torneo');
          if (nombreInp) nombreInp.focus();
          return;
        }
      }

      var payload = buildPayload(form);
      var file = fotoInput && fotoInput.files && fotoInput.files[0];
      if (feedback) {
        feedback.hidden = true;
        feedback.className = 'empresa-form-feedback';
      }
      var textoOriginal = btn ? btn.textContent : '';
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Enviando…';
      }

      function send(body) {
        return fetch('/api/promociona-torneo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
          .then(function (r) { return r.json().catch(function () { return {}; }); })
          .then(function (data) {
            if (data.ok) {
              if (feedback) {
                feedback.textContent =
                  tipoTorneo === 'publico'
                    ? 'Solicitud enviada. El club revisará la propuesta y, si la aprueba, publicará el torneo en la web. Nos pondremos en contacto contigo.'
                    : 'Solicitud de torneo privado enviada. Nos pondremos en contacto contigo para confirmar los detalles.';
                feedback.className = 'empresa-form-feedback empresa-form-feedback-ok';
                feedback.hidden = false;
              }
            } else {
              if (feedback) {
                feedback.textContent = data.error || 'No se pudo enviar. Inténtelo de nuevo.';
                feedback.className = 'empresa-form-feedback empresa-form-feedback-error';
                feedback.hidden = false;
              }
            }
            if (typeof actualizarResumenTorneo === 'function') actualizarResumenTorneo();
          })
          .catch(function () {
            if (feedback) {
              feedback.textContent = 'Error de conexión. Inténtelo de nuevo o contacte por teléfono (947 56 46 30).';
              feedback.className = 'empresa-form-feedback empresa-form-feedback-error';
              feedback.hidden = false;
            }
          })
          .finally(function () {
            if (btn) {
              btn.disabled = false;
              btn.textContent = textoOriginal;
            }
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
            if (btn) {
              btn.disabled = false;
              btn.textContent = textoOriginal;
            }
            if (feedback) {
              feedback.textContent = 'No se pudo leer la imagen seleccionada.';
              feedback.className = 'empresa-form-feedback empresa-form-feedback-error';
              feedback.hidden = false;
            }
          });
      } else {
        send(payload);
      }
    });
  });
})();
