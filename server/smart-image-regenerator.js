/**
 * Умная система регенерации изображений
 * Анализирует исходное изображение и создает новое без указанных объектов
 */

const sharp = require('sharp');

/**
 * Анализ цветовой схемы изображения
 */
async function analyzeImageColors(imageBuffer) {
  try {
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();
    
    // Получаем пиксели для анализа
    const { data } = await image.raw().toBuffer({ resolveWithObject: true });
    
    const colorCounts = {};
    const sampleStep = 10; // Анализируем каждый 10-й пиксель для скорости
    
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const pixelIndex = (y * width + x) * 3;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        
        // Группируем похожие цвета
        const colorKey = `${Math.floor(r/20)*20}-${Math.floor(g/20)*20}-${Math.floor(b/20)*20}`;
        colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
      }
    }
    
    // Находим доминирующие цвета
    const sortedColors = Object.entries(colorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([color]) => {
        const [r, g, b] = color.split('-').map(Number);
        return { r, g, b };
      });
    
    return sortedColors;
    
  } catch (error) {
    console.error('❌ [REGENERATOR] Ошибка анализа цветов:', error);
    return [{ r: 128, g: 128, b: 128 }];
  }
}

/**
 * Определение стиля изображения по цветам
 */
function determineImageStyle(colors) {
  const mainColor = colors[0];
  
  // Анализируем цветовую гамму
  const isDark = colors.every(c => (c.r + c.g + c.b) / 3 < 120);
  const isBright = colors.some(c => (c.r + c.g + c.b) / 3 > 200);
  const hasWarmColors = colors.some(c => c.r > c.g && c.r > c.b);
  const hasCoolColors = colors.some(c => c.b > c.r && c.b > c.g);
  
  let style = '';
  
  if (isDark) {
    style += 'dark atmosphere, moody lighting, ';
  } else if (isBright) {
    style += 'bright, well-lit, cheerful, ';
  }
  
  if (hasWarmColors && !hasCoolColors) {
    style += 'warm color palette, ';
  } else if (hasCoolColors && !hasWarmColors) {
    style += 'cool color palette, ';
  }
  
  // Определяем насыщенность
  const avgSaturation = colors.reduce((sum, c) => {
    const max = Math.max(c.r, c.g, c.b);
    const min = Math.min(c.r, c.g, c.b);
    return sum + (max - min) / max;
  }, 0) / colors.length;
  
  if (avgSaturation > 0.5) {
    style += 'vibrant colors, ';
  } else {
    style += 'muted colors, ';
  }
  
  return style;
}

/**
 * Извлечение ключевых слов из URL изображения
 */
function extractKeywordsFromUrl(imageUrl) {
  try {
    // Декодируем URL
    const decodedUrl = decodeURIComponent(imageUrl);
    
    // Извлекаем промпт из URL Pollinations
    const promptMatch = decodedUrl.match(/prompt\/(.+?)(?:\?|$)/);
    if (!promptMatch) return [];
    
    const prompt = promptMatch[1];
    
    // Разбиваем на слова и фильтруем служебные слова
    const words = prompt.split(/[^\w\u0400-\u04FF]+/) // латиница и кириллица
      .filter(word => word.length > 2)
      .filter(word => !['high', 'quality', 'detailed', 'professional', 'draw', 'create'].includes(word.toLowerCase()));
    
    return words;
    
  } catch (error) {
    console.error('❌ [REGENERATOR] Ошибка извлечения ключевых слов:', error);
    return [];
  }
}

/**
 * Создание нового описания без указанного объекта
 */
