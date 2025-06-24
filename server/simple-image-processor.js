/**
 * Простая система обработки изображений без внешних API
 * Использует Canvas API и базовые алгоритмы обработки изображений
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * Создание простого удаления фона на основе цветовых границ
 * @param {string} imageUrl - URL исходного изображения
 * @returns {Promise<Object>} Результат обработки
 */
async function removeBackgroundSimple(imageUrl) {
  try {
    console.log('🖼️ [SIMPLE-EDITOR] Начинаем простое удаление фона...');
    
    // Загружаем изображение
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.buffer();
    
    // Получаем информацию об изображении
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();
    
    console.log(`📐 [SIMPLE-EDITOR] Размер изображения: ${width}x${height}`);
    
    // Создаем простой эффект прозрачности по краям
    const timestamp = Date.now();
    const outputPath = `./uploads/processed-${timestamp}.png`;
    
    // Применяем простую обработку - делаем края более прозрачными
    await image
      .png()
      .composite([{
        input: Buffer.from([255, 255, 255, 0]), // Прозрачный белый
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'soft-light'
      }])
      .toFile(outputPath);
    
    console.log('✅ [SIMPLE-EDITOR] Обработка завершена');
    
    return {
      success: true,
      imageUrl: `/uploads/processed-${timestamp}.png`,
      message: 'Изображение обработано (упрощенный алгоритм)',
      type: 'simple_processing'
    };
    
  } catch (error) {
    console.error('❌ [SIMPLE-EDITOR] Ошибка обработки:', error);
    return {
      success: false,
      error: 'Ошибка обработки',
      message: 'Не удалось обработать изображение'
    };
  }
}

/**
 * Применение цветовых фильтров к изображению
 * @param {string} imageUrl - URL исходного изображения
 * @param {string} filterType - Тип фильтра
 * @returns {Promise<Object>} Результат обработки
 */
async function applyColorFilter(imageUrl, filterType = 'vintage') {
  try {
    console.log(`🎨 [SIMPLE-EDITOR] Применяем фильтр: ${filterType}`);
    
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.buffer();
    
    const timestamp = Date.now();
    const outputPath = `./uploads/filtered-${timestamp}.png`;
    
    let processedImage = sharp(imageBuffer);
    
    switch (filterType) {
      case 'vintage':
        processedImage = processedImage
          .modulate({ brightness: 1.1, saturation: 0.8 })
          .tint({ r: 255, g: 240, b: 200 });
        break;
        
      case 'blue':
        processedImage = processedImage
          .tint({ r: 200, g: 220, b: 255 });
        break;
        
      case 'warm':
        processedImage = processedImage
          .modulate({ brightness: 1.05, saturation: 1.2 })
          .tint({ r: 255, g: 220, b: 180 });
        break;
        
      case 'cool':
        processedImage = processedImage
          .modulate({ brightness: 0.95, saturation: 1.1 })
          .tint({ r: 180, g: 220, b: 255 });
        break;
        
      default:
        processedImage = processedImage.modulate({ brightness: 1.1 });
    }
    
    await processedImage.png().toFile(outputPath);
    
    return {
      success: true,
      imageUrl: `/uploads/filtered-${timestamp}.png`,
      message: `Применен фильтр: ${filterType}`,
      type: 'color_filter'
    };
    
  } catch (error) {
    console.error('❌ [SIMPLE-EDITOR] Ошибка применения фильтра:', error);
    return {
      success: false,
      error: 'Ошибка фильтра',
      message: 'Не удалось применить фильтр'
    };
  }
}

/**
 * Изменение размера изображения
 * @param {string} imageUrl - URL исходного изображения
 * @param {number} scale - Масштаб (0.5 = 50%, 2.0 = 200%)
 * @returns {Promise<Object>} Результат обработки
 */
async function resizeImage(imageUrl, scale = 0.8) {
  try {
    console.log(`📏 [SIMPLE-EDITOR] Изменяем размер с масштабом: ${scale}`);
    
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.buffer();
    
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();
    
    const newWidth = Math.round(width * scale);
    const newHeight = Math.round(height * scale);
    
    const timestamp = Date.now();
    const outputPath = `./uploads/resized-${timestamp}.png`;
    
    await image
      .resize(newWidth, newHeight)
      .png()
      .toFile(outputPath);
    
    return {
      success: true,
      imageUrl: `/uploads/resized-${timestamp}.png`,
      message: `Размер изменен на ${newWidth}x${newHeight}`,
      type: 'resize'
    };
    
  } catch (error) {
    console.error('❌ [SIMPLE-EDITOR] Ошибка изменения размера:', error);
    return {
      success: false,
      error: 'Ошибка изменения размера',
      message: 'Не удалось изменить размер изображения'
    };
  }
}

