/**
 * Локальный анализатор изображений - замена Vision API
 * Анализирует изображения без внешних сервисов
 */

const sharp = require('sharp');

/**
 * Анализ объектов на изображении по цветовым кластерам
 */
async function analyzeObjectsByColor(imageBuffer) {
  try {
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();
    
    // Уменьшаем для быстрого анализа
    const smallImage = await image.resize(200, 200, { fit: 'inside' }).raw().toBuffer();
    const { width: smallWidth, height: smallHeight } = await image.resize(200, 200, { fit: 'inside' }).metadata();
    
    const objects = [];
    const colorRegions = {};
    
    // Анализируем по сегментам
    for (let y = 0; y < smallHeight; y += 20) {
      for (let x = 0; x < smallWidth; x += 20) {
        const segmentColors = [];
        
        // Анализируем сегмент 20x20
        for (let sy = y; sy < Math.min(y + 20, smallHeight); sy++) {
          for (let sx = x; sx < Math.min(x + 20, smallWidth); sx++) {
            const pixelIndex = (sy * smallWidth + sx) * 3;
            const r = smallImage[pixelIndex];
            const g = smallImage[pixelIndex + 1];
            const b = smallImage[pixelIndex + 2];
            
            segmentColors.push({ r, g, b });
          }
        }
        
        // Определяем доминирующий цвет сегмента
        const avgColor = segmentColors.reduce((sum, color) => ({
          r: sum.r + color.r,
          g: sum.g + color.g,
          b: sum.b + color.b
        }), { r: 0, g: 0, b: 0 });
        
        avgColor.r = Math.floor(avgColor.r / segmentColors.length);
        avgColor.g = Math.floor(avgColor.g / segmentColors.length);
        avgColor.b = Math.floor(avgColor.b / segmentColors.length);
        
        // Классифицируем сегмент
        const segment = classifySegment(avgColor, x, y, smallWidth, smallHeight);
        if (segment.type !== 'background') {
          objects.push({
            type: segment.type,
            color: avgColor,
            position: { x: x * (width / smallWidth), y: y * (height / smallHeight) },
            size: { width: 20 * (width / smallWidth), height: 20 * (height / smallHeight) },
            confidence: segment.confidence
          });
        }
      }
    }
    
    return groupNearbyObjects(objects);
    
  } catch (error) {
    console.error('❌ [VISION] Ошибка анализа объектов:', error);
    return [];
  }
}

/**
 * Классификация сегмента по цвету и позиции
 */
function classifySegment(color, x, y, width, height) {
  const brightness = (color.r + color.g + color.b) / 3;
  const saturation = Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b);
  
  // Позиция на изображении
  const isTop = y < height * 0.3;
  const isBottom = y > height * 0.7;
  const isCenter = x > width * 0.3 && x < width * 0.7 && y > height * 0.3 && y < height * 0.7;
  
  // Анализ по цвету
  if (brightness > 240) {
    return { type: 'background', confidence: 0.8 };
  }
  
  // Определяем тип объекта по цвету и позиции
  if (color.r > 150 && color.g < 100 && color.b < 100) {
    // Красноватые цвета
    if (isBottom) {
      return { type: 'footwear', confidence: 0.7 }; // Возможно обувь
    }
    return { type: 'clothing', confidence: 0.6 };
  }
  
  if (color.g > 100 && color.r < 100 && color.b < 100) {
    // Зеленоватые цвета
    if (isTop) {
      return { type: 'eyes', confidence: 0.8 }; // Возможно глаза
    }
    return { type: 'accessory', confidence: 0.5 };
  }
  
  if (brightness < 100 && saturation > 50) {
    // Темные насыщенные цвета
    if (isBottom) {
      return { type: 'footwear', confidence: 0.8 };
    }
    if (isCenter) {
      return { type: 'clothing', confidence: 0.7 };
    }
    return { type: 'fur', confidence: 0.6 };
  }
  
  if (brightness > 180 && saturation < 30) {
    // Светлые ненасыщенные
    return { type: 'background', confidence: 0.9 };
  }
  
  // Средние тона
  if (isCenter) {
    return { type: 'body', confidence: 0.6 };
  }
  
  if (isTop) {
    return { type: 'head', confidence: 0.5 };
  }
  
  return { type: 'unknown', confidence: 0.3 };
}

/**
 * Группировка близких объектов
 */
