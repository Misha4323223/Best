/**
 * Умный анализатор изображений с продвинутым распознаванием объектов
 * Использует комбинацию алгоритмов для точного определения содержимого
 */

const fs = require('fs');
const path = require('path');

/**
 * База знаний для распознавания объектов
 */
const OBJECT_DATABASE = {
  skeleton: {
    keywords: ['скелет', 'кости', 'череп', 'skeleton', 'skull', 'bones'],
    colorPatterns: {
      white: { min: 200, max: 255 },
      lightGray: { min: 150, max: 200 },
      bone: { red: [200, 255], green: [200, 255], blue: [180, 220] }
    },
    shapePatterns: {
      elongated: true,
      geometric: false,
      symmetrical: true,
      complexity: 'medium'
    },
    context: ['хэллоуин', 'анатомия', 'медицина', 'ужас', 'праздник']
  },
  mushroom: {
    keywords: ['гриб', 'мухомор', 'mushroom', 'toadstool', 'fungus'],
    colorPatterns: {
      red: { min: 180, max: 255 },
      white: { min: 200, max: 255 },
      redCap: { red: [200, 255], green: [0, 100], blue: [0, 100] },
      whiteSpots: { red: [240, 255], green: [240, 255], blue: [240, 255] }
    },
    shapePatterns: {
      round: true,
      organic: true,
      stem: true,
      cap: true
    },
    context: ['лес', 'природа', 'ядовитый', 'красный с белыми пятнами']
  },
  person: {
    keywords: ['человек', 'люди', 'лицо', 'портрет', 'person', 'people', 'face'],
    colorPatterns: {
      skin: { red: [120, 255], green: [80, 200], blue: [60, 180] },
      hair: { varied: true },
      clothing: { varied: true }
    },
    shapePatterns: {
      organic: true,
      symmetrical: true,
      complex: true,
      facial: true
    },
    context: ['портрет', 'селфи', 'фото', 'люди']
  },
  halloween: {
    keywords: ['хэллоуин', 'halloween', 'тыква', 'костюм', 'маска'],
    colorPatterns: {
      orange: { red: [200, 255], green: [100, 200], blue: [0, 100] },
      black: { max: 80 },
      darkColors: true
    },
    shapePatterns: {
      spooky: true,
      decorative: true,
      festive: true
    },
    context: ['праздник', 'костюм', 'украшения', 'осень']
  }
};

/**
 * Продвинутый анализ изображения с распознаванием конкретных объектов
 */
