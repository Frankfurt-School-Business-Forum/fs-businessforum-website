/* Wrap-up curtain after FS Business Forum 2026.
   The head script decides before the first paint whether html.has-wrap is set.
   This file only handles dismissing it: button, Escape, and remembering the choice
   per browser. The site underneath is untouched and stays fully reachable. */
(function (d, w) {
    'use strict';

    var KEY = 'fsbf-wrap-2026';
    var root = d.documentElement;
    var curtain = d.getElementById('wrap-curtain');

    if (!curtain) return;

    function close() {
        if (!root.classList.contains('has-wrap')) return;
        root.classList.remove('has-wrap');
        try { w.localStorage.setItem(KEY, 'closed'); } catch (e) {}
        d.removeEventListener('keydown', onKey);
        var h = d.querySelector('.skip-link') || d.querySelector('h1');
        if (h && h.focus) { try { h.focus({ preventScroll: true }); } catch (e) {} }
    }

    function onKey(e) {
        if (e.key === 'Escape' || e.key === 'Esc') close();
    }

    var buttons = curtain.querySelectorAll('[data-wrap-close]');
    for (var i = 0; i < buttons.length; i++) buttons[i].addEventListener('click', close);

    if (root.classList.contains('has-wrap')) {
        d.addEventListener('keydown', onKey);
        var first = curtain.querySelector('[data-wrap-close]');
        if (first && first.focus) {
            w.setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) {} }, 350);
        }
    }
})(document, window);
