// ==UserScript==
// @name         Копирование изображения в фотобанке
// @namespace    http://tampermonkey.net/
// @version      2.1
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

    // Функция для скачивания изображения
    async function downloadImage(imageUrl) {
        try {
            // Загружаем изображение через GM.xmlhttpRequest
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
            
            // Получаем имя файла из URL
            const filename = imageUrl.split('/').pop().split('?')[0];
            
            // Создаём ссылку для скачивания
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Освобождаем память
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 100);

            showNotification('Изображение скачано!');
        } catch (error) {
            console.error('Ошибка при скачивании изображения:', error);
            showNotification('Не удалось скачать изображение');
        }
    }

    // Функция для перехвата клика по ссылке
    function handleLinkClick(event) {
        const linkElement = event.target.closest('a');

        if (linkElement && (linkElement.href.includes('.jpg') || linkElement.href.includes('.jpeg') || linkElement.href.includes('.png') || linkElement.href.includes('.gif'))) {
            event.preventDefault();
            const imageUrl = linkElement.href;
            downloadImage(imageUrl);
        }
    }

    document.addEventListener('click', handleLinkClick);
})();
