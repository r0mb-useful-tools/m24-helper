// ==UserScript==
// @name         123RF to Google Sheets
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Копирует инфо с 123RF для Google-таблиц по нажатию F10
// @author       Roman Balaev
// @match        *://*.123rf.com/*
// @match        *://123rf.com/*
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @updateURL    https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_123RF-to-Clipboard.user.js
// @downloadURL  https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_123RF-to-Clipboard.user.js
// ==/UserScript==

(function() {
    'use strict';

// Fallback для Safari
if (typeof GM_setValue === 'undefined') {
    window.GM_setValue = function(key, value) {
        localStorage.setItem('userscript_' + key, JSON.stringify(value));
    };
    window.GM_getValue = function(key, defaultValue) {
        const value = localStorage.getItem('userscript_' + key);
        return value ? JSON.parse(value) : defaultValue;
    };
    window.GM_setClipboard = function(text) {
        navigator.clipboard.writeText(text);
    };
    window.GM_registerMenuCommand = function(name, func) {
        // В Safari просто создаем кнопку на странице
        const btn = document.createElement('button');
        btn.textContent = name;
        btn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;';
        btn.onclick = func;
        document.body.appendChild(btn);
    };
}

    // Конфигурация по умолчанию
    const defaultConfig = {
        email: '' // Будет запрошен при первом запуске
    };

    // Загружаем конфиг
    let config = GM_getValue('config', defaultConfig);

    // Добавляем команду в меню Tampermonkey для изменения настроек
   GM_registerMenuCommand('\u2699 Ввод email для скрипта', showConfigDialog);

    function showConfigDialog() {
        const newEmail = prompt('Введите ваш рабочий email для Google Таблиц:', config.email);
        if (newEmail !== null) {
            config.email = newEmail;
            GM_setValue('config', config);
            alert('Настройки сохранены! Email: ' + newEmail);
        }
    }

    function showTempNotification(message) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(notification);
        
        // Автоматически скрыть через 0.5 секунды
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }

    // Обработчик нажатия клавиши F10
    document.addEventListener('keydown', function(event) {
        if (event.key === 'F10') {
            event.preventDefault();
            processPageData();
        }
    });

    function processPageData() {
        // Проверяем, установлен ли email
        if (!config.email) {
            alert('Email не настроен! Пожалуйста, введите ваш email в настройках скрипта.\n\nДля этого в меню Tampermonkey выберите "\u2699 Ввод email для скрипта"');
            showConfigDialog();
            return;
        }

        // Находим скрипт с данными
        const dataScript = document.getElementById('__NEXT_DATA__');
        if (!dataScript) {
            alert('Данные страницы не найдены!');
            return;
        }

        try {
            // Парсим JSON данные
            const jsonData = JSON.parse(dataScript.textContent);
            // Извлекаем нужные данные из props -> pageProps -> media
            const mediaData = jsonData?.props?.pageProps?.media;

            if (!mediaData) {
                throw new Error('Не удалось найти данные медиа');
            }

            const title = mediaData.title;
            const mediaId = mediaData.media_id;
            const contributorUid = mediaData.contributor_uid;

            if (!title || !mediaId || !contributorUid) {
                throw new Error('Не все необходимые данные найдены');
            }

            // Форматируем текущую дату
            const currentDate = new Date();
            const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}.${(currentDate.getMonth() + 1).toString().padStart(2, '0')}.${currentDate.getFullYear()}`;

            // Формируем данные для вставки (табуляция между значениями)
            const rowData = [
                config.email, // Используем email из конфига
                formattedDate,
                title,
                contributorUid,
                mediaId.toString()
            ];

            // Копируем данные в буфер обмена с табуляцией как разделителем
            const csvData = rowData.map(field => `"${field.replace(/"/g, '""')}"`).join('\t');
            GM_setClipboard(csvData);
            showTempNotification('Данные об изображении скопированы');

        } catch (error) {
            console.error('Ошибка:', error);
            alert('Произошла ошибка: ' + error.message);
        }
    }
})();
