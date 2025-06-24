/**
 * Пайплайн для генерации изображений с последующей конвертацией в форматы вышивки
 * Объединяет AI генератор изображений и конвертер в единый процесс
 */

const aiImageGenerator = require('./ai-image-generator');
const { convertToEmbroidery, analyzeImageForEmbroidery } = require('./embroidery-converter');
const { analyzeImageForEmbroidery: aiAnalyzeImage, applyAIOptimizations, generateOptimizationReport } = require('./ai-embroidery-optimizer');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');

/**
 * Определяет, является ли запрос генерацией изображения для вышивки
 */
function isEmbroideryGenerationRequest(message) {
  const embroideryGenKeywords = [
    'создай.*вышивк', 'сгенерируй.*вышивк', 'нарисуй.*вышивк',
    'создай.*dst', 'сгенерируй.*dst', 'нарисуй.*dst',
    'логотип.*вышивк', 'дизайн.*вышивк', 'паттерн.*вышивк',
    'create.*embroidery', 'generate.*embroidery', 'design.*embroidery',
    'embroidery.*design', 'вышивка.*дизайн', 'дизайн.*для.*вышивки'
  ];
  
  const lowerMessage = message.toLowerCase();
  return embroideryGenKeywords.some(pattern => {
    const regex = new RegExp(pattern, 'i');
    return regex.test(lowerMessage);
  });
}

/**
 * Извлекает описание дизайна из запроса
 */
function extractDesignDescription(message) {
  // Удаляем ключевые слова команд и оставляем описание
  let description = message
    .replace(/создай.*?(вышивк[уи]|dst|pes|jef)/gi, '')
    .replace(/сгенерируй.*?(вышивк[уи]|dst|pes|jef)/gi, '')
    .replace(/нарисуй.*?(вышивк[уи]|dst|pes|jef)/gi, '')
    .replace(/дизайн.*?(для.*)?вышивк[уи]/gi, '')
    .replace(/конвертируй.*в.*dst/gi, '')
    .trim();
  
  // Если описание слишком короткое, используем исходное сообщение
  if (description.length < 10) {
    description = message;
  }
  
  return description;
}

/**
 * Оптимизирует промпт для создания изображений, подходящих для вышивки
 */
function optimizePromptForEmbroidery(description) {
  // Проверяем, не содержит ли уже промпт ключевые слова вышивки
  if (description.includes('embroidery style') || description.includes('embroidered')) {
    return description; // Уже оптимизирован
  }
  
  // Добавляем ключевые слова для простого дизайна вышивки
  const embroideryOptimizations = [
    'line art',
    'coloring book style',
    'black outline only',
    'white background',
    'very simple shapes',
    'no shading',
    'no details',
    'bold thick lines',
    'embroidery pattern'
  ];
  
  // Убираем элементы, которые усложняют дизайн
  const removeElements = [
    'photorealistic', 'realistic', 'detailed',
    'texture', 'shadows', 'lighting effects',
    'complex details', 'fine details', 'gradients'
  ];
  
  let optimizedPrompt = description;
  
  // Удаляем нежелательные элементы
  removeElements.forEach(element => {
    const regex = new RegExp(element, 'gi');
    optimizedPrompt = optimizedPrompt.replace(regex, '');
  });
  
  // Добавляем оптимизации для реалистичной вышивки
  optimizedPrompt += ', ' + embroideryOptimizations.join(', ');
  
  return optimizedPrompt.trim();
}

/**
 * Определяет целевой формат из запроса или использует оптимальный
 */
function determineTargetFormat(message, imageAnalysis = null) {
  const lowerMessage = message.toLowerCase();
  
  // Проверяем явное указание формата
  if (lowerMessage.includes('dst')) return 'dst';
  if (lowerMessage.includes('pes')) return 'pes';
  if (lowerMessage.includes('jef')) return 'jef';
  if (lowerMessage.includes('exp')) return 'exp';
  if (lowerMessage.includes('vp3')) return 'vp3';
  
  // Если анализ доступен, используем рекомендуемый формат
  if (imageAnalysis && imageAnalysis.recommendedFormat) {
    return imageAnalysis.recommendedFormat;
  }
  
  // По умолчанию DST - самый универсальный
  return 'dst';
}

/**
 * Основная функция пайплайна генерации и конвертации
 */
