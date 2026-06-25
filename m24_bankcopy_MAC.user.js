// ==UserScript==
// @name         Копирование изображения из фотобанка
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Фото из банка в буфер обмена (Safari fix)
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

    // Функция для конвертации изображения в PNG через canvas
    function convertToPngBlob(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = imageUrl;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Не удалось конвертировать в PNG'));
                    }
                }, 'image/png');
            };

            img.onerror = () => {
                reject(new Error('Не удалось загрузить изображение'));
            };
        });
    }

    // Функция для копирования изображения в буфер обмена
    async function copyImageToClipboard(imageUrl) {
        try {
            // Создаём Promise, который сконвертирует изображение в PNG
            // и вернёт ClipboardItem
            const clipboardPromise = new Promise(async (resolve, reject) => {
                try {
                    // Загружаем изображение через fetch (без ожидания снаружи)
                    const response = await fetch(imageUrl);
                    const blob = await response.blob();
                    
                    // Создаём URL для загрузки в img
                    const objectUrl = URL.createObjectURL(blob);
                    
                    // Конвертируем в PNG через canvas
                    const pngBlob = await convertToPngBlob(objectUrl);
                    URL.revokeObjectURL(objectUrl);
                    
                    // Создаём ClipboardItem с PNG
                    resolve(new ClipboardItem({
                        'image/png': pngBlob
                    }));
                } catch (error) {
                    reject(error);
                }
            });

            // Вызываем write() синхронно, передавая Promise
            // Safari сам дождётся его внутри
            await navigator.clipboard.write([await clipboardPromise]);

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
