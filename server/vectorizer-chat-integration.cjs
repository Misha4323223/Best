/**
 * Интеграция векторизатора в чат для команды "нужен вектор"
 * Прямое подключение к StreamVectorizer с Adobe Illustrator Image Trace алгоритмом
 */

const fetch = require('node-fetch');

/**
 * Обработчик команды "нужен вектор" в потоковом чате
 */
async function handleVectorizerCommand(message, sessionId, res, previousImage) {
  console.log('🎯 [VECTORIZER-CHAT] Запуск команды векторизации');
  
  try {
    // Проверяем наличие изображения
    let imageUrl = null;
    
    if (previousImage && previousImage.url) {
      imageUrl = previousImage.url;
      console.log('🖼️ [VECTORIZER-CHAT] Используем предыдущее изображение');
    } else {
      // Ищем изображение в истории сессии
      try {
        const { getSessionMessages } = require('./chat-history');
        const messages = await getSessionMessages(sessionId);
        
        if (messages && messages.length > 0) {
          for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            if (msg.sender === 'ai' && msg.text) {
              const imageMatch = msg.text.match(/https:\/\/image\.pollinations\.ai\/prompt\/[^\s\)]+/);
              if (imageMatch) {
                imageUrl = imageMatch[0];
                console.log('🔍 [VECTORIZER-CHAT] Найдено изображение в истории');
                break;
              }
            }
          }
        }
      } catch (historyError) {
        console.log('⚠️ [VECTORIZER-CHAT] Ошибка доступа к истории чата:', historyError.message);
      }
    }
    
    if (!imageUrl) {
      sendStreamMessage(res, 'assistant', 
        '🔍 Для векторизации нужно сначала создать или загрузить изображение. Попробуйте сначала сгенерировать изображение, а затем используйте команду "нужен вектор".'
      );
      return false;
    }
    
    // Начинаем процесс векторизации
    sendStreamMessage(res, 'assistant', 
      '🚀 Запускаю векторизацию с ImageTracerJS...'
    );
    
    // Отправляем запрос к ImageTracerJS векторизатору
    sendStreamMessage(res, 'assistant', '📥 Отправляю изображение на векторизацию...');
    
    const vectorizerResponse = await fetch('http://localhost:5006/vectorize-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrl: imageUrl,
        options: {
          numberofcolors: 12,      // Хорошее количество цветов
          colorsampling: 1,        // Качественное сэмплирование
          pathomit: 8,            // Убираем мелкие детали
          ltres: 1,               // Высокое качество
          qtres: 1,               // Высокое качество
          scale: 1,               // Оригинальный размер
          roundcoords: 1          // Округляем координаты
        }
      })
    });
    
    if (!vectorizerResponse.ok) {
      throw new Error(`Ошибка векторизации: ${vectorizerResponse.status}`);
    }
    
    const vectorizerResult = await vectorizerResponse.json();
    
    if (!vectorizerResult.success) {
      throw new Error(vectorizerResult.error || 'Неизвестная ошибка векторизации');
    }
    
    sendStreamMessage(res, 'assistant', 
      `✅ Векторизация завершена успешно!\n📊 Размер SVG: ${Math.round(vectorizerResult.data.svgContent.length / 1024)}KB`
    );
    
    // Убираем превью SVG, оставляем только ссылку
    let svgPreview = '';
    
    // SVG уже сохранен ImageTracerJS векторизатором
    const filename = vectorizerResult.data.filename;
    
    console.log('💾 [VECTORIZER-CHAT] SVG сохранен:', filename);
    
    // Отправляем финальный результат
    sendStreamMessage(res, 'assistant', 
      `🎉 Векторизация успешно завершена!${svgPreview}

📊 **Результаты обработки:**
• SVG размер: ${Math.round(vectorizerResult.data.svgContent.length / 1024)}KB
• Векторизатор: ImageTracerJS v1.2.6
• Цветов: ${vectorizerResult.data.metadata.options.numberofcolors}
• Качество: Высокое

🎨 **Параметры векторизации:**
• Цветовое сэмплирование: Качественное
• Путь оптимизации: Включена
• Координаты: Округлены
• Контуры: Сглажены

✅ Векторное изображение готово к использованию!
📁 Файл: ${filename}
🔗 Ссылка: http://localhost:5000${vectorizerResult.data.url}`
    );
    
    return true;
    
  } catch (error) {
    console.error('❌ [VECTORIZER-CHAT] Ошибка векторизации:', error);
    sendStreamMessage(res, 'assistant', 
      `❌ Ошибка при векторизации: ${error.message}

Попробуйте:
• Убедитесь, что изображение загружено корректно
• Проверьте размер файла (рекомендуется до 5MB)
• Попробуйте другое изображение`
    );
    return false;
  }
}

/**
 * Вспомогательная функция для отправки потокового сообщения
 */
function sendStreamMessage(res, role, content) {
  res.write(`event: message\n`);
  res.write(`data: ${JSON.stringify({
    role: role,
    content: content
  })}\n\n`);
}

/**
 * Проверяет, является ли сообщение командой векторизации
 */
function isVectorizerCommand(message) {
  const vectorizerKeywords = [
    'нужен вектор', 
    'векторизуй', 
    'в вектор', 
    'сделай векторным',
    'преобразуй в вектор',
    'svg из изображения',
    'векторная графика',
    'создай svg'
  ];
  
  const messageLower = message.toLowerCase();
  return vectorizerKeywords.some(keyword => messageLower.includes(keyword));
}

/**
 * Извлекает настройки векторизации из сообщения пользователя
 */
function extractVectorizerSettings(message) {
  const settings = {
    maxColors: 5,           // По умолчанию для шелкографии
    tileSize: 512,
    tolerance: 1.0,
    enableOptimization: true
  };
  
  const messageLower = message.toLowerCase();
  
  // Анализ количества цветов
  const colorMatch = messageLower.match(/(\d+)\s*цвет/);
  if (colorMatch) {
    const colors = parseInt(colorMatch[1]);
    if (colors >= 2 && colors <= 10) {
      settings.maxColors = colors;
    }
  }
  
  // Анализ качества
  if (messageLower.includes('высокое качество') || messageLower.includes('детально')) {
    settings.tolerance = 0.5;
    settings.tileSize = 256;
  } else if (messageLower.includes('быстро') || messageLower.includes('просто')) {
    settings.tolerance = 2.0;
    settings.tileSize = 1024;
  }
  
  return settings;
}

/**
 * Извлекает URL изображения из сообщения
 */
function extractImageUrl(message) {
  // Поиск URL изображений Pollinations
  const pollinationsMatch = message.match(/https:\/\/image\.pollinations\.ai\/prompt\/[^\s]+/);
  if (pollinationsMatch) return pollinationsMatch[0];
  
  // Поиск других URL изображений
  const imageUrlMatch = message.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|bmp|webp)/i);
  if (imageUrlMatch) return imageUrlMatch[0];
  
  return null;
}

module.exports = {
  handleVectorizerCommand,
  isVectorizerCommand,
  extractImageUrl,
  extractVectorizerSettings,
  sendStreamMessage
};