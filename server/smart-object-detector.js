/**
 * Умная система распознавания и удаления объектов без внешних API
 * Использует анализ цветов, контуров и паттернов для поиска объектов
 */

const sharp = require('sharp');

/**
 * Анализ изображения для поиска объектов по описанию
 */
async function findObjectInImage(imageBuffer, objectDescription) {
  try {
    const image = sharp(imageBuffer);
    const { width, height, channels } = await image.metadata();
    
    // Получаем пиксели изображения для анализа
    const { data } = await image.raw().toBuffer({ resolveWithObject: true });
    
    // Анализируем объект по описанию
    const objectInfo = analyzeObjectDescription(objectDescription);
    
    // Ищем области с подходящими характеристиками
    const detectedAreas = findObjectAreas(data, width, height, channels, objectInfo);
    
    return {
      found: detectedAreas.length > 0,
      areas: detectedAreas,
      objectType: objectInfo.type,
      confidence: detectedAreas.length > 0 ? 0.7 : 0.0
    };
    
  } catch (error) {
    console.error('❌ [DETECTOR] Ошибка анализа:', error);
    return { found: false, areas: [], confidence: 0.0 };
  }
}

/**
 * Анализ описания объекта для определения характеристик поиска
 */
function analyzeObjectDescription(description) {
  const desc = description.toLowerCase();
  
  // Определяем тип объекта и его характеристики
  if (desc.includes('меч') || desc.includes('sword') || desc.includes('blade')) {
    return {
      type: 'weapon',
      colors: [[180, 180, 180], [120, 120, 120]], // серебристые оттенки
      shape: 'elongated',
      expectedSize: 'medium',
      searchAreas: ['center', 'hands']
    };
  }
  
  if (desc.includes('лицо') || desc.includes('face') || desc.includes('голова')) {
    return {
      type: 'face',
      colors: [[220, 180, 160], [180, 140, 120]], // оттенки кожи
      shape: 'oval',
      expectedSize: 'medium',
      searchAreas: ['top']
    };
  }
  
  if (desc.includes('рука') || desc.includes('hand') || desc.includes('arm')) {
    return {
      type: 'limb',
      colors: [[220, 180, 160], [180, 140, 120]], // оттенки кожи
      shape: 'elongated',
      expectedSize: 'small',
      searchAreas: ['sides', 'center']
    };
  }
  
  if (desc.includes('одежда') || desc.includes('clothes') || desc.includes('рубаш')) {
    return {
      type: 'clothing',
      colors: [[100, 100, 200], [200, 100, 100], [100, 200, 100]], // разные цвета одежды
      shape: 'irregular',
      expectedSize: 'large',
      searchAreas: ['center', 'body']
    };
  }
  
  if (desc.includes('фон') || desc.includes('background')) {
    return {
      type: 'background',
      colors: [[200, 200, 200], [100, 150, 200]], // нейтральные цвета
      shape: 'large_area',
      expectedSize: 'large',
      searchAreas: ['edges']
    };
  }
  
  // Общий объект
  return {
    type: 'generic',
    colors: [[128, 128, 128]], // серый
    shape: 'any',
    expectedSize: 'medium',
    searchAreas: ['center']
  };
}

/**
 * Поиск областей объекта на изображении
 */
function findObjectAreas(pixelData, width, height, channels, objectInfo) {
  const areas = [];
  const searchRegions = getSearchRegions(width, height, objectInfo.searchAreas);
  
  for (const region of searchRegions) {
    const foundArea = searchInRegion(pixelData, width, height, channels, region, objectInfo);
    if (foundArea) {
      areas.push(foundArea);
    }
  }
  
  return areas;
}

/**
 * Определение областей поиска
 */
function getSearchRegions(width, height, searchAreas) {
  const regions = [];
  
  for (const area of searchAreas) {
    switch (area) {
      case 'center':
        regions.push({
          x: Math.round(width * 0.25),
          y: Math.round(height * 0.25),
          width: Math.round(width * 0.5),
          height: Math.round(height * 0.5),
          name: 'center'
        });
        break;
        
      case 'top':
        regions.push({
          x: Math.round(width * 0.2),
          y: 0,
          width: Math.round(width * 0.6),
          height: Math.round(height * 0.4),
          name: 'top'
        });
        break;
        
      case 'hands':
        // Левая рука
        regions.push({
          x: 0,
          y: Math.round(height * 0.3),
          width: Math.round(width * 0.3),
          height: Math.round(height * 0.4),
          name: 'left_hand'
        });
        // Правая рука
        regions.push({
          x: Math.round(width * 0.7),
          y: Math.round(height * 0.3),
          width: Math.round(width * 0.3),
          height: Math.round(height * 0.4),
          name: 'right_hand'
        });
        break;
        
      case 'edges':
        // Верхний край
        regions.push({
          x: 0, y: 0,
          width: width,
          height: Math.round(height * 0.2),
          name: 'top_edge'
        });
        break;
    }
  }
  
  return regions;
}

/**
 * Поиск объекта в конкретной области
 */
function searchInRegion(pixelData, width, height, channels, region, objectInfo) {
  let matchCount = 0;
  let totalPixels = 0;
  
  for (let y = region.y; y < region.y + region.height && y < height; y++) {
    for (let x = region.x; x < region.x + region.width && x < width; x++) {
      const pixelIndex = (y * width + x) * channels;
      const r = pixelData[pixelIndex];
      const g = pixelData[pixelIndex + 1];
      const b = pixelData[pixelIndex + 2];
      
      // Проверяем совпадение с ожидаемыми цветами
      for (const targetColor of objectInfo.colors) {
        const colorDistance = Math.sqrt(
          Math.pow(r - targetColor[0], 2) +
          Math.pow(g - targetColor[1], 2) +
          Math.pow(b - targetColor[2], 2)
        );
        
        if (colorDistance < 80) { // Порог схожести цвета
          matchCount++;
          break;
        }
      }
      
      totalPixels++;
    }
  }
  
  const matchRatio = matchCount / totalPixels;
  
  // Если найдено достаточно совпадений, считаем что объект найден
  if (matchRatio > 0.15) {
    return {
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height,
      confidence: matchRatio,
      regionName: region.name
    };
  }
  
  return null;
}

/**
 * Умное удаление найденного объекта
 */
async function removeDetectedObject(imageBuffer, objectAreas, objectType) {
  try {
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();
    
    // Создаем маски для удаления
    const masks = [];
    
    for (const area of objectAreas) {
      // Выбираем цвет замещения в зависимости от типа объекта
      let replacementColor = { r: 255, g: 255, b: 255 }; // белый по умолчанию
      
      if (objectType === 'background') {
        replacementColor = { r: 240, g: 240, b: 245 }; // светло-серый
      } else if (objectType === 'weapon') {
        replacementColor = { r: 200, g: 200, b: 200 }; // нейтральный серый
      }
      
      // Создаем маску замещения
      const mask = sharp({
        create: {
          width: Math.round(area.width),
          height: Math.round(area.height),
          channels: 3,
          background: replacementColor
        }
      }).png();
      
      masks.push({
        input: await mask.toBuffer(),
        left: Math.round(area.x),
        top: Math.round(area.y),
        blend: 'over'
      });
    }
    
    // Применяем все маски
    const result = await image.composite(masks).png().toBuffer();
    
    return {
      success: true,
      processedImage: result,
      removedAreas: objectAreas.length,
      objectType: objectType
    };
    
  } catch (error) {
    console.error('❌ [DETECTOR] Ошибка удаления:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  findObjectInImage,
  removeDetectedObject,
  analyzeObjectDescription
};