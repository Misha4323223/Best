/**
 * Парсер веб-контента для извлечения актуальной информации со страниц
 */

const fetch = require('node-fetch');
const https = require('https');

// Агент для игнорирования SSL ошибок
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

/**
 * Извлекает содержимое веб-страницы и парсит полезную информацию
 */
async function parseWebContent(url, title, snippet) {
  try {
    console.log(`🌐 [PARSER] Загружаем содержимое: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 10000,
      agent: url.startsWith('https:') ? httpsAgent : undefined
    });

    if (!response.ok) {
      console.log(`❌ [PARSER] Ошибка загрузки ${url}: ${response.status}`);
      return {
        title,
        snippet,
        content: snippet,
        source: url
      };
    }

    const html = await response.text();
    const content = extractTextContent(html);
    
    console.log(`✅ [PARSER] Извлечено ${content.length} символов из ${url}`);
    
    return {
      title,
      snippet,
      content: content.substring(0, 800), // Ограничиваем размер
      source: url
    };
    
  } catch (error) {
    console.log(`❌ [PARSER] Ошибка парсинга ${url}:`, error.message);
    return {
      title,
      snippet,
      content: snippet,
      source: url
    };
  }
}

/**
 * Извлекает текстовое содержимое из HTML
 */
function extractTextContent(html) {
  try {
    // Удаляем скрипты и стили
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');

    // Ищем основной контент
    const mainContentRegex = /<(article|main|div[^>]*class="[^"]*content[^"]*")[^>]*>([\s\S]*?)<\/\1>/gi;
    const mainMatch = mainContentRegex.exec(text);
    
    if (mainMatch && mainMatch[2]) {
      text = mainMatch[2];
    }

    // Удаляем все HTML теги
    text = text.replace(/<[^>]*>/g, ' ');
    
    // Декодируем HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–');

    // Очищаем лишние пробелы и переносы
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // Ищем параграфы с полезной информацией
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    return sentences.slice(0, 10).join('. ').trim();
    
  } catch (error) {
    console.log('❌ [PARSER] Ошибка извлечения текста:', error.message);
    return '';
  }
}

/**
 * Обрабатывает результаты поиска и извлекает содержимое
 */
async function enrichSearchResults(searchResults) {
  console.log(`🔍 [PARSER] Обогащаем ${searchResults.length} результатов поиска`);
  
  const enrichedResults = [];
  
  // Обрабатываем первые 3 результата для экономии времени
  for (let i = 0; i < Math.min(3, searchResults.length); i++) {
    const result = searchResults[i];
    
    try {
      const parsed = await parseWebContent(result.url, result.title, result.snippet);
      enrichedResults.push(parsed);
      
      // Небольшая задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`❌ [PARSER] Ошибка обработки результата ${i}:`, error.message);
      enrichedResults.push({
        title: result.title,
        snippet: result.snippet,
        content: result.snippet,
        source: result.url
      });
    }
  }
  
  // Добавляем оставшиеся результаты без парсинга
  for (let i = 3; i < searchResults.length; i++) {
    const result = searchResults[i];
    enrichedResults.push({
      title: result.title,
      snippet: result.snippet,
      content: result.snippet,
      source: result.url
    });
  }
  
  console.log(`✅ [PARSER] Обогащение завершено: ${enrichedResults.length} результатов`);
  return enrichedResults;
}

module.exports = {
  parseWebContent,
  enrichSearchResults,
  extractTextContent
};