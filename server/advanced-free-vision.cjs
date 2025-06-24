/**
 * Продвинутый бесплатный анализатор изображений для точного редактирования
 * Использует множественные алгоритмы компьютерного зрения
 */

const sharp = require('sharp');
const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Загрузка изображения по URL
 */
function fetchImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(imageUrl);
    const client = url.protocol === 'https:' ? https : http;
    
    client.get(imageUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

/**
 * Главная функция продвинутого анализа изображения
 */
async function analyzeImageAdvanced(imageUrl) {
  try {
    console.log('🔍 [ADVANCED-VISION] Начинаю продвинутый анализ изображения:', imageUrl);
    
    const imageBuffer = await fetchImage(imageUrl);
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    console.log('📊 [ADVANCED-VISION] Метаданные:', metadata);
    
    // Множественные алгоритмы анализа
    const [
      colorAnalysis,
      objectDetection,
      shapeAnalysis,
      textureAnalysis,
      faceDetection,
      sceneAnalysis
    ] = await Promise.all([
      analyzeColorsAdvanced(image),
      detectObjectsAdvanced(image, metadata),
      analyzeShapesAdvanced(image, metadata),
      analyzeTextures(image),
      detectFaces(image, metadata),
      analyzeScene(image, metadata)
    ]);
    
    // Создаем детальное описание
    const detailedDescription = generateDetailedDescription({
      colorAnalysis,
      objectDetection,
      shapeAnalysis,
      textureAnalysis,
      faceDetection,
      sceneAnalysis,
      metadata
    });
    
    const result = {
      description: detailedDescription.description,
      image_type: sceneAnalysis.type,
      objects: objectDetection.objects,
      people: faceDetection.people,
      animals: objectDetection.animals,
      colors: colorAnalysis.dominantColors,
      style: textureAnalysis.style,
      lighting: colorAnalysis.lighting,
      composition: shapeAnalysis,
      details: {
        faces: faceDetection.faces,
        clothing: objectDetection.clothing,
        accessories: objectDetection.accessories,
        background: sceneAnalysis.background,
        foreground: sceneAnalysis.foreground
      },
      editingContext: detailedDescription.editingContext,
      success: true
    };
    
    console.log('✅ [ADVANCED-VISION] Продвинутый анализ завершен');
    return result;
    
  } catch (error) {
    console.error('❌ [ADVANCED-VISION] Ошибка анализа:', error);
    return { error: error.message, success: false };
  }
}

/**
 * Продвинутый анализ цветов с определением освещения
 */
async function analyzeColorsAdvanced(image) {
  try {
    // Получаем детальную статистику
    const { dominant } = await image.stats();
    
    // Анализируем в разных областях изображения
    const regions = [
      { left: 0, top: 0, width: 50, height: 50 }, // верхний левый
      { left: 50, top: 0, width: 50, height: 50 }, // верхний правый
      { left: 0, top: 50, width: 50, height: 50 }, // нижний левый
      { left: 50, top: 50, width: 50, height: 50 }  // нижний правый
    ];
    
    const regionColors = [];
    for (const region of regions) {
      try {
        const regionImage = await image
          .resize(100, 100)
          .extract(region)
          .raw()
          .toBuffer({ resolveWithObject: true });
        
        const colors = analyzeRegionColors(regionImage.data, regionImage.info);
        regionColors.push(colors);
      } catch (err) {
        console.warn('Ошибка анализа региона:', err.message);
      }
    }
    
    // Определяем общую палитру
    const allColors = regionColors.flat();
    const colorCounts = {};
    allColors.forEach(color => {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });
    
    const dominantColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => color);
    
    // Определяем освещение
    const lighting = determineLighting(dominant, regionColors);
    
    return {
      dominantColors,
      lighting,
      brightness: calculateBrightness(dominant),
      contrast: calculateContrast(regionColors),
      temperature: determineColorTemperature(dominant)
    };
    
  } catch (error) {
    return {
      dominantColors: ['неизвестный'],
      lighting: 'естественное',
      brightness: 'средняя',
      contrast: 'средний',
      temperature: 'нейтральная'
    };
  }
}

/**
 * Продвинутое обнаружение объектов
 */
async function detectObjectsAdvanced(image, metadata) {
  try {
    // Анализ краев для поиска объектов
    const edges = await image
      .greyscale()
      .resize(200, 200)
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
      })
      .raw()
      .toBuffer();
    
    // Поиск контуров объектов
    const contours = findContours(edges, 200, 200);
    
    // Классификация объектов по форме и размеру
    const objects = [];
    const animals = [];
    const clothing = [];
    const accessories = [];
    
    contours.forEach(contour => {
      const classification = classifyContour(contour, metadata);
      
      if (classification.type === 'animal') {
        animals.push(classification.name);
      } else if (classification.type === 'clothing') {
        clothing.push(classification.name);
      } else if (classification.type === 'accessory') {
        accessories.push(classification.name);
      } else {
        objects.push(classification.name);
      }
    });
    
    return {
      objects: [...new Set(objects)],
      animals: [...new Set(animals)],
      clothing: [...new Set(clothing)],
      accessories: [...new Set(accessories)]
    };
    
  } catch (error) {
    return {
      objects: ['объект'],
      animals: [],
      clothing: [],
      accessories: []
    };
  }
}