function groupNearbyObjects(objects) {
  const groups = [];
  const processed = new Set();
  
  objects.forEach((obj, index) => {
    if (processed.has(index)) return;
    
    const group = {
      type: obj.type,
      objects: [obj],
      bounds: {
        left: obj.position.x,
        top: obj.position.y,
        right: obj.position.x + obj.size.width,
        bottom: obj.position.y + obj.size.height
      },
      confidence: obj.confidence
    };
    
    processed.add(index);
    
    // Ищем близкие объекты того же типа
    objects.forEach((other, otherIndex) => {
      if (processed.has(otherIndex) || other.type !== obj.type) return;
      
      const distance = Math.sqrt(
        Math.pow(obj.position.x - other.position.x, 2) +
        Math.pow(obj.position.y - other.position.y, 2)
      );
      
      if (distance < 100) { // Близкие объекты
        group.objects.push(other);
        group.bounds.left = Math.min(group.bounds.left, other.position.x);
        group.bounds.top = Math.min(group.bounds.top, other.position.y);
        group.bounds.right = Math.max(group.bounds.right, other.position.x + other.size.width);
        group.bounds.bottom = Math.max(group.bounds.bottom, other.position.y + other.size.height);
        processed.add(otherIndex);
      }
    });
    
    groups.push(group);
  });
  
  return groups.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Создание текстового описания изображения
 */
async function createImageDescription(imageBuffer) {
  try {
    console.log('🔍 [VISION] Анализируем изображение локально...');
    
    const objects = await analyzeObjectsByColor(imageBuffer);
    const { width, height } = await sharp(imageBuffer).metadata();
    
    console.log('📊 [VISION] Найденные объекты:', objects.map(o => `${o.type} (${o.confidence.toFixed(2)})`));
    
    // Определяем основной субъект
    let mainSubject = 'объект';
    const bodyParts = objects.filter(o => ['head', 'body', 'fur', 'eyes'].includes(o.type));
    const clothing = objects.filter(o => ['clothing', 'footwear', 'accessory'].includes(o.type));
    
    if (bodyParts.some(o => o.type === 'fur') || bodyParts.some(o => o.type === 'eyes')) {
      mainSubject = 'кот';
    } else if (bodyParts.length > 0) {
      mainSubject = 'персонаж';
    }
    
    // Описываем одежду и аксессуары
    let accessories = [];
    clothing.forEach(item => {
      if (item.type === 'footwear') {
        accessories.push('сапоги');
      } else if (item.type === 'clothing') {
        accessories.push('одежда');
      } else if (item.type === 'accessory') {
        accessories.push('аксессуары');
      }
    });
    
    // Анализируем общий стиль
    const dominantColors = await analyzeImageColors(imageBuffer);
    const style = determineImageStyle(dominantColors);
    
    // Создаем описание
    let description = mainSubject;
    
    if (accessories.length > 0) {
      description += ` в ${accessories.join(', ')}`;
    }
    
    description += `, ${style}`;
    
    return {
      description,
      mainSubject,
      accessories,
      objects,
      style
    };
    
  } catch (error) {
    console.error('❌ [VISION] Ошибка создания описания:', error);
    return {
      description: 'изображение',
      mainSubject: 'объект',
      accessories: [],
      objects: [],
      style: ''
    };
  }
}

/**
 * Анализ цветовой схемы (из smart-image-regenerator.js)
 */
async function analyzeImageColors(imageBuffer) {
  try {
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();
    
    const { data } = await image.raw().toBuffer({ resolveWithObject: true });
    
    const colorCounts = {};
    const sampleStep = 10;
    
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const pixelIndex = (y * width + x) * 3;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        
        const colorKey = `${Math.floor(r/20)*20}-${Math.floor(g/20)*20}-${Math.floor(b/20)*20}`;
        colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
      }
    }
    
    return Object.entries(colorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([color]) => {
        const [r, g, b] = color.split('-').map(Number);
        return { r, g, b };
      });
    
  } catch (error) {
    console.error('❌ [VISION] Ошибка анализа цветов:', error);
    return [{ r: 128, g: 128, b: 128 }];
  }
}

/**
 * Определение стиля изображения
 */
function determineImageStyle(colors) {
  const mainColor = colors[0];
  
  const isDark = colors.every(c => (c.r + c.g + c.b) / 3 < 120);
  const isBright = colors.some(c => (c.r + c.g + c.b) / 3 > 200);
  const hasWarmColors = colors.some(c => c.r > c.g && c.r > c.b);
  const hasCoolColors = colors.some(c => c.b > c.r && c.b > c.g);
  
  let style = '';
  
  if (isDark) {
    style += 'темная атмосфера, ';
  } else if (isBright) {
    style += 'яркое освещение, ';
  }
  
  if (hasWarmColors && !hasCoolColors) {
    style += 'теплые тона, ';
  } else if (hasCoolColors && !hasWarmColors) {
    style += 'холодные тона, ';
  }
  
  const avgSaturation = colors.reduce((sum, c) => {
    const max = Math.max(c.r, c.g, c.b);
    const min = Math.min(c.r, c.g, c.b);
    return sum + (max - min) / max;
  }, 0) / colors.length;
  
  if (avgSaturation > 0.5) {
    style += 'насыщенные цвета';
  } else {
    style += 'приглушенные цвета';
  }
  
  return style;
}

module.exports = {
  analyzeObjectsByColor,
  createImageDescription,
  analyzeImageColors,
  determineImageStyle
};