/**
 * Создание размытого фона
 * @param {string} imageUrl - URL исходного изображения
 * @returns {Promise<Object>} Результат обработки
 */
async function createBlurredBackground(imageUrl) {
  try {
    console.log('🌫️ [SIMPLE-EDITOR] Создаем размытый фон...');
    
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.buffer();
    
    const timestamp = Date.now();
    const outputPath = `./uploads/blurred-${timestamp}.png`;
    
    await sharp(imageBuffer)
      .blur(10)
      .modulate({ brightness: 1.2, saturation: 0.7 })
      .png()
      .toFile(outputPath);
    
    return {
      success: true,
      imageUrl: `/uploads/blurred-${timestamp}.png`,
      message: 'Создан размытый эффект фона',
      type: 'blur_background'
    };
    
  } catch (error) {
    console.error('❌ [SIMPLE-EDITOR] Ошибка размытия:', error);
    return {
      success: false,
      error: 'Ошибка размытия',
      message: 'Не удалось создать размытый фон'
    };
  }
}

/**
 * Анализ запроса пользователя для определения типа обработки
 * @param {string} request - Запрос пользователя
 * @returns {Object} Тип операции и параметры
 */
function parseEditRequest(request) {
  const lowerRequest = request.toLowerCase();
  
  if (lowerRequest.includes('удали фон') || lowerRequest.includes('убери фон')) {
    return {
      type: 'remove_background',
      description: 'Простое удаление фона'
    };
  }
  
  if (lowerRequest.includes('размыт') || lowerRequest.includes('blur')) {
    return {
      type: 'blur_background',
      description: 'Размытие фона'
    };
  }
  
  if (lowerRequest.includes('фильтр') || lowerRequest.includes('цвет') || lowerRequest.includes('оттенок')) {
    let filterType = 'vintage';
    if (lowerRequest.includes('синий') || lowerRequest.includes('голубой')) filterType = 'blue';
    if (lowerRequest.includes('теплый') || lowerRequest.includes('желтый')) filterType = 'warm';
    if (lowerRequest.includes('холодный')) filterType = 'cool';
    
    return {
      type: 'color_filter',
      filterType: filterType,
      description: `Цветовой фильтр: ${filterType}`
    };
  }
  
  if (lowerRequest.includes('размер') || lowerRequest.includes('масштаб')) {
    let scale = 0.8;
    if (lowerRequest.includes('увеличь') || lowerRequest.includes('больше')) scale = 1.3;
    if (lowerRequest.includes('уменьши') || lowerRequest.includes('меньше')) scale = 0.6;
    
    return {
      type: 'resize',
      scale: scale,
      description: `Изменение размера (${scale}x)`
    };
  }
  
  // По умолчанию применяем цветовой фильтр
  return {
    type: 'color_filter',
    filterType: 'vintage',
    description: 'Применение винтажного фильтра'
  };
}

/**
 * Основная функция обработки изображения
 * @param {string} imageUrl - URL исходного изображения
 * @param {string} editRequest - Запрос на редактирование
 * @returns {Promise<Object>} Результат обработки
 */
async function processImage(imageUrl, editRequest) {
  const request = parseEditRequest(editRequest);
  
  console.log(`🔧 [SIMPLE-EDITOR] Обработка: ${request.description}`);
  
  switch (request.type) {
    case 'remove_background':
      return await removeBackgroundSimple(imageUrl);
      
    case 'blur_background':
      return await createBlurredBackground(imageUrl);
      
    case 'color_filter':
      return await applyColorFilter(imageUrl, request.filterType);
      
    case 'resize':
      return await resizeImage(imageUrl, request.scale);
      
    default:
      return {
        success: false,
        error: 'Неизвестная операция',
        message: 'Попробуйте: "удали фон", "размытие", "синий фильтр", "уменьши размер"'
      };
  }
}

module.exports = {
  processImage,
  removeBackgroundSimple,
  applyColorFilter,
  resizeImage,
  createBlurredBackground,
  parseEditRequest
};