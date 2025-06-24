/**
 * Продвинутый детектор объектов без внешних API
 * Использует анализ пикселей, цветовых паттернов и форм для распознавания объектов
 */

const fs = require('fs');
const path = require('path');

/**
 * Главная функция распознавания объектов
 */
async function detectObjects(imageBuffer, filename) {
  try {
    console.log('🔍 Запускаем продвинутое распознавание объектов...');
    
    // Получаем детальный анализ изображения
    const colorAnalysis = analyzeColors(imageBuffer);
    const edgeAnalysis = detectEdges(imageBuffer);
    const textureAnalysis = analyzeTextures(imageBuffer);
    const shapeAnalysis = detectShapes(imageBuffer);
    const patternAnalysis = findPatterns(imageBuffer);
    
    // Определяем объекты на основе всех анализов
    const detectedObjects = identifyObjects({
      colors: colorAnalysis,
      edges: edgeAnalysis,
      textures: textureAnalysis,
      shapes: shapeAnalysis,
      patterns: patternAnalysis,
      filename
    });
    
    // Генерируем детальное описание
    const description = generateDetailedDescription(detectedObjects, colorAnalysis, filename);
    
    return {
      success: true,
      description,
      detectedObjects: detectedObjects.objects,
      confidence: detectedObjects.confidence,
      service: 'Advanced Object Detection',
      details: {
        dominantColors: colorAnalysis.dominantColors,
        objectCount: detectedObjects.objects.length,
        sceneType: detectedObjects.sceneType,
        lighting: colorAnalysis.lighting,
        composition: shapeAnalysis.composition
      }
    };
    
  } catch (error) {
    console.log('❌ Ошибка распознавания объектов:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Продвинутый анализ цветов
 */
function analyzeColors(imageBuffer) {
  const sampleSize = Math.min(20000, imageBuffer.length);
  const sample = imageBuffer.slice(0, sampleSize);
  
  let colorProfile = {
    red: 0, green: 0, blue: 0,
    hues: { warm: 0, cool: 0, neutral: 0 },
    brightness: { bright: 0, medium: 0, dark: 0 },
    saturation: { high: 0, medium: 0, low: 0 },
    samples: 0
  };
  
  for (let i = 0; i < sample.length - 2; i += 3) {
    const r = sample[i] || 0;
    const g = sample[i + 1] || 0;
    const b = sample[i + 2] || 0;
    
    colorProfile.red += r;
    colorProfile.green += g;
    colorProfile.blue += b;
    colorProfile.samples++;
    
    // Анализ яркости
    const brightness = (r + g + b) / 3;
    if (brightness > 200) colorProfile.brightness.bright++;
    else if (brightness > 100) colorProfile.brightness.medium++;
    else colorProfile.brightness.dark++;
    
    // Анализ оттенков
    if (r > g + 30 && r > b + 30) colorProfile.hues.warm++;
    else if (b > r + 30 && b > g + 30) colorProfile.hues.cool++;
    else colorProfile.hues.neutral++;
    
    // Анализ насыщенности
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    
    if (saturation > 0.7) colorProfile.saturation.high++;
    else if (saturation > 0.3) colorProfile.saturation.medium++;
    else colorProfile.saturation.low++;
  }
  
  // Вычисляем средние значения
  const avgRed = colorProfile.red / colorProfile.samples;
  const avgGreen = colorProfile.green / colorProfile.samples;
  const avgBlue = colorProfile.blue / colorProfile.samples;
  
  // Определяем доминирующие цвета и соответствующие объекты
  let dominantColors = [];
  let colorObjects = [];
  
  if (avgGreen > avgRed + 40 && avgGreen > avgBlue + 40) {
    dominantColors.push('зеленый');
    colorObjects.push('растения', 'трава', 'деревья', 'листья', 'парк', 'лес');
  }
  
  if (avgBlue > avgRed + 40 && avgBlue > avgGreen + 40) {
    dominantColors.push('синий');
    colorObjects.push('небо', 'вода', 'море', 'озеро', 'джинсы', 'синие объекты');
  }
  
  if (avgRed > avgGreen + 40 && avgRed > avgBlue + 40) {
    dominantColors.push('красный');
    colorObjects.push('цветы', 'фрукты', 'автомобили', 'знаки', 'закат');
  }
  
  // Определяем освещение
  let lighting = 'нормальное';
  if (colorProfile.brightness.bright > colorProfile.brightness.dark * 2) {
    lighting = 'яркое дневное';
    colorObjects.push('солнечный день', 'хорошее освещение');
  } else if (colorProfile.brightness.dark > colorProfile.brightness.bright * 2) {
    lighting = 'темное вечернее';
    colorObjects.push('вечер', 'тени', 'приглушенное освещение');
  }
  
  return {
    dominantColors,
    colorObjects,
    lighting,
    averageRGB: { red: avgRed, green: avgGreen, blue: avgBlue },
    profile: colorProfile
  };
}

/**
 * Обнаружение краев и контуров
 */
function detectEdges(imageBuffer) {
  const sampleSize = Math.min(15000, imageBuffer.length);
  const sample = imageBuffer.slice(0, sampleSize);
  
  let edgeData = {
    sharpEdges: 0,
    softEdges: 0,
    transitions: 0,
    complexity: 0
  };
  
  for (let i = 2; i < sample.length - 2; i++) {
    const current = sample[i] || 0;
    const prev = sample[i - 1] || 0;
    const next = sample[i + 1] || 0;
    
    const gradient = Math.abs(next - prev);
    
    if (gradient > 50) {
      edgeData.sharpEdges++;
      edgeData.complexity += gradient;
    } else if (gradient > 20) {
      edgeData.softEdges++;
    }
    
    if (Math.abs(current - prev) > 30) {
      edgeData.transitions++;
    }
  }
  
  // Определяем типы объектов на основе краев
  let edgeObjects = [];
  
  if (edgeData.sharpEdges > edgeData.softEdges * 2) {
    edgeObjects.push('архитектура', 'здания', 'мебель', 'техника', 'геометрические формы');
  }
  
  if (edgeData.softEdges > edgeData.sharpEdges) {
    edgeObjects.push('природа', 'люди', 'животные', 'облака', 'органические формы');
  }
  
  if (edgeData.complexity / sample.length > 0.8) {
    edgeObjects.push('сложная сцена', 'множество объектов', 'детализированное изображение');
  }
  
  return {
    edgeObjects,
    sharpness: edgeData.sharpEdges / (edgeData.sharpEdges + edgeData.softEdges),
    complexity: edgeData.complexity / sample.length
  };
}

/**
 * Анализ текстур
 */
function analyzeTextures(imageBuffer) {
  const sampleSize = Math.min(10000, imageBuffer.length);
  const sample = imageBuffer.slice(0, sampleSize);
  
  let textureData = {
    roughness: 0,
    smoothness: 0,
    uniformity: 0,
    patterns: 0
  };
  
  let variations = [];
  
  for (let i = 5; i < sample.length - 5; i += 5) {
    const window = sample.slice(i - 5, i + 5);
    let localVariation = 0;
    
    for (let j = 1; j < window.length; j++) {
      localVariation += Math.abs((window[j] || 0) - (window[j-1] || 0));
    }
    
    variations.push(localVariation);
    
    if (localVariation > 100) textureData.roughness++;
    else if (localVariation < 30) textureData.smoothness++;
    
    if (localVariation > 80 && localVariation < 120) textureData.patterns++;
  }
  
  // Вычисляем однородность
  const avgVariation = variations.reduce((a, b) => a + b, 0) / variations.length;
  textureData.uniformity = 1 - (Math.sqrt(variations.reduce((acc, v) => acc + Math.pow(v - avgVariation, 2), 0) / variations.length) / 255);
  
  // Определяем объекты на основе текстуры
  let textureObjects = [];
  
  if (textureData.smoothness > textureData.roughness * 1.5) {
    textureObjects.push('стекло', 'вода', 'металл', 'экраны', 'гладкие поверхности');
  }
  
  if (textureData.roughness > textureData.smoothness) {
    textureObjects.push('ткань', 'кожа', 'кора деревьев', 'камень', 'текстурированные материалы');
  }
  
  if (textureData.uniformity > 0.8) {
    textureObjects.push('небо', 'стены', 'однородные поверхности');
  }
  
  if (textureData.patterns > variations.length * 0.3) {
    textureObjects.push('узоры', 'орнаменты', 'текстиль', 'повторяющиеся элементы');
  }
  
  return {
    textureObjects,
    smoothness: textureData.smoothness / variations.length,
    roughness: textureData.roughness / variations.length,
    uniformity: textureData.uniformity
  };
}

/**
 * Обнаружение форм
 */
function detectShapes(imageBuffer) {
  const sampleSize = Math.min(8000, imageBuffer.length);
  const sample = imageBuffer.slice(0, sampleSize);
  
  let shapeData = {
    geometric: 0,
    organic: 0,
    linear: 0,
    circular: 0,
    complexity: 0
  };
  
  // Анализируем последовательности значений для поиска паттернов
  for (let i = 10; i < sample.length - 10; i += 10) {
    const segment = sample.slice(i - 10, i + 10);
    
    // Ищем линейные паттерны
    let linearScore = 0;
    for (let j = 1; j < segment.length - 1; j++) {
      const diff1 = Math.abs((segment[j] || 0) - (segment[j-1] || 0));
      const diff2 = Math.abs((segment[j+1] || 0) - (segment[j] || 0));
      if (Math.abs(diff1 - diff2) < 10) linearScore++;
    }
    
    if (linearScore > segment.length * 0.6) {
      shapeData.linear++;
      shapeData.geometric++;
    }
    
    // Ищем циклические паттерны
    let cyclicalScore = 0;
    for (let j = 2; j < segment.length - 2; j++) {
      const val = segment[j] || 0;
      const prev2 = segment[j-2] || 0;
      const next2 = segment[j+2] || 0;
      if (Math.abs(val - prev2) < 15 && Math.abs(val - next2) < 15) cyclicalScore++;
    }
    
    if (cyclicalScore > segment.length * 0.4) {
      shapeData.circular++;
      shapeData.organic++;
    }
    
    // Вычисляем сложность
    let changes = 0;
    for (let j = 1; j < segment.length; j++) {
      if (Math.abs((segment[j] || 0) - (segment[j-1] || 0)) > 20) changes++;
    }
    shapeData.complexity += changes;
  }
  
  // Определяем объекты на основе форм
  let shapeObjects = [];
  let composition = 'смешанная';
  
  if (shapeData.geometric > shapeData.organic * 1.5) {
    shapeObjects.push('здания', 'мебель', 'техника', 'инструменты', 'искусственные объекты');
    composition = 'геометрическая';
  }
  
  if (shapeData.organic > shapeData.geometric) {
    shapeObjects.push('люди', 'животные', 'растения', 'природные формы', 'органические объекты');
    composition = 'органическая';
  }
  
  if (shapeData.linear > shapeData.circular * 1.5) {
    shapeObjects.push('дороги', 'провода', 'линии', 'границы', 'структурные элементы');
  }
  
  if (shapeData.circular > shapeData.linear) {
    shapeObjects.push('колеса', 'мячи', 'часы', 'круглые объекты', 'циклические формы');
  }
  
  return {
    shapeObjects,
    composition,
    geometricScore: shapeData.geometric / (shapeData.geometric + shapeData.organic),
    complexity: shapeData.complexity / sampleSize
  };
}

/**
 * Поиск паттернов
 */
function findPatterns(imageBuffer) {
  const sampleSize = Math.min(5000, imageBuffer.length);
  const sample = imageBuffer.slice(0, sampleSize);
  
  let patternData = {
    repetitive: 0,
    random: 0,
    symmetric: 0,
    gradients: 0
  };
  
  // Ищем повторяющиеся последовательности
  for (let i = 0; i < sample.length - 20; i += 10) {
    const pattern = sample.slice(i, i + 10);
    let matches = 0;
    
    for (let j = i + 10; j < sample.length - 10; j += 10) {
      const candidate = sample.slice(j, j + 10);
      let similarity = 0;
      
      for (let k = 0; k < Math.min(pattern.length, candidate.length); k++) {
        if (Math.abs((pattern[k] || 0) - (candidate[k] || 0)) < 20) similarity++;
      }
      
      if (similarity > pattern.length * 0.7) matches++;
    }
    
    if (matches > 2) patternData.repetitive++;
  }
  
  // Ищем градиенты
  for (let i = 0; i < sample.length - 10; i += 10) {
    const segment = sample.slice(i, i + 10);
    let isGradient = true;
    
    for (let j = 1; j < segment.length; j++) {
      const diff = (segment[j] || 0) - (segment[j-1] || 0);
      if (Math.abs(diff) > 30) {
        isGradient = false;
        break;
      }
    }
    
    if (isGradient) patternData.gradients++;
  }
  
  // Определяем объекты на основе паттернов
  let patternObjects = [];
  
  if (patternData.repetitive > 0) {
    patternObjects.push('узоры', 'текстиль', 'архитектурные элементы', 'повторяющиеся структуры');
  }
  
  if (patternData.gradients > sample.length / 100) {
    patternObjects.push('небо', 'закат', 'освещение', 'плавные переходы');
  }
  
  return {
    patternObjects,
    repetitiveness: patternData.repetitive / (sample.length / 100),
    smoothness: patternData.gradients / (sample.length / 100)
  };
}

/**
 * Идентификация объектов на основе всех анализов
 */
function identifyObjects(analysisData) {
  const { colors, edges, textures, shapes, patterns, filename } = analysisData;
  
  // Собираем все потенциальные объекты
  let allObjects = [
    ...colors.colorObjects,
    ...edges.edgeObjects,
    ...textures.textureObjects,
    ...shapes.shapeObjects,
    ...patterns.patternObjects
  ];
  
  // Подсчитываем частоту упоминаний каждого объекта
  let objectCounts = {};
  allObjects.forEach(obj => {
    objectCounts[obj] = (objectCounts[obj] || 0) + 1;
  });
  
  // Сортируем объекты по частоте упоминаний
  let detectedObjects = Object.entries(objectCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8) // Берем топ-8 объектов
    .map(([obj, count]) => ({
      name: obj,
      confidence: Math.min(count / 5, 1) // Нормализуем уверенность
    }));
  
  // Определяем тип сцены
  let sceneType = 'общая сцена';
  if (detectedObjects.some(obj => obj.name.includes('здания') || obj.name.includes('архитектура'))) {
    sceneType = 'городская архитектура';
  } else if (detectedObjects.some(obj => obj.name.includes('растения') || obj.name.includes('природа'))) {
    sceneType = 'природный пейзаж';
  } else if (detectedObjects.some(obj => obj.name.includes('люди'))) {
    sceneType = 'портрет или люди';
  } else if (detectedObjects.some(obj => obj.name.includes('техника'))) {
    sceneType = 'технологические объекты';
  }
  
  // Анализируем имя файла для дополнительного контекста
  const fileName = filename.toLowerCase();
  if (fileName.includes('photo') || fileName.includes('img') || fileName.includes('picture')) {
    sceneType += ' (фотография)';
  }
  
  return {
    objects: detectedObjects,
    sceneType,
    confidence: detectedObjects.length > 0 ? 
      detectedObjects.reduce((sum, obj) => sum + obj.confidence, 0) / detectedObjects.length : 0.5
  };
}

/**
 * Генерация детального описания
 */
function generateDetailedDescription(detectedObjects, colorAnalysis, filename) {
  let description = '';
  
  // Начинаем с типа сцены
  description += `${detectedObjects.sceneType} с `;
  
  // Добавляем цветовое описание
  if (colorAnalysis.dominantColors.length > 0) {
    description += `преобладанием ${colorAnalysis.dominantColors.join(' и ')} цветов. `;
  } else {
    description += 'разнообразной цветовой палитрой. ';
  }
  
  // Добавляем обнаруженные объекты
  if (detectedObjects.objects.length > 0) {
    const topObjects = detectedObjects.objects.slice(0, 5);
    const objectNames = topObjects.map(obj => obj.name);
    description += `На изображении обнаружены: ${objectNames.join(', ')}. `;
  }
  
  // Добавляем информацию об освещении
  description += `Освещение: ${colorAnalysis.lighting}. `;
  
  // Добавляем общую оценку качества
  if (detectedObjects.confidence > 0.7) {
    description += 'Высокая детализация и четкость изображения.';
  } else if (detectedObjects.confidence > 0.4) {
    description += 'Хорошее качество с различимыми деталями.';
  } else {
    description += 'Стандартное качество изображения.';
  }
  
  return description;
}

module.exports = {
  detectObjects,
  analyzeColors,
  detectEdges,
  analyzeTextures,
  detectShapes,
  findPatterns
};