/**
 * Claude Provider - интеграция с Anthropic Claude через Python G4F
 */

const express = require('express');
const router = express.Router();
const pythonProviderRoutes = require('./python_provider_routes');

// Настройки провайдера Claude
const CLAUDE_CONFIG = {
  defaultModel: 'claude-3-sonnet',
  models: {
    haiku: 'claude-3-haiku',
    sonnet: 'claude-3-sonnet',
    opus: 'claude-3-opus'
  },
  systemPrompt: {
    default: 'Вы полезный ассистент, отвечающий точно и информативно.',
    creative: 'Вы творческий ассистент, генерирующий оригинальные и интересные идеи.',
    technical: 'Вы технический эксперт, отвечающий на технические вопросы с глубоким пониманием.'
  }
};

/**
 * Получение ответа от Claude через Python G4F
 * @param {string} message - Запрос пользователя
 * @param {Object} options - Дополнительные параметры
 * @returns {Promise<Object>} - Ответ от Claude
 */
async function getClaudeResponse(message, options = {}) {
  const model = options.model || CLAUDE_CONFIG.defaultModel;
  const promptType = options.promptType || 'default';
  const systemPrompt = options.systemPrompt || CLAUDE_CONFIG.systemPrompt[promptType];
  
  try {
    console.log(`Claude: Отправка прямого запроса к модели ${model}...`);
    
    // Используем прямой вызов API без автоматического переключения
    const response = await fetch('http://localhost:5004/python/direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        provider: 'Anthropic',  // Именно так называется провайдер в g4f
        systemPrompt,
        timeout: 30000  // Увеличенный таймаут для Claude
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Проверяем ответ от сервера
    if (data.error) {
      throw new Error(data.error);
    }
    
    if (!data.response || data.response.trim() === '') {
      throw new Error('Claude вернул пустой ответ');
    }
    
    console.log(`Claude: Успешно получен прямой ответ от модели ${model}`);
    
    return {
      success: true,
      response: data.response,
      provider: 'Claude',
      model: model
    };
  } catch (error) {
    console.error(`Claude Error: ${error.message}`);
    
    // В случае ошибки пробуем использовать обычный метод с автопереключением
    try {
      console.log(`Claude: Попытка получить ответ через обычный API после ошибки...`);
      
      // Формируем запрос к Python G4F с провайдером Anthropic
      const fullMessage = {
        message,
        systemPrompt
      };
      
      // Получаем ответ от Python G4F с автопереключением
      const response = await pythonProviderRoutes.callPythonAI(
        JSON.stringify(fullMessage), 
        'Anthropic'
      );
      
      if (!response) {
        throw new Error('Python G4F не вернул ответ');
      }
      
      console.log(`Claude: Успешно получен ответ через обычный API`);
      
      return {
        success: true,
        response,
        provider: 'Claude (fallback)',
        model
      };
    } catch (fallbackError) {
      console.error(`Claude Fallback Error: ${fallbackError.message}`);
      
      return {
        success: false,
        error: `Ошибка Claude: ${error.message}`,
        provider: 'Claude',
        model
      };
    }
  }
}

/**
 * Проверка доступности Claude через Python G4F
 * @returns {Promise<boolean>} Доступен ли Claude
 */
async function checkClaudeAvailability() {
  try {
    console.log(`Проверка доступности Claude через Python G4F...`);
    
    // Пробуем отправить простой запрос
    const testMessage = 'Hello, this is a test message to check if Claude is available.';
    
    // Используем функцию G4F с выбором конкретного провайдера
    const testResponse = await pythonProviderRoutes.callPythonAI(testMessage, 'Anthropic');
    
    // Если получили ответ, то провайдер доступен
    const isAvailable = !!testResponse;
    
    console.log(`Claude ${isAvailable ? 'доступен' : 'недоступен'} через Python G4F`);
    
    return isAvailable;
  } catch (error) {
    console.error(`Ошибка при проверке Claude: ${error.message}`);
    return false;
  }
}

// API маршрут для отправки запроса к Claude
router.post('/chat', async (req, res) => {
  const { message, model, promptType, systemPrompt } = req.body;
  
  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Необходимо указать сообщение'
    });
  }
  
  try {
    const response = await getClaudeResponse(message, {
      model,
      promptType,
      systemPrompt
    });
    
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Ошибка обработки запроса: ${error.message}`
    });
  }
});

// API маршрут для проверки доступности Claude
router.get('/status', async (req, res) => {
  try {
    const isAvailable = await checkClaudeAvailability();
    
    res.json({
      success: true,
      available: isAvailable,
      timestamp: new Date().toISOString(),
      message: isAvailable ? 'Claude доступен' : 'Claude недоступен'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      available: false,
      error: `Ошибка при проверке Claude: ${error.message}`
    });
  }
});

// API маршрут для получения доступных моделей и настроек
router.get('/models', (req, res) => {
  res.json({
    success: true,
    models: CLAUDE_CONFIG.models,
    promptTypes: Object.keys(CLAUDE_CONFIG.systemPrompt)
  });
});

module.exports = router;
module.exports.getClaudeResponse = getClaudeResponse;
module.exports.checkClaudeAvailability = checkClaudeAvailability;