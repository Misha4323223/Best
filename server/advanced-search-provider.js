/**
 * Расширенный поисковый провайдер с множественными источниками
 * Поддерживает поиск в реальном времени, анализ веб-страниц и базы знаний
 * Теперь с полноценным анализом ссылок, PDF и изображений
 */

const WebContentAnalyzer = require('./web-content-analyzer');

const webSearchProvider = require('./web-search-provider');

/**
 * Основная функция расширенного поиска
 * @param {string} query - Поисковый запрос
 * @param {Object} options - Параметры поиска
 * @returns {Promise<Object>} Результаты поиска
 */
async function performAdvancedSearch(query, options = {}) {
  const {
    searchType = 'comprehensive', // comprehensive, web, academic, news, images
    language = 'ru',
    maxResults = 10,
    includeAnalysis = true
  } = options;

  console.log(`🔍 Выполняем расширенный поиск: "${query}" (тип: ${searchType})`);

  try {
    let searchResults = [];
    
    // Определяем тип поиска и источники
    switch (searchType) {
      case 'comprehensive':
        searchResults = await performComprehensiveSearch(query, language, maxResults);
        break;
      case 'web':
        const webResult = await webSearchProvider.performWebSearch(query);
        searchResults = webResult.success ? webResult.results : [];
        break;
      case 'academic':
        searchResults = await performAcademicSearch(query, language, maxResults);
        break;
      case 'news':
        searchResults = await performNewsSearch(query, language, maxResults);
        break;
      case 'images':
        searchResults = await performImageSearch(query, language, maxResults);
        break;
      default:
        const defaultWebResult = await webSearchProvider.performWebSearch(query);
        searchResults = defaultWebResult.success ? defaultWebResult.results : [];
    }

    // Анализируем результаты если требуется
    let analysis = null;
    let deepAnalysis = null;
    
    if (includeAnalysis && searchResults.length > 0) {
      // Глубокий анализ веб-страниц, PDF и изображений
      const webAnalyzer = new WebContentAnalyzer();
      deepAnalysis = await webAnalyzer.analyzeSearchResults(searchResults, query);
      
      // Стандартный AI анализ
      analysis = await analyzeSearchResults(searchResults, query);
      
      // Объединяем результаты
      if (deepAnalysis && deepAnalysis.summary) {
        analysis.deepContent = deepAnalysis.summary;
        analysis.analyzedSources = deepAnalysis.sources;
        analysis.keyFacts = deepAnalysis.keyFacts;
      }
    }

    return {
      success: true,
      query,
      searchType,
      results: searchResults,
      analysis,
      totalResults: searchResults.length,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Ошибка расширенного поиска:', error);
    return {
      success: false,
      error: error.message,
      query,
      searchType
    };
  }
}

/**
 * Комплексный поиск по всем источникам
 */
async function performComprehensiveSearch(query, language, maxResults) {
  const results = [];
  
  try {
    // Основной веб-поиск
    const webSearchResult = await webSearchProvider.performWebSearch(query);
    if (webSearchResult.success) {
      results.push(...webSearchResult.results.slice(0, Math.ceil(maxResults * 0.6)));
    }

    // Поиск новостей
    const newsResults = await performNewsSearch(query, language, Math.ceil(maxResults * 0.2));
    results.push(...newsResults);

    // Академический поиск
    const academicResults = await performAcademicSearch(query, language, Math.ceil(maxResults * 0.2));
    results.push(...academicResults);

    // Удаляем дубликаты и сортируем по релевантности
    return removeDuplicates(results).slice(0, maxResults);
    
  } catch (error) {
    console.error('❌ Ошибка комплексного поиска:', error);
    return [];
  }
}

/**
 * Веб-поиск через DuckDuckGo
 */
async function performLocalWebSearch(query, language, maxResults) {
  try {
    const webSearchResult = await webSearchProvider.performWebSearch(query);
    
    if (webSearchResult.success && webSearchResult.results) {
      return webSearchResult.results.map(result => ({
        ...result,
        source: 'web',
        relevanceScore: calculateRelevanceScore(result, query)
      })).slice(0, maxResults);
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ Ошибка веб-поиска:', error);
    return [];
  }
}

/**
 * Поиск новостей
 */
async function performNewsSearch(query, language, maxResults) {
  try {
    // Используем специальные операторы для поиска новостей
    const newsQuery = `${query} site:news.google.com OR site:yandex.ru/news OR site:lenta.ru OR site:rbc.ru`;
    const newsResult = await webSearchProvider.performWebSearch(newsQuery);
    
    if (newsResult.success && newsResult.results) {
      return newsResult.results.map(result => ({
        ...result,
        source: 'news',
        relevanceScore: calculateRelevanceScore(result, query),
        category: 'Новости'
      })).slice(0, maxResults);
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ Ошибка поиска новостей:', error);
    return [];
  }
}

/**
 * Академический поиск
 */
async function performAcademicSearch(query, language, maxResults) {
  try {
    // Поиск в академических источниках
    const academicQuery = `${query} site:scholar.google.com OR site:elibrary.ru OR site:cyberleninka.ru OR filetype:pdf`;
    const academicResult = await webSearchProvider.performWebSearch(academicQuery);
    
    if (academicResult.success && academicResult.results) {
      return academicResult.results.map(result => ({
        ...result,
        source: 'academic',
        relevanceScore: calculateRelevanceScore(result, query),
        category: 'Научные статьи'
      })).slice(0, maxResults);
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ Ошибка академического поиска:', error);
    return [];
  }
}

/**
 * Поиск изображений
 */
async function performImageSearch(query, language, maxResults) {
  try {
    // Поиск изображений через специальные операторы
    const imageQuery = `${query} filetype:jpg OR filetype:png OR filetype:webp`;
    const imageResults = await searchWeb(imageQuery, maxResults);
    
    return imageResults.map(result => ({
      ...result,
      source: 'images',
      relevanceScore: calculateRelevanceScore(result, query),
      category: 'Изображения'
    }));
    
  } catch (error) {
    console.error('❌ Ошибка поиска изображений:', error);
    return [];
  }
}

/**
 * Анализ результатов поиска с помощью AI
 */
async function analyzeSearchResults(results, originalQuery) {
  try {
    // Извлекаем ключевые факты из результатов
    const keyFacts = extractKeyFacts(results);
    const sources = results.map(r => r.source).filter((v, i, a) => a.indexOf(v) === i);
    const topResults = results.slice(0, 5);
    
    // Генерируем AI-обработанный ответ
    const aiProcessedAnswer = await generateAIProcessedAnswer(results, originalQuery);
    
    return {
      summary: generateSummary(results, originalQuery),
      aiAnswer: aiProcessedAnswer, // Новое поле с AI-обработанным ответом
      keyFacts,
      sources,
      topResults: topResults.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet,
        relevanceScore: r.relevanceScore
      })),
      searchDepth: results.length,
      confidence: calculateConfidenceScore(results)
    };
    
  } catch (error) {
    console.error('❌ Ошибка анализа результатов:', error);
    return null;
  }
}

/**
 * Генерирует AI-обработанный ответ на основе результатов поиска
 */
async function generateAIProcessedAnswer(results, originalQuery) {
  try {
    // Собираем содержимое из результатов поиска
    const searchContent = results.slice(0, 8).map((result, index) => {
      return `${index + 1}. **${result.title}**
Источник: ${result.source}
Содержание: ${result.snippet || result.content || ''}
${result.content ? `Дополнительный контент: ${result.content.substring(0, 500)}...` : ''}

---`;
    }).join('\n');

    // Создаем промпт для AI обработки
    const aiPrompt = `Проанализируй следующие результаты поиска и дай четкий, исчерпывающий ответ на вопрос пользователя.

ВОПРОС ПОЛЬЗОВАТЕЛЯ: "${originalQuery}"

РЕЗУЛЬТАТЫ ПОИСКА:
${searchContent}

ИНСТРУКЦИИ:
1. Дай четкий, прямой ответ на вопрос пользователя
2. Используй только информацию из предоставленных результатов поиска
3. Структурируй ответ логично с использованием заголовков и списков
4. Указывай конкретные факты, цифры, даты
5. В конце укажи основные источники информации
6. НЕ предоставляй ссылки - только содержательную информацию
7. Отвечай на русском языке

ФОРМАТ ОТВЕТА:
- Начни с прямого ответа на вопрос
- Добавь детали и контекст
- Укажи ключевые факты
- Заключи кратким резюме`;

    // Отправляем запрос к Python G4F провайдеру
    const fetch = require('node-fetch');
    const aiResponse = await fetch('http://localhost:5004/python/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: aiPrompt,
        provider: 'Qwen_Qwen_2_72B',
        timeout: 30000
      })
    });
    
    const aiResult = await aiResponse.json();
    
    if (aiResult && aiResult.success && aiResult.response) {
      return aiResult.response;
    } else {
      // Fallback к локальной обработке
      return generateLocalProcessedAnswer(results, originalQuery);
    }
    
  } catch (error) {
    console.error('❌ Ошибка генерации AI ответа:', error);
    return generateLocalProcessedAnswer(results, originalQuery);
  }
}

