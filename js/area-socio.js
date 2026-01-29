/**
 * Área Socio: login, dashboard y vistas.
 * Usuario demo: socio / golf2024
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'areaSocioLoggedIn';
  var DEMO_USER = 'socio';
  var DEMO_PASS = 'golf2024';

  function isLoggedIn() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function setLoggedIn(val) {
    try {
      if (val) sessionStorage.setItem(STORAGE_KEY, '1');
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function esc(s) {
    if (s == null || s === '') return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function getData() {
    return window.AREA_SOCIO_DATA || {};
  }

  function showSection(id) {
    var sections = document.querySelectorAll('.area-socio-vista');
    var tabs = document.querySelectorAll('.area-socio-nav-link');
    sections.forEach(function (s) {
      s.hidden = s.id !== id;
    });
    tabs.forEach(function (t) {
      var href = (t.getAttribute('href') || '').trim();
      t.classList.toggle('activo', href === '#' + id);
    });
  }

  function renderDashboard() {
    var data = getData();
    var perfil = data.miPerfil || {};
    var feed = data.feed || [];
    var ranking = (data.rankingTop10 || []).slice(0, 5);

    var statsEl = document.getElementById('area-socio-stats');
    if (statsEl) {
      var ev = perfil.evolucion || [];
      var labels = ev.map(function (x) { return x.mes; }).join(',');
      var values = ev.map(function (x) { return x.handicap; }).join(',');
      statsEl.innerHTML =
        '<div class="area-socio-stats-grid">' +
        '<div class="area-socio-stat-card"><span class="area-socio-stat-label">Nivel</span><span class="area-socio-stat-val area-socio-nivel-' + (perfil.nivel || '').toLowerCase() + '">' + esc(perfil.nivel) + '</span></div>' +
        '<div class="area-socio-stat-card"><span class="area-socio-stat-label">Hándicap</span><span class="area-socio-stat-val">' + esc(perfil.handicap) + '</span></div>' +
        '<div class="area-socio-stat-card"><span class="area-socio-stat-label">Mejor tarjeta</span><span class="area-socio-stat-val">' + esc(perfil.mejorScore) + '</span></div>' +
        '</div>' +
        '<p class="area-socio-ultima">Última partida: ' + esc(perfil.ultimaPartida || '—') + '</p>' +
        (ev.length ? '<div class="area-socio-evolucion"><h4>Evolución hándicap</h4><div class="area-socio-evolucion-chart" style="height:120px;background:linear-gradient(180deg, rgba(26,77,58,0.15) 0%, transparent 100%);border-radius:8px;display:flex;align-items:flex-end;gap:4px;padding:12px;">' +
          ev.map(function (e, i) {
            var max = Math.max.apply(null, ev.map(function (x) { return x.handicap; }));
            var h = Math.max(20, (e.handicap / max) * 100);
            return '<div style="flex:1;height:' + h + '%;background:var(--color-primary);border-radius:4px;min-height:8px;" title="' + esc(e.mes) + ': ' + e.handicap + '"></div>';
          }).join('') + '</div><div class="area-socio-evolucion-leyenda">' + ev.map(function (e) { return '<span>' + esc(e.mes) + '</span>'; }).join('') + '</div></div>' : '');
    }

    var feedEl = document.getElementById('area-socio-feed');
    if (feedEl) {
      feedEl.innerHTML = feed.length ? feed.map(function (f) {
        var c = f.tipo === 'logro' ? 'area-socio-feed-logro' : 'area-socio-feed-rival';
        return '<div class="area-socio-feed-item ' + c + '"><p>' + esc(f.texto) + '</p><span class="area-socio-feed-fecha">' + esc(f.fecha) + '</span></div>';
      }).join('') : '<p class="area-socio-feed-empty">Aún no hay actividad. ¡Juega y añade amigos!</p>';
    }

    var rankEl = document.getElementById('area-socio-ranking-preview');
    if (rankEl && ranking.length) {
      rankEl.innerHTML = '<ol class="area-socio-top5">' + ranking.map(function (r) {
        return '<li><span class="area-socio-top5-nom">' + esc(r.nombre) + '</span> <span class="area-socio-top5-score">' + r.score + '</span></li>';
      }).join('') + '</ol><p class="area-socio-cta-inner"><a href="#vista-hall">Ver Hall of Fame</a></p>';
    }
  }

  function renderHallOfFame() {
    var data = getData();
    var hof = data.hallOfFame || {};
    var el = document.getElementById('area-socio-hall-content');
    if (!el) return;
    el.innerHTML =
      '<div class="area-socio-hall-grid">' +
      '<div class="area-socio-hall-card"><h4>🏆 Mejor tarjeta del mes</h4><p class="area-socio-hall-ganador">' + esc((hof.mejorTarjetaMes || {}).nombre) + '</p><p class="area-socio-hall-dato">' + (hof.mejorTarjetaMes ? hof.mejorTarjetaMes.score + ' golpes · ' + esc(hof.mejorTarjetaMes.campo) : '—') + '</p><p class="area-socio-hall-premio">' + esc((hof.mejorTarjetaMes || {}).premio || '') + '</p></div>' +
      '<div class="area-socio-hall-card"><h4>📐 Consistencia</h4><p class="area-socio-hall-ganador">' + esc((hof.consistencia || {}).nombre) + '</p><p class="area-socio-hall-dato">' + esc((hof.consistencia || {}).desc || '') + '</p></div>' +
      '<div class="area-socio-hall-card"><h4>📈 Most Improved</h4><p class="area-socio-hall-ganador">' + esc((hof.mostImproved || {}).nombre) + '</p><p class="area-socio-hall-dato">' + esc((hof.mostImproved || {}).mejora || '') + ' · ' + esc((hof.mostImproved || {}).desc || '') + '</p></div>' +
      '</div>';
  }

  function renderAmigos() {
    var data = getData();
    var feed = data.feed || [];
    var el = document.getElementById('area-socio-amigos-content');
    if (!el) return;
    var rivales = feed.filter(function (f) { return f.tipo === 'rival'; });
    el.innerHTML =
      '<p class="area-socio-amigos-intro">Tu círculo de rivales. Cuando un amigo supere tu tiempo, recibirás una notificación y podrás volver a intentarlo.</p>' +
      '<div class="area-socio-amigos-feed">' +
      (rivales.length ? rivales.map(function (f) {
        return '<div class="area-socio-feed-item area-socio-feed-rival"><p>' + esc(f.texto) + '</p><span class="area-socio-feed-fecha">' + esc(f.fecha) + '</span></div>';
      }).join('') : '<p class="area-socio-feed-empty">Añade amigos desde el buscador para ver aquí sus logros y rivalidades.</p>') +
      '</div>' +
      '<div class="area-socio-amigos-buscar"><label>Buscar socio para añadir</label><input type="text" placeholder="Nombre o usuario" class="area-socio-buscar-input"><button type="button" class="btn-area-socio-small">Añadir</button><p class="area-socio-hint">Buscador en preparación. Próximamente podrás añadir amigos y comparar 1vs1.</p></div>';
  }

  function renderPerfil() {
    var data = getData();
    var p = data.miPerfil || {};
    var niveles = data.niveles || [];
    var el = document.getElementById('area-socio-perfil-content');
    if (!el) return;
    var campos = (p.camposMasJugados || []).map(function (c) {
      return '<tr><td>' + esc(c.nombre) + '</td><td>' + c.partidas + ' partidas</td></tr>';
    }).join('');
    el.innerHTML =
      '<div class="area-socio-perfil-header">' +
      '<h3>' + esc(p.nombre) + '</h3>' +
      '<p class="area-socio-perfil-nivel area-socio-nivel-' + (p.nivel || '').toLowerCase() + '">' + esc(p.nivel) + ' · ' + esc(p.nivelDesc || '') + '</p>' +
      '</div>' +
      '<div class="area-socio-perfil-grid">' +
      '<div class="area-socio-perfil-block"><h4>Mis datos</h4><p>Hándicap: <strong>' + esc(p.handicap) + '</strong></p><p>Mejor score: <strong>' + esc(p.mejorScore) + '</strong></p><p>Última partida: ' + esc(p.ultimaPartida || '—') + '</p></div>' +
      '<div class="area-socio-perfil-block"><h4>Campos más jugados</h4><table class="area-socio-tabla">' + (campos || '<tr><td>—</td><td>—</td></tr>') + '</table></div>' +
      '</div>' +
      '<div class="area-socio-perfil-niveles"><h4>Niveles</h4><div class="area-socio-niveles-list">' +
      (niveles.map(function (n) {
        var act = (p.nivel || '').toLowerCase() === n.id ? ' activo' : '';
        return '<span class="area-socio-nivel-badge' + act + '" title="' + esc(n.desc) + '">' + esc(n.label) + '</span>';
      }).join('')) +
      '</div></div>';
  }

  function initDashboard() {
    renderDashboard();
    renderHallOfFame();
    renderAmigos();
    renderPerfil();

    function handleVistaLink(e) {
      var a = e.target.closest('a[href^="#vista-"]');
      if (!a) return;
      var href = (a.getAttribute('href') || '').trim();
      if (href) {
        e.preventDefault();
        showSection(href.slice(1));
      }
    }
    document.querySelectorAll('.area-socio-nav-link').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = (a.getAttribute('href') || '').trim();
        if (href && href.indexOf('#') === 0) {
          e.preventDefault();
          showSection(href.slice(1));
        }
      });
    });
    var dash = document.getElementById('area-socio-dashboard-section');
    if (dash) dash.addEventListener('click', handleVistaLink);

    var btnLogout = document.getElementById('area-socio-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', function (e) {
        e.preventDefault();
        setLoggedIn(false);
        window.location.reload();
      });
    }
  }

  function initLogin() {
    var form = document.getElementById('formLogin');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var user = (form.querySelector('[name="usuario"]') || {}).value || '';
      var pass = (form.querySelector('[name="password"]') || {}).value || '';
      if (user === DEMO_USER && pass === DEMO_PASS) {
        setLoggedIn(true);
        window.location.reload();
      } else {
        var err = form.querySelector('.area-socio-error');
        if (!err) {
          err = document.createElement('p');
          err.className = 'area-socio-error';
          form.insertBefore(err, form.querySelector('button'));
        }
        err.textContent = 'Usuario o contraseña incorrectos. Prueba con socio / golf2024.';
        err.hidden = false;
      }
    });
  }

  function init() {
    var loginSection = document.getElementById('area-socio-login-section');
    var dashboardSection = document.getElementById('area-socio-dashboard-section');

    if (isLoggedIn()) {
      if (loginSection) loginSection.hidden = true;
      if (dashboardSection) {
        dashboardSection.hidden = false;
        initDashboard();
        var hash = (window.location.hash || '').trim().slice(1);
        if (hash && /^vista-(dashboard|hall|amigos|perfil)$/.test(hash)) {
          showSection(hash);
        }
      }
    } else {
      if (loginSection) loginSection.hidden = false;
      if (dashboardSection) dashboardSection.hidden = true;
      initLogin();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