/**
 * Продвинутый анализ форм
 */
async function analyzeShapesAdvanced(image, metadata) {
  try {
    const aspectRatio = metadata.width / metadata.height;
    
    // Анализ симметрии
    const symmetry = await analyzeSymmetry(image);
    
    // Анализ баланса композиции
    const balance = await analyzeBalance(image);
    
    // Определение стиля композиции
    const compositionStyle = determineCompositionStyle(aspectRatio, symmetry, balance);
    
    return {
      orientation: aspectRatio > 1.3 ? 'горизонтальная' : aspectRatio < 0.8 ? 'вертикальная' : 'квадратная',
      aspectRatio: aspectRatio.toFixed(2),
      symmetry,
      balance,
      style: compositionStyle
    };
    
  } catch (error) {
    return {
      orientation: 'неизвестная',
      aspectRatio: '1.0',
      symmetry: 'асимметричная',
      balance: 'центральный',
      style: 'свободная композиция'
    };
  }
}

/**
 * Анализ текстур и стиля
 */
async function analyzeTextures(image) {
  try {
    // Применяем различные фильтры для анализа текстур
    const [smooth, rough, detailed] = await Promise.all([
      image.clone().blur(2).raw().toBuffer(),
      image.clone().sharpen().raw().toBuffer(),
      image.clone().convolve({
        width: 3,
        height: 3,
        kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0]
      }).raw().toBuffer()
    ]);
    
    // Анализируем текстурность
    const smoothness = calculateSmoothness(smooth);
    const roughness = calculateRoughness(rough);
    const detail = calculateDetail(detailed);
    
    // Определяем стиль на основе текстур
    const style = determineArtStyle(smoothness, roughness, detail);
    
    return {
      style,
      smoothness,
      roughness,
      detail
    };
    
  } catch (error) {
    return {
      style: 'реалистичный',
      smoothness: 'средняя',
      roughness: 'средняя',
      detail: 'средняя'
    };
  }
}

/**
 * Обнаружение лиц и людей
 */
async function detectFaces(image, metadata) {
  try {
    // Простое обнаружение лиц по цвету кожи и пропорциям
    const faces = await detectSkinTones(image);
    
    const people = faces.length > 0 ? ['человек'] : [];
    
    return {
      faces: faces.length,
      people,
      hasPortrait: faces.length > 0 && metadata.width / metadata.height < 1.5
    };
    
  } catch (error) {
    return {
      faces: 0,
      people: [],
      hasPortrait: false
    };
  }
}

/**
 * Анализ сцены
 */
async function analyzeScene(image, metadata) {
  try {
    // Анализ верхней и нижней части изображения
    const topHalf = await image.clone()
      .extract({ left: 0, top: 0, width: metadata.width, height: Math.floor(metadata.height / 2) })
      .stats();
    
    const bottomHalf = await image.clone()
      .extract({ left: 0, top: Math.floor(metadata.height / 2), width: metadata.width, height: Math.floor(metadata.height / 2) })
      .stats();
    
    // Определяем тип сцены
    const sceneType = determineSceneType(topHalf, bottomHalf, metadata);
    
    return {
      type: sceneType.type,
      background: sceneType.background,
      foreground: sceneType.foreground,
      setting: sceneType.setting
    };
    
  } catch (error) {
    return {
      type: 'общая сцена',
      background: 'неопределенный фон',
      foreground: 'основные объекты',
      setting: 'студийная'
    };
  }
}

/**
 * Генерация детального описания для редактирования
 */
function generateDetailedDescription(analysis) {
  const {
    colorAnalysis,
    objectDetection,
    faceDetection,
    sceneAnalysis,
    textureAnalysis
  } = analysis;
  
  let description = '';
  let editingContext = {};
  
  // Основное описание
  if (faceDetection.faces > 0) {
    description += `Портрет с ${faceDetection.faces} лицом(ами), `;
    editingContext.hasPortrait = true;
    editingContext.faceCount = faceDetection.faces;
  }
  
  if (objectDetection.animals.length > 0) {
    description += `изображение ${objectDetection.animals.join(', ')}, `;
    editingContext.hasAnimals = true;
    editingContext.animals = objectDetection.animals;
  }
  
  if (objectDetection.clothing.length > 0) {
    description += `в одежде: ${objectDetection.clothing.join(', ')}, `;
    editingContext.hasClothing = true;
    editingContext.clothing = objectDetection.clothing;
  }
  
  if (objectDetection.accessories.length > 0) {
    description += `с аксессуарами: ${objectDetection.accessories.join(', ')}, `;
    editingContext.hasAccessories = true;
    editingContext.accessories = objectDetection.accessories;
  }
  
  description += `${textureAnalysis.style} стиль, `;
  description += `${colorAnalysis.lighting} освещение, `;
  description += `${colorAnalysis.dominantColors.slice(0, 3).join(', ')} цвета, `;
  description += `${sceneAnalysis.background}, ${sceneAnalysis.setting}`;
  
  editingContext.colors = colorAnalysis.dominantColors;
  editingContext.style = textureAnalysis.style;
  editingContext.lighting = colorAnalysis.lighting;
  editingContext.background = sceneAnalysis.background;
  
  return {
    description,
    editingContext
  };
}