function createModifiedDescription(originalKeywords, objectToRemove, imageStyle) {
  // Удаляем упоминания объекта
  const removePatterns = [
    objectToRemove,
    objectToRemove.slice(0, -1), // убираем окончание
    objectToRemove + 'ом',
    objectToRemove + 'ами',
    objectToRemove + 'и'
  ];
  
  let filteredKeywords = originalKeywords.filter(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    return !removePatterns.some(pattern => 
      lowerKeyword.includes(pattern.toLowerCase()) || 
      pattern.toLowerCase().includes(lowerKeyword)
    );
  });
  
  // Если удалили слишком много, оставляем основные
  if (filteredKeywords.length < 2 && originalKeywords.length > 0) {
    filteredKeywords = originalKeywords.slice(0, 2);
  }
  
  // Создаем новое описание
  let newDescription = filteredKeywords.join(' ');
  
  // Добавляем стилевые характеристики
  newDescription += `, ${imageStyle}`;
  
  // Добавляем качественные модификаторы
  newDescription += ' high quality, detailed, professional';
  
  return newDescription;
}

/**
 * Создание нового описания на основе локального анализа
 */
function createModifiedDescriptionFromAnalysis(analysis, objectToRemove) {
  // Удаляем указанный объект из списка аксессуаров
  const filteredAccessories = analysis.accessories.filter(accessory => {
    const lowerAccessory = accessory.toLowerCase();
    const lowerRemove = objectToRemove.toLowerCase();
    
    // Проверяем различные формы слова
    return !lowerAccessory.includes(lowerRemove) && 
           !lowerRemove.includes(lowerAccessory) &&
           !areRelatedWords(lowerAccessory, lowerRemove);
  });
  
  // Создаем новое описание
  let newDescription = analysis.mainSubject;
  
  if (filteredAccessories.length > 0) {
    newDescription += ` в ${filteredAccessories.join(', ')}`;
  }
  
  // Добавляем стиль
  newDescription += `, ${analysis.style}`;
  
  // Добавляем качественные модификаторы
  newDescription += ', high quality, detailed, professional';
  
  console.log(`🔄 [REGENERATOR] Удаляем "${objectToRemove}" из "${analysis.accessories.join(', ')}"`);
  console.log(`✅ [REGENERATOR] Остаются: "${filteredAccessories.join(', ')}"`);
  
  return newDescription;
}

/**
 * Проверка родственных слов
 */
