// ==UserScript==
// @name         Копирование с m24.ru без мусора
// @namespace    https://github.com/yourname/
// @version      1.1
// @description  Кушает рекламный хвост "Подробнее:", оставляя чистое копирование
// @author       Roman Balaev
// @match        *://m24.ru/*
// @match        *://*.m24.ru/*
// @grant        none
// @run-at       document-start
// @updateURL    https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_copy.user.js
// @downloadURL  https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_copy.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Перехватываем копирование
    document.addEventListener('copy', function(e) {
        // Получаем выделенный текст
        const selectedText = window.getSelection().toString();
        
        // Удаляем строку, начинающуюся с "Подробнее: https://www.m24.ru"
        const cleanText = selectedText.replace(
            /\nПодробнее:\s+https:\/\/www\.m24\.ru[^\n]*/g, 
            ''
        ).trim();

        // Записываем очищенный текст в буфер
        e.preventDefault();
        e.clipboardData.setData('text/plain', cleanText);
    }, true);
})();
