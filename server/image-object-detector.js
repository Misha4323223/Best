/**
 * Обработчик изображений с собственным распознаванием объектов
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const advancedDetector = require('./advanced-object-detector');

/**
 * Анализ изображения по локальному пути
 */
async function analyzeLocalImage(imagePath, prompt = 'Что изображено на картинке?') {
  try {
    console.log(`🔍 Анализируем изображение: ${imagePath}`);
    
    // Проверяем существование файла (сначала как есть, потом в папке images)
    let fullPath = path.join(process.cwd(), imagePath);
    if (!fs.existsSync(fullPath)) {
      // Пробуем в папке images
      fullPath = path.join(process.cwd(), 'uploads', 'images', path.basename(imagePath));
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Файл изображения не найден: ${imagePath}`);
      }
    }
    
    // Читаем изображение
    const imageBuffer = fs.readFileSync(fullPath);
    const filename = path.basename(imagePath);
    
    console.log(`📊 Размер файла: ${Math.round(imageBuffer.length / 1024)}KB`);
    
    // Запускаем улучшенный умный анализатор
    const smartAnalyzer = require('./smart-vision-analyzer');
    const detectionResult = await smartAnalyzer.analyzeImageContent(imageBuffer, filename);
    
    if (detectionResult.success) {
      // Форматируем ответ для пользователя
      const response = formatAnalysisResponse(detectionResult, filename, prompt);
      
      return {
        success: true,
        response,
        provider: 'Advanced Object Detection',
        model: `AI Vision (${Math.round(detectionResult.confidence * 100)}% точность)`,
        details: detectionResult.details
      };
    } else {
      throw new Error(detectionResult.error);
    }
    
  } catch (error) {
    console.error(`❌ Ошибка анализа изображения: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Форматирование ответа для пользователя
 */
function formatAnalysisResponse(detectionResult, filename, userPrompt) {
  let response = '🖼️ **AI Анализ изображения:**\n\n';
  
  // Информация о файле
  response += `📁 **Файл:** ${filename}\n`;
  response += `📏 **Размер:** ${Math.round(detectionResult.details?.fileSize / 1024) || 'неизвестен'}KB\n`;
  response += `🎨 **Формат:** JPEG фотография\n\n`;
  
  // Основное описание
  response += '🤖 **Описание содержимого:**\n';
  response += `${detectionResult.description}\n\n`;
  
  // Обнаруженные объекты
  if (detectionResult.recognizedObjects && detectionResult.recognizedObjects.length > 0) {
    response += '🎯 **Обнаруженные объекты:**\n';
    detectionResult.recognizedObjects.forEach(obj => {
      const confidence = Math.round(obj.confidence * 100);
      response += `• ${obj.name} - ${obj.description} (${confidence}% уверенность)\n`;
    });
    response += '\n';
  }
  
  // Детали анализа
  if (detectionResult.details) {
    response += '🎨 **Анализ изображения:**\n';
    if (detectionResult.details.dominantColors?.length > 0) {
      response += `• Основные цвета: ${detectionResult.details.dominantColors.join(', ')}\n`;
    }
    if (detectionResult.details.sceneType) {
      response += `• Тип сцены: ${detectionResult.details.sceneType}\n`;
    }
    if (detectionResult.details.lighting) {
      response += `• Освещение: ${detectionResult.details.lighting}\n`;
    }
    if (detectionResult.details.composition) {
      response += `• Композиция: ${detectionResult.details.composition}\n`;
    }
    response += '\n';
  }
  
  // Информация о сервисе
  response += `🔧 **Сервис:** ${detectionResult.service}\n`;
  response += `📊 **Точность:** ${Math.round(detectionResult.confidence * 100)}%\n\n`;
  
  // Пользовательский запрос
  response += `\n💭 **Ваш запрос:** ${userPrompt}\n\n`;
  response += '*🚀 Анализ выполнен с помощью собственных алгоритмов распознавания!*';
  
  return response;
}

/**
 * API маршрут для анализа изображений
 */
router.post('/analyze', async (req, res) => {
  const { imageUrl, prompt } = req.body;
  
  if (!imageUrl) {
    return res.status(400).json({
      success: false,
      error: 'URL изображения не предоставлен'
    });
  }
  
  try {
    const result = await analyzeLocalImage(imageUrl, prompt);
    res.json(result);
  } catch (error) {
    console.error(`Ошибка в API анализа изображений: ${error.message}`);
    res.status(500).json({
      success: false,
      error: `Ошибка анализа: ${error.message}`
    });
  }
});

module.exports = {
  router,
  analyzeLocalImage
};