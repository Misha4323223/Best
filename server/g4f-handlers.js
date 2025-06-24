// Обработчики API для G4F
const express = require('express');
const router = express.Router();
const g4fProvider = require('./g4f-provider');

// Набор демо-ответов для BOOOMERANGS для случаев, когда провайдеры недоступны
const DEMO_RESPONSES = [
  {
    prompt: "привет",
    response: "Привет! Я BOOOMERANGS AI ассистент. Чем могу помочь вам сегодня?"
  },
  {
    prompt: "расскажи о booomerangs",
    response: "BOOOMERANGS - это инновационный инструмент для работы с искусственным интеллектом, который объединяет возможности текстовых AI-моделей и генерации изображений. С BOOOMERANGS вы можете бесплатно использовать функции, аналогичные ChatGPT и DALL-E, без необходимости платить за подписки или покупать API ключи. Наше приложение работает напрямую в браузере и оптимизировано для использования на мобильных устройствах."
  },
  {
    prompt: "что ты умеешь",
    response: "Я умею многое! Вот мои основные возможности:\n\n1. Отвечать на ваши вопросы с использованием современных AI-моделей\n2. Генерировать текстовые описания и контент\n3. Помогать с решением проблем\n4. Давать рекомендации\n\nКроме того, BOOOMERANGS приложение позволяет:\n• Создавать изображения по текстовому описанию\n• Конвертировать изображения в SVG формат\n• Использовать различные AI-провайдеры для получения разнообразных ответов"
  },
  {
    prompt: "как генерировать изображения",
    response: "Для генерации изображений в BOOOMERANGS:\n\n1. Перейдите на вкладку 'Генератор Изображений'\n2. Введите текстовое описание изображения, которое хотите создать\n3. Нажмите кнопку 'Сгенерировать изображение'\n4. Дождитесь результата и используйте полученное изображение\n5. При желании конвертируйте его в SVG формат, нажав соответствующую кнопку\n\nСоветы для лучших результатов:\n• Давайте подробные описания\n• Указывайте стиль (акварель, фотореализм, аниме и т.д.)\n• Используйте слова, описывающие настроение и атмосферу"
  },
  {
    prompt: "о технологиях",
    response: "BOOOMERANGS использует различные бесплатные AI-провайдеры, работающие через JavaScript и Python интерфейсы. Для генерации изображений применяются свободные API, а для получения текстов - различные LLM модели, доступные без API ключей. Наша система автоматически переключается между провайдерами для обеспечения стабильной работы."
  }
];

// Функция для получения наиболее подходящего демо-ответа
function findDemoResponse(message) {
  // Приводим запрос к нижнему регистру для лучшего сравнения
  const normalizedMessage = message.toLowerCase();
  
  // Проверяем наличие ключевых слов в запросе
  for (const demo of DEMO_RESPONSES) {
    if (normalizedMessage.includes(demo.prompt)) {
      return demo.response;
    }
  }
  
  // Возвращаем базовый ответ, если ничего не найдено
  return "Я BOOOMERANGS AI ассистент. К сожалению, внешние AI-провайдеры сейчас недоступны, но я все равно могу помочь с базовой информацией о BOOOMERANGS и подсказать, как использовать генератор изображений!";
}

