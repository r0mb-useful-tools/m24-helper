// ==UserScript==
// @name         Копирование изображения в фотобанке
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Фото из банка в буфер обмена
// @author       Roman Balaev
// @match        *://assist.m24.ru/*
// @grant        GM.addStyle
// @updateURL    https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_bankcopy_MAC.user.js
// @downloadURL  https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_bankcopy_MAC.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Добавляем стили для уведомления
    GM.addStyle(`
        .custom-notification {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(70, 170, 80, 0.9);
            color: white;
            padding: 30px 40px;
            border-radius: 5px;
            font-size: 18px;
            z-index: 10000;
            animation: fadeOut 0.5s ease-in-out 1.5s forwards;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
            border-left: 40px solid transparent !important;
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `);

    // Функция для отображения уведомления
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'custom-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    // Функция для копирования изображения в буфер обмена
    async function copyImageToClipboard(imageUrl) {
        try {
            // Для Safari: передаём Promise внутрь ClipboardItem
            // Это сохраняет контекст пользовательского действия
            const imagePromise = fetch(imageUrl).then(response => response.blob());
            
            // Определяем тип изображения (по умолчанию PNG)
            const mimeType = imageUrl.match(/\.(jpg|jpeg)$/i) ? 'image/jpeg' : 'image/png';
            
            await navigator.clipboard.write([
                new ClipboardItem({
                    [mimeType]: imagePromise
                })
            ]);

            console.log('Изображение скопировано в буфер обмена:', imageUrl);
            showNotification('Изображение скопировано в буфер обмена!');
        } catch (error) {
            console.error('Ошибка при копировании изображения:', error);
            showNotification('Не удалось скопировать изображение');
        }
    }

    // Функция для перехвата клика по ссылке
    function handleLinkClick(event) {
        const linkElement = event.target.closest('a');

        if (linkElement && (linkElement.href.includes('.jpg') || linkElement.href.includes('.jpeg') || linkElement.href.includes('.png') || linkElement.href.includes('.gif'))) {
            event.preventDefault();
            const imageUrl = linkElement.href;
            copyImageToClipboard(imageUrl);
        }
    }

    document.addEventListener('click', handleLinkClick);
})();
