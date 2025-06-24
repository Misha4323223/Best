/**
 * ChatFree Provider - прямая интеграция с бесплатным API ChatFree
 * Предоставляет доступ к AI моделям без необходимости API ключей
 */

const fetch = require('node-fetch').default;
const express = require('express');
const router = express.Router();

// Настройки ChatFree API
const CHATFREE_API = {
  url: 'https://chatfree.org/api/chat/completions',
  models: {
    gpt35: 'gpt-3.5-turbo',
    gpt4: 'gpt-4'
  },
  defaultHeaders: {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  }
};

/**
 * Получение ответа от ChatFree API
 * @param {string} message - Сообщение пользователя
 * @param {Object} options - Дополнительные параметры
 * @param {string} options.systemPrompt - Системный промпт для направления ответа AI
 * @param {string} options.model - Модель AI для использования
 * @param {number} options.temperature - Температура генерации ответа (0.0 - 1.0)
 * @returns {Promise<Object>} - Объект с ответом или ошибкой
 */
async function getChatFreeResponse(message, options = {}) {
  // Настройки по умолчанию
  const systemPrompt = options.systemPrompt || 'Вы полезный ассистент. Отвечайте точно и по существу.';
  const model = options.model || CHATFREE_API.models.gpt35;
  const temperature = options.temperature || 0.7;
  
  try {
    console.log(`ChatFree: Отправка запроса к API для "${message.substring(0, 30)}..."`);
    
    // Подготовка тела запроса
    const requestBody = {
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: temperature,
      max_tokens: 2048,
      stream: false
    };
    
    // Отправка запроса
    const response = await fetch(CHATFREE_API.url, {
      method: 'POST',
      headers: CHATFREE_API.defaultHeaders,
      body: JSON.stringify(requestBody),
      timeout: 15000 // Таймаут 15 секунд для избежания длительного ожидания
    });
    
    if (!response.ok) {
      throw new Error(`ChatFree API вернул статус ${response.status}: ${response.statusText}`);
    }
    
    // Разбор ответа
    const data = await response.json();
    
    // Проверка структуры ответа
    if (!data.choices || !data.choices.length || !data.choices[0].message) {
      throw new Error('Некорректный формат ответа от ChatFree API');
    }
    
    const content = data.choices[0].message.content;
    console.log(`ChatFree: Успешно получен ответ (${content.length} символов)`);
    
    return {
      success: true,
      response: content,
      provider: "ChatFree",
      model: model
    };
    
  } catch (error) {
    console.error(`ChatFree Error: ${error.message}`);
    
    return {
      success: false,
      error: `Ошибка ChatFree: ${error.message}`,
      provider: "ChatFree",
      model: model
    };
  }
}

// Маршрут для прямых запросов к ChatFree
router.post('/query', async (req, res) => {
  const { message, systemPrompt, model, temperature } = req.body;
  
  if (!message) {
    return res.status(400).json({
      success: false,
      error: "Необходимо указать сообщение"
    });
  }
  
  try {
    const response = await getChatFreeResponse(message, {
      systemPrompt,
      model,
      temperature
    });
    
    res.json(response);
  } catch (error) {
    console.error("Ошибка в маршруте ChatFree:", error);
    res.status(500).json({
      success: false,
      error: "Внутренняя ошибка сервера"
    });
  }
});

// Тестовый маршрут
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: "ChatFree API готов к использованию"
  });
});

module.exports = router;
module.exports.getChatFreeResponse = getChatFreeResponse;