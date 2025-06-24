/**
 * Обработчик команд для конвертации изображений в форматы вышивки через чат
 */

const { convertToEmbroidery, getSupportedFormats, analyzeImageForEmbroidery } = require('./embroidery-converter');
const path = require('path');

/**
 * Определяет, является ли сообщение запросом на конвертацию в формат вышивки
 */
function isEmbroideryRequest(message) {
  const embroideryKeywords = [
    'dst', 'pes', 'jef', 'exp', 'vp3',
    'вышивка', 'вышить', 'шелкография', 
    'конвертировать', 'конвертация',
    'формат вышивки', 'файл для вышивки',
    'embroidery', 'convert', 'stitch'
  ];
  
  const lowerMessage = message.toLowerCase();
  return embroideryKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Определяет целевой формат из сообщения
 */
function extractTargetFormat(message) {
  const lowerMessage = message.toLowerCase();
  
  // Проверяем упоминание конкретных форматов
  if (lowerMessage.includes('dst')) return 'dst';
  if (lowerMessage.includes('pes')) return 'pes';
  if (lowerMessage.includes('jef')) return 'jef';
  if (lowerMessage.includes('exp')) return 'exp';
  if (lowerMessage.includes('vp3')) return 'vp3';
  
  // По умолчанию DST как самый универсальный
  return 'dst';
}

/**
 * Извлекает параметры конвертации из сообщения
 */
function extractConversionOptions(message) {
  const options = {};
  
  // Поиск размеров
  const sizeMatch = message.match(/(\d+)\s*[x×]\s*(\d+)/);
  if (sizeMatch) {
    options.width = parseInt(sizeMatch[1]);
    options.height = parseInt(sizeMatch[2]);
  }
  
  // Поиск количества цветов
  const colorsMatch = message.match(/(\d+)\s*(цвет|color)/i);
  if (colorsMatch) {
    options.colors = parseInt(colorsMatch[1]);
  }
  
  return options;
}

/**
 * Обработка запроса на конвертацию через чат
 */
async function handleEmbroideryRequest(message, imageData = null) {
  try {
    // Если нет изображения, возвращаем инструкции
    if (!imageData) {
      const formats = getSupportedFormats();
      return {
        success: true,
        type: 'instructions',
        message: 'Для конвертации в формат вышивки загрузите изображение и укажите команду.',
        supportedFormats: formats,
        examples: [
          'Конвертировать в DST',
          'Сделать файл для вышивки PES',
          'Преобразовать в формат JEF размером 200x150',
          'Создать вышивку с 10 цветами'
        ]
      };
    }
    
    const targetFormat = extractTargetFormat(message);
    const options = extractConversionOptions(message);
    
    console.log(`Конвертация в формат ${targetFormat} с параметрами:`, options);
    
    // Выполняем конвертацию
    const result = await convertToEmbroidery(
      imageData.buffer,
      imageData.filename || 'uploaded_image.png',
      targetFormat,
      options
    );
    
    if (result.success) {
      return {
        success: true,
        type: 'conversion_complete',
        format: result.format,
        analysis: result.analysis,
        colorPalette: result.colorPalette,
        files: result.files,
        instructions: result.instructions,
        message: `Изображение успешно конвертировано в формат ${result.format.name}`,
        details: {
          colors: result.colorPalette.length,
          size: `${result.analysis.width}x${result.analysis.height}мм`,
          threadsNeeded: result.colorPalette.map(c => c.threadColor.name).join(', ')
        }
      };
    } else {
      return {
        success: false,
        type: 'conversion_error',
        error: result.error,
        supportedFormats: result.supportedFormats
      };
    }
    
  } catch (error) {
    console.error('Ошибка обработки запроса на вышивку:', error);
    return {
      success: false,
      type: 'processing_error',
      error: 'Ошибка при обработке запроса на конвертацию'
    };
  }
}

/**
 * Анализ изображения для вышивки через чат
 */
async function analyzeImageForChat(imageData) {
  try {
    const analysis = await analyzeImageForEmbroidery(imageData.buffer);
    const { extractColorPalette } = require('./embroidery-converter');
    const colorPalette = await extractColorPalette(imageData.buffer, 15);
    
    return {
      success: true,
      type: 'analysis',
      filename: imageData.filename,
      analysis: analysis,
      colorPalette: colorPalette,
      recommendations: {
        recommendedFormat: analysis.recommendedFormat,
        sizeStatus: analysis.width <= 400 && analysis.height <= 400 ? 'Размер подходит для вышивки' : 'Рекомендуется уменьшить размер',
        colorStatus: colorPalette.length <= 15 ? 'Цветовая схема подходит' : 'Слишком много цветов, упростите схему',
        complexity: colorPalette.length <= 5 ? 'Простой дизайн' : colorPalette.length <= 10 ? 'Средний дизайн' : 'Сложный дизайн'
      },
      message: `Анализ завершен. Найдено ${colorPalette.length} цветов. Рекомендуемый формат: ${analysis.recommendedFormat.toUpperCase()}`
    };
    
  } catch (error) {
    console.error('Ошибка анализа изображения:', error);
    return {
      success: false,
      type: 'analysis_error',
      error: 'Ошибка анализа изображения для вышивки'
    };
  }
}

/**
 * Получение справки по форматам вышивки
 */
function getEmbroideryHelp() {
  const formats = getSupportedFormats();
  
  return {
    success: true,
    type: 'help',
    message: 'Доступные форматы для конвертации в вышивку',
    formats: formats,
    commands: [
      'анализ изображения - проверить подходит ли изображение для вышивки',
      'конвертировать в DST - создать файл для большинства машин',
      'сделать PES - для машин Brother',
      'формат JEF - для машин Janome',
      'создать EXP - для машин Melco',
      'размер 200x150 - указать нужный размер',
      '10 цветов - ограничить количество цветов'
    ],
    tips: [
      'Лучше всего подходят простые изображения с четкими контурами',
      'Рекомендуемый размер: не более 400x400 пикселей',
      'Оптимальное количество цветов: 5-15',
      'Формат DST поддерживается большинством машин'
    ]
  };
}

/**
 * Получение размера файла
 */
async function getFileSize(filePath) {
  try {
    const fs = require('fs').promises;
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Автоматическая конвертация изображения по URL в файлы вышивки
 */
async function processEmbroideryGeneration(imageUrl, originalPrompt = '') {
  try {
    const fetch = require('node-fetch');
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Не удалось загрузить изображение: ${response.status}`);
    }
    
    const imageBuffer = await response.buffer();
    const filename = `generated_embroidery_${Date.now()}.png`;
    
    // Конвертируем в несколько популярных форматов
    const formats = ['dst', 'pes', 'jef'];
    const results = [];
    
    for (const format of formats) {
      try {
        const result = await convertToEmbroidery(imageBuffer, filename, format, {
          maxColors: 8,
          stitchDensity: 'medium'
        });
        
        if (result.success && result.files) {
          // Новый формат данных - files уже массив с URL
          results.push(...result.files);
        }
      } catch (formatError) {
        console.error(`Ошибка конвертации в формат ${format}:`, formatError);
      }
    }
    
    if (results.length > 0) {
      // Создаем превью вышивки на ткани с учетом оригинального промпта
      let previewPrompt = 'hand embroidered design, real embroidery on fabric, visible thread texture, traditional needlework, embroidery stitches visible, fabric background, raised thread pattern, authentic embroidery look, textile art, handcrafted embroidery';
      
      if (originalPrompt) {
        // Переводим ключевые слова из русского промпта в английский для превью
        let cleanPrompt = originalPrompt.toLowerCase()
          .replace(/вышивк[а-я]*/g, '')
          .replace(/создай|нарисуй|сгенерируй/g, '')
          .replace(/кота/g, 'cat')
          .replace(/кот/g, 'cat') 
          .replace(/самурая/g, 'samurai')
          .replace(/самурай/g, 'samurai')
          .replace(/дракона/g, 'dragon')
          .replace(/дракон/g, 'dragon')
          .replace(/феникса/g, 'phoenix')
          .replace(/феникс/g, 'phoenix')
          .replace(/цветок/g, 'flower')
          .replace(/цветы/g, 'flowers')
          .replace(/логотип/g, 'logo')
          .replace(/демон/g, 'demon')
          .replace(/робот/g, 'robot')
          .replace(/воин/g, 'warrior')
          .replace(/принцесса/g, 'princess')
          .replace(/катана/g, 'katana')
          .replace(/меч/g, 'sword')
          .replace(/нож/g, 'knife')
          .replace(/тигр/g, 'tiger')
          .replace(/лев/g, 'lion')
          .replace(/волк/g, 'wolf')
          .replace(/орел/g, 'eagle')
          .replace(/сердце/g, 'heart')
          .replace(/звезда/g, 'star')
          .replace(/солнце/g, 'sun')
          .replace(/луна/g, 'moon')
          .replace(/гриб/g, 'mushroom')
          .replace(/грибок/g, 'mushroom')
          .replace(/дерево/g, 'tree')
          .replace(/рыба/g, 'fish')
          .replace(/птица/g, 'bird')
          .replace(/змея/g, 'snake')
          .replace(/медведь/g, 'bear')
          .trim();
        
        if (cleanPrompt) {
          previewPrompt += `, ${cleanPrompt} embroidered on fabric`;
        }
      }
      
      const embroideryPreviewUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(previewPrompt)}?width=512&height=512&nologo=true&enhance=true&model=flux-pro&seed=${Date.now()}&quality=standard`;
      
      return {
        success: true,
        files: results,
        previewUrl: embroideryPreviewUrl,
        recommendations: 'Файлы оптимизированы для вышивки с ограниченной палитрой цветов.'
      };
    } else {
      return {
        success: false,
        error: 'Не удалось создать файлы вышивки'
      };
    }
    
  } catch (error) {
    console.error('Ошибка автоматической конвертации:', error);
    return {
      success: false,
      error: 'Ошибка при обработке изображения для вышивки'
    };
  }
}

module.exports = {
  isEmbroideryRequest,
  handleEmbroideryRequest,
  analyzeImageForChat,
  getEmbroideryHelp,
  extractTargetFormat,
  extractConversionOptions,
  processEmbroideryGeneration
};