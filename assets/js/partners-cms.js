// One public published read supplies cards, the marquee and workshop hosts independently.
(function () {
    'use strict';
    const section = document.getElementById('partners');
    if (!section || section.dataset.cmsPartnersStarted) return;
    section.dataset.cmsPartnersStarted = 'true';
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
        ['de', 'en'].forEach(lang => panel.querySelector('[data-lang="' + lang + '"]').appendChild(
            paragraphs(partner.details[lang === 'de' ? 'descriptionDe' : 'descriptionEn'])));
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
                    const li = node('li', ''); li.appendChild(card);
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
