// ==UserScript==
// @name         Обработка фотографов на mskagency.ru
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Подпись в АГН Москва с иконкой копирования
// @author       Roman Balaev
// @match        *://mskagency.ru/*
// @match        *://www.mskagency.ru/*
// @grant        none
// @run-at       document-idle
// @noframes
// @updateURL    https://raw.githubusercontent.com/r0mb-useful-tools/m24-helper/main/m24_agn_moscow.user.js
// @downloadURL  https://raw.githubusercontent.com/r0mb-useful-tools/m24-helper/main/m24_agn_moscow.user.js
// ==/UserScript==

(function() {
    'use strict';

    /* ============================== НАСТРОЙКИ ============================== */
    const CONFIG = {
        // размер иконки относительно шрифта подписи (1 = как шрифт, 1.25 = крупнее)
        iconScale: 1.25,

        // сколько держится галочка после копирования, мс
        iconSwapMs: 400,

        // префикс для буфера обмена:
        //   ''            — копируется только подпись: "Агентство "Москва"/Иван Иванов"
        //   'Фотограф: '  — копируется вместе со словом "Фотограф:"
        copyPrefix: '',

        // диагностика в консоли браузера
        debug: false,
    };
    /* ======================================================================= */

    const BTN_CLASS       = 'm24-copy-btn';
    const DONE_CLASS      = 'm24-copy-btn--done';
    const STYLE_ID        = 'm24-copy-style';
    const TRANSFORM_PREFIX = 'Агентство "Москва"/';

    const SVG_COPY =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
        '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>' +
        '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>' +
        '</svg>';

    const SVG_DONE =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
        '<polyline points="20 6 9 17 4 12"></polyline>' +
        '</svg>';

    /* ------------------------------- утилиты ------------------------------- */

    function log() {
        if (!CONFIG.debug) return;
        console.log('[m24]', ...arguments);
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const css =
            '.' + BTN_CLASS + '{' +
                'all:unset;' +
                'display:inline-flex;' +
                'align-items:center;' +
                'justify-content:center;' +
                'box-sizing:border-box;' +
                'font-size:inherit;' +
                'line-height:1;' +
                'width:' + CONFIG.iconScale + 'em;' +
                'height:' + CONFIG.iconScale + 'em;' +
                'flex:0 0 auto;' +
                'margin-left:.45em;' +
                'vertical-align:middle;' +
                'color:currentColor;' +
                'opacity:.55;' +
                'cursor:pointer;' +
                'touch-action:manipulation;' +
                '-webkit-tap-highlight-color:transparent;' +
                'transition:opacity .15s ease,transform .1s ease;' +
            '}' +
            '.' + BTN_CLASS + ':hover{opacity:.95}' +
            '.' + BTN_CLASS + ':active{transform:scale(.9)}' +
            '.' + BTN_CLASS + ':focus-visible{opacity:.95;outline:2px solid currentColor;' +
                'outline-offset:1px;border-radius:4px}' +
            '.' + DONE_CLASS + '{opacity:.95}' +
            '.' + BTN_CLASS + ' svg{display:block;width:100%;height:100%;pointer-events:none}';
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    }

    /* ------------------------------ копирование ---------------------------- */

    function copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                const p = navigator.clipboard.writeText(text);
                if (p && typeof p.catch === 'function') {
                    p.catch(function () { fallbackCopy(text); });
                }
                return;
            }
        } catch (e) { /* падаем в фолбэк */ }
        fallbackCopy(text);
    }

    function fallbackCopy(text) {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.cssText =
                'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;' +
                'opacity:0;pointer-events:none;';
            document.body.appendChild(ta);

            const sel = document.getSelection();
            const savedRange = sel && sel.rangeCount ? sel.getRangeAt(0) : null;

            ta.focus();
            ta.select();
            ta.setSelectionRange(0, text.length);
            document.execCommand('copy');

            ta.remove();
            if (savedRange && sel) {
                sel.removeAllRanges();
                sel.addRange(savedRange);
            }
            log('скопировано через fallback');
        } catch (e) {
            log('копирование не удалось', e);
        }
    }

    /* --------------------------- определение страницы ---------------------- */

    function isSinglePhotoPage() {
        // Пример: https://www.mskagency.ru/photobank/1554421
        return /^\/photobank\/\d+\/?$/.test(location.pathname);
    }

    /* ------------------------------- отрисовка ----------------------------- */

    function makeButton(textToCopy) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = BTN_CLASS;
        btn.setAttribute('aria-label', 'Скопировать подпись');
        btn.innerHTML = SVG_COPY;

        // чтобы клик по иконке не уходил в обработчики сайта (SPA не перерисовывалась)
        btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); }, true);
        btn.addEventListener('mousedown',   function (e) { e.stopPropagation(); }, true);

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const payload = CONFIG.copyPrefix + textToCopy;
            copyToClipboard(payload);
            flash(btn);
            log('скопировано:', JSON.stringify(payload));
        });

        return btn;
    }

    function flash(btn) {
        if (btn.__m24Timer) clearTimeout(btn.__m24Timer);
        btn.innerHTML = SVG_DONE;
        btn.classList.add(DONE_CLASS);
        btn.__m24Timer = setTimeout(function () {
            btn.innerHTML = SVG_COPY;
            btn.classList.remove(DONE_CLASS);
            btn.__m24Timer = null;
        }, CONFIG.iconSwapMs);
    }

    /* --------------------------- обработка подписи ------------------------- */

    function processItem(item) {
        const textNode = Array.from(item.childNodes).find(function (node) {
            return node.nodeType === Node.TEXT_NODE;
        });
        if (!textNode) return;

        let photographerName = textNode.nodeValue.trim();
        if (!photographerName) return;

        photographerName = photographerName.replace(/ё/g, 'е');

        if (photographerName === "Мобильный репортер") {
            photographerName = '"' + photographerName + '"';
        } else {
            const nameParts = photographerName.split(/\s+/).filter(function (p) { return p.trim(); });
            if (nameParts.length >= 2) {
                photographerName = nameParts[1] + ' ' + nameParts[0];
            }
        }

        const newText = TRANSFORM_PREFIX + photographerName;

        // Пересобираем содержимое li (заодно удаляет старую кнопку, если была)
        item.innerHTML = '<span>Фотограф:</span> ' + newText;

        // Кнопка копирования — только на странице отдельного фото
        if (isSinglePhotoPage()) {
            item.appendChild(makeButton(newText));
        }

        log('обработано:', newText);
    }

    /* --------------------------------- скан -------------------------------- */

    function scan() {
        injectStyles();
        const items = document.querySelectorAll('li');
        items.forEach(function (item) {
            if (!item.textContent.includes('Фотограф:')) return;
            // Уже обработано (в т.ч. нашим же скриптом) — пропускаем
            if (item.textContent.includes(TRANSFORM_PREFIX)) return;
            processItem(item);
        });
    }

    let scanQueued = false;
    function scheduleScan() {
        if (scanQueued) return;
        scanQueued = true;
        setTimeout(function () {
            scanQueued = false;
            scan();
        }, 50);
    }

    scan();

    // MutationObserver для SPA: листание фото и любые динамические обновления.
    // characterData нужен на случай, если сайт меняет только nodeValue, не пересоздавая <li>.
    const mo = new MutationObserver(scheduleScan);
    mo.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
    });
})();