async function generateAndConvertToEmbroidery(message, options = {}) {
  try {
    console.log('🎨 Начинаем пайплайн генерации изображения для вышивки');
    
    // Извлекаем описание дизайна
    const designDescription = extractDesignDescription(message);
    console.log('📝 Описание дизайна:', designDescription);
    
    // Оптимизируем промпт для вышивки
    const optimizedPrompt = optimizePromptForEmbroidery(designDescription);
    console.log('✨ Оптимизированный промпт:', optimizedPrompt);
    
    // Генерируем изображение
    const imageResult = await aiImageGenerator.generateImage(
      optimizedPrompt, 
      'artistic', // Стиль подходящий для вышивки
      null, // Без предыдущего изображения
      options.sessionId,
      options.userId
    );
    
    if (!imageResult.success) {
      return {
        success: false,
        error: 'Не удалось сгенерировать изображение: ' + imageResult.error,
        step: 'image_generation'
      };
    }
    
    console.log('🖼️ Изображение сгенерировано:', imageResult.imageUrl);
    
    // Скачиваем сгенерированное изображение
    let imageBuffer;
    if (imageResult.imageUrl.startsWith('http')) {
      // Если это URL, скачиваем изображение
      console.log('📥 Скачиваем изображение по URL:', imageResult.imageUrl);
      
      // Пробуем скачать изображение с повторными попытками
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          imageBuffer = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Таймаут скачивания изображения'));
            }, 60000); // 60 секунд таймаут для генерации
            
            https.get(imageResult.imageUrl, (response) => {
              clearTimeout(timeout);
              
              if (response.statusCode !== 200) {
                reject(new Error(`Сервис генерации изображений временно недоступен (код: ${response.statusCode})`));
                return;
              }
              
              const chunks = [];
              response.on('data', (chunk) => chunks.push(chunk));
              response.on('end', () => resolve(Buffer.concat(chunks)));
              response.on('error', reject);
            }).on('error', (error) => {
              clearTimeout(timeout);
              reject(error);
            });
          });
          break; // Успешно скачали, выходим из цикла
        } catch (error) {
          attempts++;
          console.log(`❌ Попытка ${attempts} не удалась: ${error.message}`);
          
          if (attempts >= maxAttempts) {
            throw new Error(`Не удалось скачать изображение после ${maxAttempts} попыток. Сервис генерации изображений временно недоступен. Попробуйте позже.`);
          }
          
          // Ждем перед следующей попыткой (увеличиваем время)
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    } else {
      // Если это локальный путь
      const imagePath = imageResult.imageUrl.replace('/output/', '');
      const fullImagePath = path.join(process.cwd(), 'output', imagePath);
      imageBuffer = await fs.readFile(fullImagePath);
    }
    
    // Проводим AI-анализ изображения для оптимизации
    console.log('🤖 Запускаем AI-анализ для оптимизации...');
    const aiAnalysis = await aiAnalyzeImage(imageBuffer, designDescription);
    
    // Применяем AI-оптимизации к изображению
    let optimizedImageBuffer = imageBuffer;
    if (aiAnalysis) {
      console.log('🎨 Применяем AI-оптимизации...');
      optimizedImageBuffer = await applyAIOptimizations(imageBuffer, aiAnalysis);
    }
    
    // Анализируем изображение для вышивки (старый анализ)
    const analysis = await analyzeImageForEmbroidery(optimizedImageBuffer);
    console.log('🔍 Анализ для вышивки:', analysis);
    
    // Определяем целевой формат
    const targetFormat = determineTargetFormat(message, analysis);
    console.log('🎯 Целевой формат:', targetFormat);
    
    // Конвертируем в формат вышивки (используем оптимизированное изображение)
    const conversionResult = await convertToEmbroidery(
      optimizedImageBuffer,
      `generated_embroidery_${Date.now()}.png`,
      targetFormat,
      options.conversionOptions || {}
    );
    
    if (!conversionResult.success) {
      return {
        success: false,
        error: 'Не удалось конвертировать в формат вышивки: ' + conversionResult.error,
        step: 'embroidery_conversion',
        generatedImage: imageResult.imageUrl
      };
    }
    
    console.log('🧵 Конвертация в формат вышивки завершена');
    
    // Генерируем AI-отчет об оптимизации
    const aiOptimizationReport = aiAnalysis ? generateOptimizationReport(aiAnalysis, designDescription) : '';
    
    return {
      success: true,
      step: 'complete',
      originalPrompt: designDescription,
      optimizedPrompt: optimizedPrompt,
      generatedImage: imageResult.imageUrl,
      embroideryFormat: conversionResult.format,
      analysis: conversionResult.analysis,
      colorPalette: conversionResult.colorPalette,
      files: conversionResult.files,
      instructions: conversionResult.instructions,
      aiOptimizationReport: aiOptimizationReport,
      message: `Дизайн "${designDescription}" создан и готов для вышивки в формате ${conversionResult.format.name}`,
      details: {
        colors: conversionResult.colorPalette.length,
        size: `${conversionResult.analysis.width}x${conversionResult.analysis.height}мм`,
        threadsNeeded: conversionResult.colorPalette.map(c => c.threadColor.name).join(', '),
        machineFormat: conversionResult.format.name
      }
    };
    
  } catch (error) {
    console.error('❌ Ошибка в пайплайне генерации для вышивки:', error);
    return {
      success: false,
      error: 'Ошибка в процессе создания дизайна для вышивки: ' + error.message,
      step: 'pipeline_error'
    };
  }
}

/**
 * Проверяет доступность генератора изображений
 */
async function checkImageGeneratorAvailability() {
  try {
    // Простая проверка - пытаемся создать тестовое изображение
    const testResult = await aiImageGenerator.generateImage('test', 'artistic');
    return testResult.success;
  } catch (error) {
    console.error('Генератор изображений недоступен:', error);
    return false;
  }
}

/**
 * Получение примеров промптов для вышивки
 */
function getEmbroideryPromptExamples() {
  return {
    logos: [
      'создай логотип компании с буквами ABC для вышивки',
      'сгенерируй простой логотип кота для вышивки dst',
      'нарисуй логотип кафе с чашкой кофе для вышивки'
    ],
    patterns: [
      'создай цветочный паттерн для вышивки',
      'сгенерируй геометрический узор для вышивки pes',
      'нарисуй простой орнамент для вышивки'
    ],
    characters: [
      'создай мультяшного медведя для детской вышивки',
      'сгенерируй простого кота для вышивки jef',
      'нарисуй собаку в мультяшном стиле для вышивки'
    ],
    text: [
      'создай надпись "МАМА" красивым шрифтом для вышивки',
      'сгенерируй текст "LOVE" для вышивки dst',
      'нарисуй имя "Анна" декоративным шрифтом для вышивки'
    ]
  };
}

module.exports = {
  isEmbroideryGenerationRequest,
  generateAndConvertToEmbroidery,
  checkImageGeneratorAvailability,
  getEmbroideryPromptExamples,
  extractDesignDescription,
  optimizePromptForEmbroidery,
  determineTargetFormat
};