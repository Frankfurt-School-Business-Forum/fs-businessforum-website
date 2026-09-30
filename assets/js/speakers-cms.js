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
            card.appendChild(figure);
            card.appendChild(body);
            fragment.appendChild(card);
        });
        // Keep the grid itself: its existing reveal observer and classes remain attached.
        grid.appendChild(fragment);
    }

    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 5000);
    var query = '*[_type == "speaker" && visible == true] | order(sortOrder asc, name asc, _id asc){name,role,companyName,companySuffix,companyLanguage,portraitAlt,companyLogoAlt,"portrait":portrait.asset->{url,"dimensions":metadata.dimensions},"companyLogo":companyLogo.asset->{url,"dimensions":metadata.dimensions}}';
    var url = 'https://0kh5rd3y.apicdn.sanity.io/v2025-02-19/data/query/production?perspective=published&query=' + encodeURIComponent(query);
    fetch(url, {credentials: 'omit', signal: controller.signal})
        .then(function (response) {
            if (!response.ok) throw new Error('Speaker content unavailable');
            return response.json();
        })
        .then(function (payload) {
            if (!controller.signal.aborted) render(payload && payload.result);
        })
        .catch(function () { /* No editorial fallback; other sections remain independent. */ })
        .finally(function () { clearTimeout(timeout); });
})();
