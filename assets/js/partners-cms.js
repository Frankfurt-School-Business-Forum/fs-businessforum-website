// One public published read supplies cards, the marquee and workshop hosts independently.
(function () {
    'use strict';
    const section = document.getElementById('partners');
    if (!section || section.dataset.cmsPartnersStarted) return;
    section.dataset.cmsPartnersStarted = 'true';
    // The originals stay in place; presentation-only copies provide a seamless repeat.
    const eventTrack = document.getElementById('event-partners-track');
    if (eventTrack && !eventTrack.dataset.carouselReady) {
        eventTrack.dataset.carouselReady = 'true';
        const tier = document.getElementById('event-partners');
        const controls = tier.querySelector('.event-partner-controls');
        const previous = controls.querySelector('[data-event-prev]');
        const next = controls.querySelector('[data-event-next]');
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        let period = 0, phase = 0, lastTime = 0, frame = 0, rebuildFrame = 0;
        let hovering = false, touching = false, dragging = false, settling = false;
        let settleTimer;
        const originals = () => Array.from(eventTrack.children).filter(el => !el.hasAttribute('data-event-copy'));
        const motionAllowed = () => !reduced.matches && !document.documentElement.classList.contains('motion-paused');
        function paused() {
            return !motionAllowed() || document.hidden || hovering || touching || settling
                || tier.contains(document.activeElement) || !!tier.querySelector('.pcard--toggle[aria-expanded="true"]');
        }
        function updateControls() {
            const end = Math.max(0, eventTrack.scrollWidth - eventTrack.clientWidth);
            controls.hidden = end <= 2;
            previous.disabled = eventTrack.scrollLeft <= 2;
            next.disabled = eventTrack.scrollLeft >= end - 2;
        }
        function animate(time) {
            frame = 0;
            const delta = lastTime ? Math.min(time - lastTime, 50) : 0;
            lastTime = time;
            if (period && !paused()) {
                phase = (phase + delta * .018) % period; // 18 pixels per second.
                eventTrack.scrollLeft = phase;
            } else phase = eventTrack.scrollLeft;
            if (!document.hidden && period && motionAllowed()) frame = requestAnimationFrame(animate);
        }
        function wake() {
            if (!frame && period && motionAllowed() && !document.hidden) {
                lastTime = 0;
                frame = requestAnimationFrame(animate);
            }
        }
        function rebuild() {
            rebuildFrame = 0;
            observer.disconnect();
            eventTrack.querySelectorAll('[data-event-copy]').forEach(el => el.remove());
            const cards = originals();
            period = 0;
            if (motionAllowed() && cards.length && eventTrack.clientWidth) {
                // Enough complete repeats to cover the viewport even with just one partner.
                const gap = parseFloat(getComputedStyle(eventTrack).columnGap) || 0;
                const unit = cards[0].getBoundingClientRect().width + gap;
                const repeats = unit > 0 ? Math.ceil(eventTrack.clientWidth / (unit * cards.length)) + 1 : 0;
                for (let repeat = 0; repeat < repeats; repeat++) cards.forEach(original => {
                    const copy = original.cloneNode(true);
                    copy.setAttribute('data-event-copy', '');
                    copy.setAttribute('aria-hidden', 'true');
                    [copy, ...copy.querySelectorAll('[id]')].forEach(el => el.removeAttribute('id'));
                    copy.querySelectorAll('img').forEach(img => { img.alt = ''; });
                    const sources = original.querySelectorAll('a,button');
                    copy.querySelectorAll('a,button').forEach((el, index) => {
                        el.tabIndex = -1;
                        el.removeAttribute('aria-controls');
                        // Anchors retain their real href/target/rel, including modifier-click behaviour.
                        if (el.tagName === 'BUTTON') el.addEventListener('click', event => {
                            event.preventDefault();
                            if (dragging) return;
                            sources[index].focus({preventScroll: true});
                            sources[index].click();
                        });
                        el.addEventListener('mousedown', event => event.preventDefault());
                        el.addEventListener('focus', () => sources[index].focus({preventScroll: true}));
                    });
                    eventTrack.appendChild(copy);
                });
                const firstCopy = eventTrack.querySelector('[data-event-copy]');
                if (firstCopy) period = firstCopy.getBoundingClientRect().left - cards[0].getBoundingClientRect().left;
            }
            eventTrack.classList.toggle('event-ticker-active', period > 0);
            phase = period ? eventTrack.scrollLeft % period : eventTrack.scrollLeft;
            eventTrack.scrollLeft = phase;
            observer.observe(eventTrack, {childList: true});
            updateControls();
            wake();
        }
        function queueRebuild() {
            if (!rebuildFrame) rebuildFrame = requestAnimationFrame(rebuild);
        }
        const observer = new MutationObserver(queueRebuild);
        function settle() {
            settling = true;
            clearTimeout(settleTimer);
            settleTimer = setTimeout(() => { settling = false; wake(); }, 1000);
        }
        function move(direction) {
            settle();
            eventTrack.scrollBy({left: direction * eventTrack.clientWidth, behavior: motionAllowed() ? 'smooth' : 'auto'});
        }
        previous.addEventListener('click', () => move(-1));
        next.addEventListener('click', () => move(1));
        eventTrack.addEventListener('scroll', updateControls, {passive: true});
        eventTrack.addEventListener('wheel', settle, {passive: true});
        tier.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') hovering = true; });
        tier.addEventListener('pointerleave', () => { hovering = false; wake(); });
        let startX = 0, startY = 0;
        eventTrack.addEventListener('pointerdown', event => { touching = true; dragging = false; startX = event.clientX; startY = event.clientY; }, {passive: true});
        eventTrack.addEventListener('pointermove', event => {
            if (touching && Math.hypot(event.clientX - startX, event.clientY - startY) > 8) dragging = true;
        }, {passive: true});
        function release() { if (touching) { touching = false; settle(); } }
        window.addEventListener('pointerup', release, {passive: true});
        window.addEventListener('pointercancel', release, {passive: true});
        eventTrack.addEventListener('click', event => {
            if (dragging) { event.preventDefault(); event.stopImmediatePropagation(); }
            dragging = false;
        }, true);
        tier.addEventListener('focusout', wake);
        // Opening panels pauses motion; closing them resumes without touching Details handlers.
        new MutationObserver(wake).observe(tier, {subtree: true, attributes: true, attributeFilter: ['aria-expanded']});
        new MutationObserver(queueRebuild).observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
        reduced.addEventListener('change', queueRebuild);
        window.addEventListener('resize', queueRebuild, {passive: true});
        document.addEventListener('visibilitychange', wake);
        if ('ResizeObserver' in window) new ResizeObserver(queueRebuild).observe(eventTrack);
        rebuild();
    }
    const categories = ['platinum', 'gold', 'silver', 'corporate', 'event'];
    const text = value => typeof value === 'string' && value.trim().length > 0;
    const node = (tag, cls, value) => {
        const el = document.createElement(tag);
        el.className = cls;
        if (value !== undefined) el.textContent = value;
        return el;
    };
    function href(value, relative = false) {
        if (!text(value)) return null;
        try {
            const url = new URL(value, relative ? location.href : undefined);
            return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? value : null;
        } catch (_) { return null; }
    }
    function validLogo(logo) {
        try {
            const url = new URL(logo.url);
            return url.protocol === 'https:' && url.hostname === 'cdn.sanity.io'
                && url.pathname.startsWith('/images/0kh5rd3y/production/') && !url.username && !url.password;
        } catch (_) { return false; }
    }
    function image(partner, decorative = false) {
        const img = node('img', '');
        img.alt = decorative ? '' : partner.logoAlt;
        img.loading = 'lazy';
        img.decoding = 'async';
        const size = partner.logo.dimensions;
        if (size && Number.isInteger(size.width) && size.width > 0 && Number.isInteger(size.height) && size.height > 0) {
            img.width = size.width;
            img.height = size.height;
        }
        img.src = partner.logo.url;
        return img;
    }
    function external(link, url) {
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        return link;
    }
    // Restricted Portable Text: paragraphs, strong and safe links; never evaluate CMS HTML.
    function paragraphs(blocks, cls = '') {
        if (!Array.isArray(blocks) || !blocks.length) throw new Error('Missing partner text');
        const fragment = document.createDocumentFragment();
        blocks.forEach(block => {
            if (block._type !== 'block' || block.style !== 'normal' || block.listItem || !Array.isArray(block.children)) throw new Error('Invalid partner text');
            const p = node('p', cls);
            block.children.forEach(span => {
                if (span._type !== 'span' || typeof span.text !== 'string' || !Array.isArray(span.marks)) throw new Error('Invalid partner span');
                let content = document.createTextNode(span.text);
                span.marks.forEach(mark => {
                    let wrapper;
                    if (mark === 'strong') wrapper = node('strong', '');
                    else {
                        const def = (block.markDefs || []).find(d => d._key === mark);
                        if (!def || def._type !== 'link' || !href(def.href, true)) throw new Error('Invalid partner link');
                        wrapper = node('a', '');
                        wrapper.href = def.href;
                    }
                    wrapper.appendChild(content);
                    content = wrapper;
                });
                p.appendChild(content);
            });
            fragment.appendChild(p);
        });
        return fragment;
    }
    function detail(partner, id) {
        const panel = document.getElementById('partner-detail-template').content.firstElementChild.cloneNode(true);
        panel.id = 'pd-' + id;
        panel.setAttribute('aria-labelledby', 'pb-' + id);
        panel.querySelector('.pdetail-name').textContent = partner.name;
        // Render languages independently; invalid optional copy must not remove a partner.
        const languages = [];
        ['de', 'en'].forEach(lang => {
            const container = panel.querySelector('[data-lang="' + lang + '"]');
            try {
                const content = paragraphs(partner.details[lang === 'de' ? 'descriptionDe' : 'descriptionEn']);
                if (!text(content.textContent)) throw new Error('Empty company description');
                container.appendChild(content);
                container.hidden = languages.length > 0;
                languages.push(lang);
            } catch (_) {
                container.remove();
                panel.querySelector('[data-lang-btn="' + lang + '"]').remove();
            }
        });
        if (!languages.length) panel.querySelector('.pdetail-lang').remove();
        else panel.querySelectorAll('[data-lang-btn]').forEach(button => {
            button.setAttribute('aria-pressed', String(button.getAttribute('data-lang-btn') === languages[0]));
        });
        if (!languages.length) return null;
        const workshop = panel.querySelector('.pdetail-workshop');
        if (partner.details.workshopText) {
            if (!text(partner.details.workshopHeading)) throw new Error('Missing workshop heading');
            workshop.querySelector('.pdetail-workshop-k').textContent = partner.details.workshopHeading;
            workshop.appendChild(paragraphs(partner.details.workshopText, 'pdetail-workshop-text'));
        } else workshop.remove();
        const actions = panel.querySelector('.pdetail-actions');
        if (href(partner.websiteUrl)) {
            const link = external(node('a', 'btn--link', 'Visit website'), partner.websiteUrl);
            link.appendChild(node('span', 'sr-only', ' of ' + partner.name + ' (opens in a new tab)'));
            link.appendChild(document.createTextNode(' '));
            const arrow = node('span', '', '↗'); arrow.setAttribute('aria-hidden', 'true'); link.appendChild(arrow);
            actions.appendChild(link);
        } else actions.remove();
        return panel;
    }
    function render(records) {
        if (!Array.isArray(records)) throw new Error('Invalid partner response');
        const lists = Array.from(document.querySelectorAll('.proof-marquee .lm-list'));
        const hosts = document.querySelector('.ws-hosts');
        const seen = new Set();
        // Static fallback from the HTML stays unless the CMS delivers at least one usable partner.
        const usable = records.filter(p => p && categories.includes(p.category) && text(p._id) && text(p.name)
            && text(p.logoAlt) && p.logo && validLogo(p.logo) && Number.isInteger(p.sortOrder) && p.sortOrder >= 0);
        if (!usable.length) return;
        section.querySelectorAll('.ptier .pcards').forEach(list => { list.textContent = ''; });
        section.querySelectorAll('.ptier > .pdetail').forEach(panel => panel.remove());
        lists.forEach(list => { list.textContent = ''; });
        if (hosts) hosts.textContent = '';
        categories.forEach(category => {
            const tier = section.querySelector('.ptier--' + category);
            const size = category === 'platinum' ? 'lg' : category === 'event' ? 'tile' : 'md';
            records.filter(p => p && p.category === category).forEach(partner => {
                if (!text(partner._id) || seen.has(partner._id) || !text(partner.name) || !text(partner.logoAlt)
                    || !validLogo(partner.logo) || !Number.isInteger(partner.sortOrder) || partner.sortOrder < 0) return;
                seen.add(partner._id);
                try {
                    const id = 'cms-' + encodeURIComponent(partner._id);
                    const panel = partner.details ? detail(partner, id) : null;
                    const url = href(partner.websiteUrl);
                    const card = node(panel ? 'button' : url ? 'a' : 'div', 'pcard pcard--' + size + (panel ? ' pcard--toggle' : ''));
                    if (panel) {
                        card.type = 'button'; card.id = 'pb-' + id;
                        card.setAttribute('aria-expanded', 'false'); card.setAttribute('aria-controls', panel.id);
                    } else if (url) external(card, url);
                    const logo = node('span', 'plogo'); logo.appendChild(image(partner, true)); card.appendChild(logo);
                    const name = node('span', 'pname', partner.name);
                    if (category === 'event') card.appendChild(name);
                    else { const info = node('span', 'pinfo'); info.appendChild(name); card.appendChild(info); }
                    if (panel) {
                        const more = node('span', 'pmore'); more.setAttribute('aria-hidden', 'true');
                        more.appendChild(node('span', 'pmore-label', 'Details')); more.appendChild(node('span', 'pmore-icon')); card.appendChild(more);
                    } else if (url) {
                        card.appendChild(node('span', 'sr-only', ' – website (opens in a new tab)'));
                        const arrow = node('span', 'parrow', '↗'); arrow.setAttribute('aria-hidden', 'true'); card.appendChild(arrow);
                    }
                    const li = node('li', panel && url ? 'partner-with-website' : ''); li.appendChild(card);
                    // A sibling link avoids nesting an interactive link inside the Details button.
                    if (panel && url) {
                        const link = external(node('a', 'parrow', '↗'), url);
                        link.setAttribute('aria-label', partner.name + ' website (opens in a new tab)');
                        li.appendChild(link);
                    }
                    const placements = [li];
                    const marqueeItems = lists.map(list => {
                        const item = node('li', 'lm-item'); item.appendChild(image(partner, list.hasAttribute('aria-hidden'))); placements.push(item); return item;
                    });
                    let host;
                    if (partner.workshopHost === true && hosts) { host = node('li', 'ws-host'); host.appendChild(image(partner)); placements.push(host); }
                    placements.forEach(placement => placement.querySelector('img').addEventListener('error', () => {
                        placements.forEach(el => el.remove()); if (panel) panel.remove();
                    }, {once: true}));
                    tier.querySelector('.pcards').appendChild(li);
                    if (panel) tier.appendChild(panel);
                    lists.forEach((list, i) => list.appendChild(marqueeItems[i]));
                    if (host) hosts.appendChild(host);
                } catch (_) { /* Invalid record: leave all its placements empty. */ }
            });
        });
        if (window.fsbfInitPartnerDetails) window.fsbfInitPartnerDetails();
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const query = '*[_type == "partner" && visible == true] | order(sortOrder asc, name asc, _id asc){_id,name,category,logoAlt,websiteUrl,sortOrder,workshopHost,details,"logo":logo.asset->{url,"dimensions":metadata.dimensions}}';
    fetch('https://0kh5rd3y.apicdn.sanity.io/v2025-02-19/data/query/production?perspective=published&query=' + encodeURIComponent(query), {credentials: 'omit', signal: controller.signal})
        .then(response => { if (!response.ok) throw new Error('Partner content unavailable'); return response.json(); })
        .then(payload => { if (!controller.signal.aborted) render(payload && payload.result); })
        .catch(() => { /* Static fallback in the HTML stays visible. */ })
        .finally(() => clearTimeout(timeout));
})();
