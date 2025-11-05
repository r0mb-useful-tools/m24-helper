// ==UserScript==
// @name         Test Hotkeys Kinopoisk
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Test multiple hotkeys on Kinopoisk
// @author       Donald Trump
// @match        *://kinopoisk.ru/*
// @match        *://www.kinopoisk.ru/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F10') {
            alert('✅ F10 работает!');
        }
        if (e.ctrlKey && e.key === 'F10') {
            alert('✅ Ctrl+F10 работает!');
        }
        if (e.shiftKey && e.key === 'F10') {
            alert('✅ Shift+F10 работает!');
        }
        if (e.altKey && e.key === 'F10') {
            alert('✅ Alt+F10 работает!');
        }
    });
    
    alert('Тестовый скрипт загружен. Попробуйте нажать разные комбинации F10');
})();
