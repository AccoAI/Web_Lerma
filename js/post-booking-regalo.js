/**
 * Postbooking — Paquete de regalo: nombre + mensaje + 3 formatos PDF (imprimir / guardar).
 * Solo Paquete Burgos y Campeonato Burgos.
 */
(function () {
  'use strict';

  var FORMATOS = [
    {
      id: 'clasico',
      nombre: 'Clásico',
      desc: 'Verde club, tipografía sobria',
    },
    {
      id: 'elegante',
      nombre: 'Elegante',
      desc: 'Marco fino y tono champagne',
    },
    {
      id: 'festivo',
      nombre: 'Festivo',
      desc: 'Más color, ideal para celebrar',
    },
  ];

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function buildCertificateHtml(formato, nombre, mensaje, paqueteLabel) {
    var safeName = esc(nombre || '—');
    var safeMsg = esc(mensaje || '').replace(/\n/g, '<br>');
    var safePack = esc(paqueteLabel || 'Golf Lerma');
    var year = new Date().getFullYear();

    return (
      '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">' +
      '<title>Tarjeta regalo — Golf Lerma</title>' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">' +
      '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">' +
      '<style>' +
      '@page{size:A4;margin:0}' +
      'html,body{margin:0;padding:0;background:#fff}' +
      'body{font-family:Montserrat,system-ui,sans-serif;color:#1a2e24}' +
      '.sheet{width:210mm;min-height:297mm;margin:0 auto;box-sizing:border-box;padding:18mm 16mm;position:relative;display:flex;align-items:center;justify-content:center}' +
      '.card{width:100%;min-height:240mm;box-sizing:border-box;padding:22mm 18mm;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:1.1rem}' +
      '.eyebrow{letter-spacing:.22em;text-transform:uppercase;font-size:11px;font-weight:600;margin:0}' +
      '.title{font-family:"Cormorant Garamond",Georgia,serif;font-size:42px;line-height:1.1;margin:0;font-weight:600}' +
      '.to{font-size:13px;letter-spacing:.12em;text-transform:uppercase;margin:1.2rem 0 0;opacity:.75}' +
      '.name{font-family:"Cormorant Garamond",Georgia,serif;font-size:34px;margin:.2rem 0 0;font-weight:600}' +
      '.msg{max-width:140mm;font-size:15px;line-height:1.55;margin:1.2rem 0 0;white-space:pre-wrap}' +
      '.pack{margin-top:1.6rem;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.8}' +
      '.brand{margin-top:auto;padding-top:2rem;font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:600}' +
      '.year{font-size:11px;opacity:.65;margin:.35rem 0 0}' +
      /* Clásico */ +
      '.fmt-clasico .card{background:linear-gradient(165deg,#f4f7f4 0%,#e8efe9 100%);border:2px solid #0f5c2c;box-shadow:inset 0 0 0 8px #fff}' +
      '.fmt-clasico .eyebrow,.fmt-clasico .brand{color:#0f5c2c}' +
      '.fmt-clasico .title,.fmt-clasico .name{color:#0a3d1c}' +
      /* Elegante */ +
      '.fmt-elegante .card{background:#faf8f4;border:1px solid #c4b59a;box-shadow:inset 0 0 0 10px #fff,inset 0 0 0 11px #d9cbb3}' +
      '.fmt-elegante .eyebrow,.fmt-elegante .brand{color:#7a6848}' +
      '.fmt-elegante .title,.fmt-elegante .name{color:#3d3426}' +
      '.fmt-elegante .msg{color:#4a4033}' +
      /* Festivo */ +
      '.fmt-festivo .card{background:radial-gradient(circle at 20% 15%,#fff8e8 0%,#f3f8f1 45%,#e6f0ea 100%);border:3px solid #0f5c2c;position:relative;overflow:hidden}' +
      '.fmt-festivo .card::before,.fmt-festivo .card::after{content:"";position:absolute;width:120px;height:120px;border-radius:50%;opacity:.18}' +
      '.fmt-festivo .card::before{background:#c9a227;top:-30px;left:-20px}' +
      '.fmt-festivo .card::after{background:#0f5c2c;bottom:-40px;right:-25px}' +
      '.fmt-festivo .eyebrow{color:#9a7b1a}' +
      '.fmt-festivo .title,.fmt-festivo .name{color:#0f5c2c}' +
      '.fmt-festivo .brand{color:#0f5c2c}' +
      '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{width:auto;min-height:auto;padding:0}.card{min-height:277mm}}' +
      '</style></head><body class="fmt-' +
      esc(formato) +
      '"><div class="sheet"><div class="card">' +
      '<p class="eyebrow">Golf Lerma · Saldaña Golf</p>' +
      '<h1 class="title">Tarjeta regalo</h1>' +
      '<p class="to">Para</p>' +
      '<p class="name">' +
      safeName +
      '</p>' +
      (safeMsg ? '<p class="msg">' + safeMsg + '</p>' : '') +
      '<p class="pack">' +
      safePack +
      '</p>' +
      '<p class="brand">Un detalle para disfrutar el green</p>' +
      '<p class="year">' +
      year +
      '</p>' +
      '</div></div></body></html>'
    );
  }

  function openPrintPdf(formato, nombre, mensaje, paqueteLabel) {
    var html = buildCertificateHtml(formato, nombre, mensaje, paqueteLabel);
    var w = window.open('', '_blank');
    if (!w) {
      return { ok: false, error: 'El navegador bloqueó la ventana. Permite pop-ups para imprimir el PDF.' };
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    // Esperar fuentes / layout antes de imprimir
    setTimeout(function () {
      try {
        w.focus();
        w.print();
      } catch (e) {}
    }, 350);
    return { ok: true };
  }

  function paqueteLabelFromId(paqueteId) {
    if (paqueteId === 'campeonato-burgos') return 'Paquete Campeonato Burgos';
    if (paqueteId === 'golf-burgos') return 'Paquete Golf Burgos';
    return 'Golf Lerma';
  }

  window.renderPostBookingPaqueteRegalo = function (containerId, paqueteId) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;

    if (
      typeof window.paqueteIncluyePaqueteRegalo !== 'function' ||
      !window.paqueteIncluyePaqueteRegalo(paqueteId)
    ) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }

    var packLabel = paqueteLabelFromId(paqueteId);
    var formatosHtml = FORMATOS.map(function (f, i) {
      return (
        '<label class="post-regalo-format' +
        (i === 0 ? ' is-selected' : '') +
        '">' +
        '<input type="radio" name="regalo-formato" value="' +
        esc(f.id) +
        '"' +
        (i === 0 ? ' checked' : '') +
        '>' +
        '<span class="post-regalo-format__name">' +
        esc(f.nombre) +
        '</span>' +
        '<span class="post-regalo-format__desc">' +
        esc(f.desc) +
        '</span>' +
        '</label>'
      );
    }).join('');

    el.hidden = false;
    el.innerHTML =
      '<div class="post-booking-embed post-booking-regalo-block">' +
      '<div class="post-booking-embed-head">' +
      '<h3 class="post-booking-embed-title">Tarjeta regalo</h3>' +
      '</div>' +
      '<p class="post-booking-embed-intro">Opcional y sin coste. Personaliza una tarjeta PDF para regalar tu experiencia: elige formato, nombre y mensaje, e imprímela o guárdala como PDF.</p>' +
      '<form class="post-regalo-form" id="postRegaloForm" novalidate>' +
      '<div class="post-regalo-formats" role="radiogroup" aria-label="Formato del PDF">' +
      formatosHtml +
      '</div>' +
      '<label class="post-regalo-field">' +
      '<span>Nombre del destinatario</span>' +
      '<input type="text" id="regaloNombre" name="nombre" maxlength="80" required placeholder="Ej. Ana López" autocomplete="name">' +
      '</label>' +
      '<label class="post-regalo-field">' +
      '<span>Mensaje</span>' +
      '<textarea id="regaloMensaje" name="mensaje" rows="3" maxlength="280" placeholder="Ej. ¡Que disfrutes del green en Burgos!"></textarea>' +
      '</label>' +
      '<p class="post-regalo-actions">' +
      '<button type="submit" class="btn-reservar-paquete" id="btnRegaloPdf">Generar PDF / Imprimir</button>' +
      '</p>' +
      '<p class="post-regalo-status" id="regaloStatus" hidden></p>' +
      '</form>' +
      '</div>';

    var form = document.getElementById('postRegaloForm');
    var statusEl = document.getElementById('regaloStatus');
    var formats = el.querySelectorAll('.post-regalo-format');

    formats.forEach(function (lab) {
      lab.addEventListener('change', function () {
        formats.forEach(function (x) {
          x.classList.toggle('is-selected', !!(x.querySelector('input') && x.querySelector('input').checked));
        });
      });
    });

    if (!form) return;
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var nombre = (document.getElementById('regaloNombre') || {}).value || '';
      nombre = String(nombre).trim();
      var mensaje = (document.getElementById('regaloMensaje') || {}).value || '';
      mensaje = String(mensaje).trim();
      var checked = form.querySelector('input[name="regalo-formato"]:checked');
      var formato = checked ? checked.value : 'clasico';

      if (!nombre) {
        if (statusEl) {
          statusEl.hidden = false;
          statusEl.textContent = 'Escribe el nombre del destinatario.';
        }
        return;
      }

      var result = openPrintPdf(formato, nombre, mensaje, packLabel);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = result.ok
          ? 'Se abrió la vista previa. En el diálogo de impresión elige «Guardar como PDF» si quieres el archivo.'
          : result.error || 'No se pudo abrir el PDF.';
      }
    });
  };
})();
