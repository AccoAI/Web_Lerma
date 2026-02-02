/**
 * Sistema de idiomas ES / FR / EN
 * Añade data-i18n="key" a los elementos a traducir.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'golflerma_lang';
    var SUPPORTED = ['es', 'fr', 'en'];

    function getLang() {
        var saved = localStorage.getItem(STORAGE_KEY);
        return (SUPPORTED.indexOf(saved) >= 0) ? saved : 'es';
    }

    function setStoredLang(lang) {
        if (SUPPORTED.indexOf(lang) >= 0) {
            localStorage.setItem(STORAGE_KEY, lang);
        }
    }

    function getBasePath() {
        var s = document.querySelector('script[src*="i18n.js"]');
        if (s && s.src) {
            var p = s.src.replace(/\/[^/]+$/, '/');
            return p.replace(/^https?:\/\/[^/]+/, '') || '';
        }
        var base = document.querySelector('base');
        return (base && base.href) ? base.getAttribute('href') : '';
    }

    function applyTranslations(t) {
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            if (t[key] != null) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    if (el.placeholder !== undefined) el.placeholder = t[key];
                    else if (el.type === 'submit' || el.type === 'button') el.value = t[key];
                } else {
                    el.textContent = t[key];
                }
            }
        });
        document.documentElement.lang = (getLang() === 'es' ? 'es' : getLang() === 'fr' ? 'fr' : 'en');
    }

    function loadAndApply(lang) {
        var path = 'data/i18n-' + lang + '.json';
        fetch(path)
            .then(function (r) { return r.json(); })
            .then(function (t) {
                applyTranslations(t);
                setStoredLang(lang);
                document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang: lang } }));
            })
            .catch(function () {
                if (lang !== 'es') loadAndApply('es');
            });
    }

    window.setLanguage = function (lang) {
        if (SUPPORTED.indexOf(lang) >= 0) {
            loadAndApply(lang);
            var sel = document.getElementById('lang-select');
            if (sel) sel.value = lang;
        }
    };

    function initSelector() {
        var wrap = document.getElementById('lang-selector');
        if (!wrap) return;
        var lang = getLang();
        wrap.innerHTML = '<select id="lang-select" class="lang-select" aria-label="Idioma">' +
            '<option value="es"' + (lang === 'es' ? ' selected' : '') + '>ES</option>' +
            '<option value="fr"' + (lang === 'fr' ? ' selected' : '') + '>FR</option>' +
            '<option value="en"' + (lang === 'en' ? ' selected' : '') + '>EN</option>' +
            '</select>';
        wrap.querySelector('#lang-select').addEventListener('change', function () {
            window.setLanguage(this.value);
        });
    }

    function init() {
        loadAndApply(getLang());
        initSelector();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