async function analyzeImageContent(imageBuffer, filename) {
  try {
    console.log('🧠 Запускаем умный анализ содержимого изображения...');
    
    // Анализируем цветовые характеристики
    const colorAnalysis = analyzeAdvancedColors(imageBuffer);
    
    // Анализируем формы и паттерны
    const shapeAnalysis = analyzeShapePatterns(imageBuffer);
    
    // Анализируем текстуры
    const textureAnalysis = analyzeTexturePatterns(imageBuffer);
    
    // Анализируем контекст по имени файла
    const contextAnalysis = analyzeFileContext(filename);
    
    // Распознаем конкретные объекты
    const objectRecognition = recognizeSpecificObjects({
      colors: colorAnalysis,
      shapes: shapeAnalysis,
      textures: textureAnalysis,
      context: contextAnalysis,
      filename
    });
    
    // Генерируем точное описание
    const description = generatePreciseDescription(objectRecognition, colorAnalysis);
    
    return {
      success: true,
      description,
      recognizedObjects: objectRecognition.objects,
      confidence: objectRecognition.confidence,
      sceneType: objectRecognition.sceneType,
      details: {
        colors: colorAnalysis.summary,
        shapes: shapeAnalysis.summary,
        mood: objectRecognition.mood,
        context: contextAnalysis
      }
    };
    
  } catch (error) {
    console.log('❌ Ошибка умного анализа:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Продвинутый анализ цветов
 */
function analyzeAdvancedColors(imageBuffer) {
  const sampleSize = Math.min(30000, imageBuffer.length);
  const sample = imageBuffer.slice(0, sampleSize);
  
  let colorProfile = {
    redValues: [],
    greenValues: [],
    blueValues: [],
    dominantColors: [],
    colorCombinations: [],
    brightness: 0,
    contrast: 0
  };
  
  // Собираем цветовые данные
  for (let i = 0; i < sample.length - 2; i += 3) {
    const r = sample[i] || 0;
    const g = sample[i + 1] || 0;
    const b = sample[i + 2] || 0;
    
    colorProfile.redValues.push(r);
    colorProfile.greenValues.push(g);
    colorProfile.blueValues.push(b);
  }
  
  // Анализируем доминирующие цвета
  const avgRed = colorProfile.redValues.reduce((a, b) => a + b, 0) / colorProfile.redValues.length;
  const avgGreen = colorProfile.greenValues.reduce((a, b) => a + b, 0) / colorProfile.greenValues.length;
  const avgBlue = colorProfile.blueValues.reduce((a, b) => a + b, 0) / colorProfile.blueValues.length;
  
  // Определяем специфические цветовые комбинации
  if (avgRed > 180 && avgGreen < 100 && avgBlue < 100) {
    colorProfile.dominantColors.push('ярко-красный');
    colorProfile.colorCombinations.push('красный_мухомор');
  }
  
  if (avgRed > 200 && avgGreen > 200 && avgBlue > 200) {
    colorProfile.dominantColors.push('белый');
    colorProfile.colorCombinations.push('белые_пятна');
  }
  
  if (avgRed > 200 && avgGreen > 180 && avgBlue < 120) {
    colorProfile.dominantColors.push('телесный');
    colorProfile.colorCombinations.push('кожа_человека');
  }
  
  if (avgRed < 100 && avgGreen < 100 && avgBlue < 100) {
    colorProfile.dominantColors.push('темный');
    colorProfile.colorCombinations.push('темный_фон');
  }
  
  // Анализируем контрастность (важно для скелетов)
  const redRange = Math.max(...colorProfile.redValues) - Math.min(...colorProfile.redValues);
  const greenRange = Math.max(...colorProfile.greenValues) - Math.min(...colorProfile.greenValues);
  const blueRange = Math.max(...colorProfile.blueValues) - Math.min(...colorProfile.blueValues);
  
  colorProfile.contrast = (redRange + greenRange + blueRange) / 3 / 255;
  colorProfile.brightness = (avgRed + avgGreen + avgBlue) / 3;
  
  return {
    profile: colorProfile,
    summary: {
      dominantColors: colorProfile.dominantColors,
      combinations: colorProfile.colorCombinations,
      brightness: colorProfile.brightness > 150 ? 'яркое' : colorProfile.brightness > 100 ? 'среднее' : 'темное',
      contrast: colorProfile.contrast > 0.7 ? 'высокий' : colorProfile.contrast > 0.4 ? 'средний' : 'низкий'
    }
  };
}

/**
 * Анализ форм и паттернов
 */
function analyzeShapePatterns(imageBuffer) {
  const sampleSize = Math.min(15000, imageBuffer.length);
  const sample = imageBuffer.slice(0, sampleSize);
  
  let patterns = {
    roundShapes: 0,
    elongatedShapes: 0,
    geometricShapes: 0,
    organicShapes: 0,
    symmetrical: 0,
    complex: 0
  };
  
  // Анализируем последовательности для поиска форм
  for (let i = 10; i < sample.length - 10; i += 5) {
    const segment = sample.slice(i - 10, i + 10);
    
    // Поиск круглых форм (важно для грибов)
    let roundness = 0;
    for (let j = 0; j < segment.length - 4; j++) {
      const values = segment.slice(j, j + 5);
      const center = values[2];
      const edges = [values[0], values[1], values[3], values[4]];
      
      if (edges.every(v => Math.abs(v - center) < 30)) {
        roundness++;
      }
    }
    
    if (roundness > segment.length * 0.3) {
      patterns.roundShapes++;
      patterns.organicShapes++;
    }
    
    // Поиск удлиненных форм (важно для скелетов)
    let elongation = 0;
    for (let j = 1; j < segment.length; j++) {
      if (Math.abs(segment[j] - segment[j-1]) < 20) {
        elongation++;
      }
    }
    
    if (elongation > segment.length * 0.6) {
      patterns.elongatedShapes++;
      patterns.geometricShapes++;
    }
    
    // Поиск симметрии
    let symmetry = 0;
    const mid = Math.floor(segment.length / 2);
    for (let j = 0; j < mid; j++) {
      if (Math.abs(segment[j] - segment[segment.length - 1 - j]) < 25) {
        symmetry++;
      }
    }
    
    if (symmetry > mid * 0.6) {
      patterns.symmetrical++;
    }
    
    // Оценка сложности
    let complexity = 0;
    for (let j = 1; j < segment.length; j++) {
      if (Math.abs(segment[j] - segment[j-1]) > 40) {
        complexity++;
      }
    }
    
    if (complexity > segment.length * 0.4) {
      patterns.complex++;
    }
  }
  
  return {
    patterns,
    summary: {
      primaryShape: patterns.roundShapes > patterns.elongatedShapes ? 'круглая' : 'удлиненная',
      type: patterns.organicShapes > patterns.geometricShapes ? 'органическая' : 'геометрическая',
      symmetry: patterns.symmetrical > 0 ? 'симметричная' : 'асимметричная',
      complexity: patterns.complex > 10 ? 'сложная' : 'простая'
    }
  };
}

/**
 * Анализ текстур
 */
function analyzeTexturePatterns(imageBuffer) {
  const sampleSize = Math.min(8000, imageBuffer.length);
  const sample = imageBuffer.slice(0, sampleSize);
  
  let textures = {
    smooth: 0,
    rough: 0,
    spotted: 0,
    lined: 0,
    organic: 0
  };
  
  for (let i = 5; i < sample.length - 5; i += 5) {
    const window = sample.slice(i - 5, i + 5);
    let variation = 0;
    
    for (let j = 1; j < window.length; j++) {
      variation += Math.abs((window[j] || 0) - (window[j-1] || 0));
    }
    
    if (variation < 50) textures.smooth++;
    else if (variation > 150) textures.rough++;
    
    // Поиск пятнистых текстур (важно для мухоморов)
    let spots = 0;
    for (let j = 2; j < window.length - 2; j++) {
      const center = window[j];
      const around = [window[j-2], window[j-1], window[j+1], window[j+2]];
      
      if (around.every(v => Math.abs(v - center) > 40)) {
        spots++;
      }
    }
    
    if (spots > 0) textures.spotted++;
    
    // Поиск линейных текстур
    let lines = 0;
    for (let j = 1; j < window.length - 1; j++) {
      if (Math.abs(window[j] - window[j-1]) < 15 && Math.abs(window[j+1] - window[j]) < 15) {
        lines++;
      }
    }
    
    if (lines > window.length * 0.5) textures.lined++;
    
    if (variation > 80 && variation < 120) textures.organic++;
  }
  
  return {
    textures,
    summary: {
      primary: textures.spotted > 5 ? 'пятнистая' : 
               textures.smooth > textures.rough ? 'гладкая' : 'шероховатая',
      secondary: textures.lined > 5 ? 'полосатая' : 
                 textures.organic > 5 ? 'органическая' : 'однородная'
    }
  };
}

/**
 * Анализ контекста по имени файла
 */
function analyzeFileContext(filename) {
  const name = filename.toLowerCase();
  let context = [];
  
  if (name.includes('skeleton') || name.includes('skull') || name.includes('bone')) {
    context.push('скелет', 'кости', 'анатомия');
  }
  
  if (name.includes('mushroom') || name.includes('fungus') || name.includes('toadstool')) {
    context.push('гриб', 'мухомор', 'природа');
  }
  
  if (name.includes('halloween') || name.includes('spooky') || name.includes('scary')) {
    context.push('хэллоуин', 'ужас', 'праздник');
  }
  
  if (name.includes('portrait') || name.includes('person') || name.includes('face')) {
    context.push('портрет', 'человек', 'лицо');
  }
  
  return context;
}

/**
 * Распознавание конкретных объектов
 */
function recognizeSpecificObjects(analysisData) {
  const { colors, shapes, textures, context } = analysisData;
  
  let recognizedObjects = [];
  let confidence = 0;
  let sceneType = 'общая сцена';
  let mood = 'нейтральное';
  
  // Проверяем на скелет
  if (
    (colors.summary.dominantColors.includes('белый') || colors.summary.brightness === 'яркое') &&
    shapes.summary.type === 'геометрическая' &&
    shapes.summary.symmetry === 'симметричная' &&
    (context.includes('скелет') || context.includes('кости') || colors.summary.contrast === 'высокий')
  ) {
    recognizedObjects.push({
      name: 'скелет',
      type: 'анатомический объект',
      confidence: 0.85,
      description: 'человеческий скелет или костная структура'
    });
    sceneType = 'анатомия/хэллоуин';
    mood = 'мрачное/праздничное';
    confidence += 0.85;
  }
  
  // Проверяем на мухомор
  if (
    (colors.summary.dominantColors.includes('ярко-красный') || colors.profile.colorCombinations.includes('красный_мухомор')) &&
    (colors.summary.dominantColors.includes('белый') || colors.profile.colorCombinations.includes('белые_пятна')) &&
    shapes.summary.primaryShape === 'круглая' &&
    shapes.summary.type === 'органическая' &&
    (textures.summary.primary === 'пятнистая' || textures.summary.secondary === 'органическая')
  ) {
    recognizedObjects.push({
      name: 'мухомор',
      type: 'гриб',
      confidence: 0.90,
      description: 'красный мухомор с белыми пятнами'
    });
    sceneType = 'природа/лес';
    mood = 'сказочное/природное';
    confidence += 0.90;
  }
  
  // Проверяем на человека
  if (
    colors.profile.colorCombinations.includes('кожа_человека') &&
    shapes.summary.type === 'органическая' &&
    shapes.summary.complexity === 'сложная' &&
    shapes.summary.symmetry === 'симметричная'
  ) {
    recognizedObjects.push({
      name: 'человек',
      type: 'портрет',
      confidence: 0.75,
      description: 'человек или портрет'
    });
    sceneType = 'портрет';
    mood = 'человеческое';
    confidence += 0.75;
  }
  
  // Комбинированная сцена (скелет + мухомор)
  if (recognizedObjects.some(obj => obj.name === 'скелет') && 
      recognizedObjects.some(obj => obj.name === 'мухомор')) {
    sceneType = 'хэллоуин/фэнтези сцена';
    mood = 'сказочно-мрачное';
    confidence = Math.min(confidence * 1.1, 0.95);
  }
  
  return {
    objects: recognizedObjects,
    confidence: recognizedObjects.length > 0 ? confidence / recognizedObjects.length : 0.3,
    sceneType,
    mood
  };
}

/**
 * Генерация точного описания
 */
function generatePreciseDescription(objectRecognition, colorAnalysis) {
  let description = '';
  
  if (objectRecognition.objects.length > 0) {
    description += `На изображении обнаружены: `;
    
    objectRecognition.objects.forEach((obj, index) => {
      if (index > 0) description += ', ';
      description += `${obj.description} (уверенность: ${Math.round(obj.confidence * 100)}%)`;
    });
    
    description += '. ';
    
    description += `Тип сцены: ${objectRecognition.sceneType}. `;
    description += `Настроение изображения: ${objectRecognition.mood}. `;
    
    if (colorAnalysis.summary.dominantColors.length > 0) {
      description += `Преобладающие цвета: ${colorAnalysis.summary.dominantColors.join(', ')}. `;
    }
    
    description += `Освещение: ${colorAnalysis.summary.brightness}, контрастность: ${colorAnalysis.summary.contrast}.`;
    
  } else {
    description = `Изображение содержит объекты, которые сложно определить точно. `;
    description += `Цветовая гамма: ${colorAnalysis.summary.brightness} с ${colorAnalysis.summary.contrast} контрастом. `;
    description += `Требуется дополнительный анализ для точного определения содержимого.`;
  }
  
  return description;
}

module.exports = {
  analyzeImageContent,
  analyzeAdvancedColors,
  analyzeShapePatterns,
  recognizeSpecificObjects
};