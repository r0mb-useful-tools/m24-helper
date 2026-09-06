// ==UserScript==
// @name         Заглушки для МАКСа (DEBUG для Safari)
// @namespace    http://tampermonkey.net/
// @version      2.1-debug
// @author       Roman Balaev
// @description  Отправляет автора из заглушек автоматом (только web.max.ru) - DEBUG версия
// @match        https://web.max.ru/*
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.umd.min.js
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================
    // ДИАГНОСТИКА: Проверка загрузки скрипта
    // ============================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[m24_DEBUG] Скрипт запущен!');
    console.log('[m24_DEBUG] User Agent:', navigator.userAgent);
    console.log('[m24_DEBUG] Браузер:', navigator.vendor);
    console.log('[m24_DEBUG] exifr доступен:', typeof exifr !== 'undefined');
    console.log('[m24_DEBUG] TextDecoder доступен:', typeof TextDecoder !== 'undefined');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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
        const result = name.startsWith(PREFIX) && ALLOWED_EXTENSIONS.includes(ext);
        console.log('[m24_DEBUG] isTargetFile:', name, '→', result);
        return result;
    }

    function decodeLatin1ToUtf8(str) {
        if (!str || typeof str !== 'string') {
            console.log('[m24_DEBUG] decodeLatin1ToUtf8: пустая строка');
            return str;
        }
        try {
            const bytes = [];
            for (let i = 0; i < str.length; i++) {
                bytes.push(str.charCodeAt(i));
            }
            const byteArray = new Uint8Array(bytes);
            const decoder = new TextDecoder('utf-8');
            const result = decoder.decode(byteArray);
            console.log('[m24_DEBUG] decodeLatin1ToUtf8:', str, '→', result);
            return result.includes('�') ? str : result;
        } catch (e) {
            console.error('[m24_DEBUG] Ошибка декодирования:', e);
            return str;
        }
    }

    async function readCopyright(file) {
        console.log('[m24_DEBUG] readCopyright: начало чтения IPTC из', file.name);
        
        try {
            if (typeof exifr === 'undefined') {
                console.error('[m24_DEBUG] ❌ exifr не загружен!');
                return null;
            }

            console.log('[m24_DEBUG] exifr.parse вызван...');
            const data = await exifr.parse(file, {
                iptc: true,
                xmp: false,
                exif: false,
                translateKeys: false,
                iptcEncoding: 'utf-8'
            });

            console.log('[m24_DEBUG] exifr.parse завершён, данные:', data);

            if (!data) {
                console.log('[m24_DEBUG] ❌ Нет IPTC данных');
                return null;
            }

            let copyrightValue = null;
            if (data['116'] && data['116'].trim() !== '') {
                copyrightValue = data['116'];
                console.log('[m24_DEBUG] ✅ Найден IPTC:CopyrightNotice (116):', copyrightValue);
            } else if (data['115'] && data['115'].trim() !== '') {
                copyrightValue = data['115'];
                console.log('[m24_DEBUG] ✅ Найден IPTC:Credit (115):', copyrightValue);
            } else if (data['80'] && data['80'].trim() !== '') {
                copyrightValue = data['80'];
                console.log('[m24_DEBUG] ✅ Найден IPTC:Byline (80):', copyrightValue);
            }

            if (!copyrightValue) {
                console.log('[m24_DEBUG] ❌ Copyright не найден в IPTC');
                return null;
            }

            const decoded = decodeLatin1ToUtf8(copyrightValue);
            console.log('[m24_DEBUG] ✅ Итоговый copyright:', decoded);
            return decoded.trim() || null;
        } catch (err) {
            console.error('[m24_DEBUG] ❌ Ошибка чтения IPTC:', err);
            console.error('[m24_DEBUG] Stack trace:', err.stack);
            return null;
        }
    }

    function findInputField() {
        console.log('[m24_DEBUG] findInputField: поиск поля ввода...');
        
        let el = document.querySelector('div[role="textbox"][contenteditable="true"][data-lexical-editor="true"]');
        if (el) {
            console.log('[m24_DEBUG] ✅ Найдено поле (вариант 1):', el);
            return el;
        }
        
        el = document.querySelector('div[contenteditable="true"][role="textbox"]');
        if (el) {
            console.log('[m24_DEBUG] ✅ Найдено поле (вариант 2):', el);
            return el;
        }
        
        el = document.querySelector('div[contenteditable="true"][placeholder="Сообщение"]');
        if (el) {
            console.log('[m24_DEBUG] ✅ Найдено поле (вариант 3):', el);
            return el;
        }
        
        el = document.querySelector('div[data-lexical-editor="true"]');
        if (el) {
            console.log('[m24_DEBUG] ✅ Найдено поле (вариант 4):', el);
            return el;
        }
        
        el = document.querySelector('.input [contenteditable="true"]');
        if (el) {
            console.log('[m24_DEBUG] ✅ Найдено поле (вариант 5):', el);
            return el;
        }
        
        console.log('[m24_DEBUG] ❌ Поле ввода не найдено');
        return null;
    }

    /**
     * Вставка текста через innerText и отправка через Enter
     */
    function sendTextMessage(text) {
        console.log('[m24_DEBUG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[m24_DEBUG] sendTextMessage: начало отправки:', text);
        
        const inputField = findInputField();

        if (!inputField) {
            console.error('[m24_DEBUG] ❌ Поле ввода не найдено');
            alert('❌ DEBUG: Поле ввода не найдено! Откройте консоль (F12)');
            return false;
        }

        // --- 1. Фокус на поле ---
        console.log('[m24_DEBUG] Шаг 1: Фокус на поле');
        inputField.focus();

        // --- 2. Очистка ---
        console.log('[m24_DEBUG] Шаг 2: Очистка поля');
        inputField.innerText = '';

        // --- 3. Вставка текста через innerText ---
        console.log('[m24_DEBUG] Шаг 3: Вставка текста через innerText');
        inputField.innerText = text;
        console.log('[m24_DEBUG] ✅ Текст вставлен, проверка:', inputField.innerText);

        // --- 4. События, чтобы сайт понял, что текст появился ---
        console.log('[m24_DEBUG] Шаг 4: Отправка событий input/change');
        inputField.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            data: text,
            inputType: 'insertText'
        }));
        inputField.dispatchEvent(new Event('change', { bubbles: true }));

        // --- 5. Проверка, что текст действительно вставлен ---
        const currentText = inputField.innerText || inputField.textContent || '';
        console.log('[m24_DEBUG] Шаг 5: Проверка вставки, текст в поле:', currentText);
        
        if (!currentText.includes(text.trim())) {
            console.warn('[m24_DEBUG] ⚠️ Текст не вставлен, пробуем ещё раз...');
            inputField.innerText = text;
            inputField.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // --- 6. Отправка через Enter (с задержкой) ---
        console.log('[m24_DEBUG] Шаг 6: Отправка через Enter...');

        setTimeout(() => {
            console.log('[m24_DEBUG] Создание событий KeyboardEvent...');
            
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
                const dispatched = inputField.dispatchEvent(evt);
                console.log('[m24_DEBUG] Событие', evt.type, 'dispatched:', dispatched);
            }

            inputField.dispatchEvent(new Event('submit', { bubbles: true }));
            console.log('[m24_DEBUG] Событие submit отправлено');

            console.log('[m24_DEBUG] ✅ Enter отправлен');
            console.log('[m24_DEBUG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Уведомление пользователю
            setTimeout(() => {
                if (inputField.innerText === text) {
                    console.warn('[m24_DEBUG] ⚠️ Текст всё ещё в поле, возможно Enter не сработал');
                    alert('⚠️ DEBUG: Текст вставлен, но Enter не сработал в Safari. Попробуйте нажать Enter вручную.');
                }
            }, 500);
        }, 100);

        return true;
    }

    // ============================================================
    // 4. ОСНОВНАЯ ЛОГИКА
    // ============================================================

    function findFileInput() {
        const input = document.querySelector('input[type="file"]');
        console.log('[m24_DEBUG] findFileInput:', input ? '✅ Найден' : '❌ Не найден');
        return input;
    }

    function setupFileInputListener() {
        const input = findFileInput();

        if (!input) {
            console.log('[m24_DEBUG] Ожидание появления input...');
            return;
        }

        fileInputElement = input;

        input.removeEventListener('change', handleFileChange);
        input.addEventListener('change', handleFileChange);

        console.log('[m24_DEBUG] ✅ Input найден, слушатель установлен');
    }

    async function handleFileChange(event) {
        console.log('[m24_DEBUG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[m24_DEBUG] handleFileChange: файл выбран');
        
        const files = event.target.files;

        if (!files || files.length === 0) {
            console.log('[m24_DEBUG] ❌ Нет файлов');
            return;
        }

        const file = files[0];
        console.log('[m24_DEBUG] Файл:', file.name, 'Размер:', file.size, 'Тип:', file.type);

        if (!isTargetFile(file)) {
            console.log('[m24_DEBUG] Файл не подходит (не начинается с m24_ или неверное расширение)');
            return;
        }

        console.log('[m24_DEBUG] ✅ Обнаружен целевой файл:', file.name);

        const copyright = await readCopyright(file);

        if (!copyright || copyright.trim() === '') {
            console.log('[m24_DEBUG] ❌ Copyright пустой, ничего не отправляем');
            alert('⚠️ DEBUG: Copyright не найден в IPTC. Откройте консоль (F12) для деталей.');
            pendingCopyright = null;
            return;
        }

        console.log('[m24_DEBUG] ✅ Найден Copyright:', copyright);
        alert('✅ DEBUG: Copyright найден: ' + copyright);

        pendingCopyright = copyright;
        fileUploaded = false;

        fileInputElement.value = '';

        waitForUploadComplete();
    }

    // ============================================================
    // 5. МОНИТОРИНГ ЗАВЕРШЕНИЯ ЗАГРУЗКИ
    // ============================================================

    function waitForUploadComplete() {
        console.log('[m24_DEBUG] waitForUploadComplete: ожидание загрузки...');
        
        let attempts = 0;
        const maxAttempts = 30;

        const checkInterval = setInterval(() => {
            attempts++;
            console.log('[m24_DEBUG] Попытка', attempts, '/', maxAttempts);

            const fileMessages = document.querySelectorAll(
                '.message-file, .attachment, [data-testid="message-file"], img[src*="i.oneme.ru"]'
            );

            console.log('[m24_DEBUG] Найдено элементов файла:', fileMessages.length);

            if (fileMessages.length > 0) {
                clearInterval(checkInterval);
                console.log('[m24_DEBUG] ✅ Файл появился в сообщениях, загрузка завершена');

                if (pendingCopyright && !fileUploaded) {
                    fileUploaded = true;
                    console.log('[m24_DEBUG] Отправка copyright...');
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
                console.log('[m24_DEBUG] ✅ Индикатор загрузки пропал');

                if (pendingCopyright && !fileUploaded) {
                    fileUploaded = true;
                    console.log('[m24_DEBUG] Отправка copyright...');
                    sendTextMessage(pendingCopyright);
                    pendingCopyright = null;
                }
                return;
            }

            if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.log('[m24_DEBUG] ⚠️ Таймаут ожидания загрузки');
                if (pendingCopyright && !fileUploaded) {
                    fileUploaded = true;
                    console.log('[m24_DEBUG] Отправка copyright...');
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
        console.log('[m24_DEBUG] setupMutationObserver: запуск наблюдателя DOM');
        
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
        
        console.log('[m24_DEBUG] ✅ MutationObserver установлен');
    }

    // ============================================================
    // 7. ЗАПУСК
    // ============================================================

    console.log('[m24_DEBUG] Скрипт инициализирован, автор: Roman Balaev, версия 2.1-debug');

    function init() {
        console.log('[m24_DEBUG] init: начало инициализации');
        setupFileInputListener();
        setupMutationObserver();
        console.log('[m24_DEBUG] ✅ Инициализация завершена');
        console.log('[m24_DEBUG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    if (document.readyState === 'loading') {
        console.log('[m24_DEBUG] Ожидание DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', init);
    } else {
        console.log('[m24_DEBUG] DOM уже загружен, запуск init сразу');
        init();
    }

})();
