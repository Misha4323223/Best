/**
 * DeepInfra Provider - интеграция с высококачественными моделями через DeepInfra
 */
const express = require('express');
const router = express.Router();
const pythonProviderRoutes = require('./python_provider_routes');

// Модели DeepInfra
const DEEPINFRA_MODELS = {
  mistral: "mistral-7b-instruct",
  mixtral: "mixtral-8x7b-instruct",
  llama: "llama-2-70b-chat",
  qwen: "qwen-14b-chat",
  codellama: "codellama-34b-instruct"
};

/**
 * Получение ответа от DeepInfra через Python G4F
 * @param {string} message - Запрос пользователя
 * @param {Object} options - Дополнительные параметры
 * @returns {Promise<Object>} - Ответ от DeepInfra
 */
async function getDeepInfraResponse(message, options = {}) {
  const model = options.model || "mixtral";
  const modelName = DEEPINFRA_MODELS[model] || DEEPINFRA_MODELS.mixtral;
  const promptType = options.promptType || 'general';
  
  // Выбираем системный промпт в зависимости от типа запроса
  let systemPrompt = "Вы полезный AI-ассистент. Отвечайте точно и информативно.";
  
  if (promptType === 'technical') {
    systemPrompt = "Вы технический эксперт. Предоставляйте детальные технические ответы с примерами кода, где это уместно.";
  } else if (promptType === 'creative') {
    systemPrompt = "Вы творческий ассистент. Помогайте с оригинальными идеями и креативными решениями.";
  }
  
  try {
    console.log(`DeepInfra: Запрос к модели ${modelName}...`);
    
    // Подготавливаем запрос с нужными параметрами
    const fullMessage = {
      message: message,
      systemPrompt: systemPrompt
    };
    
    // Используем прямой вызов к конкретному провайдеру DeepInfra без автопереключения
    // Используем /python/direct вместо /python/chat для указания конкретного провайдера
    
    // Определяем нужный провайдер, используя точное имя из списка провайдеров Python G4F
    const providerToUse = model === 'codellama' ? 'DeepInfra' :
                          model === 'mixtral' ? 'DeepInfra' :
                          model === 'llama' ? 'DeepInfra' :
                          model === 'qwen' ? 'DeepInfra' : 'DeepInfra';
    
    console.log(`DeepInfra: Используем провайдер ${providerToUse} с прямым вызовом без автоматического переключения`);
    
    // Создаем HTTP-запрос к Python G4F напрямую, указывая force_provider=true
    const http = require('http');
    const requestData = JSON.stringify({
      message: message,
      provider: providerToUse,
      systemPrompt: systemPrompt,
      force_provider: true, // Принудительное использование указанного провайдера
      timeout: 25000
    });
    
    // Отправляем запрос напрямую к Python API с указанием принудительного использования провайдера
    const responseData = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5004,
        path: '/python/direct',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestData)
        }
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (err) {
            reject(new Error(`Ошибка при парсинге ответа: ${err.message}`));
          }
        });
      });
      
      req.on('error', (err) => {
        reject(err);
      });
      
      req.write(requestData);
      req.end();
    });
    
    // Проверяем ответ на наличие ошибок
    if (responseData.error || (responseData.response && responseData.response.includes("Ошибка провайдера DeepInfra"))) {
      console.log(`DeepInfra недоступен или требует API ключ. Переключаемся на резервный провайдер.`);
      throw new Error(responseData.error || responseData.response);
    }
    
    // Извлекаем ответ из данных
    const response = responseData.response;
    
    if (!response) {
      throw new Error('Python G4F не вернул ответ от DeepInfra');
    }
    
    console.log(`DeepInfra: Успешно получен ответ от модели ${modelName}`);
    
    return {
      success: true,
      response: response,
      provider: 'DeepInfra',
      model: modelName
    };
  } catch (error) {
    console.error(`DeepInfra Error: ${error.message}`);
    
    // Пробуем получить ответ через общий API с автоматическим переключением
    try {
      console.log(`DeepInfra: Попытка получить ответ через общий API...`);
      
      // Отправляем запрос через основной интерфейс с автоматическим переключением
      const response = await pythonProviderRoutes.callPythonAI(message);
      
      if (!response) {
        throw new Error('Python G4F не вернул ответ через общий API');
      }
      
      console.log(`DeepInfra: Успешно получен ответ через общий API`);
      
      return {
        success: true,
        response: response,
        provider: 'AI-Fallback',
        model: 'auto-selected'
      };
    } catch (fallbackError) {
      console.error(`DeepInfra Fallback Error: ${fallbackError.message}`);
      
      return {
        success: false,
        error: `Ошибка DeepInfra: ${error.message}`,
        provider: 'DeepInfra',
        model: modelName
      };
    }
  }
}

/**
 * Проверка доступности DeepInfra
 * @returns {Promise<boolean>} Доступен ли DeepInfra
 */
async function checkDeepInfraAvailability() {
  try {
    const testResult = await getDeepInfraResponse('Привет, это тестовый запрос.');
    return testResult.success;
  } catch (error) {
    console.error(`Ошибка при проверке DeepInfra: ${error.message}`);
    return false;
  }
}

// Маршрут для проверки статуса провайдера
router.get('/status', async (req, res) => {
  try {
    const isAvailable = await checkDeepInfraAvailability();
    
    res.json({
      success: true,
      available: isAvailable,
      timestamp: new Date().toISOString(),
      message: isAvailable ? 'DeepInfra доступен' : 'DeepInfra недоступен'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      available: false,
      error: `Ошибка при проверке DeepInfra: ${error.message}`
    });
  }
});

// Маршрут для получения доступных моделей
router.get('/models', (req, res) => {
  res.json({
    success: true,
    models: DEEPINFRA_MODELS,
    defaultModel: 'mixtral'
  });
});

// API маршрут для отправки запроса к DeepInfra
router.post('/chat', async (req, res) => {
  const { message, model, promptType } = req.body;
  
  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Необходимо указать сообщение'
    });
  }
  
  try {
    const response = await getDeepInfraResponse(message, {
      model,
      promptType
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
module.exports.getDeepInfraResponse = getDeepInfraResponse;
module.exports.checkDeepInfraAvailability = checkDeepInfraAvailability;