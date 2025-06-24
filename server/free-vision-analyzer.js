/**
 * Бесплатный анализатор изображений без внешних API
 * Использует локальное компьютерное зрение и анализ пикселей
 */

const sharp = require('sharp');
const fetch = require('node-fetch');

/**
 * Главная функция анализа изображения
 */
async function analyzeImageLocally(imageUrl) {
  try {
    console.log('🔍 [FREE-VISION] Начинаю локальный анализ изображения:', imageUrl);
    
    // Загружаем изображение
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Не удалось загрузить изображение: ${response.status}`);
    }
    
    const imageBuffer = await response.buffer();
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    console.log('📊 [FREE-VISION] Метаданные изображения:', {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels
    });
    
    // Анализируем различные аспекты
    const colorAnalysis = await analyzeColors(image);
    const shapeAnalysis = await analyzeShapes(image, metadata);
    const contentAnalysis = await analyzeContent(image, metadata);
    const styleAnalysis = determineStyle(colorAnalysis, metadata);
    
    // Создаем описание на основе анализа
    const description = generateDescription(colorAnalysis, shapeAnalysis, contentAnalysis, styleAnalysis);
    
    const result = {
      description,
      image_type: contentAnalysis.type,
      objects: contentAnalysis.objects,
      colors: colorAnalysis.dominantColors,
      style: styleAnalysis,
      composition: shapeAnalysis,
      success: true
    };
    
    console.log('✅ [FREE-VISION] Анализ завершен:', result);
    return result;
    
  } catch (error) {
    console.error('❌ [FREE-VISION] Ошибка анализа:', error);
    return {
      error: error.message,
      success: false
    };
  }
}

/**
 * Анализ цветовой палитры
 */
async function analyzeColors(image) {
  try {
    // Получаем статистику цветов
    const { dominant } = await image.stats();
    
    // Уменьшаем изображение для анализа пикселей
    const smallImage = await image
      .resize(50, 50, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const { data, info } = smallImage;
    const pixelCount = info.width * info.height;
    const colorCounts = {};
    
    // Анализируем каждый пикс0ель
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Группируем похожие цвета
      const colorKey = `${Math.floor(r / 32) * 32}-${Math.floor(g / 32) * 32}-${Math.floor(b / 32) * 32}`;
      colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
    }
    
    // Находим доминирующие цвета
    const sortedColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color, count]) => {
        const [r, g, b] = color.split('-').map(Number);
        return {
          rgb: { r, g, b },
          name: getColorName(r, g, b),
          percentage: (count / pixelCount * 100).toFixed(1)
        };
      });
    
    return {
      dominantColors: sortedColors.map(c => c.name),
      colorDetails: sortedColors,
      brightness: calculateBrightness(dominant),
      contrast: calculateContrast(sortedColors)
    };
    
  } catch (error) {
    console.error('❌ [FREE-VISION] Ошибка анализа цветов:', error);
    return {
      dominantColors: ['неизвестный'],
      colorDetails: [],
      brightness: 'средняя',
      contrast: 'средний'
    };
  }
}

/**
 * Анализ форм и композиции
 */
async function analyzeShapes(image, metadata) {
  try {
    // Определяем ориентацию
    const orientation = metadata.width > metadata.height ? 'горизонтальная' : 
                      metadata.height > metadata.width ? 'вертикальная' : 'квадратная';
    
    // Анализируем края для определения сложности
    const edges = await image
      .greyscale()
      .resize(100, 100)
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
      })
      .raw()
      .toBuffer();
    
    // Подсчитываем количество краев
    let edgeCount = 0;
    for (let i = 0; i < edges.length; i++) {
      if (edges[i] > 50) edgeCount++;
    }
    
    const complexity = edgeCount > 2000 ? 'сложная' : 
                      edgeCount > 1000 ? 'средняя' : 'простая';
    
    return {
      orientation,
      complexity,
      aspectRatio: (metadata.width / metadata.height).toFixed(2)
    };
    
  } catch (error) {
    console.error('❌ [FREE-VISION] Ошибка анализа форм:', error);
    return {
      orientation: 'неизвестная',
      complexity: 'средняя',
      aspectRatio: '1.0'
    };
  }
}

/**
 * Анализ содержимого изображения
 */
async function analyzeContent(image, metadata) {
  try {
    // Базовая классификация по размеру и соотношению сторон
    const aspectRatio = metadata.width / metadata.height;
    
    let type = 'изображение';
    let objects = [];
    
    // Определяем тип по соотношению сторон и размеру
    if (aspectRatio > 1.5) {
      type = 'пейзаж';
      objects = ['природа', 'горизонт'];
    } else if (aspectRatio < 0.8) {
      type = 'портрет';
      objects = ['фигура'];
    } else if (metadata.width > 800 && metadata.height > 600) {
      type = 'фотография';
      objects = ['объекты'];
    } else {
      type = 'иллюстрация';
      objects = ['элементы'];
    }
    
    return {
      type,
      objects,
      category: determineCategory(type, metadata)
    };
    
  } catch (error) {
    console.error('❌ [FREE-VISION] Ошибка анализа содержимого:', error);
    return {
      type: 'изображение',
      objects: ['объект'],
      category: 'общее'
    };
  }
}

/**
 * Определение стиля изображения
 */
function determineStyle(colorAnalysis, metadata) {
  const { brightness, contrast, dominantColors } = colorAnalysis;
  
  // Определяем стиль по цветовым характеристикам
  if (dominantColors.includes('черный') && dominantColors.includes('белый')) {
    return 'черно-белый стиль';
  } else if (dominantColors.length <= 2) {
    return 'минималистичный стиль';
  } else if (dominantColors.includes('яркий') || contrast === 'высокий') {
    return 'яркий стиль';
  } else if (brightness === 'низкая') {
    return 'темный стиль';
  } else {
    return 'натуральный стиль';
  }
}

/**
 * Генерация описания изображения
 */
function generateDescription(colorAnalysis, shapeAnalysis, contentAnalysis, style) {
  const { dominantColors } = colorAnalysis;
  const { orientation, complexity } = shapeAnalysis;
  const { type, objects } = contentAnalysis;
  
  const colorDesc = dominantColors.slice(0, 2).join(' и ');
  const mainObjects = objects.slice(0, 2).join(' и ');
  
  return `${type} в ${orientation} ориентации с ${colorDesc} цветами, содержащее ${mainObjects}, ${complexity} композиция, ${style}`;
}

/**
 * Определение названия цвета по RGB
 */
function getColorName(r, g, b) {
  // Простая классификация цветов
  if (r > 200 && g > 200 && b > 200) return 'белый';
  if (r < 50 && g < 50 && b < 50) return 'черный';
  if (r > g && r > b) return 'красный';
  if (g > r && g > b) return 'зеленый';
  if (b > r && b > g) return 'синий';
  if (r > 150 && g > 150 && b < 100) return 'желтый';
  if (r > 150 && g < 100 && b > 150) return 'фиолетовый';
  if (r > 150 && g > 100 && b < 100) return 'оранжевый';
  if (r > 100 && g > 100 && b > 100) return 'серый';
  return 'смешанный';
}

/**
 * Расчет яркости
 */
function calculateBrightness(dominant) {
  const avg = (dominant.r + dominant.g + dominant.b) / 3;
  return avg > 180 ? 'высокая' : avg > 80 ? 'средняя' : 'низкая';
}

/**
 * Расчет контраста
 */
function calculateContrast(colors) {
  if (colors.length < 2) return 'низкий';
  
  const first = colors[0].rgb;
  const second = colors[1].rgb;
  
  const diff = Math.abs(first.r - second.r) + Math.abs(first.g - second.g) + Math.abs(first.b - second.b);
  
  return diff > 300 ? 'высокий' : diff > 150 ? 'средний' : 'низкий';
}

/**
 * Определение категории
 */
function determineCategory(type, metadata) {
  if (type === 'портрет') return 'люди';
  if (type === 'пейзаж') return 'природа';
  if (metadata.width === metadata.height) return 'квадратное';
  return 'общее';
}

module.exports = {
  analyzeImageLocally
};