// ==UserScript==
// @name         Kinopoisk Key Test
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Тест комбинаций клавиш для Kinopoisk Data Collector
// @author       Roman Balaev
// @match        https://kinopoisk.ru/*
// @match        https://www.kinopoisk.ru/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Конфигурация тестируемых комбинаций
    const TEST_COMBINATIONS = [
        // F9
        { key: 'F9', modifiers: [] },
        { key: 'F9', modifiers: ['ctrlKey'] },
        { key: 'F9', modifiers: ['metaKey'] },
        { key: 'F9', modifiers: ['altKey'] },
        { key: 'F9', modifiers: ['ctrlKey', 'metaKey'] },
        { key: 'F9', modifiers: ['ctrlKey', 'metaKey', 'shiftKey'] },
        { key: 'F9', modifiers: ['ctrlKey', 'metaKey', 'altKey'] },

        // F10
        { key: 'F10', modifiers: [] },
        { key: 'F10', modifiers: ['ctrlKey'] },
        { key: 'F10', modifiers: ['metaKey'] },
        { key: 'F10', modifiers: ['altKey'] },
        { key: 'F10', modifiers: ['ctrlKey', 'metaKey'] },
        { key: 'F10', modifiers: ['ctrlKey', 'metaKey', 'shiftKey'] },
        { key: 'F10', modifiers: ['ctrlKey', 'metaKey', 'altKey'] },

        // F11
        { key: 'F11', modifiers: [] },
        { key: 'F11', modifiers: ['ctrlKey'] },
        { key: 'F11', modifiers: ['metaKey'] },
        { key: 'F11', modifiers: ['altKey'] },
        { key: 'F11', modifiers: ['ctrlKey', 'metaKey'] },
        { key: 'F11', modifiers: ['ctrlKey', 'metaKey', 'shiftKey'] },
        { key: 'F11', modifiers: ['ctrlKey', 'metaKey', 'altKey'] },

        // F12
        { key: 'F12', modifiers: [] },
        { key: 'F12', modifiers: ['ctrlKey'] },
        { key: 'F12', modifiers: ['metaKey'] },
        { key: 'F12', modifiers: ['altKey'] },
        { key: 'F12', modifiers: ['ctrlKey', 'metaKey'] },
        { key: 'F12', modifiers: ['ctrlKey', 'metaKey', 'shiftKey'] },
        { key: 'F12', modifiers: ['ctrlKey', 'metaKey', 'altKey'] }
    ];

    // Функция показа уведомления
    function showTestNotification(combination) {
        const modifierNames = {
            ctrlKey: 'Control',
            metaKey: 'Command',
            altKey: 'Option',
            shiftKey: 'Shift'
        };

        const modifiersText = combination.modifiers.map(mod => modifierNames[mod]).join(' + ');
        const keyText = combination.key;
        const fullCombo = modifiersText ? `${modifiersText} + ${keyText}` : keyText;

        // Создаем стили для уведомления
        const style = document.createElement('style');
        style.textContent = `
            .key-test-notification {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                padding: 20px 30px;
                border-radius: 10px;
                font-family: Arial, sans-serif;
                font-size: 18px;
                font-weight: bold;
                color: white;
                background-color: #2E7D32;
                border: 3px solid #1B5E20;
                z-index: 10000;
                box-shadow: 0 6px 20px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 90%;
                word-wrap: break-word;
            }
        `;
        
        if (!document.querySelector('style[key-test]')) {
            style.setAttribute('key-test', '');
            document.head.appendChild(style);
        }

        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = 'key-test-notification';
        notification.textContent = `✅ Скрипт работает!\nКомбинация: ${fullCombo}`;

        document.body.appendChild(notification);

        // Удаляем уведомление через 3 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);

        // Логируем в консоль
        console.log(`✅ Сработала комбинация: ${fullCombo}`);
    }

    // Функция проверки комбинации
    function checkCombination(event, combination) {
        // Проверяем основную клавишу
        if (event.key !== combination.key) return false;

        // Проверяем модификаторы которые должны быть нажаты
        for (const modifier of combination.modifiers) {
            if (!event[modifier]) return false;
        }

        // Проверяем что другие модификаторы НЕ нажаты
        const allModifiers = ['ctrlKey', 'metaKey', 'altKey', 'shiftKey'];
        for (const modifier of allModifiers) {
            if (!combination.modifiers.includes(modifier) && event[modifier]) {
                return false;
            }
        }

        return true;
    }

    // Обработчик нажатия клавиш
    function handleKeyPress(event) {
        for (const combination of TEST_COMBINATIONS) {
            if (checkCombination(event, combination)) {
                event.preventDefault();
                event.stopPropagation();
                showTestNotification(combination);
                return;
            }
        }
    }

    // Инициализация скрипта
    function init() {
        document.addEventListener('keydown', handleKeyPress, true);
        console.log('🔑 Kinopoisk Key Test загружен. Пробуйте комбинации с F9-F12');
        console.log('Доступные комбинации:', TEST_COMBINATIONS.map(c => {
            const mods = c.modifiers.map(m => m.replace('Key', ''));
            return mods.length ? `${mods.join('+')}+${c.key}` : c.key;
        }));
    }

    // Запускаем скрипт когда DOM готов
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
