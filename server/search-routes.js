/**
 * Маршруты для расширенного поиска
 */

const express = require('express');
const router = express.Router();
const { performAdvancedSearch, searchRealTimeWeb } = require('./advanced-search-provider');

/**
 * Расширенный поиск
 */
router.post('/advanced', async (req, res) => {
  try {
    const { query, searchType = 'comprehensive', language = 'ru', maxResults = 10 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Поисковый запрос обязателен'
      });
    }

    const results = await performAdvancedSearch(query, {
      searchType,
      language,
      maxResults,
      includeAnalysis: true
    });

    res.json(results);

  } catch (error) {
    console.error('Ошибка расширенного поиска:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * Поиск в реальном времени
 */
router.post('/realtime', async (req, res) => {
  try {
    const { query, timeRange = 'recent', region = 'ru', maxResults = 15 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Поисковый запрос обязателен'
      });
    }

    const results = await searchRealTimeWeb(query, {
      timeRange,
      region,
      maxResults
    });

    res.json({
      success: true,
      query,
      timeRange,
      results,
      totalResults: results.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка поиска в реальном времени:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * Поиск по типу контента
 */
router.post('/by-type', async (req, res) => {
  try {
    const { query, contentType, language = 'ru', maxResults = 10 } = req.body;

    if (!query || !contentType) {
      return res.status(400).json({
        success: false,
        error: 'Поисковый запрос и тип контента обязательны'
      });
    }

    const validTypes = ['web', 'news', 'academic', 'images', 'comprehensive'];
    if (!validTypes.includes(contentType)) {
      return res.status(400).json({
        success: false,
        error: `Недопустимый тип контента. Разрешены: ${validTypes.join(', ')}`
      });
    }

    const results = await performAdvancedSearch(query, {
      searchType: contentType,
      language,
      maxResults,
      includeAnalysis: true
    });

    res.json(results);

  } catch (error) {
    console.error('Ошибка поиска по типу:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

module.exports = router;