/**
 * Локальная обработка результатов поиска (fallback)
 */
function generateLocalProcessedAnswer(results, originalQuery) {
  if (results.length === 0) {
    return `По запросу "${originalQuery}" актуальная информация не найдена.`;
  }

  const topResult = results[0];
  const allContent = results.slice(0, 5).map(r => r.snippet || r.content || '').join(' ');
  
  // Извлекаем ключевые данные
  const numbers = allContent.match(/\d+[.,]?\d*/g) || [];
  const dates = allContent.match(/\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}/g) || [];
  
  let answer = `**Ответ на запрос "${originalQuery}":**\n\n`;
  answer += `${topResult.snippet || topResult.content || ''}\n\n`;
  
  if (numbers.length > 0) {
    answer += `**Ключевые цифры:** ${numbers.slice(0, 5).join(', ')}\n\n`;
  }
  
  if (dates.length > 0) {
    answer += `**Важные даты:** ${dates.slice(0, 3).join(', ')}\n\n`;
  }
  
  const sources = results.slice(0, 3).map(r => r.source).filter((v, i, a) => a.indexOf(v) === i);
  answer += `**Источники информации:** ${sources.join(', ')}`;
  
  return answer;
}

module.exports = {
  performAdvancedSearch,
  performComprehensiveSearch,
  searchRealTimeWeb,
  analyzeSearchResults,
  generateAIProcessedAnswer
};

