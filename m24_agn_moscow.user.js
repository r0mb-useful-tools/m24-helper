// ==UserScript==
// @name         Обработка фотографов на mskagency.ru
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Подпись "под формат" на сайте Агентства "Москва"
// @author       Roman Balaev
// @match        *://mskagency.ru/*
// @match        *://www.mskagency.ru/*
// @grant        none
// @updateURL    https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_agn_moscow.user.js
// @downloadURL  https://github.com/r0mb-useful-tools/m24-helper/raw/refs/heads/main/m24_agn_moscow.user.js
// ==/UserScript==

(function() {
    'use strict';

    const photographerItems = document.querySelectorAll('li');
    
    photographerItems.forEach(item => {
        if (item.textContent.includes('Фотограф:')) {
            const textNode = Array.from(item.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
            if (!textNode) return;

            let photographerName = textNode.nodeValue.trim();
            photographerName = photographerName.replace(/ё/g, 'е'); // Замена ё на е

            // Обработка для "Мобильный репортер"
            if (photographerName === "Мобильный репортер") {
                photographerName = `"${photographerName}"`;
            } 
            // Обработка для остальных случаев (Фамилия Имя)
            else {
                const nameParts = photographerName.split(/\s+/).filter(part => part.trim());
                if (nameParts.length >= 2) {
                    photographerName = `${nameParts[1]} ${nameParts[0]}`; // Меняем местами
                }
            }

            // Формируем итоговую строку
            const newText = `Агентство "Москва"/${photographerName}`;
            item.innerHTML = `<span>Фотограф:</span> ${newText}`;
        }
    });
})();
