/**
 * Ollama Provider - интеграция с локальным Ollama для бесплатного доступа к AI моделям
 */

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch').default;

// Настройки Ollama
const OLLAMA_CONFIG = {
  url: process.env.OLLAMA_URL || 'http://localhost:11434',
  defaultModel: 'llama3',
  supportedModels: [
    'llama3', 'mistral', 'gemma', 'llama2', 'phi', 'falcon'
  ]
};

/**
 * Получение списка доступных моделей от Ollama
 * @returns {Promise<Array>} Список доступных моделей
 */
async function getAvailableModels() {
  try {
    const response = await fetch(`${OLLAMA_CONFIG.url}/api/tags`);
    
    if (!response.ok) {
      throw new Error(`Ollama вернул статус ${response.status}`);
    }
    
    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error(`Ошибка при получении списка моделей Ollama: ${error.message}`);
    return [];
  }
}

/**
 * Проверка доступности Ollama сервера
 * @returns {Promise<boolean>} Доступен ли Ollama
 */
async function checkOllamaAvailability() {
  try {
    const response = await fetch(`${OLLAMA_CONFIG.url}/api/version`);
    return response.ok;
  } catch (error) {
    console.error(`Ollama недоступен: ${error.message}`);
    return false;
  }
}

/**
 * Получение ответа от Ollama
 * @param {string} message - Запрос пользователя
 * @param {Object} options - Дополнительные параметры
 * @param {string} options.model - Модель Ollama для использования
 * @param {string} options.systemPrompt - Системный промпт
 * @param {number} options.temperature - Температура для генерации (0.0-1.0)
 * @returns {Promise<Object>} Ответ от Ollama
 */
async function getOllamaResponse(message, options = {}) {
  const model = options.model || OLLAMA_CONFIG.defaultModel;
  const systemPrompt = options.systemPrompt || 'Вы полезный ассистент. Отвечайте точно и по существу.';
  const temperature = options.temperature || 0.7;
  
  try {
    console.log(`Ollama: Отправка запроса к модели ${model}...`);
    
    // Проверяем доступность Ollama
    const isAvailable = await checkOllamaAvailability();
    if (!isAvailable) {
      throw new Error('Ollama сервер недоступен');
    }
    
    // Подготовка запроса
    const requestBody = {
      model: model,
      prompt: message,
      system: systemPrompt,
      stream: false,
      options: {
        temperature: temperature,
        top_p: 0.9
      }
    };
    
    // Отправка запроса
    const response = await fetch(`${OLLAMA_CONFIG.url}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      timeout: 30000 // 30 секунд таймаут
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API вернул ошибку ${response.status}: ${errorText}`);
    }
    
    // Парсинг ответа
    const data = await response.json();
    
    console.log(`Ollama: Успешно получен ответ от модели ${model}`);
    
    return {
      success: true,
      response: data.response,
      provider: "Ollama",
      model: model
    };
  } catch (error) {
    console.error(`Ollama Error: ${error.message}`);
    
    return {
      success: false,
      error: `Ошибка Ollama: ${error.message}`,
      provider: "Ollama",
      model: model
    };
  }
}

// Маршрут для установки Ollama, если он еще не установлен
router.get('/setup', async (req, res) => {
  try {
    // Проверка наличия Ollama
    const isAvailable = await checkOllamaAvailability();
    
    if (isAvailable) {
      // Ollama уже доступен
      const models = await getAvailableModels();
      
      return res.json({
        success: true,
        message: 'Ollama уже установлен и готов к использованию',
        models: models
      });
    } else {
      // Инструкция по установке
      return res.json({
        success: false,
        message: 'Ollama не установлен или недоступен',
        setupInstructions: {
          linux: 'curl -fsSL https://ollama.com/install.sh | sh',
          windows: 'Скачайте установщик с https://ollama.com/download',
          mac: 'curl -fsSL https://ollama.com/install.sh | sh'
        }
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Ошибка проверки Ollama: ${error.message}`
    });
  }
});

// Маршрут для списка доступных моделей
router.get('/models', async (req, res) => {
  try {
    const models = await getAvailableModels();
    
    res.json({
      success: true,
      models: models
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Ошибка получения списка моделей: ${error.message}`
    });
  }
});

// Маршрут для отправки запроса к Ollama
router.post('/chat', async (req, res) => {
  const { message, model, systemPrompt, temperature } = req.body;
  
  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Необходимо указать сообщение'
    });
  }
  
  try {
    const response = await getOllamaResponse(message, {
      model,
      systemPrompt,
      temperature
    });
    
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Ошибка обработки запроса: ${error.message}`
    });
  }
});

module.exports = router;
module.exports.getOllamaResponse = getOllamaResponse;
module.exports.checkOllamaAvailability = checkOllamaAvailability;