/**
 * Web Search Provider - поиск в интернете в реальном времени
 * Использует несколько бесплатных поисковых API и сервисов
 */

// Импорт fetch для HTTP запросов
const fetch = require('node-fetch');

/**
 * Определяет требуется ли веб-поиск для запроса
 * @param {string} query - Запрос пользователя
 * @returns {boolean} Нужен ли веб-поиск
 */
function needsWebSearch(query) {
    const lowerQuery = query.toLowerCase();
    console.log(`🔍 [SEARCH CHECK] Проверяем запрос: "${lowerQuery}"`);
    
    // Простые паттерны для определения поисковых запросов
    const patterns = [
        // Погода
        /погода|температура|дождь|снег|ветер|прогноз|градус/,
        
        // Новости
        /новост|событи|происходит|случилось|произошло|главные|сводка/,
        
        // Актуальная информация
        /сейчас|сегодня|вчера|завтра|текущий|актуальный|последний|свежий/,
        
        // Время работы и расписание
        /время работы|часы работы|расписание|работает ли|открыт|закрыт/,
        
        // Финансы
        /курс|цена|стоимость|котировки|акции|доллар|евро|рубль/,
        
        // Поиск мест
        /где найти|где купить|адрес|как добраться/,
        
        // Статус сервисов
        /статус|доступен|работает сайт|не работает/
    ];
    
    // Проверяем каждый паттерн
    const matchedPatterns = patterns.filter(pattern => pattern.test(lowerQuery));
    console.log(`🔍 [SEARCH CHECK] Найдено совпадений: ${matchedPatterns.length}`);
    
    const needsSearch = matchedPatterns.length > 0;
    console.log(`🔍 [SEARCH CHECK] Нужен ли поиск: ${needsSearch}`);
    
    return needsSearch;
}

/**
 * Поиск через Python DuckDuckGo модуль (бесплатный)
 * @param {string} query - Поисковый запрос
 * @returns {Promise<Object>} Результаты поиска
 */
async function searchDuckDuckGo(query) {
    try {
        console.log('🔍 [SEARCH] === НАЧИНАЕМ PYTHON DUCKDUCKGO ПОИСК ===');
        console.log('🔍 [SEARCH] Запрос:', query);
        
        // Используем Python скрипт для поиска
        const { spawn } = require('child_process');
        
        return new Promise((resolve, reject) => {
            const pythonScript = `
import sys
import json
try:
    from duckduckgo_search import DDGS
    
    query = "${query.replace(/"/g, '\\"')}"
    results = []
    
    with DDGS() as ddgs:
        search_results = list(ddgs.text(query, max_results=10))
        for result in search_results:
            results.append({
                'title': result.get('title', ''),
                'snippet': result.get('body', ''),
                'url': result.get('href', ''),
                'source': 'DuckDuckGo'
            })
    
    print(json.dumps({
        'success': True,
        'results': results,
        'total': len(results)
    }))
    
except Exception as e:
    print(json.dumps({
        'success': False,
        'error': str(e),
        'results': []
    }))
`;

            const python = spawn('python3', ['-c', pythonScript]);
            let output = '';
            let errorOutput = '';
            
            python.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            python.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            
            python.on('close', (code) => {
                console.log('🔍 [SEARCH] Python завершен с кодом:', code);
                console.log('🔍 [SEARCH] Вывод:', output);
                if (errorOutput) console.log('🔍 [SEARCH] Ошибки:', errorOutput);
                
                try {
                    const result = JSON.parse(output.trim());
                    console.log('🔍 [SEARCH] Результатов найдено:', result.results?.length || 0);
                    resolve(result);
                } catch (parseError) {
                    console.error('🔍 [SEARCH] Ошибка парсинга:', parseError);
                    resolve({
                        success: false,
                        error: 'Ошибка парсинга результатов поиска',
                        results: []
                    });
                }
            });
            
            python.on('error', (error) => {
                console.error('🔍 [SEARCH] Ошибка Python:', error);
                resolve({
                    success: false,
                    error: error.message,
                    results: []
                });
            });
        });
        
    } catch (error) {
        console.error('🔍 [SEARCH] Общая ошибка поиска:', error);
        return {
            success: false,
            error: error.message,
            results: []
        };
    }
}

/**
 * Поиск через публичный API Wikipedia
 * @param {string} query - Поисковый запрос
 * @returns {Promise<Object>} Результаты поиска
 */
async function searchWikipedia(query) {
    try {
        // Поиск статей
        const searchUrl = `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
        
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'BOOOMERANGS-Search/1.0'
            },
            timeout: 5000
        });
        
        if (!response.ok) {
            throw new Error(`Wikipedia API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.extract) {
            return {
                success: true,
                results: [{
                    title: data.title,
                    snippet: data.extract,
                    url: data.content_urls?.desktop?.page,
                    source: 'Wikipedia'
                }],
                provider: 'Wikipedia'
            };
        }
        
        return {
            success: false,
            error: 'No results found',
            provider: 'Wikipedia'
        };
        
    } catch (error) {
        console.error('🔍 [SEARCH] Ошибка Wikipedia:', error.message);
        return {
            success: false,
            error: error.message,
            provider: 'Wikipedia'
        };
    }
}