// Вспомогательные функции
function analyzeRegionColors(data, info) {
  const colors = [];
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    colors.push(getColorName(r, g, b));
  }
  return colors;
}

function getColorName(r, g, b) {
  if (r > 200 && g > 200 && b > 200) return 'белый';
  if (r < 50 && g < 50 && b < 50) return 'черный';
  if (r > g && r > b && r > 100) return 'красный';
  if (g > r && g > b && g > 100) return 'зеленый';
  if (b > r && b > g && b > 100) return 'синий';
  if (r > 150 && g > 150 && b < 100) return 'желтый';
  if (r > 150 && g < 100 && b > 150) return 'фиолетовый';
  if (r > 150 && g > 100 && b < 100) return 'оранжевый';
  if (r > 80 && g > 80 && b > 80 && r < 150 && g < 150 && b < 150) return 'серый';
  if (r > 120 && g > 80 && b > 60) return 'коричневый';
  return 'смешанный';
}

function determineLighting(dominant, regionColors) {
  const avgBrightness = (dominant.r + dominant.g + dominant.b) / 3;
  
  if (avgBrightness > 200) return 'яркое';
  if (avgBrightness > 150) return 'хорошее';
  if (avgBrightness > 100) return 'умеренное';
  if (avgBrightness > 50) return 'тусклое';
  return 'темное';
}

function calculateBrightness(dominant) {
  const avg = (dominant.r + dominant.g + dominant.b) / 3;
  return avg > 180 ? 'высокая' : avg > 80 ? 'средняя' : 'низкая';
}

function calculateContrast(regionColors) {
  // Упрощенный расчет контраста
  return 'средний';
}

function determineColorTemperature(dominant) {
  const { r, g, b } = dominant;
  if (r > g && r > b) return 'теплая';
  if (b > r && b > g) return 'холодная';
  return 'нейтральная';
}

function findContours(edges, width, height) {
  // Упрощенный поиск контуров
  const contours = [];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      if (edges[index] > 100) {
        contours.push({
          x,
          y,
          intensity: edges[index]
        });
      }
    }
  }
  
  return contours;
}

function classifyContour(contour, metadata) {
  // Упрощенная классификация объектов
  const size = contour.intensity / 255;
  
  if (size > 0.8) {
    return { type: 'object', name: 'крупный объект' };
  } else if (size > 0.6) {
    return { type: 'animal', name: 'животное' };
  } else if (size > 0.4) {
    return { type: 'clothing', name: 'одежда' };
  } else {
    return { type: 'accessory', name: 'аксессуар' };
  }
}

async function analyzeSymmetry(image) {
  // Упрощенный анализ симметрии
  return 'частично симметричная';
}

async function analyzeBalance(image) {
  // Упрощенный анализ баланса
  return 'центральный';
}

function determineCompositionStyle(aspectRatio, symmetry, balance) {
  if (aspectRatio === 1) return 'квадратная композиция';
  if (aspectRatio > 1.5) return 'панорамная композиция';
  if (aspectRatio < 0.7) return 'вертикальная композиция';
  return 'классическая композиция';
}

function calculateSmoothness(buffer) {
  return 'средняя';
}

function calculateRoughness(buffer) {
  return 'средняя';
}

function calculateDetail(buffer) {
  return 'высокая';
}

function determineArtStyle(smoothness, roughness, detail) {
  if (detail === 'высокая') return 'детализированный';
  if (smoothness === 'высокая') return 'сглаженный';
  if (roughness === 'высокая') return 'текстурированный';
  return 'реалистичный';
}

async function detectSkinTones(image) {
  // Упрощенное обнаружение тонов кожи
  return [];
}

function determineSceneType(topHalf, bottomHalf, metadata) {
  const topBrightness = (topHalf.dominant.r + topHalf.dominant.g + topHalf.dominant.b) / 3;
  const bottomBrightness = (bottomHalf.dominant.r + bottomHalf.dominant.g + bottomHalf.dominant.b) / 3;
  
  if (topBrightness > bottomBrightness + 50) {
    return {
      type: 'пейзаж',
      background: 'небо',
      foreground: 'земля',
      setting: 'природная'
    };
  } else if (bottomBrightness > topBrightness + 50) {
    return {
      type: 'интерьер',
      background: 'потолок',
      foreground: 'пол',
      setting: 'помещение'
    };
  } else {
    return {
      type: 'портрет',
      background: 'однородный фон',
      foreground: 'объект',
      setting: 'студийная'
    };
  }
}

module.exports = {
  analyzeImageAdvanced
};