/**
 * Модуль для редактирования изображений через бесплатные API
 * Использует Hugging Face и другие бесплатные сервисы
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');
const path = require('path');

/**
 * Удаление фона с изображения через Remove.bg API
 * @param {string} imageUrl - URL исходного изображения
 * @returns {Promise<Object>} Результат обработки
 */
async function removeBackground(imageUrl) {
  try {
    console.log('🖼️ [EDITOR] Удаляем фон с изображения...');
    
    // Используем бесплатный сервис для удаления фона
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: imageUrl,
        size: 'auto'
      })
    });

    if (response.ok) {
      const imageBuffer = await response.buffer();
      const outputPath = `./uploads/no-bg-${Date.now()}.png`;
      fs.writeFileSync(outputPath, imageBuffer);
      
      return {
        success: true,
        imageUrl: outputPath,
        message: 'Фон успешно удален'
      };
    } else {
      throw new Error('Remove.bg API недоступен');
    }
  } catch (error) {
    console.log('⚠️ [EDITOR] Remove.bg недоступен, используем альтернативный метод');
    return await removeBackgroundHuggingFace(imageUrl);
  }
}

/**
 * Удаление фона через Hugging Face
 * @param {string} imageUrl - URL исходного изображения
 * @returns {Promise<Object>} Результат обработки
 */
async function removeBackgroundHuggingFace(imageUrl) {
  try {
    console.log('🤗 [EDITOR] Используем Hugging Face для удаления фона...');
    
    if (!process.env.HUGGINGFACE_API_KEY) {
      return {
        success: false,
        error: 'API ключ не найден',
        message: 'Hugging Face API ключ не настроен'
      };
    }
    
    // Список доступных моделей для удаления фона
    const models = [
      'briaai/RMBG-1.4',
      'ZhengPeng7/BiRefNet',
      'schirrmacher/birefnet-general',
      'Xenova/modnet'
    ];
    
    // Загружаем изображение
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.buffer();
    
    // Пробуем каждую модель по очереди
    for (const model of models) {
      try {
        console.log(`🔄 [EDITOR] Пробуем модель: ${model}`);
        
        const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/octet-stream',
            'x-wait-for-model': 'true'
          },
          body: imageBuffer
        });

        if (response.ok) {
          const resultBuffer = await response.buffer();
          const timestamp = Date.now();
          const outputPath = `./uploads/no-bg-hf-${timestamp}.png`;
          fs.writeFileSync(outputPath, resultBuffer);
          
          console.log(`✅ [EDITOR] Успешно использована модель: ${model}`);
          return {
            success: true,
            imageUrl: `/uploads/no-bg-hf-${timestamp}.png`,
            message: 'Фон успешно удален',
            model: model
          };
        } else {
          const errorText = await response.text();
          console.log(`⚠️ [EDITOR] Модель ${model} недоступна: ${response.status} - ${errorText}`);
          continue;
        }
      } catch (modelError) {
        console.log(`⚠️ [EDITOR] Ошибка модели ${model}:`, modelError.message);
        continue;
      }
    }
    
    // Если все модели не сработали
    return {
      success: false,
      error: 'Все модели недоступны',
      message: 'Сервис удаления фона временно недоступен, попробуйте позже'
    };
    
  } catch (error) {
    console.error('❌ [EDITOR] Общая ошибка Hugging Face:', error);
    return {
      success: false,
      error: 'Сетевая ошибка',
      message: 'Не удалось подключиться к сервису редактирования'
    };
  }
}

/**
 * Замена фона на изображении
 * @param {string} imageUrl - URL исходного изображения
 * @param {string} newBackground - Описание нового фона
 * @returns {Promise<Object>} Результат обработки
 */
