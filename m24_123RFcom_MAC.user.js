// ==UserScript==
// @name         123RF Author Prefix
// @namespace    http://tampermonkey.net/
// @version      2.1MAC
// @description  Добавляет префикс "123RF.com/" перед ником автора на 123rf.com
// @author       Roman Balaev
// @match        *://*.123rf.com/*
// @match        *://123rf.com/*
// @grant        none
// @updateURL    https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_123RFcom_MAC.user.js
// @downloadURL  https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_123RFcom_MAC.user.js
// ==/UserScript==

(function() {
    'use strict';
    
    function addPrefix() {
        const authorElement = document.querySelector('.ImageDetailsInfo__contributor--name a.ImageDetails__information--link');
        
        if (authorElement && !authorElement.textContent.startsWith('123RF.com/')) {
            authorElement.textContent = '123RF.com/' + authorElement.textContent;
        }
    }
    
    // Добавляем наблюдение за изменениями DOM для SPA
    const observer = new MutationObserver(function(mutations) {
        addPrefix();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Запускаем сразу
    addPrefix();
})();
