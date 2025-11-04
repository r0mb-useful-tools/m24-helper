// ==UserScript==
// @name         123RF Author Prefix
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Добавляет префикс "123RF.com/" перед ником автора на 123rf.com
// @author       Roman Balaev
// @match        *://*.123rf.com/*
// @match        *://123rf.com/*
// @grant        none
// @updateURL    https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_123RFcom.user.js
// @downloadURL  https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_123RFcom.user.js
// ==/UserScript==

(function() {
    'use strict';
    
    function addPrefix() {
        // Ищем элемент с именем автора
        const authorElement = document.querySelector('.ImageDetailsInfo__contributor--name a.ImageDetails__information--link');
        
        // Если элемент найден, добавляем префикс
        if (authorElement) {
            authorElement.textContent = '123RF.com/' + authorElement.textContent;
        }
    }
    
    // Проверяем, загружен ли DOM уже
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addPrefix);
    } else {
        // DOM уже загружен, запускаем сразу
        addPrefix();
    }
})();