// API endpoint для чата с моделями G4F
router.post('/chat', async (req, res) => {
  try {
    const { 
      message, 
      messages = null,
      provider = null, // Если null, будет перебор по приоритету
      model = null, 
      temperature = 0.7, 
      maxTokens = 800, 
      max_retries = 3 
    } = req.body;
    
    // Проверяем, что есть хотя бы одно сообщение
    if (!message && (!messages || messages.length === 0)) {
      return res.status(400).json({ 
        error: 'Отсутствует сообщение',
        response: 'Пожалуйста, укажите сообщение или историю сообщений для обработки'
      });
    }
    
    // Извлекаем текст последнего пользовательского сообщения для логирования и демо-режима
    const userMessageText = messages ? 
      messages.filter(m => m.role === 'user').pop()?.content || message : 
      message;
    
    console.log(`Запрос к G4F: провайдер=${provider || 'auto'}, сообщение="${userMessageText.substring(0, 50)}..."`);
    
    // Пробуем сначала получить ответ от G4F провайдеров
    try {
      // Подготовка формата сообщений для API
      let chatMessages;
      if (messages) {
        // Если передан массив сообщений, используем его
        chatMessages = messages;
      } else {
        // Иначе создаем новое сообщение
        chatMessages = [{ role: 'user', content: message }];
      }
      
      // Если указан конкретный провайдер, проверяем модель
      let selectedModel = model;
      if (provider && !model) {
        // Если модель не указана, получаем модель по умолчанию для данного провайдера
        selectedModel = g4fProvider.getModelForProvider(provider, model);
        console.log(`Для провайдера ${provider} выбрана модель: ${selectedModel}`);
      }
      
      // Выполняем запрос к провайдеру(ам) с уменьшенным timeout
      const response = await Promise.race([
        g4fProvider.getResponse(message, {
          provider,
          model: selectedModel,
          temperature,
          maxTokens,
          maxRetries: max_retries,
          messages: chatMessages
        }),
        // Если провайдеры не отвечают в течение 5 секунд, переходим к демо-режиму
        new Promise((_, reject) => setTimeout(() => 
          reject(new Error('Timeout: провайдеры не отвечают')), 5000))
      ]);
      
      // Если успешно получили ответ от провайдера
      console.log(`Успешный ответ от провайдера: ${response.provider} (модель: ${response.model})`);
      return res.json(response);
      
    } catch (error) {
      console.log('Не удалось получить ответ от провайдеров, переключаемся на демо-режим:', error.message);
      
      // Если не удалось получить ответ от провайдеров, используем демо-ответы
      const demoResponse = findDemoResponse(userMessageText);
      
      return res.json({
        response: demoResponse,
        provider: 'booomerangs-demo',
        model: 'demo-mode',
        message: 'Используется демо-режим из-за недоступности внешних провайдеров'
      });
    }
    
  } catch (error) {
    console.error('Ошибка G4F API:', error);
    
    // Используем демо-ответы в случае ошибки
    let demoResponse;
    try {
      // Извлекаем текст сообщения пользователя
      const userMessage = message || 
        (messages && messages.length > 0 ? 
          messages.filter(m => m.role === 'user').pop()?.content : "");
      
      demoResponse = userMessage ? findDemoResponse(userMessage) : 
        "Извините, произошла ошибка, но я все равно готов помочь!";
    } catch (e) {
      demoResponse = "Извините, произошла ошибка при обработке вашего запроса. Попробуйте еще раз или попробуйте другой вопрос.";
    }
    
    // Возвращаем демо-ответ клиенту
    return res.json({
      response: demoResponse,
      provider: 'booomerangs-demo',
      model: 'demo-mode',
      message: 'Используется демо-режим из-за внутренней ошибки'
    });
  }
});

// Получение списка доступных провайдеров
router.get('/providers', async (req, res) => {
  try {
    const providers = g4fProvider.getProviders();
    const models = g4fProvider.PROVIDER_MODELS;
    
    // Получаем информацию о доступности каждого провайдера
    const availabilityPromises = providers.map(async (provider) => {
      const available = await g4fProvider.checkProviderAvailability(provider);
      return {
        name: provider,
        available,
        model: models[provider] || null
      };
    });
    
    const providersInfo = await Promise.all(availabilityPromises);
    
    return res.json({
      providers: providersInfo,
      default: null // Автоматический выбор провайдера
    });
  } catch (error) {
    console.error('Ошибка при получении списка провайдеров:', error);
    return res.status(500).json({
      error: 'Не удалось получить список провайдеров',
      message: error.message
    });
  }
});

// API для проверки доступности конкретного провайдера
router.get('/check/:providerName', async (req, res) => {
  try {
    const { providerName } = req.params;
    
    if (!providerName) {
      return res.status(400).json({ error: 'Укажите имя провайдера' });
    }
    
    const available = await g4fProvider.checkProviderAvailability(providerName);
    
    return res.json({
      provider: providerName,
      available
    });
  } catch (error) {
    console.error(`Ошибка при проверке провайдера ${req.params.providerName}:`, error);
    return res.status(500).json({
      error: 'Не удалось проверить доступность провайдера',
      message: error.message
    });
  }
});

// API для простого тестирования
router.get('/test', (req, res) => {
  // Получаем только бесплатные провайдеры, не требующие API ключей
  const allProviders = g4fProvider.getProviders();
  const keyRequiredProviders = g4fProvider.KEY_REQUIRED_PROVIDERS;
  
  // Фильтруем провайдеры, исключая требующие API ключей
  const freeProviders = allProviders.filter(
    provider => !keyRequiredProviders.includes(provider)
  );
  
  res.json({
    status: 'ok',
    message: 'G4F API работает',
    availableProviders: freeProviders,
    note: 'Показаны только бесплатные провайдеры, не требующие API ключей'
  });
});

module.exports = router;