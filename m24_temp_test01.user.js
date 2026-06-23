// ==UserScript==
// @name         Диагностика 123RF для Safari
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Проверяет доступность данных на странице 123RF
// @author       Diagnostic Tool
// @match        *://*.123rf.com/*
// @match        *://123rf.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Ждем полной загрузки страницы
    window.addEventListener('load', function() {
        console.log('🔍 Диагностический скрипт запущен');
        
        // Создаем панель диагностики
        const panel = document.createElement('div');
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 15px;
            z-index: 99999;
            max-width: 400px;
            max-height: 80vh;
            overflow-y: auto;
            font-family: Arial, sans-serif;
            font-size: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        // Заголовок
        const title = document.createElement('h3');
        title.textContent = '🔍 Диагностика 123RF';
        title.style.cssText = 'margin: 0 0 10px 0; color: #333;';
        panel.appendChild(title);

        // Кнопка закрытия
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            border: none;
            background: none;
            font-size: 18px;
            cursor: pointer;
            color: #999;
        `;
        closeBtn.onclick = () => panel.style.display = 'none';
        panel.appendChild(closeBtn);

        // Контейнер для результатов
        const results = document.createElement('div');
        results.id = 'diagnostic-results';
        panel.appendChild(results);

        // Добавляем панель на страницу
        document.body.appendChild(panel);

        // Запускаем диагностику
        runDiagnostics(results);
    });

    function runDiagnostics(results) {
        // Очищаем предыдущие результаты
        results.innerHTML = '<div style="color: #666;">Выполняется проверка...</div>';

        setTimeout(() => {
            let html = '<div style="margin-bottom: 10px;"><strong>Результаты проверки:</strong></div>';

            // 1. Проверяем наличие __NEXT_DATA__
            const dataScript = document.getElementById('__NEXT_DATA__');
            html += `<div style="margin: 5px 0;">
                📄 <strong>__NEXT_DATA__</strong>: 
                ${dataScript ? '✅ Найден' : '❌ НЕ НАЙДЕН'}
            </div>`;

            if (dataScript) {
                try {
                    const jsonData = JSON.parse(dataScript.textContent);
                    
                    // 2. Проверяем структуру props
                    const hasProps = jsonData && jsonData.props;
                    html += `<div style="margin: 5px 0;">
                        📦 <strong>props</strong>: 
                        ${hasProps ? '✅ Найден' : '❌ НЕ НАЙДЕН'}
                    </div>`;

                    if (hasProps) {
                        // 3. Проверяем pageProps
                        const hasPageProps = jsonData.props && jsonData.props.pageProps;
                        html += `<div style="margin: 5px 0;">
                            📦 <strong>pageProps</strong>: 
                            ${hasPageProps ? '✅ Найден' : '❌ НЕ НАЙДЕН'}
                        </div>`;

                        if (hasPageProps) {
                            // 4. Проверяем media
                            const mediaData = jsonData.props.pageProps.media;
                            html += `<div style="margin: 5px 0;">
                                🖼️ <strong>media</strong>: 
                                ${mediaData ? '✅ Найден' : '❌ НЕ НАЙДЕН'}
                            </div>`;

                            if (mediaData) {
                                // 5. Проверяем поля внутри media
                                const fields = {
                                    'title': mediaData.title,
                                    'media_id': mediaData.media_id,
                                    'contributor': mediaData.contributor
                                };

                                html += '<div style="margin: 10px 0; padding-left: 20px; border-left: 2px solid #4CAF50;">';
                                html += '<strong>Поля в media:</strong><br>';

                                let allFieldsFound = true;
                                for (const [fieldName, value] of Object.entries(fields)) {
                                    const found = value !== undefined && value !== null;
                                    html += `<div style="margin: 3px 0;">
                                        ${fieldName}: ${found ? '✅' : '❌'} 
                                        ${found ? `<span style="color: #666;">"${value}"</span>` : '<span style="color: #f44336;">не найдено</span>'}
                                    </div>`;
                                    if (!found) allFieldsFound = false;
                                }

                                html += '</div>';

                                // Общий результат
                                if (allFieldsFound) {
                                    html += `<div style="margin: 10px 0; padding: 8px; background: #e8f5e9; border-radius: 4px; color: #2e7d32;">
                                        ✅ ВСЕ ПОЛЯ НАЙДЕНЫ! Данные доступны.
                                    </div>`;
                                } else {
                                    html += `<div style="margin: 10px 0; padding: 8px; background: #ffebee; border-radius: 4px; color: #c62828;">
                                        ❌ НЕКОТОРЫЕ ПОЛЯ ОТСУТСТВУЮТ! Проверьте структуру.
                                    </div>`;
                                }

                                // Показываем полную структуру media (для отладки)
                                html += `<details style="margin: 10px 0; padding: 8px; background: #f5f5f5; border-radius: 4px;">
                                    <summary style="cursor: pointer; font-weight: bold;">🔍 Показать все поля media</summary>
                                    <pre style="margin: 10px 0 0 0; padding: 8px; background: #fff; border: 1px solid #ddd; border-radius: 4px; font-size: 10px; overflow-x: auto; white-space: pre-wrap;">${JSON.stringify(mediaData, null, 2)}</pre>
                                </details>`;

                            } else {
                                html += `<div style="margin: 10px 0; padding: 8px; background: #ffebee; border-radius: 4px; color: #c62828;">
                                    ❌ media отсутствует или null!
                                </div>`;
                            }
                        } else {
                            html += `<div style="margin: 10px 0; padding: 8px; background: #ffebee; border-radius: 4px; color: #c62828;">
                                ❌ pageProps отсутствует!
                            </div>`;
                        }
                    } else {
                        html += `<div style="margin: 10px 0; padding: 8px; background: #ffebee; border-radius: 4px; color: #c62828;">
                            ❌ props отсутствует!
                        </div>`;
                    }

                    // Показываем структуру JSON (для отладки)
                    html += `<details style="margin: 10px 0; padding: 8px; background: #f5f5f5; border-radius: 4px;">
                        <summary style="cursor: pointer; font-weight: bold;">🔍 Показать весь JSON</summary>
                        <pre style="margin: 10px 0 0 0; padding: 8px; background: #fff; border: 1px solid #ddd; border-radius: 4px; font-size: 10px; overflow-x: auto; white-space: pre-wrap; max-height: 300px;">${JSON.stringify(jsonData, null, 2)}</pre>
                    </details>`;

                } catch (error) {
                    html += `<div style="margin: 10px 0; padding: 8px; background: #ffebee; border-radius: 4px; color: #c62828;">
                        ❌ Ошибка при парсинге JSON: ${error.message}
                    </div>`;
                }
            } else {
                html += `<div style="margin: 10px 0; padding: 8px; background: #ffebee; border-radius: 4px; color: #c62828;">
                    ❌ __NEXT_DATA__ не найден. Страница, возможно, использует другой подход для данных.
                </div>`;
            }

            // Дополнительная информация о странице
            html += `<div style="margin: 10px 0; padding: 8px; background: #f5f5f5; border-radius: 4px;">
                <strong>📊 Информация о странице:</strong><br>
                URL: ${window.location.href}<br>
                Заголовок: ${document.title}<br>
                User-Agent: ${navigator.userAgent.substring(0, 100)}...
            </div>`;

            results.innerHTML = html;
        }, 500);
    }
})();
