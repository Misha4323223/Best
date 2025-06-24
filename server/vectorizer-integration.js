/**
 * Интеграция векторизатора в основной чат
 * Обрабатывает команды векторизации через текстовые запросы
 */

import fetch from 'node-fetch';

const VECTORIZER_BASE_URL = 'http://localhost:5006/api/vectorizer';

/**
 * Проверяет доступность векторизатора
 */
async function checkVectorizerHealth() {
  try {
    const response = await fetch('http://localhost:5006/health');
    return response.ok;
  } catch (error) {
    console.error('Векторизатор недоступен:', error.message);
    return false;
  }
}

/**
 * Определяет, является ли сообщение командой векторизации
 */
function isVectorizationRequest(message) {
  const vectorizeKeywords = [
    'векторизуй', 'векторизация', 'в вектор', 'в svg', 'в eps', 'в pdf',
    'конвертируй в svg', 'сделай векторным', 'преобразуй в вектор',
    'нужен вектор', 'векторизатор 5006', 'вектор 5006',
    'vectorize', 'convert to svg', 'make vector', 'to vector'
  ];
  
  const lowerMessage = message.toLowerCase();
  return vectorizeKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Извлекает URL изображения из сообщения или контекста
 */
function extractImageUrl(message, context = {}) {
  // Поиск URL в сообщении
  const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|bmp|webp))/gi;
  const match = message.match(urlRegex);
  
  if (match) {
    return match[0];
  }
  
  // Проверка контекста на наличие последнего сгенерированного изображения
  if (context.lastGeneratedImage) {
    return context.lastGeneratedImage;
  }
  
  return null;
}

/**
 * Определяет параметры векторизации из текстового запроса
 */
function parseVectorizationParams(message) {
  const params = {
    format: 'svg', // по умолчанию
    quality: 'standard',
    colors: 'auto',
    complexity: 'medium'
  };
  
  const lowerMessage = message.toLowerCase();
  
  // Определение формата
  if (lowerMessage.includes('eps')) params.format = 'eps';
  if (lowerMessage.includes('pdf')) params.format = 'pdf';
  if (lowerMessage.includes('ai')) params.format = 'ai';
  
  // Определение качества
  if (lowerMessage.includes('высок') || lowerMessage.includes('детальн') || 
      lowerMessage.includes('професс') || lowerMessage.includes('hd')) {
    params.quality = 'high';
  }
  if (lowerMessage.includes('быстр') || lowerMessage.includes('простой')) {
    params.quality = 'fast';
  }
  
  // Определение количества цветов
  if (lowerMessage.includes('мало цвет') || lowerMessage.includes('упрост')) {
    params.colors = 'limited';
  }
  if (lowerMessage.includes('много цвет') || lowerMessage.includes('полн')) {
    params.colors = 'full';
  }
  
  return params;
}

/**
 * Выполняет векторизацию изображения
 */
async function processVectorization(imageUrl, params, userMessage) {
  try {
    // Проверяем доступность векторизатора
    const isHealthy = await checkVectorizerHealth();
    if (!isHealthy) {
      return {
        success: false,
        error: 'Векторизатор временно недоступен. Попробуйте позже.'
      };
    }
    
    // Выбираем подходящий endpoint в зависимости от параметров
    let endpoint = '/convert';
    if (params.quality === 'high') {
      endpoint = '/professional';
    }
    
    const requestBody = {
      imageUrl: imageUrl,
      outputFormat: params.format,
      quality: params.quality,
      colorMode: params.colors,
      complexity: params.complexity,
      userPrompt: userMessage
    };
    
    console.log(`🎨 Запуск векторизации: ${imageUrl} -> ${params.format}`);
    
    const response = await fetch(`${VECTORIZER_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка векторизации: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      data: result,
      vectorUrl: result.vectorUrl || result.outputUrl,
      format: params.format,
      processingTime: result.processingTime,
      fileSize: result.fileSize
    };
    
  } catch (error) {
    console.error('Ошибка при векторизации:', error);
    return {
      success: false,
      error: `Ошибка векторизации: ${error.message}`
    };
  }
}

/**
 * Генерирует ответ пользователю после векторизации
 */
function generateVectorizationResponse(result, originalMessage) {
  if (!result.success) {
    return {
      text: `❌ ${result.error}`,
      hasImage: false
    };
  }
  
  const formatName = {
    'svg': 'SVG (векторная графика)',
    'eps': 'EPS (PostScript)',
    'pdf': 'PDF (векторный)',
    'ai': 'Adobe Illustrator'
  }[result.format] || result.format.toUpperCase();
  
  let responseText = `✅ Векторизация завершена!\n\n`;
  responseText += `📄 Формат: ${formatName}\n`;
  
  if (result.processingTime) {
    responseText += `⏱️ Время обработки: ${result.processingTime}мс\n`;
  }
  
  if (result.fileSize) {
    responseText += `📦 Размер файла: ${Math.round(result.fileSize / 1024)}KB\n`;
  }
  
  responseText += `\n🔗 Векторное изображение готово для скачивания`;
  
  return {
    text: responseText,
    hasImage: true,
    imageUrl: result.vectorUrl,
    downloadUrl: result.vectorUrl,
    format: result.format
  };
}

/**
 * Основная функция обработки запроса векторизации в чате
 */
async function handleVectorizationRequest(message, context = {}) {
  try {
    // Извлекаем URL изображения
    const imageUrl = extractImageUrl(message, context);
    
    if (!imageUrl) {
      return {
        success: false,
        response: {
          text: '❌ Для векторизации нужно указать изображение. Прикрепите файл или укажите URL изображения.',
          hasImage: false
        }
      };
    }
    
    // Определяем параметры векторизации
    const params = parseVectorizationParams(message);
    
    // Выполняем векторизацию
    const result = await processVectorization(imageUrl, params, message);
    
    // Генерируем ответ
    const response = generateVectorizationResponse(result, message);
    
    return {
      success: result.success,
      response: response,
      vectorUrl: result.vectorUrl,
      processingData: result.data
    };
    
  } catch (error) {
    console.error('Ошибка обработки запроса векторизации:', error);
    return {
      success: false,
      response: {
        text: `❌ Ошибка обработки запроса: ${error.message}`,
        hasImage: false
      }
    };
  }
}

export {
  isVectorizationRequest,
  handleVectorizationRequest,
  checkVectorizerHealth,
  extractImageUrl,
  parseVectorizationParams
};