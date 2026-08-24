/**
 * Renderiza una página CMS: pagina.html?slug=mi-aviso
 */
(function () {
  'use strict';

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function getSlug() {
    try {
      var q = new URLSearchParams(window.location.search || '');
      return String(q.get('slug') || '').trim().toLowerCase();
    } catch (e) {
      return '';
    }
  }

  function safeHref(url) {
    var href = String(url || '').trim();
    if (!href || /^\s*javascript\s*:/i.test(href) || /^\s*data\s*:/i.test(href)) return '#';
    return href;
  }

  function findPage(data, slug) {
    var list = (data && data.paginas) || [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (p && p.activo !== false && String(p.slug || '').toLowerCase() === slug) return p;
    }
    return null;
  }

  function renderBlocks(page) {
    var root = document.getElementById('cmsPaginaBlocks');
    if (!root) return;
    root.innerHTML = '';
    var bloques = (page.bloques || []).filter(function (b) { return b && b.activo !== false; });
    if (!bloques.length && page.texto) {
      var solo = document.createElement('div');
      solo.className = 'cms-pagina-block cms-pagina-block--texto';
      solo.innerHTML = '<p class="cms-pagina-block-text">' + esc(page.texto) + '</p>';
      root.appendChild(solo);
      return;
    }
    bloques.forEach(function (b) {
      var el = document.createElement('article');
      el.className = 'cms-pagina-block cms-pagina-block--' + (b.tipo || 'texto');
      var html = '';
      if (b.tipo === 'imagen') {
        if (b.imagen) html += '<img class="cms-pagina-block-img" src="' + esc(b.imagen) + '" alt="' + esc(b.pie || b.titulo || '') + '">';
        if (b.titulo) html += '<h2 class="cms-pagina-block-title">' + esc(b.titulo) + '</h2>';
        if (b.pie) html += '<p class="cms-pagina-block-pie">' + esc(b.pie) + '</p>';
      } else if (b.tipo === 'boton') {
        if (b.titulo) html += '<h2 class="cms-pagina-block-title">' + esc(b.titulo) + '</h2>';
        html += '<a class="cms-pagina-block-btn" href="' + esc(safeHref(b.linkUrl || '#')) + '">' +
          esc(b.linkTexto || 'Ver más') + '</a>';
      } else {
        if (b.titulo) html += '<h2 class="cms-pagina-block-title">' + esc(b.titulo) + '</h2>';
        if (b.texto) html += '<p class="cms-pagina-block-text">' + esc(b.texto) + '</p>';
      }
      el.innerHTML = html;
      root.appendChild(el);
    });
  }

  function render(page) {
    var status = document.getElementById('cmsPaginaStatus');
    var hero = document.getElementById('cmsPaginaHero');
    var heroImg = document.getElementById('cmsPaginaHeroImg');
    var heroTitle = document.getElementById('cmsPaginaHeroTitle');
    var heroIntro = document.getElementById('cmsPaginaHeroIntro');
    var title = document.getElementById('cmsPaginaTitle');
    var intro = document.getElementById('cmsPaginaIntro');

    if (!page) {
      if (status) status.textContent = 'Página no encontrada.';
      if (title) title.textContent = 'Página no encontrada';
      return;
    }

    var seoTitle = String(page.seoTitulo || page.titulo || 'Golf Lerma').trim();
    document.title = seoTitle;
    var meta = document.querySelector('meta[name="description"]');
    if (meta && page.seoDescripcion) meta.setAttribute('content', page.seoDescripcion);

    var hasImg = !!(page.imagen && String(page.imagen).trim());
    if (hasImg && hero && heroImg) {
      hero.hidden = false;
      heroImg.src = page.imagen;
      heroImg.alt = page.titulo || '';
      if (heroTitle) heroTitle.textContent = page.titulo || '';
      if (heroIntro) {
        heroIntro.textContent = page.texto || '';
        heroIntro.hidden = !page.texto;
      }
      if (title) title.hidden = true;
      if (intro) intro.hidden = true;
    } else {
      if (hero) hero.hidden = true;
      if (title) {
        title.hidden = false;
        title.textContent = page.titulo || '';
      }
      if (intro) {
        intro.hidden = !page.texto;
        intro.textContent = page.texto || '';
      }
    }

    renderBlocks(page);
    if (status) status.hidden = true;
  }

  function applyFromData(data) {
    var slug = getSlug();
    if (!slug) {
      render(null);
      var status = document.getElementById('cmsPaginaStatus');
      if (status) status.textContent = 'Falta el parámetro ?slug= en la URL.';
      return;
    }
    render(findPage(data, slug));
  }

  function init() {
    if (window.CmsPlataforma && window.CmsPlataforma.data) {
      applyFromData(window.CmsPlataforma.data);
      return;
    }
    document.addEventListener('cms:contenido-listo', function (ev) {
      applyFromData(ev.detail || {});
    }, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
