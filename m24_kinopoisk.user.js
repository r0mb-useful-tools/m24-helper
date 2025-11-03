// ==UserScript==
// @name         Kinopoisk Data Collector
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Собирает данные о кино с kinopoisk и копирует в буфер обмена по F10
// @author       Roman Balaev
// @match        https://kinopoisk.ru/*
// @match        https://www.kinopoisk.ru/*
// @grant        GM_setClipboard
// @grant        GM_notification
// @updateURL    https://github.com/r0mb-useful-tools/m24-helper/raw/main/m24_kinopoisk.user.js
// @downloadURL  https://github.com/r0mb-useful-tools/m24-helper/raw/main/m24_kinopoisk.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Конфигурационные константы (легко изменить при необходимости)
    const CONFIG = {
        MAX_DIRECTORS: 3,      // Максимальное количество режиссеров
        MAX_STUDIOS: 3,        // Максимальное количество студий
        NOTIFICATION_TIMEOUT: 1500, // Время показа уведомления (мс)
        NOTIFICATION_COLOR: '#2E7D32' // Темно-зеленый цвет для уведомления
    };

    // Основная функция скрипта
    async function collectKinopoiskData() {
        try {
            const currentUrl = window.location.href;
            
            // Получаем FILM_TYPE и FILM_ID из URL
            const urlMatch = currentUrl.match(/kinopoisk\.ru\/(film|series)\/(\d+)/);
            if (!urlMatch) {
                showNotification('Не удалось определить тип и ID фильма', 'error');
                return;
            }

            const filmType = urlMatch[1];
            const filmId = urlMatch[2];
            const baseUrl = currentUrl.split('/').slice(0, 3).join('/');

            // Получаем основные данные с текущей страницы
            const mainData = await getMainData();
            if (!mainData) {
                showNotification('Не удалось получить основные данные', 'error');
                return;
            }

            // Получаем данные режиссеров
            const directorsUrl = `${baseUrl}/film/${filmId}/cast/who_is/director/`;
            const directors = await getDirectors(directorsUrl);

            // Получаем данные студий
            const studiosUrl = `${baseUrl}/film/${filmId}/studio/`;
            const studios = await getStudios(studiosUrl);

            // Формируем финальный результат
            const result = formatResult(mainData, directors, studios);
            
            // Копируем в буфер обмена и показываем уведомление
            GM_setClipboard(result, 'text');
            showNotification('Данные скопированы в буфер обмена', 'success');

        } catch (error) {
            console.error('Ошибка в скрипте Kinopoisk Data Collector:', error);
            showNotification('Произошла ошибка при сборе данных', 'error');
        }
    }

    // Получение основных данных с текущей страницы
    async function getMainData() {
        const scriptElement = document.querySelector('script[type="application/ld+json"]');
        if (!scriptElement) return null;

        try {
            const jsonData = JSON.parse(scriptElement.textContent);
            const name = cleanText(jsonData.name);
            const genres = jsonData.genre || [];

            // Определяем тип контента
            let contentType = 'фильма';
            if (genres.some(genre => genre.toLowerCase().includes('мультфильм'))) {
                contentType = 'мультфильма';
            } else if (window.location.href.includes('/series/')) {
                contentType = 'сериала';
            }

            return { name, contentType };
        } catch (error) {
            console.error('Ошибка парсинга JSON:', error);
            return null;
        }
    }

    // Получение списка режиссеров
    async function getDirectors(url) {
        try {
            const response = await fetch(url);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const directors = [];
            const actorElements = doc.querySelectorAll('.actorInfo');

            for (const element of actorElements) {
                if (directors.length >= CONFIG.MAX_DIRECTORS) break;

                const nameElement = element.querySelector('.name a');
                if (nameElement) {
                    const directorName = cleanText(nameElement.textContent);
                    if (directorName) {
                        directors.push(directorName);
                    }
                }
            }

            return directors;
        } catch (error) {
            console.error('Ошибка получения режиссеров:', error);
            return [];
        }
    }

    // Получение списка студий
    async function getStudios(url) {
        try {
            const response = await fetch(url);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const studios = [];

            // Ищем элемент с точным текстом "Производство:"
            const productionElements = doc.querySelectorAll('*');
            let targetTable = null;

            for (const element of productionElements) {
                if (element.textContent.trim() === 'Производство:') {
                    targetTable = element.closest('table');
                    break;
                }
            }

            if (!targetTable) return studios;

            // Собираем все ссылки из этой таблицы
            const links = targetTable.querySelectorAll('a');
            for (const link of links) {
                if (studios.length >= CONFIG.MAX_STUDIOS) break;
                
                const studioName = cleanText(link.textContent);
                if (studioName) {
                    studios.push(studioName);
                }
            }

            return studios;
        } catch (error) {
            console.error('Ошибка получения студий:', error);
            return [];
        }
    }

    // Форматирование финального результата
    function formatResult(mainData, directors, studios) {
        const { name, contentType } = mainData;
        
        // Формируем часть с режиссерами
        let directorsPart = 'режиссер – ';
        if (directors.length > 1) {
            directorsPart = 'режиссеры – ';
        }
        directorsPart += directors.join(', ') || 'не указан';

        // Формируем часть со студиями
        const studiosPart = 'производство – ' + (studios.join(', ') || 'не указано');

        // Собираем финальную строку
        const result = `кадр из ${contentType} "${name}"; ${directorsPart}; ${studiosPart}`;
        
        // Применяем финальные замены
        return finalCleanup(result);
    }

    // Очистка текста от лишних пробелов
    function cleanText(text) {
        if (!text) return '';
        return text.replace(/^\s+|\s+$/g, '');
    }

    // Финальная очистка текста (замена кавычек и буквы ё)
    function finalCleanup(text) {
        return text
            .replace(/[«»]/g, '"')
            .replace(/ё/g, 'е');
    }

    // Показ уведомления
    function showNotification(message, type = 'info') {
        // Создаем стили для уведомления
        const style = document.createElement('style');
        style.textContent = `
            .kinopoisk-notification {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                padding: 15px 25px;
                border-radius: 8px;
                font-family: Arial, sans-serif;
                font-size: 16px;
                font-weight: bold;
                color: white;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 80%;
                word-wrap: break-word;
            }
            .kinopoisk-notification.success {
                background-color: ${CONFIG.NOTIFICATION_COLOR};
                border: 2px solid #1B5E20;
            }
            .kinopoisk-notification.error {
                background-color: #c62828;
                border: 2px solid #b71c1c;
            }
        `;
        document.head.appendChild(style);

        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = `kinopoisk-notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Удаляем уведомление через указанное время
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, CONFIG.NOTIFICATION_TIMEOUT);
    }

    // Обработчик нажатия клавиши F10
    function handleKeyPress(event) {
        if (event.key === 'F10') {
            event.preventDefault();
            collectKinopoiskData();
        }
    }

    // Инициализация скрипта
    function init() {
        document.addEventListener('keydown', handleKeyPress);
    //    console.log('Kinopoisk Data Collector загружен. Нажмите F10 для копирования данных.');
    }

    // Запускаем скрипт когда DOM готов
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