/**
 * Извлечение ключевых фактов
 */
function extractKeyFacts(results) {
  const facts = [];
  
  results.forEach(result => {
    if (result.snippet) {
      // Ищем числовые данные, даты, имена
      const numbers = result.snippet.match(/\d+[.,]?\d*/g);
      const dates = result.snippet.match(/\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}/g);
      
      if (numbers && numbers.length > 0) {
        facts.push(`Числовые данные: ${numbers.join(', ')}`);
      }
      
      if (dates && dates.length > 0) {
        facts.push(`Даты: ${dates.join(', ')}`);
      }
    }
  });
  
  return [...new Set(facts)].slice(0, 10); // Уникальные факты, максимум 10
}

/**
 * Генерация краткого резюме
 */
function generateSummary(results, query) {
  if (results.length === 0) {
    return `По запросу "${query}" информация не найдена.`;
  }
  
  const topResult = results[0];
  const totalSources = results.map(r => r.source).filter((v, i, a) => a.indexOf(v) === i).length;
  
  return `По запросу "${query}" найдено ${results.length} результатов из ${totalSources} источников. ` +
         `Наиболее релевантный результат: "${topResult.title}" (${topResult.url}).`;
}

/**
 * Вычисление релевантности результата
 */
function calculateRelevanceScore(result, query) {
  let score = 0;
  const queryWords = query.toLowerCase().split(' ');
  
  // Проверяем заголовок
  if (result.title) {
    const titleWords = result.title.toLowerCase();
    queryWords.forEach(word => {
      if (titleWords.includes(word)) score += 3;
    });
  }
  
  // Проверяем описание
  if (result.snippet) {
    const snippetWords = result.snippet.toLowerCase();
    queryWords.forEach(word => {
      if (snippetWords.includes(word)) score += 1;
    });
  }
  
  // Проверяем URL
  if (result.url) {
    const urlWords = result.url.toLowerCase();
    queryWords.forEach(word => {
      if (urlWords.includes(word)) score += 2;
    });
  }
  
  return Math.min(score / queryWords.length, 10); // Нормализуем от 0 до 10
}

/**
 * Вычисление уверенности в результатах
 */
function calculateConfidenceScore(results) {
  if (results.length === 0) return 0;
  
  const avgRelevance = results.reduce((sum, r) => sum + (r.relevanceScore || 0), 0) / results.length;
  const sourceVariety = results.map(r => r.source).filter((v, i, a) => a.indexOf(v) === i).length;
  
  return Math.min((avgRelevance * 0.7 + sourceVariety * 0.3) * 10, 100);
}

/**
 * Удаление дубликатов
 */
function removeDuplicates(results) {
  const seen = new Set();
  return results.filter(result => {
    const key = result.url || result.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Поиск по веб-страницам в реальном времени
 */
async function searchRealTimeWeb(query, options = {}) {
  const { 
    timeRange = 'recent', // recent, day, week, month, year
    region = 'ru'
  } = options;

  try {
    let timeFilter = '';
    switch (timeRange) {
      case 'day':
        timeFilter = ' after:' + new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0];
        break;
      case 'week':
        timeFilter = ' after:' + new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0];
        break;
      case 'month':
        timeFilter = ' after:' + new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
        break;
    }

    const enhancedQuery = query + timeFilter;
    return await performWebSearch(enhancedQuery, region, 15);

  } catch (error) {
    console.error('❌ Ошибка поиска в реальном времени:', error);
    return [];
  }
}

module.exports = {
  performAdvancedSearch,
  searchRealTimeWeb,
  performLocalWebSearch,
  performNewsSearch,
  performAcademicSearch,
  performImageSearch
};