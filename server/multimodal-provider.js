/**
 * Мультимодальный провайдер для обработки изображений
 * Использует различные AI-провайдеры с поддержкой изображений (Claude, Gemini)
 */

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Список провайдеров с поддержкой анализа изображений
const MULTIMODAL_PROVIDERS = {
  claude: {
    name: "Anthropic", // Имя провайдера в Python G4F
    description: "Claude (Anthropic) - высококачественная мультимодальная модель с глубоким пониманием изображений",
    priority: 1
  },
  gemini: {
    name: "GeminiPro", // Имя провайдера в Python G4F
    description: "Gemini Pro (Google) - мощная мультимодальная модель с продвинутым анализом изображений",
    priority: 2
  },
  vision: {
    name: "You", // Имя провайдера в Python G4F
    description: "You.com - модель с доступом к актуальным данным и анализом изображений",
    priority: 3
  }
};

// Временное хранилище для кэширования ответов по URL изображений
const responseCache = new Map();
const CACHE_EXPIRATION = 30 * 60 * 1000; // 30 минут

/**
 * Анализ изображения с помощью мультимодальных моделей
 * @param {string} imageUrl - URL изображения для анализа
 * @param {string} prompt - Запрос или инструкция для модели
 * @param {string} provider - Конкретный провайдер (если указан)
 * @returns {Promise<Object>} - Результат анализа
 */
async function analyzeImage(imageUrl, prompt = 'Опишите детально, что вы видите на изображении.', provider = null) {
  // Генерируем ключ кэша
  const cacheKey = `${imageUrl}|${prompt}|${provider || 'auto'}`;
  
  // Проверяем кэш
  if (responseCache.has(cacheKey)) {
    const cachedData = responseCache.get(cacheKey);
    if (Date.now() - cachedData.timestamp < CACHE_EXPIRATION) {
      console.log(`Мультимодальный провайдер: Используем кэшированный ответ для ${imageUrl}`);
      return cachedData.response;
    } else {
      // Удаляем устаревший кэш
      responseCache.delete(cacheKey);
    }
  }
  
  // Определяем провайдера
  let providerToUse = provider;
  if (!providerToUse) {
    // Выбираем по приоритету
    const availableProviders = Object.values(MULTIMODAL_PROVIDERS)
      .sort((a, b) => a.priority - b.priority);
    
    if (availableProviders.length > 0) {
      providerToUse = availableProviders[0].name;
    } else {
      throw new Error("Нет доступных мультимодальных провайдеров");
    }
  }
  
  try {
    console.log(`Мультимодальный провайдер: Отправка изображения ${imageUrl} на анализ провайдеру ${providerToUse}`);
    
    // Отправляем запрос к Python провайдеру для анализа
    const response = await fetch(`http://localhost:5004/python/image_analysis?provider=${providerToUse}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        message: prompt,
        system_prompt: "Вы визуальный аналитик. Анализируйте изображения детально и отвечайте на вопросы о них точно и информативно."
      }),
      timeout: 45000 // 45 секунд для обработки изображений
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Проверяем, получили ли валидный ответ
    if (data.error) {
      throw new Error(data.error);
    }
    
    const result = {
      success: true,
      response: data.response,
      provider: data.provider || providerToUse,
      timestamp: Date.now()
    };
    
    // Кэшируем результат
    responseCache.set(cacheKey, {
      response: result,
      timestamp: Date.now()
    });
    
    console.log(`Мультимодальный провайдер: Успешно получен ответ от ${result.provider}`);
    
    return result;
  } catch (error) {
    console.error(`Мультимодальный провайдер Error: ${error.message}`);
    
    // Пробуем резервный провайдер
    if (provider && Object.values(MULTIMODAL_PROVIDERS).some(p => p.name === provider)) {
      // Если указан конкретный провайдер и он не сработал, пробуем резервный
      const fallbackProvider = Object.values(MULTIMODAL_PROVIDERS)
        .filter(p => p.name !== provider)
        .sort((a, b) => a.priority - b.priority)[0];
      
      if (fallbackProvider) {
        console.log(`Мультимодальный провайдер: Пробуем резервный провайдер ${fallbackProvider.name}`);
        
        try {
          return await analyzeImage(imageUrl, prompt, fallbackProvider.name);
        } catch (fallbackError) {
          console.error(`Мультимодальный провайдер Fallback Error: ${fallbackError.message}`);
        }
      }
    }
    
    // Если все попытки не удались
    return {
      success: false,
      error: `Ошибка при анализе изображения: ${error.message}`,
      provider: provider || 'unknown'
    };
  }
}

// Маршрут для анализа изображения
router.post('/analyze', async (req, res) => {
  const { imageUrl, prompt, provider } = req.body;
  
  if (!imageUrl) {
    return res.status(400).json({
      success: false,
      error: 'Необходимо указать URL изображения'
    });
  }
  
  try {
    const result = await analyzeImage(
      imageUrl, 
      prompt || 'Опишите детально, что вы видите на изображении.', 
      provider
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Ошибка при анализе изображения: ${error.message}`
    });
  }
});

// Маршрут для получения списка доступных провайдеров
router.get('/providers', (req, res) => {
  res.json({
    success: true,
    providers: MULTIMODAL_PROVIDERS
  });
});

// Маршрут для очистки кэша
router.post('/clear-cache', (req, res) => {
  const count = responseCache.size;
  responseCache.clear();
  
  res.json({
    success: true,
    message: `Кэш очищен (${count} записей)`
  });
});

module.exports = router;
module.exports.analyzeImage = analyzeImage;