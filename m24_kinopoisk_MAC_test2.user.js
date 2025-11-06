// ==UserScript==
// @name         Test2
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Собирает данные о кино с kinopoisk и копирует по Control+Command+F10
// @author       Roman Balaev
// @match        https://kinopoisk.ru/*
// @match        https://www.kinopoisk.ru/*
// @grant        GM_setClipboard
// @grant        GM_xmlHttpRequest
// @updateURL    https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_kinopoisk_MAC_test2.user.js
// @downloadURL  https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_kinopoisk_MAC_test2.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Fallback для Safari/Userscripts (ТОЧНО КАК В РАБОЧЕМ СКРИПТЕ)
    if (typeof GM_setClipboard === 'undefined') {
        window.GM_setClipboard = function(text) {
            return navigator.clipboard.writeText(text);
        };
    }

    if (typeof GM_xmlHttpRequest === 'undefined') {
        window.GM_xmlHttpRequest = function(details) {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open(details.method, details.url);
                xhr.onload = function() {
                    details.onload({
                        responseText: xhr.responseText,
                        status: xhr.status
                    });
                };
                xhr.onerror = function() {
                    if (details.onerror) details.onerror();
                };
                xhr.send();
            });
        };
    }

    // Конфигурационные константы
    const CONFIG = {
        MAX_DIRECTORS: 3,
        MAX_STUDIOS: 3,
        NOTIFICATION_TIMEOUT: 1500,
        NOTIFICATION_COLOR: '#2E7D32'
    };

    // Основная функция скрипта
    async function collectKinopoiskData() {
        // СРАЗУ ПРОВЕРЯЕМ РАБОТОСПОСОБНОСТЬ
        alert('Скрипт запускается! Проверяем GM функции...');
        
        let debugInfo = "Данные отладки:\n\n";
        
        try {
            // Проверяем GM функции (ПРАВИЛЬНЫЕ ИМЕНА)
            debugInfo += "GM_setClipboard: " + (typeof GM_setClipboard) + "\n";
            debugInfo += "GM_xmlHttpRequest: " + (typeof GM_xmlHttpRequest) + "\n";
            debugInfo += "URL: " + window.location.href + "\n\n";
            
            const currentUrl = window.location.href;
            const urlMatch = currentUrl.match(/kinopoisk\.ru\/(film|series)\/(\d+)/);
            debugInfo += "URL match: " + (urlMatch ? "успех" : "не найдено") + "\n";
            
            if (urlMatch) {
                debugInfo += "Тип: " + urlMatch[1] + ", ID: " + urlMatch[2] + "\n\n";
            }

            // Получаем основные данные
            const mainData = await getMainData();
            debugInfo += "Основные данные: " + (mainData ? "получены" : "не получены") + "\n";
            if (mainData) {
                debugInfo += "- Название: " + mainData.name + "\n";
                debugInfo += "- Тип: " + mainData.contentType + "\n";
            }

            // ПОКАЗЫВАЕМ ДИАГНОСТИКУ
            const userConfirmed = confirm(debugInfo + "\nПродолжить выполнение?");
            if (!userConfirmed) return;
            
            if (!mainData) {
                showNotification('Не удалось получить основные данные', 'error');
                return;
            }

            const filmType = urlMatch[1];
            const filmId = urlMatch[2];
            const baseUrl = currentUrl.split('/').slice(0, 3).join('/');

            // Получаем данные режиссеров (ПРАВИЛЬНОЕ ИМЯ ФУНКЦИИ)
            const directorsUrl = `${baseUrl}/film/${filmId}/cast/who_is/director/`;
            const directors = await getDirectors(directorsUrl);
            debugInfo += "Режиссеры: " + directors.length + "\n";

            // Получаем данные студий (ПРАВИЛЬНОЕ ИМЯ ФУНКЦИИ)
            const studiosUrl = `${baseUrl}/film/${filmId}/studio/`;
            const studios = await getStudios(studiosUrl);
            debugInfo += "Студии: " + studios.length + "\n";

            // Формируем результат
            const result = formatResult(mainData, directors, studios);
            
            // Копируем (ПРАВИЛЬНОЕ ИМЯ ФУНКЦИИ)
            GM_setClipboard(result);
            showNotification('Данные скопированы!', 'success');

        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка: ' + error.message + '\n\n' + debugInfo);
        }
    }

    // Получение списка режиссеров (ОБНОВЛЕНО ДЛЯ GM_xmlHttpRequest)
    function getDirectors(url) {
        return new Promise((resolve) => {
            GM_xmlHttpRequest({
                method: 'GET',
                url: url,
                onload: function(response) {
                    try {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(response.responseText, 'text/html');
                        const directors = [];
                        const actorElements = doc.querySelectorAll('.actorInfo');

                        for (const element of actorElements) {
                            if (directors.length >= CONFIG.MAX_DIRECTORS) break;
                            const nameElement = element.querySelector('.name a');
                            if (nameElement) {
                                const directorName = cleanText(nameElement.textContent);
                                if (directorName) directors.push(directorName);
                            }
                        }
                        resolve(directors);
                    } catch (error) {
                        console.error('Ошибка получения режиссеров:', error);
                        resolve([]);
                    }
                },
                onerror: function() {
                    console.error('Ошибка запроса режиссеров');
                    resolve([]);
                }
            });
        });
    }

    // Получение списка студий (ОБНОВЛЕНО ДЛЯ GM_xmlHttpRequest)
    function getStudios(url) {
        return new Promise((resolve) => {
            GM_xmlHttpRequest({
                method: 'GET',
                url: url,
                onload: function(response) {
                    try {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(response.responseText, 'text/html');
                        const studios = [];
                        const productionElements = doc.querySelectorAll('*');
                        let targetTable = null;

                        for (const element of productionElements) {
                            if (element.textContent.trim() === 'Производство:') {
                                targetTable = element.closest('table');
                                break;
                            }
                        }

                        if (targetTable) {
                            const links = targetTable.querySelectorAll('a');
                            for (const link of links) {
                                if (studios.length >= CONFIG.MAX_STUDIOS) break;
                                const studioName = cleanText(link.textContent);
                                if (studioName) studios.push(studioName);
                            }
                        }
                        resolve(studios);
                    } catch (error) {
                        console.error('Ошибка получения студий:', error);
                        resolve([]);
                    }
                },
                onerror: function() {
                    console.error('Ошибка запроса студий');
                    resolve([]);
                }
            });
        });
    }

    // Остальные функции без изменений...
    async function getMainData() {
        const scriptElement = document.querySelector('script[type="application/ld+json"]');
        if (!scriptElement) return null;
        try {
            const jsonData = JSON.parse(scriptElement.textContent);
            const name = cleanText(jsonData.name);
            const genres = jsonData.genre || [];
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

    function formatResult(mainData, directors, studios) {
        const { name, contentType } = mainData;
        let directorsPart = 'режиссер – ';
        if (directors.length > 1) directorsPart = 'режиссеры – ';
        directorsPart += directors.join(', ') || 'не указан';
        const studiosPart = 'производство – ' + (studios.join(', ') || 'не указано');
        const result = `кадр из ${contentType} "${name}"; ${directorsPart}; ${studiosPart}`;
        return finalCleanup(result);
    }

    function cleanText(text) {
        if (!text) return '';
        return text.replace(/^\s+|\s+$/g, '');
    }

    function finalCleanup(text) {
        return text.replace(/[«»]/g, '"').replace(/ё/g, 'е');
    }

    function showNotification(message, type = 'info') {
        const style = document.createElement('style');
        style.textContent = `.kinopoisk-notification {position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 15px 25px; border-radius: 8px; font-family: Arial; font-size: 16px; font-weight: bold; color: white; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); text-align: center; max-width: 80%; } .kinopoisk-notification.success { background-color: ${CONFIG.NOTIFICATION_COLOR}; border: 2px solid #1B5E20; } .kinopoisk-notification.error { background-color: #c62828; border: 2px solid #b71c1c; }`;
        document.head.appendChild(style);
        const notification = document.createElement('div');
        notification.className = `kinopoisk-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => { if (notification.parentNode) notification.parentNode.removeChild(notification); }, CONFIG.NOTIFICATION_TIMEOUT);
    }

    function handleKeyPress(event) {
        if (event.key === 'F10' && event.ctrlKey && event.metaKey) {
            event.preventDefault();
            collectKinopoiskData();
        }
    }

    function init() {
        document.addEventListener('keydown', handleKeyPress);
        // ТЕСТОВОЕ УВЕДОМЛЕНИЕ
        setTimeout(() => {
            alert('Скрипт Kinopoisk загружен! Нажмите Ctrl+Cmd+F10');
        }, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