/**
 * Поиск новостей через бесплатный новостной API
 * @param {string} query - Поисковый запрос
 * @returns {Promise<Object>} Результаты поиска новостей
 */
async function searchNews(query) {
    try {
        // Используем бесплатный RSS конвертер для получения новостей
        const rssFeeds = [
            'https://lenta.ru/rss',
            'https://www.rbc.ru/rss/news'
        ];
        
        // Простая проверка RSS (базовая версия)
        for (const feedUrl of rssFeeds) {
            try {
                const response = await fetch(feedUrl, {
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'BOOOMERANGS-Search/1.0'
                    }
                });
                
                if (response.ok) {
                    const xmlText = await response.text();
                    console.log(`🔍 [NEWS] Получили RSS данные, размер: ${xmlText.length} символов`);
                    
                    // Извлекаем заголовки новостей из RSS
                    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>/g;
                    const altTitleRegex = /<title>(.*?)<\/title>/g;
                    
                    let matches = [];
                    let match;
                    
                    // Пробуем CDATA формат
                    while ((match = titleRegex.exec(xmlText)) !== null) {
                        matches.push(match[1]);
                    }
                    
                    // Если не нашли, пробуем обычный формат
                    if (matches.length === 0) {
                        while ((match = altTitleRegex.exec(xmlText)) !== null) {
                            matches.push(match[1]);
                        }
                    }
                    
                    console.log(`🔍 [NEWS] Найдено заголовков: ${matches.length}`);
                    
                    if (matches.length > 1) { // Пропускаем первый элемент (название канала)
                        const news = [];
                        for (let i = 1; i < Math.min(4, matches.length); i++) {
                            const title = matches[i].trim();
                            if (title && title.length > 10) {
                                news.push({
                                    title: title,
                                    snippet: `Новость от ${new Date().toLocaleDateString('ru-RU')}`,
                                    url: feedUrl,
                                    source: 'RSS Feed'
                                });
                            }
                        }
                        
                        if (news.length > 0) {
                            console.log(`🔍 [NEWS] Успешно получено ${news.length} новостей`);
                            return {
                                success: true,
                                results: news,
                                provider: 'News'
                            };
                        }
                    }
                }
            } catch (err) {
                continue;
            }
        }
        
        return {
            success: false,
            error: 'No news sources available',
            provider: 'News'
        };
        
    } catch (error) {
        console.error('🔍 [SEARCH] Ошибка News:', error.message);
        return {
            success: false,
            error: error.message,
            provider: 'News'
        };
    }
}

/**
 * Основная функция веб-поиска
 * @param {string} query - Поисковый запрос
 * @param {Object} options - Дополнительные параметры
 * @returns {Promise<Object>} Результаты поиска
 */
async function performWebSearch(query, options = {}) {
    console.log(`🔍 [SEARCH] Выполняем веб-поиск для: "${query}"`);
    
    const searchProviders = [];
    
    // Определяем какие провайдеры использовать
    if (query.toLowerCase().includes('новости') || query.toLowerCase().includes('событи')) {
        searchProviders.push(() => searchNews(query));
    }
    
    // Используем мощную бесплатную систему поиска
    const { searchRealTimeInfo } = await import('./free-web-search.js');
    searchProviders.push(
        () => searchRealTimeInfo(query),
        () => searchWikipedia(query)
    );
    
    const allResults = [];
    
    // Выполняем поиск параллельно
    const searchPromises = searchProviders.map(async (searchFunc) => {
        try {
            const result = await searchFunc();
            if (result.success && result.results.length > 0) {
                allResults.push(...result.results);
            }
            return result;
        } catch (error) {
            console.error('🔍 [SEARCH] Ошибка поисковика:', error);
            return { success: false, error: error.message };
        }
    });
    
    await Promise.allSettled(searchPromises);
    
    if (allResults.length === 0) {
        return {
            success: false,
            message: 'Не удалось найти информацию в интернете',
            results: []
        };
    }
    
    console.log(`🔍 [SEARCH] Найдено ${allResults.length} результатов`);
    
    return {
        success: true,
        results: allResults.slice(0, 5), // Ограничиваем до 5 результатов
        searchQuery: query
    };
}

/**
 * Форматирует результаты поиска для AI
 * @param {Object} searchResults - Результаты поиска
 * @returns {string} Отформатированный текст для AI
 */
function formatSearchResultsForAI(searchResults) {
    if (!searchResults.success || searchResults.results.length === 0) {
        return '';
    }
    
    let formatted = '\n📡 ИНФОРМАЦИЯ ИЗ ИНТЕРНЕТА:\n';
    
    searchResults.results.forEach((result, index) => {
        formatted += `\n${index + 1}. **${result.title}** (${result.source})\n`;
        formatted += `   ${result.snippet}\n`;
        if (result.url) {
            formatted += `   🔗 ${result.url}\n`;
        }
    });
    
    formatted += '\nИспользуйте эту актуальную информацию для ответа пользователю.\n';
    
    return formatted;
}

module.exports = {
    needsWebSearch,
    performWebSearch,
    formatSearchResultsForAI,
    searchDuckDuckGo,
    searchWikipedia,
    searchNews
};