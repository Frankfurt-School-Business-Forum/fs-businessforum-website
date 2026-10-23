// Production speaker records only. Shared page initialization never awaits this request.
(function () {
    'use strict';
    var grid = document.querySelector('#speakers .spk-grid');
    if (!grid || grid.dataset.cmsSpeakersStarted === 'true') return;
    grid.dataset.cmsSpeakersStarted = 'true';

    function hasText(value) { return typeof value === 'string' && value.trim().length > 0; }
    function validImage(value) {
        if (!value || !hasText(value.url)) return false;
        try {
            var url = new URL(value.url);
            return url.protocol === 'https:' && url.hostname === 'cdn.sanity.io'
                && !url.username && !url.password
                && url.pathname.startsWith('/images/0kh5rd3y/production/');
        } catch (_) { return false; }
    }
    function language(value) {
        if (!hasText(value)) return null;
        try { return Intl.getCanonicalLocales(value)[0] || null; }
        catch (_) { return null; }
    }
    function element(tag, className, text) {
        var node = document.createElement(tag);
        node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }
    function image(asset, alt) {
        var img = document.createElement('img');
        img.alt = alt;
        img.loading = 'lazy';
        img.decoding = 'async';
        var size = asset.dimensions;
        if (size && Number.isInteger(size.width) && size.width > 0 && Number.isInteger(size.height) && size.height > 0) {
            img.width = size.width;
            img.height = size.height;
        }
        img.src = asset.url;
        return img;
    }
    // Optional content is rendered in isolation; malformed biographies never remove cards.
    function biography(blocks) {
        try {
            if (!Array.isArray(blocks) || !blocks.length) return null;
            var fragment = document.createDocumentFragment();
            blocks.forEach(function (block) {
                if (!block || block._type !== 'block' || block.style !== 'normal' || block.listItem
                    || !Array.isArray(block.children) || !Array.isArray(block.markDefs)) throw new Error('Invalid biography');
                var p = document.createElement('p');
                block.children.forEach(function (span) {
                    if (!span || span._type !== 'span' || typeof span.text !== 'string' || !Array.isArray(span.marks)) throw new Error('Invalid span');
                    var content = document.createTextNode(span.text);
                    span.marks.forEach(function (mark) {
                        var wrapper;
                        if (mark === 'strong') wrapper = document.createElement('strong');
                        else {
                            var definition = block.markDefs.find(function (def) { return def && def._key === mark; });
                            if (!definition || definition._type !== 'link') throw new Error('Invalid link');
                            var url = new URL(definition.href);
                            if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Unsafe link');
                            wrapper = document.createElement('a');
                            wrapper.href = url.href;
                            wrapper.target = '_blank';
                            wrapper.rel = 'noopener noreferrer';
                        }
                        wrapper.appendChild(content);
                        content = wrapper;
                    });
                    p.appendChild(content);
                });
                fragment.appendChild(p);
            });
            return hasText(fragment.textContent) ? fragment : null;
        } catch (_) { return null; }
    }
    function render(records) {
        if (!Array.isArray(records)) return;
        var fragment = document.createDocumentFragment();
        records.forEach(function (speaker) {
            if (!speaker || ![speaker.name, speaker.role, speaker.companyName, speaker.portraitAlt].every(hasText)
                || !validImage(speaker.portrait)) return;
            var card = element('article', 'spk-card');
            var figure = element('figure', 'spk-photo');
            var portrait = image(speaker.portrait, speaker.portraitAlt);
            // Failed media must not leave a broken portrait or company badge on screen.
            portrait.addEventListener('error', function () { card.remove(); }, {once: true});
            figure.appendChild(portrait);
            if (validImage(speaker.companyLogo) && hasText(speaker.companyLogoAlt)) {
                var badge = element('span', 'spk-logo');
                var logo = image(speaker.companyLogo, speaker.companyLogoAlt);
                logo.addEventListener('error', function () { badge.remove(); }, {once: true});
                badge.appendChild(logo);
                figure.appendChild(badge);
            }
            var body = element('div', 'spk-body');
            body.appendChild(element('h3', 'spk-name', speaker.name));
            body.appendChild(element('p', 'spk-role', speaker.role));
            var company = element('p', 'spk-company');
            var lang = language(speaker.companyLanguage);
            if (lang) {
                var companyName = element('span', '', speaker.companyName);
                companyName.lang = lang;
                company.appendChild(companyName);
            } else {
                company.appendChild(document.createTextNode(speaker.companyName));
            }
            if (hasText(speaker.companySuffix)) company.appendChild(document.createTextNode(' ' + speaker.companySuffix));
            body.appendChild(company);
            var bios = {de: biography(speaker.biographyDe), en: biography(speaker.biographyEn)};
            var languages = ['de', 'en'].filter(function (lang) { return bios[lang]; });
            if (languages.length) {
                card.classList.add('spk-card--flip');
                var inner = element('div', 'spk-flip-inner');
                var front = element('div', 'spk-flip-front');
                var back = element('div', 'spk-flip-back');
                back.id = 'speaker-bio-' + encodeURIComponent(speaker._id || String(fragment.childNodes.length));
                var title = element('h3', 'spk-flip-title', speaker.name);
                title.tabIndex = -1;
                title.id = back.id + '-title';
                back.setAttribute('role', 'region');
                back.setAttribute('aria-labelledby', title.id);
                back.inert = true;
                back.setAttribute('inert', '');
                back.setAttribute('aria-hidden', 'true');
                var info = element('button', 'spk-info-button', 'i');
                info.type = 'button';
                info.setAttribute('aria-label', 'Biography of ' + speaker.name);
                info.setAttribute('aria-controls', back.id);
                info.setAttribute('aria-expanded', 'false');
                body.insertBefore(info, body.firstChild);
                var controls = element('div', 'spk-flip-controls');
                var flags = element('div', 'spk-flip-languages');
                flags.setAttribute('role', 'group');
                flags.setAttribute('aria-label', 'Biography language');
                var backButton = element('button', 'spk-return-button', '×');
                backButton.type = 'button';
                backButton.setAttribute('aria-label', 'Return to ' + speaker.name + ' card');
                var content = element('div', 'spk-flip-content');
                content.tabIndex = 0;
                content.setAttribute('role', 'region');
                content.setAttribute('aria-label', 'Biography text');
                function selectLanguage(lang) {
                    Array.from(content.children).forEach(function (el) { el.hidden = el.lang !== lang; });
                    Array.from(flags.children).forEach(function (el) { el.setAttribute('aria-pressed', String(el.dataset.language === lang)); });
                    content.scrollTop = 0;
                }
                languages.forEach(function (lang) {
                    var section = element('div', 'spk-bio-language');
                    section.lang = lang;
                    section.appendChild(bios[lang]);
                    content.appendChild(section);
                    var flag = element('button', 'lang-btn lang-btn--' + lang);
                    flag.type = 'button';
                    flag.dataset.language = lang;
                    flag.title = lang === 'de' ? 'Deutsch' : 'English';
                    flag.setAttribute('aria-label', flag.title);
                    flag.addEventListener('click', function () { selectLanguage(lang); });
                    flags.appendChild(flag);
                });
                selectLanguage(languages[0]);
                var flipped = false;
                function flip(open) {
                    if (flipped === open) return;
                    flipped = open;
                    var active = open ? back : front;
                    var inactive = open ? front : back;
                    active.inert = false;
                    active.removeAttribute('inert');
                    active.removeAttribute('aria-hidden');
                    card.classList.toggle('is-flipped', open);
                    info.setAttribute('aria-expanded', String(open));
                    if (open) selectLanguage(languages[0]);
                    (open ? title : info).focus({preventScroll: true});
                    inactive.inert = true;
                    inactive.setAttribute('inert', '');
                    inactive.setAttribute('aria-hidden', 'true');
                }
                info.addEventListener('click', function () { flip(true); });
                backButton.addEventListener('click', function () { flip(false); });
                card.addEventListener('keydown', function (event) {
                    if (event.key === 'Escape' && flipped) { event.preventDefault(); flip(false); }
                });
                controls.appendChild(flags);
                controls.appendChild(backButton);
                back.appendChild(title);
                back.appendChild(controls);
                back.appendChild(content);
                front.appendChild(figure);
                front.appendChild(body);
                inner.appendChild(front);
                inner.appendChild(back);
                card.appendChild(inner);
            } else {
                card.appendChild(figure);
                card.appendChild(body);
            }
            fragment.appendChild(card);
        });
        // Keep the static fallback cards unless the CMS delivered at least one valid speaker.
        if (!fragment.childNodes.length) return;
        grid.querySelectorAll('.spk-card').forEach(function (card) { card.remove(); });
        // Keep the grid itself: its existing reveal observer and classes remain attached.
        grid.appendChild(fragment);
    }

    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 5000);
    var query = '*[_type == "speaker" && visible == true] | order(sortOrder asc, name asc, _id asc){_id,biographyDe,biographyEn,name,role,companyName,companySuffix,companyLanguage,portraitAlt,companyLogoAlt,"portrait":portrait.asset->{url,"dimensions":metadata.dimensions},"companyLogo":companyLogo.asset->{url,"dimensions":metadata.dimensions}}';
    var url = 'https://0kh5rd3y.apicdn.sanity.io/v2025-02-19/data/query/production?perspective=published&query=' + encodeURIComponent(query);
    fetch(url, {credentials: 'omit', signal: controller.signal})
        .then(function (response) {
            if (!response.ok) throw new Error('Speaker content unavailable');
            return response.json();
        })
        .then(function (payload) {
            if (!controller.signal.aborted) render(payload && payload.result);
        })
        .catch(function () { /* Static fallback cards in the HTML stay visible. */ })
        .finally(function () { clearTimeout(timeout); });
})();
