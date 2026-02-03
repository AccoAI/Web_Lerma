/**
 * Controles +/- para servicios adicionales (buggies, carritos)
 */
(function () {
    function handleClick(e) {
        var btn = e.target.closest('.ancillary-btn-minus, .ancillary-btn-plus');
        if (!btn) return;
        var wrap = btn.closest('.ancillary-counter-wrap');
        if (!wrap) return;
        var input = wrap.querySelector('.ancillary-counter');
        if (!input) return;
        var min = parseInt(input.getAttribute('min') || '0', 10);
        var max = parseInt(input.getAttribute('max') || '99', 10);
        var val = parseInt(input.value || '0', 10);
        if (btn.classList.contains('ancillary-btn-minus')) {
            val = Math.max(min, val - 1);
        } else {
            val = Math.min(max, val + 1);
        }
        input.value = String(val);
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    document.addEventListener('click', handleClick);
})();
