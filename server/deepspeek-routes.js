/**
 * Маршруты для DeepSpeek провайдера - специализированного AI для технических вопросов
 */

const express = require('express');
const router = express.Router();

// Используем DeepSpeek провайдер
const deepspeekProvider = require('./deepspeek-provider');

// API endpoint для запросов к DeepSpeek
router.post('/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Необходимо указать запрос (query)"
      });
    }
    
    console.log(`DeepSpeek запрос: ${query.substring(0, 50)}${query.length > 50 ? '...' : ''}`);
    
    const response = await deepspeekProvider.getDeepSpeekResponse(query);
    return res.json(response);
  } catch (error) {
    console.error('Ошибка DeepSpeek:', error);
    
    return res.status(500).json({
      success: false,
      error: `Ошибка DeepSpeek: ${error.message}`
    });
  }
});

// API endpoint для чат-интерфейса
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Необходимо указать сообщение (message)"
      });
    }
    
    console.log(`DeepSpeek чат: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    
    const response = await deepspeekProvider.getDeepSpeekResponse(message);
    return res.json(response);
  } catch (error) {
    console.error('Ошибка DeepSpeek чат:', error);
    
    return res.status(500).json({
      success: false,
      error: `Ошибка DeepSpeek: ${error.message}`
    });
  }
});

// Тестовый маршрут
router.get('/status', (req, res) => {
  res.json({
    status: "ok",
    message: "DeepSpeek API доступен",
    time: new Date().toISOString()
  });
});

module.exports = router;