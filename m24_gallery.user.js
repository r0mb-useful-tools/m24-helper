// ==UserScript==
// @name         Галерея фотобанка --> Источник/Автор
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Выводит Источник/Автор с описанием при наведении
// @author       Roman Balaev
// @match        *://assist.m24.ru/*
// @grant        none
// @updateURL    https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_gallery.user.js
// @downloadURL  https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_gallery.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Находим все ячейки галереи
    const galleryItems = document.querySelectorAll('li.span2.fadeInfo');

    // Обрабатываем каждую ячейку
    galleryItems.forEach(item => {
        // Ищем информационный блок с источником и автором
        const infoDiv = item.querySelector('div[style*="background: white;height: 90px;overflow: hidden; margin: 3px"]');
        
        if (!infoDiv) return;

        // Извлекаем источник и автора из информационного блока
        let source = null;
        let author = null;
        let description = null;

        // Парсим HTML содержимое для поиска источника и автора
        const infoHTML = infoDiv.innerHTML;
        
        // Ищем источник
        const sourceMatch = infoHTML.match(/<b>Источник: <\/b>([^<]+)/i);
        if (sourceMatch) {
            source = sourceMatch[1].trim();
        }
        
        // Ищем автора
        const authorMatch = infoHTML.match(/<b>Автор: <\/b>([^<]+)/i);
        if (authorMatch) {
            author = authorMatch[1].trim();
        }

        // Ищем описание - берем из нижнего блока (более надежно)
        const descDiv = item.querySelector('div[style*="background: white;height: 35px;overflow: hidden; margin: 3px; border-top: 1px solid #b0b0b0"]');
        if (descDiv) {
            description = descDiv.textContent.trim();
        }

        // Формируем новое содержимое для блока при наведении
        const hoverDiv = item.querySelector('div[style="color: #ffffff;padding: 10px;"]');
        if (!hoverDiv) return;

        // Создаем первую строку: Источник/Автор
        let firstLine = '';
        if (source && author) {
            firstLine = `${source}/${author}`;
        } else if (source) {
            firstLine = source;
        } else if (author) {
            firstLine = author;
        }

        // Формируем финальный HTML с переносами строк
        let finalHTML = '';
        if (firstLine && description) {
            finalHTML = `${firstLine}<span style="user-select: none;">​</span><br><br>${description}`; // Добавляем невидимый пробел перед переносами
        } else if (firstLine) {
            finalHTML = `${firstLine}<span style="user-select: none;">​</span>`; // Добавляем и в случае если нет описания
        } else if (description) {
            finalHTML = description;
        } else {
            finalHTML = ''; // Если вообще ничего нет
        }

        // Заменяем содержимое блока при наведении
        hoverDiv.innerHTML = finalHTML;
        hoverDiv.style.paddingTop = '40px'; // Добавляем отступ сверху
    });
})();
