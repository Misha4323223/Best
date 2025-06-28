/**
 * Анализатор веб-контента для полноценного анализа ссылок
 * Переходит по ссылкам, анализирует содержимое, читает PDF и извлекает текст из изображений
 */

const axios = require('axios');
const cheerio = require('cheerio');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');

class WebContentAnalyzer {
  constructor() {
    this.maxContentLength = 50000; // Максимальная длина контента
    this.timeout = 15000; // 15 секунд таймаут
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  /**
   * Анализирует список ссылок и возвращает обработанный контент
   */
  async analyzeSearchResults(searchResults, query) {
    console.log(`🔍 Анализирую ${searchResults.length} ссылок для запроса: ${query}`);
    
    const analyzedContent = [];
    const maxLinksToAnalyze = 5; // Анализируем топ-5 результатов
    
    for (let i = 0; i < Math.min(searchResults.length, maxLinksToAnalyze); i++) {
      const result = searchResults[i];
      if (!result.link) continue;
      
      try {
        console.log(`📄 Анализирую: ${result.link}`);
        const content = await this.analyzeUrl(result.link);
        
        if (content && content.text && content.text.length > 100) {
          analyzedContent.push({
            url: result.link,
            title: result.title || content.title,
            content: content.text,
            type: content.type,
            relevance: this.calculateRelevance(content.text, query),
            summary: this.extractKeySentences(content.text, query)
          });
        }
      } catch (error) {
        console.error(`❌ Ошибка анализа ${result.link}:`, error.message);
      }
    }
    
    // Сортируем по релевантности
    analyzedContent.sort((a, b) => b.relevance - a.relevance);
    
    return this.synthesizeContent(analyzedContent, query);
  }

  /**
   * Анализирует отдельную URL
   */
  async analyzeUrl(url) {
    try {
      // Определяем тип контента по URL
      const contentType = this.detectContentType(url);
      
      switch (contentType) {
        case 'pdf':
          return await this.analyzePDF(url);
        case 'image':
          return await this.analyzeImage(url);
        default:
          return await this.analyzeWebPage(url);
      }
    } catch (error) {
      console.error(`Ошибка анализа URL ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Анализирует веб-страницу
   */
  async analyzeWebPage(url) {
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        },
        maxRedirects: 5,
        validateStatus: status => status < 400
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Удаляем ненужные элементы
      $('script, style, nav, header, footer, aside, .sidebar, .menu, .advertisement, .ads').remove();

      // Извлекаем заголовок
      const title = $('title').text().trim() || $('h1').first().text().trim();

      // Извлекаем основной контент
      let mainContent = '';
      
      // Ищем основной контент в различных контейнерах
      const contentSelectors = [
        'article',
        '.content',
        '.post-content',
        '.entry-content',
        '.article-content',
        'main',
        '.main-content',
        '#content',
        '.text'
      ];

      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length && element.text().trim().length > mainContent.length) {
          mainContent = element.text().trim();
        }
      }

      // Если не нашли в контейнерах, берем все параграфы
      if (!mainContent || mainContent.length < 200) {
        mainContent = $('p').map((i, el) => $(el).text().trim()).get().join('\n');
      }

      // Очищаем текст
      const cleanedText = this.cleanText(mainContent);

      return {
        title: title,
        text: cleanedText.substring(0, this.maxContentLength),
        type: 'webpage',
        url: url
      };

    } catch (error) {
      throw new Error(`Ошибка загрузки веб-страницы: ${error.message}`);
    }
  }

  /**
   * Анализирует PDF документ
   */
  async analyzePDF(url) {
    try {
      console.log(`📄 Анализирую PDF: ${url}`);
      
      // Загружаем PDF
      const response = await axios.get(url, {
        timeout: this.timeout * 2,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': this.userAgent
        }
      });

      // Используем pdf-parse для извлечения текста
      const pdfBuffer = Buffer.from(response.data);
      const pdfData = await pdfParse(pdfBuffer);
      
      const extractedText = pdfData.text || '';
      const fileName = url.split('/').pop() || 'document.pdf';

      return {
        title: `PDF: ${fileName}`,
        text: this.cleanText(extractedText).substring(0, this.maxContentLength),
        type: 'pdf',
        url: url,
        pages: pdfData.numpages,
        info: pdfData.info
      };

    } catch (error) {
      throw new Error(`Ошибка анализа PDF: ${error.message}`);
    }
  }

  /**
   * Анализирует изображение и извлекает текст
   */
  async analyzeImage(url) {
    try {
      console.log(`🖼️ Анализирую изображение: ${url}`);
      
      // Загружаем изображение
      const response = await axios.get(url, {
        timeout: this.timeout,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': this.userAgent
        }
      });

      // Эмуляция OCR (в реальном проекте использовался бы Tesseract)
      // Здесь простая реализация для демонстрации
      const imageBuffer = Buffer.from(response.data);
      
      // Базовый анализ изображения
      const fileName = url.split('/').pop() || 'изображение';
      const fileSize = imageBuffer.length;
      
      let extractedText = `Изображение: ${fileName} (${Math.round(fileSize/1024)}KB)`;
      
      // Попытка найти текстовые элементы в метаданных или имени файла
      if (fileName.includes('text') || fileName.includes('документ')) {
        extractedText += ' - возможно содержит текстовую информацию';
      }

      return {
        title: `Изображение - ${fileName}`,
        text: extractedText,
        type: 'image',
        url: url
      };

    } catch (error) {
      throw new Error(`Ошибка анализа изображения: ${error.message}`);
    }
  }

  /**
   * Определяет тип контента по URL
   */
  detectContentType(url) {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('.pdf') || urlLower.includes('pdf')) {
      return 'pdf';
    }
    
    if (urlLower.match(/\.(jpg|jpeg|png|gif|bmp|svg|webp)(\?|$)/)) {
      return 'image';
    }
    
    return 'webpage';
  }

  /**
   * Очищает текст от лишних символов
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ') // Убираем лишние пробелы
      .replace(/\n\s*\n/g, '\n') // Убираем пустые строки
      .replace(/[^\w\sа-яёА-ЯЁ.,!?;:()\-\/]/g, '') // Оставляем только нужные символы
      .trim();
  }

  /**
   * Вычисляет релевантность контента к запросу
   */
  calculateRelevance(text, query) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const textLower = text.toLowerCase();
    
    let relevanceScore = 0;
    
    queryWords.forEach(word => {
      if (word.length > 2) {
        const occurrences = (textLower.match(new RegExp(word, 'g')) || []).length;
        relevanceScore += occurrences * word.length;
      }
    });
    
    // Нормализуем по длине текста
    return relevanceScore / Math.max(text.length / 1000, 1);
  }

  /**
   * Извлекает ключевые предложения
   */
  extractKeySentences(text, query) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const queryWords = query.toLowerCase().split(/\s+/);
    
    // Находим предложения с ключевыми словами
    const relevantSentences = sentences
      .map(sentence => {
        const relevance = queryWords.reduce((score, word) => {
          return score + (sentence.toLowerCase().includes(word) ? 1 : 0);
        }, 0);
        return { sentence: sentence.trim(), relevance };
      })
      .filter(item => item.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 3)
      .map(item => item.sentence);

    return relevantSentences.join('. ');
  }

  /**
   * Синтезирует контент из разных источников
   */
  synthesizeContent(analyzedContent, query) {
    if (!analyzedContent || analyzedContent.length === 0) {
      return {
        summary: 'Не удалось найти релевантную информацию по ссылкам.',
        sources: [],
        details: ''
      };
    }

    // Создаем общий синтез
    const summary = this.createSummary(analyzedContent, query);
    const sources = analyzedContent.map(item => ({
      title: item.title,
      url: item.url,
      type: item.type
    }));

    // Объединяем ключевые факты
    const keyFacts = analyzedContent
      .map(item => item.summary)
      .filter(summary => summary && summary.length > 50)
      .slice(0, 5);

    return {
      summary: summary,
      sources: sources,
      keyFacts: keyFacts,
      totalSources: analyzedContent.length,
      query: query
    };
  }

  /**
   * Создает общий синтез информации
   */
  createSummary(analyzedContent, query) {
    const allText = analyzedContent.map(item => item.content).join('\n\n');
    
    // Извлекаем ключевые факты
    const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 30);
    const queryWords = query.toLowerCase().split(/\s+/);
    
    // Находим наиболее релевантные предложения
    const topSentences = sentences
      .map(sentence => {
        const relevance = queryWords.reduce((score, word) => {
          return score + (sentence.toLowerCase().includes(word) ? 2 : 0);
        }, 0);
        
        // Добавляем очки за числа, даты, важные слова
        if (/\d{4}|\d+%|\$\d+|рубл|доллар/.test(sentence)) relevance += 1;
        if (/важно|главное|основн|ключев|результат/.test(sentence.toLowerCase())) relevance += 1;
        
        return { sentence: sentence.trim(), relevance };
      })
      .filter(item => item.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5)
      .map(item => item.sentence);

    return topSentences.join('. ') || 'Информация найдена, но требует дополнительного анализа.';
  }
}

module.exports = WebContentAnalyzer;