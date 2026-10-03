// ==UserScript==
// @name         Копирование названия канала в МАКСе
// @namespace    http://tampermonkey.net/
// @version      1.0
// @author       Roman Balaev
// @description  Добавляет иконку копирования > MAX/"Название"
// @match        https://web.max.ru/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_max-copy-channel.user.js
// @downloadURL  https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_max-copy-channel.user.js
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  /* ============================== НАСТРОЙКИ ============================== */
  const CONFIG = {
    // сколько держится галочка после копирования, мс
    iconSwapMs: 600,

    // размер иконки относительно шрифта названия (1 = как шрифт названия, 1.25 = крупнее)
    iconScale: 1.25,

    // минимальный --avatarSize в заголовке, по которому заголовок считается ПРОФИЛЕМ
    minAvatarSize: 64,

    // 'profile' — только профиль канала; 'any' — везде, где есть название + подписчики (лента канала тоже)
    target: 'profile',

    // диагностика в консоли браузера
    debug: false,
  };
  /* ======================================================================= */

  const BTN_CLASS = 'maxcn-btn';
  const DONE_CLASS = 'maxcn-done';
  const STYLE_ID = 'maxcn-style';

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
    console.log('[MAX copy]', ...arguments);
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
        'width:' + CONFIG.iconScale + 'em;' +
        'height:' + CONFIG.iconScale + 'em;' +
        'min-width:' + CONFIG.iconScale + 'em;' +
        'flex:0 0 auto;' +
        'margin-left:.45em;' +
        'padding:.1em;' +
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
    // основной путь: Clipboard API (работает в user gesture на https)
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

  /* --------------------------- разбор заголовка -------------------------- */

  function getContainer(h2) {
    return h2.closest('header') ||
           h2.closest('[class*="titleWrapper"]') ||
           h2.parentElement;
  }

  function getSubtitleText(container) {
    const sub = container.querySelector('[class*="subtitle"]');
    return sub ? (sub.textContent || '') : '';
  }

  // фильтр «это канал»: подпись содержит «подписчик» -> покрывает
  // «подписчик», «подписчика», «подписчиков»
  function isChannel(container) {
    const t = getSubtitleText(container).toLowerCase();
    return t.indexOf('подписчик') !== -1;
  }

  function getAvatarSize(container) {
    const els = container.querySelectorAll('[style]');
    for (let i = 0; i < els.length; i++) {
      const st = els[i].getAttribute('style') || '';
      if (st.indexOf('--avatarSize') === -1) continue;
      const m = /--avatarSize:\s*([\d.]+)/.exec(st);
      if (m) return parseFloat(m[1]);
    }
    return null;
  }

  // вариант C: работаем только в профиле канала (крупная аватарка в заголовке)
  function isProfile(container) {
    if (CONFIG.target !== 'profile') return true;
    const size = getAvatarSize(container);
    if (size != null) return size >= CONFIG.minAvatarSize;
    // запасной признак, если --avatarSize не найден:
    // крупная аватарка-кнопка есть, кнопки «назад» нет
    return !!container.querySelector('[class*="avatarButton"]') &&
           !container.querySelector('[class*="back"]');
  }

  function getNameNode(h2) {
    const nameEl = h2.querySelector('[class*="name"]') || h2;
    const textEl = nameEl.querySelector('[class*="text"]');
    return { nameEl: nameEl, textEl: textEl };
  }

  // внешние пробелы и переносы обрезаются, внутри названия НИЧЕГО не меняем
  function readName(h2) {
    const n = getNameNode(h2);
    const node = n.textEl || n.nameEl;
    const raw = node.textContent || '';
    if (node === n.nameEl && n.textEl == null) {
      // если .text не нашёлся, выбрасываем возможный хвост от кнопки
      return raw.replace(/\u00A0/g, ' ').trim();
    }
    return raw.trim();
  }

  /* ------------------------------- отрисовка ----------------------------- */

  function makeButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = BTN_CLASS;
    btn.setAttribute('aria-label', 'Скопировать название канала');
    btn.innerHTML = SVG_COPY;
    return btn;
  }

  function flash(btn) {
    if (btn.__maxcnTimer) clearTimeout(btn.__maxcnTimer);
    btn.innerHTML = SVG_DONE;
    btn.classList.add(DONE_CLASS);
    btn.__maxcnTimer = setTimeout(function () {
      btn.innerHTML = SVG_COPY;
      btn.classList.remove(DONE_CLASS);
      btn.__maxcnTimer = null;
    }, CONFIG.iconSwapMs);
  }

  function attach(h2) {
    const n = getNameNode(h2);
    if (!n.nameEl || n.nameEl.querySelector('.' + BTN_CLASS)) return;

    const btn = makeButton();

    // чтобы клик по иконке не уходил в обработчики заголовка (профиль не перерисовывался)
    btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); }, true);
    btn.addEventListener('mousedown', function (e) { e.stopPropagation(); }, true);
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') e.stopPropagation();
    }, true);

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const name = readName(h2);
      if (!name) {
        log('название пустое, копирование отменено');
        return;
      }
      // ровно MAX/"Название", без завершающего перевода строки
      const payload = 'MAX/"' + name + '"';
      copyToClipboard(payload);
      flash(btn);
      log('скопировано:', JSON.stringify(payload));
    });

    if (n.textEl && n.textEl.parentNode === n.nameEl) {
      n.nameEl.insertBefore(btn, n.textEl.nextSibling);
    } else {
      n.nameEl.appendChild(btn);
    }
    log('иконка добавлена', readName(h2));
  }

  /* --------------------------------- скан -------------------------------- */

  function scan() {
    injectStyles();
    const h2s = document.querySelectorAll('h2');
    for (let i = 0; i < h2s.length; i++) {
      const h2 = h2s[i];
      const container = getContainer(h2);
      if (!container) continue;
      if (!isChannel(container)) continue;
      if (!isProfile(container)) continue;
      attach(h2);
    }
  }

  let scanQueued = false;
  function scheduleScan() {
    if (scanQueued) return;
    scanQueued = true;
    setTimeout(function () {
      scanQueued = false;
      scan();
    }, 150);
  }

  scan();

  const mo = new MutationObserver(scheduleScan);
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