async function replaceBackground(imageUrl, newBackground) {
  try {
    console.log('🎨 [EDITOR] Заменяем фон на:', newBackground);
    
    // Сначала удаляем фон
    const noBgResult = await removeBackground(imageUrl);
    
    if (!noBgResult.success) {
      return noBgResult;
    }
    
    // Генерируем новый фон
    const backgroundPrompt = `${newBackground}, high quality background, detailed, photorealistic`;
    const imageGenerator = require('./ai-image-generator');
    const bgResult = await imageGenerator.generateImage(backgroundPrompt, 'realistic');
    
    if (bgResult.success) {
      return {
        success: true,
        originalWithoutBg: noBgResult.imageUrl,
        newBackground: bgResult.imageUrl,
        message: `Создан объект без фона и новый фон: ${newBackground}`,
        instructions: 'Используйте графический редактор для совмещения изображений'
      };
    } else {
      return {
        success: false,
        error: 'Не удалось создать новый фон',
        message: 'Попробуйте другое описание фона'
      };
    }
  } catch (error) {
    console.error('❌ [EDITOR] Ошибка замены фона:', error);
    return {
      success: false,
      error: 'Ошибка обработки',
      message: 'Не удалось заменить фон'
    };
  }
}

/**
 * Inpainting - редактирование части изображения
 * @param {string} imageUrl - URL исходного изображения  
 * @param {string} editPrompt - Что нужно изменить
 * @returns {Promise<Object>} Результат обработки
 */
async function editImagePart(imageUrl, editPrompt) {
  try {
    console.log('✏️ [EDITOR] Редактируем часть изображения:', editPrompt);
    
    // Загружаем изображение
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.buffer();
    
    // Используем Hugging Face Stable Diffusion Inpainting
    const response = await fetch('https://api-inference.huggingface.co/models/runwayml/stable-diffusion-inpainting', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: editPrompt,
        parameters: {
          num_inference_steps: 20,
          guidance_scale: 7.5
        }
      })
    });

    if (response.ok) {
      const resultBuffer = await response.buffer();
      const outputPath = `./uploads/edited-${Date.now()}.png`;
      fs.writeFileSync(outputPath, resultBuffer);
      
      return {
        success: true,
        imageUrl: `http://localhost:3000/${outputPath}`,
        message: `Изображение отредактировано: ${editPrompt}`
      };
    } else {
      throw new Error('Inpainting API недоступен');
    }
  } catch (error) {
    console.error('❌ [EDITOR] Ошибка редактирования:', error);
    return {
      success: false,
      error: 'Не удалось отредактировать изображение',
      message: 'Попробуйте переформулировать запрос на редактирование'
    };
  }
}

/**
 * Определение типа редактирования по тексту запроса
 * @param {string} request - Запрос пользователя
 * @returns {Object} Тип операции и параметры
 */
function parseEditRequest(request) {
  const lowerRequest = request.toLowerCase();
  
  if (lowerRequest.includes('удали фон') || lowerRequest.includes('убери фон') || lowerRequest.includes('без фона')) {
    return {
      type: 'remove_background',
      description: 'Удаление фона'
    };
  }
  
  if (lowerRequest.includes('замени фон') || lowerRequest.includes('поменяй фон') || lowerRequest.includes('новый фон')) {
    // Извлекаем описание нового фона
    const bgMatch = request.match(/(фон|background).+?на\s+(.+?)(?:\.|$|,)/i);
    const newBg = bgMatch ? bgMatch[2] : 'природа, лес';
    
    return {
      type: 'replace_background',
      newBackground: newBg,
      description: `Замена фона на: ${newBg}`
    };
  }
  
  if (lowerRequest.includes('измени') || lowerRequest.includes('отредактируй') || lowerRequest.includes('добавь')) {
    return {
      type: 'edit_part',
      editPrompt: request,
      description: 'Редактирование части изображения'
    };
  }
  
  return {
    type: 'unknown',
    description: 'Неизвестный тип редактирования'
  };
}

module.exports = {
  removeBackground,
  replaceBackground,
  editImagePart,
  parseEditRequest
};