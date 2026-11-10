// Program bar (10 Nov 2026): closes the "The full program is live" strip above the header.
// Visibility itself is set before the first paint by the head script (html.has-announce);
// here we only remember a dismissal per browser. Storage may be blocked, so every access is guarded.
(function () {
    'use strict';
    var bar = document.querySelector('.announce-bar');
    if (!bar) return;
    var close = bar.querySelector('.announce-close');
    if (!close) return;
    close.addEventListener('click', function () {
        document.documentElement.classList.remove('has-announce');
        try { window.localStorage.setItem('fsbf-program-bar', 'closed'); } catch (e) { /* stays closed for this page view */ }
    });
})();
