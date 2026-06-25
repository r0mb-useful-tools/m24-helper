// ==UserScript==
// @name         Копирование изображения в фотобанке
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  Фото из банка в буфер обмена
// @author       Roman Balaev
// @match        *://assist.m24.ru/*
// @grant        GM.xmlhttpRequest
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

    // Функция для конвертации изображения в PNG
    async function convertImageToPng(imageUrl) {
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
                        reject(new Error('Не удалось конвертировать изображение в PNG'));
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
            // Используем GM.xmlhttpRequest для обхода CORS
            const response = await new Promise((resolve, reject) => {
                GM.xmlhttpRequest({
                    method: 'GET',
                    url: imageUrl,
                    responseType: 'blob',
                    onload: (response) => resolve(response),
                    onerror: (error) => reject(error)
                });
            });

            const blob = response.response;

            if (blob.type !== 'image/png') {
                const imageUrlTemp = URL.createObjectURL(blob);
                const pngBlob = await convertImageToPng(imageUrlTemp);
                URL.revokeObjectURL(imageUrlTemp);

                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': pngBlob
                    })
                ]);
            } else {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': blob
                    })
                ]);
            }

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