function areRelatedWords(word1, word2) {
  const related = {
    'сапоги': ['обувь', 'ботинки', 'туфли'],
    'шляпа': ['головной убор', 'кепка', 'шапка'],
    'куртка': ['пиджак', 'жакет', 'одежда'],
    'очки': ['линзы', 'оправа']
  };
  
  for (const [key, synonyms] of Object.entries(related)) {
    if ((word1.includes(key) || key.includes(word1)) && 
        (synonyms.some(s => word2.includes(s) || s.includes(word2)))) {
      return true;
    }
    if ((word2.includes(key) || key.includes(word2)) && 
        (synonyms.some(s => word1.includes(s) || s.includes(word1)))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Анализ изображения с помощью Python скрипта
 */
async function analyzeImageWithPython(imageUrl) {
  try {
    const { analyzeImageAdvanced } = require('./advanced-free-vision.cjs');
    
    console.log('🔍 [ADVANCED-ANALYZER] Начинаю продвинутый анализ изображения');
    const analysis = await analyzeImageAdvanced(imageUrl);
    
    if (analysis.success) {
      // Адаптируем результат к ожидаемому формату
      const adaptedAnalysis = {
        description: analysis.description || 'изображение',
        mainSubject: analysis.image_type || 'объект',
        accessories: [...(analysis.accessories || []), ...(analysis.clothing || []), ...(analysis.objects || [])],
        style: analysis.style || 'натуральный стиль',
        colors: analysis.colors || [],
        people: analysis.people || [],
        animals: analysis.animals || [],
        lighting: analysis.lighting || 'естественное',
        details: analysis.details || {},
        editingContext: analysis.editingContext || {},
        fullAnalysis: analysis
      };
      
      console.log('✅ [FREE-ANALYZER] Анализ успешно завершен');
      return adaptedAnalysis;
    } else {
      console.error('❌ [FREE-ANALYZER] Ошибка анализа:', analysis.error);
      return getFallbackAnalysis(imageUrl);
    }
    
  } catch (error) {
    console.error('❌ [FREE-ANALYZER] Общая ошибка:', error);
    return getFallbackAnalysis(imageUrl);
  }
}

/**
 * Извлечение аксессуаров из описания
 */
function extractAccessories(description) {
  const accessories = [];
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes('сапог')) accessories.push('сапоги');
  if (lowerDesc.includes('шляп')) accessories.push('шляпа');
  if (lowerDesc.includes('очк')) accessories.push('очки');
  if (lowerDesc.includes('одежд')) accessories.push('одежда');
  
  return accessories;
}

/**
 * Fallback анализ при ошибках
 */
function getFallbackAnalysis(imageUrl) {
  const keywords = extractKeywordsFromUrl(imageUrl);
  return {
    description: keywords.join(' ') || 'изображение',
    mainSubject: keywords.length > 0 ? keywords[0] : 'объект',
    accessories: keywords.filter(k => ['сапоги', 'шляпа', 'очки'].includes(k.toLowerCase())),
    style: 'профессиональное качество',
    colors: ['смешанные тона']
  };
}

/**
 * Основная функция умной регенерации
 */
async function regenerateImageWithoutObject(imageUrl, objectToRemove) {
  try {
    console.log(`🔄 [REGENERATOR] Начинаем обработку изображения`);
    console.log(`🎯 [REGENERATOR] Убираем объект: ${objectToRemove}`);
    
    // Анализируем изображение
    const analysis = await analyzeImageWithPython(imageUrl);
    
    console.log(`🎨 [REGENERATOR] Анализ изображения:`, analysis);
    console.log(`📝 [REGENERATOR] Описание: ${analysis.description}`);
    console.log(`🎯 [REGENERATOR] Главный объект: ${analysis.mainSubject}`);
    console.log(`👕 [REGENERATOR] Аксессуары: ${analysis.accessories.join(', ')}`);
    
    // Сначала пытаемся реальное редактирование
    const { editImageReally } = require('./real-image-editor.cjs');
    const realEditResult = await editImageReally(imageUrl, `убери ${objectToRemove}`, analysis);
    
    if (realEditResult.success) {
      console.log('✅ [REGENERATOR] Реальное редактирование успешно');
      console.log('🔗 [REGENERATOR] URL результата:', realEditResult.imageUrl);
      console.log('📁 [REGENERATOR] Путь файла:', realEditResult.imagePath);
      console.log('📊 [REGENERATOR] Полный результат:', realEditResult);
      
      return {
        success: true,
        imageUrl: realEditResult.imageUrl,
        message: `Удален "${objectToRemove}" с исходного изображения`,
        originalDescription: analysis.description,
        editType: 'real_edit',
        removedObject: objectToRemove
      };
    }
    
    // Если реальное редактирование не удалось, используем генерацию
    console.log('🔄 [REGENERATOR] Переключаюсь на генерацию нового изображения');
    
    // Создаем новое описание без указанного объекта
    const newDescription = createModifiedDescriptionFromAnalysis(analysis, objectToRemove);
    console.log(`📝 [REGENERATOR] Новое описание: ${newDescription}`);
    
    // Генерируем новое изображение
    const aiImageGenerator = require('./ai-image-generator');
    const result = await aiImageGenerator.generateImage(newDescription, 'realistic');
    
    if (result.success) {
      return {
        success: true,
        imageUrl: result.imageUrl,
        message: `Создано новое изображение без "${objectToRemove}", сохранив ${analysis.mainSubject} и стиль`,
        originalDescription: analysis.description,
        newDescription: newDescription,
        editType: 'regeneration',
        removedObject: objectToRemove
      };
    } else {
      throw new Error('Не удалось сгенерировать новое изображение');
    }
    
  } catch (error) {
    console.error('❌ [REGENERATOR] Ошибка обработки:', error);
    return {
      success: false,
      error: error.message,
      message: 'Не удалось обработать изображение'
    };
  }
}

module.exports = {
  regenerateImageWithoutObject,
  analyzeImageColors,
  determineImageStyle,
  extractKeywordsFromUrl
};