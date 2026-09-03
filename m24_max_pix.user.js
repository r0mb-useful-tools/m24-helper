// ==UserScript==
// @name         Заглушки для МАКСа
// @namespace    http://tampermonkey.net/
// @version      2.0
// @author       Roman Balaev
// @description  Отправляет автора из заглушек автоматом (только web.max.ru)
// @match        https://web.max.ru/*
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.umd.min.js
// @updateURL    https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_max_pix.user.js
// @downloadURL  https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_max_pix.user.js
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================
    // 1. НАСТРОЙКИ
    // ============================================================

    const PREFIX = 'm24_';
    const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'jpe'];

    // ============================================================
    // 2. ПЕРЕМЕННЫЕ СОСТОЯНИЯ
    // ============================================================

    let pendingCopyright = null;
    let fileUploaded = false;
    let fileInputElement = null;

    // ============================================================
    // 3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // ============================================================

    function isTargetFile(file) {
        const name = file.name.toLowerCase();
        const ext = name.split('.').pop();
        return name.startsWith(PREFIX) && ALLOWED_EXTENSIONS.includes(ext);
    }

    function decodeLatin1ToUtf8(str) {
        if (!str || typeof str !== 'string') return str;
        try {
            const bytes = [];
            for (let i = 0; i < str.length; i++) {
                bytes.push(str.charCodeAt(i));
            }
            const byteArray = new Uint8Array(bytes);
            const decoder = new TextDecoder('utf-8');
            const result = decoder.decode(byteArray);
            return result.includes('�') ? str : result;
        } catch (e) {
            return str;
        }
    }

    async function readCopyright(file) {
        try {
            const data = await exifr.parse(file, {
                iptc: true,
                xmp: false,
                exif: false,
                translateKeys: false,
                iptcEncoding: 'utf-8'
            });

            if (!data) return null;

            let copyrightValue = null;
            if (data['116'] && data['116'].trim() !== '') {
                copyrightValue = data['116'];
            } else if (data['115'] && data['115'].trim() !== '') {
                copyrightValue = data['115'];
            } else if (data['80'] && data['80'].trim() !== '') {
                copyrightValue = data['80'];
            }

            if (!copyrightValue) return null;

            const decoded = decodeLatin1ToUtf8(copyrightValue);
            return decoded.trim() || null;
        } catch (err) {
            console.warn('[m24_max_pix] Ошибка чтения IPTC:', err);
            return null;
        }
    }

    function findInputField() {
        let el = document.querySelector('div[role="textbox"][contenteditable="true"][data-lexical-editor="true"]');
        if (el) return el;
        el = document.querySelector('div[contenteditable="true"][role="textbox"]');
        if (el) return el;
        el = document.querySelector('div[contenteditable="true"][placeholder="Сообщение"]');
        if (el) return el;
        el = document.querySelector('div[data-lexical-editor="true"]');
        if (el) return el;
        el = document.querySelector('.input [contenteditable="true"]');
        if (el) return el;
        return null;
    }

    /**
     * Вставка текста через innerText и отправка через Enter
     */
    function sendTextMessage(text) {
        const inputField = findInputField();

        if (!inputField) {
            console.warn('[m24_max_pix] Поле ввода не найдено');
            return false;
        }

        // --- 1. Фокус на поле ---
        inputField.focus();

        // --- 2. Очистка ---
        inputField.innerText = '';

        // --- 3. Вставка текста через innerText ---
        inputField.innerText = text;
        console.log('[m24_max_pix] ✅ Текст вставлен через innerText');

        // --- 4. События, чтобы сайт понял, что текст появился ---
        inputField.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            data: text,
            inputType: 'insertText'
        }));
        inputField.dispatchEvent(new Event('change', { bubbles: true }));

        // --- 5. Проверка, что текст действительно вставлен ---
        const currentText = inputField.innerText || inputField.textContent || '';
        if (!currentText.includes(text.trim())) {
            console.warn('[m24_max_pix] Текст не вставлен, пробуем ещё раз...');
            inputField.innerText = text;
            inputField.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // --- 6. Отправка через Enter (с задержкой) ---
        console.log('[m24_max_pix] Отправляем через Enter...');

        setTimeout(() => {
            const events = [
                new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    view: window
                }),
                new KeyboardEvent('keypress', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    view: window
                }),
                new KeyboardEvent('keyup', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    view: window
                })
            ];

            for (const evt of events) {
                inputField.dispatchEvent(evt);
            }

            inputField.dispatchEvent(new Event('submit', { bubbles: true }));

            console.log('[m24_max_pix] ✅ Enter отправлен');
        }, 100);

        return true;
    }

    // ============================================================
    // 4. ОСНОВНАЯ ЛОГИКА
    // ============================================================

    function findFileInput() {
        return document.querySelector('input[type="file"]');
    }

    function setupFileInputListener() {
        const input = findFileInput();

        if (!input) {
            console.log('[m24_max_pix] Ожидание появления input...');
            return;
        }

        fileInputElement = input;

        input.removeEventListener('change', handleFileChange);
        input.addEventListener('change', handleFileChange);

        console.log('[m24_max_pix] ✅ Input найден, слушатель установлен');
    }

    async function handleFileChange(event) {
        const files = event.target.files;

        if (!files || files.length === 0) {
            return;
        }

        const file = files[0];

        if (!isTargetFile(file)) {
            console.log('[m24_max_pix] Файл не подходит:', file.name);
            return;
        }

        console.log('[m24_max_pix] Обнаружен целевой файл:', file.name);

        const copyright = await readCopyright(file);

        if (!copyright || copyright.trim() === '') {
            console.log('[m24_max_pix] Copyright пустой, ничего не отправляем');
            pendingCopyright = null;
            return;
        }

        console.log('[m24_max_pix] Найден Copyright:', copyright);

        pendingCopyright = copyright;
        fileUploaded = false;

        fileInputElement.value = '';

        waitForUploadComplete();
    }

    // ============================================================
    // 5. МОНИТОРИНГ ЗАВЕРШЕНИЯ ЗАГРУЗКИ
    // ============================================================

    function waitForUploadComplete() {
        let attempts = 0;
        const maxAttempts = 30;

        const checkInterval = setInterval(() => {
            attempts++;

            const fileMessages = document.querySelectorAll(
                '.message-file, .attachment, [data-testid="message-file"], img[src*="i.oneme.ru"]'
            );

            if (fileMessages.length > 0) {
                clearInterval(checkInterval);
                console.log('[m24_max_pix] Файл появился в сообщениях, загрузка завершена');

                if (pendingCopyright && !fileUploaded) {
                    fileUploaded = true;
                    sendTextMessage(pendingCopyright);
                    pendingCopyright = null;
                }
                return;
            }

            const uploadProgress = document.querySelector(
                '.upload-progress, .sending-progress, [data-testid="upload-progress"], .progress'
            );

            if (!uploadProgress && attempts > 5) {
                clearInterval(checkInterval);
                console.log('[m24_max_pix] Индикатор загрузки пропал');

                if (pendingCopyright && !fileUploaded) {
                    fileUploaded = true;
                    sendTextMessage(pendingCopyright);
                    pendingCopyright = null;
                }
                return;
            }

            if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.log('[m24_max_pix] Таймаут ожидания загрузки');
                if (pendingCopyright && !fileUploaded) {
                    fileUploaded = true;
                    sendTextMessage(pendingCopyright);
                    pendingCopyright = null;
                }
            }
        }, 500);
    }

    // ============================================================
    // 6. ОТСЛЕЖИВАНИЕ ПОЯВЛЕНИЯ INPUT
    // ============================================================

    function setupMutationObserver() {
        const observer = new MutationObserver(() => {
            const input = findFileInput();
            if (input && input !== fileInputElement) {
                setupFileInputListener();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ============================================================
    // 7. ЗАПУСК
    // ============================================================

    console.log('[m24_max_pix] Скрипт загружен, автор: Roman Balaev, версия 1.9');

    function init() {
        setupFileInputListener();
        setupMutationObserver();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
