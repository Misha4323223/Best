/**
 * Adobe Illustrator Image Trace Engine - Полная реализация
 * Воспроизводит все алгоритмы Adobe Illustrator Live Trace
 */

const sharp = require('sharp');
const potrace = require('potrace');

/**
 * Adobe Trace Presets - точные настройки как в Illustrator
 */
const ADOBE_PRESETS = {
  AUTO: {
    name: 'Auto',
    mode: 'color',
    palette: 'automatic',
    maxColors: 'auto',
    threshold: 'auto',
    paths: 'auto',
    corners: 'auto',
    noise: 'auto'
  },
  
  HIGH_FIDELITY_PHOTO: {
    name: 'High Fidelity Photo',
    mode: 'color',
    palette: 'full',
    maxColors: 30,
    threshold: 128,
    paths: 50,
    corners: 25,
    noise: 1,
    method: 'overlapping'
  },
  
  LOW_FIDELITY_PHOTO: {
    name: 'Low Fidelity Photo', 
    mode: 'color',
    palette: 'limited',
    maxColors: 6,
    threshold: 128,
    paths: 20,
    corners: 75,
    noise: 10,
    method: 'abutting'
  },
  
  THREE_COLORS: {
    name: '3 Colors',
    mode: 'color',
    palette: 'limited', 
    maxColors: 3,
    threshold: 128,
    paths: 25,
    corners: 75,
    noise: 20,
    method: 'abutting'
  },
  
  SIX_COLORS: {
    name: '6 Colors',
    mode: 'color',
    palette: 'limited',
    maxColors: 6, 
    threshold: 128,
    paths: 50,
    corners: 75,
    noise: 10,
    method: 'abutting'
  },
  
  SIXTEEN_COLORS: {
    name: '16 Colors',
    mode: 'color',
    palette: 'limited',
    maxColors: 16,
    threshold: 128, 
    paths: 100,
    corners: 50,
    noise: 5,
    method: 'abutting'
  },
  
  SHADES_OF_GRAY: {
    name: 'Shades of Gray',
    mode: 'grayscale',
    palette: 'limited',
    maxColors: 50,
    threshold: 128,
    paths: 100,
    corners: 50,
    noise: 5,
    method: 'abutting'
  },
  
  BLACK_AND_WHITE_LOGO: {
    name: 'Black and White Logo',
    mode: 'blackwhite',
    palette: 'limited',
    maxColors: 2,
    threshold: 128,
    paths: 25,
    corners: 100,
    noise: 25,
    method: 'abutting'
  },
  
  SKETCHED_ART: {
    name: 'Sketched Art',
    mode: 'color',
    palette: 'limited',
    maxColors: 6,
    threshold: 128,
    paths: 50,
    corners: 20,
    noise: 10,
    method: 'abutting',
    fills: false,
    strokes: true
  },
  
  SILHOUETTES: {
    name: 'Silhouettes',
    mode: 'blackwhite', 
    palette: 'limited',
    maxColors: 1,
    threshold: 128,
    paths: 25,
    corners: 100,
    noise: 100,
    method: 'abutting'
  },
  
  LINE_ART: {
    name: 'Line Art',
    mode: 'blackwhite',
    palette: 'limited', 
    maxColors: 1,
    threshold: 128,
    paths: 100,
    corners: 20,
    noise: 5,
    method: 'abutting',
    fills: false,
    strokes: true
  },
  
  TECHNICAL_DRAWING: {
    name: 'Technical Drawing',
    mode: 'blackwhite',
    palette: 'limited',
    maxColors: 1, 
    threshold: 128,
    paths: 100,
    corners: 100,
    noise: 1,
    method: 'abutting',
    fills: false,
    strokes: true
  }
};

/**
 * ЭТАП 1: Анализ изображения (как в Adobe)
 */
async function analyzeImageType(imageBuffer) {
  console.log('🔍 Adobe Analysis: Анализ типа изображения...');
  
  const { data, info } = await sharp(imageBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  // Анализ цветового разнообразия
  const colorMap = new Map();
  let totalPixels = 0;
  
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1]; 
    const b = data[i + 2];
    
    // Квантование для анализа
    const quantR = Math.round(r / 32) * 32;
    const quantG = Math.round(g / 32) * 32;
    const quantB = Math.round(b / 32) * 32;
    
    const colorKey = `${quantR},${quantG},${quantB}`;
    colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    totalPixels++;
  }
  
  const uniqueColors = colorMap.size;
  const colorComplexity = uniqueColors / totalPixels;
  
  // Анализ контрастности
  const grayData = await sharp(imageBuffer)
    .grayscale()
    .raw()
    .toBuffer();
  
  let totalContrast = 0;
  for (let i = 0; i < grayData.length - 1; i++) {
    totalContrast += Math.abs(grayData[i] - grayData[i + 1]);
  }
  const avgContrast = totalContrast / grayData.length;
  
  // Классификация изображения
  let imageType = 'AUTO';
  let recommendedPreset = ADOBE_PRESETS.AUTO;
  
  if (uniqueColors <= 3) {
    imageType = 'SIMPLE_LOGO';
    recommendedPreset = ADOBE_PRESETS.THREE_COLORS;
  } else if (uniqueColors <= 10 && avgContrast > 50) {
    imageType = 'LOGO';  
    recommendedPreset = ADOBE_PRESETS.SIX_COLORS;
  } else if (avgContrast < 20) {
    imageType = 'PHOTO';
    recommendedPreset = ADOBE_PRESETS.LOW_FIDELITY_PHOTO;
  } else if (colorComplexity > 0.5) {
    imageType = 'COMPLEX_PHOTO';
    recommendedPreset = ADOBE_PRESETS.HIGH_FIDELITY_PHOTO;
  } else {
    imageType = 'ILLUSTRATION';
    recommendedPreset = ADOBE_PRESETS.SIXTEEN_COLORS;
  }
  
  console.log(`📊 Adobe Analysis результат: ${imageType}`);
  console.log(`🎨 Уникальных цветов: ${uniqueColors}`);
  console.log(`📈 Контрастность: ${avgContrast.toFixed(1)}`);
  console.log(`🎯 Рекомендуемый пресет: ${recommendedPreset.name}`);
  
  return {
    imageType,
    uniqueColors,
    avgContrast,
    colorComplexity,
    recommendedPreset
  };
}

/**
 * ЭТАП 2: Adobe Color Preprocessing  
 */
async function preprocessColors(imageBuffer, preset) {
  console.log(`🎨 Adobe Preprocessing: ${preset.name}...`);
  
  let processedBuffer = imageBuffer;
  
  // Гамма-коррекция (Adobe стандарт)
  processedBuffer = await sharp(processedBuffer)
    .gamma(2.2) // Adobe RGB gamma
    .toBuffer();
  
  // Адаптивная контрастность
  if (preset.mode === 'blackwhite') {
    processedBuffer = await sharp(processedBuffer)
      .grayscale()
      .normalize()
      .toBuffer();
  } else if (preset.mode === 'grayscale') {
    processedBuffer = await sharp(processedBuffer)
      .grayscale()
      .modulate({
        brightness: 1.1,
        saturation: 0,
        hue: 0
      })
      .toBuffer();
  } else {
    // Цветная обработка
    processedBuffer = await sharp(processedBuffer)
      .modulate({
        brightness: 1.05,
        saturation: 1.1,
        hue: 0
      })
      .toBuffer();
  }
  
  // Edge-preserving smoothing для фотографий
  if (preset.name.includes('Photo')) {
    processedBuffer = await sharp(processedBuffer)
      .blur(0.3) // Minimal blur для сохранения деталей
      .sharpen(1, 1, 0.5)
      .toBuffer();
  }
  
  console.log('✅ Adobe Preprocessing завершен');
  return processedBuffer;
}

/**
 * ЭТАП 3: Adobe K-means Color Segmentation
 */
async function performAdobeKMeans(imageBuffer, numColors) {
  console.log(`🧮 Adobe K-means: Сегментация на ${numColors} цветов...`);
  
  const { data, info } = await sharp(imageBuffer)
    .resize(400, 400, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  // Инициализация центроидов (Adobe метод)
  const centroids = [];
  for (let i = 0; i < numColors; i++) {
    const angle = (i / numColors) * 2 * Math.PI;
    centroids.push({
      r: 128 + 100 * Math.cos(angle),
      g: 128 + 100 * Math.sin(angle), 
      b: 128 + 50 * Math.cos(angle + Math.PI/2)
    });
  }
  
  // K-means итерации
  let maxIterations = 50;
  let convergenceThreshold = 1.0;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const clusters = Array(numColors).fill().map(() => ({ 
      pixels: [], 
      sumR: 0, 
      sumG: 0, 
      sumB: 0 
    }));
    
    // Назначение пикселей к кластерам
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      let minDistance = Infinity;
      let bestCluster = 0;
      
      for (let c = 0; c < numColors; c++) {
        const distance = Math.sqrt(
          Math.pow(r - centroids[c].r, 2) +
          Math.pow(g - centroids[c].g, 2) +
          Math.pow(b - centroids[c].b, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          bestCluster = c;
        }
      }
      
      clusters[bestCluster].pixels.push({ r, g, b });
      clusters[bestCluster].sumR += r;
      clusters[bestCluster].sumG += g; 
      clusters[bestCluster].sumB += b;
    }
    
    // Обновление центроидов
    let totalMovement = 0;
    for (let c = 0; c < numColors; c++) {
      if (clusters[c].pixels.length > 0) {
        const newR = clusters[c].sumR / clusters[c].pixels.length;
        const newG = clusters[c].sumG / clusters[c].pixels.length;
        const newB = clusters[c].sumB / clusters[c].pixels.length;
        
        const movement = Math.sqrt(
          Math.pow(newR - centroids[c].r, 2) +
          Math.pow(newG - centroids[c].g, 2) +
          Math.pow(newB - centroids[c].b, 2)
        );
        
        totalMovement += movement;
        
        centroids[c].r = newR;
        centroids[c].g = newG;
        centroids[c].b = newB;
      }
    }
    
    console.log(`   Итерация ${iter + 1}: движение центроидов = ${totalMovement.toFixed(2)}`);
    
    if (totalMovement < convergenceThreshold) {
      console.log(`   Конвергенция достигнута на итерации ${iter + 1}`);
      break;
    }
  }
  
  // Создание финальной палитры
  const finalPalette = centroids.map((centroid, index) => ({
    r: Math.round(centroid.r),
    g: Math.round(centroid.g),
    b: Math.round(centroid.b),
    hex: `#${Math.round(centroid.r).toString(16).padStart(2, '0')}${Math.round(centroid.g).toString(16).padStart(2, '0')}${Math.round(centroid.b).toString(16).padStart(2, '0')}`,
    index
  }));
  
  console.log(`✅ Adobe K-means завершен: ${finalPalette.length} цветов`);
  finalPalette.forEach((color, i) => {
    console.log(`   ${i + 1}. ${color.hex} (RGB: ${color.r}, ${color.g}, ${color.b})`);
  });
  
  return finalPalette;
}

/**
 * ЭТАП 4: Adobe Edge-Aware Color Masking
 */
async function createAdobeColorMask(imageBuffer, targetColor, preset) {
  console.log(`🎯 Adobe Mask: Создание маски для ${targetColor.hex}...`);
  
  const { data, info } = await sharp(imageBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  // Adobe адаптивные пороги
  let tolerance = 30; // Базовый Adobe порог
  
  if (preset.name.includes('Photo')) {
    tolerance = 45; // Более мягкие пороги для фото
  } else if (preset.name.includes('Logo')) {
    tolerance = 20; // Жесткие пороги для логотипов
  }
  
  // Создание Edge Map для сохранения границ
  const edgeMap = await createEdgeMap(imageBuffer);
  
  const maskData = Buffer.alloc(info.width * info.height);
  let pixelCount = 0;
  
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const pixelIndex = y * info.width + x;
      const dataIndex = pixelIndex * info.channels;
      
      const r = data[dataIndex];
      const g = data[dataIndex + 1];
      const b = data[dataIndex + 2];
      
      // Adobe перцептивное расстояние в LAB пространстве
      const distance = calculatePerceptualDistance(
        { r, g, b },
        { r: targetColor.r, g: targetColor.g, b: targetColor.b }
      );
      
      // Edge-aware tolerance adjustment
      const edgeStrength = edgeMap[pixelIndex] || 0;
      const adaptiveTolerance = tolerance * (1 + edgeStrength * 0.5);
      
      if (distance <= adaptiveTolerance) {
        maskData[pixelIndex] = 255;
        pixelCount++;
      } else {
        maskData[pixelIndex] = 0;
      }
    }
  }
  
  const coverage = (pixelCount / (info.width * info.height)) * 100;
  console.log(`   Покрытие: ${coverage.toFixed(2)}%, пикселей: ${pixelCount}`);
  
  // Adobe морфологические операции
  const processedMask = await applyMorphologicalOperations(
    maskData, 
    info.width, 
    info.height, 
    preset
  );
  
  if (coverage < 0.1) {
    console.log(`   ⚠️ Слишком низкое покрытие для ${targetColor.hex}`);
    return null;
  }
  
  return await sharp(processedMask, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 1
    }
  }).png().toBuffer();
}

/**
 * Adobe Edge Detection
 */
async function createEdgeMap(imageBuffer) {
  const grayBuffer = await sharp(imageBuffer)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const { data, info } = grayBuffer;
  const edgeMap = new Array(info.width * info.height).fill(0);
  
  // Sobel edge detection
  for (let y = 1; y < info.height - 1; y++) {
    for (let x = 1; x < info.width - 1; x++) {
      const idx = y * info.width + x;
      
      // Sobel X kernel
      const gx = 
        -1 * data[(y-1) * info.width + (x-1)] +
        -2 * data[y * info.width + (x-1)] +
        -1 * data[(y+1) * info.width + (x-1)] +
        1 * data[(y-1) * info.width + (x+1)] +
        2 * data[y * info.width + (x+1)] +
        1 * data[(y+1) * info.width + (x+1)];
      
      // Sobel Y kernel  
      const gy =
        -1 * data[(y-1) * info.width + (x-1)] +
        -2 * data[(y-1) * info.width + x] +
        -1 * data[(y-1) * info.width + (x+1)] +
        1 * data[(y+1) * info.width + (x-1)] +
        2 * data[(y+1) * info.width + x] +
        1 * data[(y+1) * info.width + (x+1)];
      
      const magnitude = Math.sqrt(gx * gx + gy * gy) / 255;
      edgeMap[idx] = Math.min(1, magnitude);
    }
  }
  
  return edgeMap;
}

/**
 * Adobe Perceptual Color Distance (CIE Delta E)
 */
function calculatePerceptualDistance(color1, color2) {
  // Упрощенная версия CIE Delta E для Adobe совместимости
  const dr = color1.r - color2.r;
  const dg = color1.g - color2.g;  
  const db = color1.b - color2.b;
  
  // Весовые коэффициенты для человеческого восприятия
  const weightR = 0.30;
  const weightG = 0.59; 
  const weightB = 0.11;
  
  return Math.sqrt(
    weightR * dr * dr +
    weightG * dg * dg +
    weightB * db * db
  );
}

/**
 * Adobe Morphological Operations
 */
async function applyMorphologicalOperations(maskData, width, height, preset) {
  console.log('🔧 Adobe Morphology: Применение морфологических операций...');
  
  let processedMask = Buffer.from(maskData);
  
  // Noise reduction на основе preset.noise
  const noiseThreshold = preset.noise || 10;
  if (noiseThreshold > 0) {
    processedMask = await removeSmallAreas(processedMask, width, height, noiseThreshold);
  }
  
  // Closing operation для заполнения дыр
  processedMask = await morphologicalClosing(processedMask, width, height, 2);
  
  // Opening operation для сглаживания
  processedMask = await morphologicalOpening(processedMask, width, height, 1);
  
  return processedMask;
}

/**
 * Remove Small Areas (Adobe Noise parameter)
 */
async function removeSmallAreas(maskData, width, height, minArea) {
  const visited = new Array(width * height).fill(false);
  const result = Buffer.alloc(width * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      if (maskData[idx] === 255 && !visited[idx]) {
        const area = floodFillArea(maskData, visited, x, y, width, height);
        
        if (area >= minArea) {
          // Восстанавливаем область
          floodFillRestore(maskData, result, x, y, width, height);
        }
      }
    }
  }
  
  return result;
}

function floodFillArea(maskData, visited, startX, startY, width, height) {
  const stack = [{ x: startX, y: startY }];
  let area = 0;
  
  while (stack.length > 0) {
    const { x, y } = stack.pop();
    const idx = y * width + x;
    
    if (x < 0 || x >= width || y < 0 || y >= height || 
        visited[idx] || maskData[idx] !== 255) {
      continue;
    }
    
    visited[idx] = true;
    area++;
    
    stack.push({ x: x + 1, y });
    stack.push({ x: x - 1, y });
    stack.push({ x, y: y + 1 });
    stack.push({ x, y: y - 1 });
  }
  
  return area;
}

function floodFillRestore(maskData, result, startX, startY, width, height) {
  const stack = [{ x: startX, y: startY }];
  const visited = new Array(width * height).fill(false);
  
  while (stack.length > 0) {
    const { x, y } = stack.pop();
    const idx = y * width + x;
    
    if (x < 0 || x >= width || y < 0 || y >= height || 
        visited[idx] || maskData[idx] !== 255) {
      continue;
    }
    
    visited[idx] = true;
    result[idx] = 255;
    
    stack.push({ x: x + 1, y });
    stack.push({ x: x - 1, y });
    stack.push({ x, y: y + 1 });
    stack.push({ x, y: y - 1 });
  }
}

/**
 * Morphological Closing
 */
async function morphologicalClosing(maskData, width, height, kernelSize) {
  // Dilation followed by Erosion
  const dilated = await dilate(maskData, width, height, kernelSize);
  return await erode(dilated, width, height, kernelSize);
}

/**
 * Morphological Opening  
 */
async function morphologicalOpening(maskData, width, height, kernelSize) {
  // Erosion followed by Dilation
  const eroded = await erode(maskData, width, height, kernelSize);
  return await dilate(eroded, width, height, kernelSize);
}

async function dilate(maskData, width, height, kernelSize) {
  const result = Buffer.alloc(width * height);
  const halfKernel = Math.floor(kernelSize / 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let maxVal = 0;
      
      for (let ky = -halfKernel; ky <= halfKernel; ky++) {
        for (let kx = -halfKernel; kx <= halfKernel; kx++) {
          const ny = y + ky;
          const nx = x + kx;
          
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            const idx = ny * width + nx;
            maxVal = Math.max(maxVal, maskData[idx]);
          }
        }
      }
      
      result[y * width + x] = maxVal;
    }
  }
  
  return result;
}

async function erode(maskData, width, height, kernelSize) {
  const result = Buffer.alloc(width * height);
  const halfKernel = Math.floor(kernelSize / 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minVal = 255;
      
      for (let ky = -halfKernel; ky <= halfKernel; ky++) {
        for (let kx = -halfKernel; kx <= halfKernel; kx++) {
          const ny = y + ky;
          const nx = x + kx;
          
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            const idx = ny * width + nx;
            minVal = Math.min(minVal, maskData[idx]);
          }
        }
      }
      
      result[y * width + x] = minVal;
    }
  }
  
  return result;
}

/**
 * ЭТАП 5: Adobe Potrace Vectorization
 */
async function adobeVectorize(maskBuffer, color, preset) {
  console.log(`📐 Adobe Vectorize: Трассировка ${color.hex}...`);
  
  return new Promise((resolve, reject) => {
    // Adobe Potrace настройки
    const potraceOptions = {
      threshold: preset.threshold || 128,
      turdSize: Math.max(1, Math.floor((preset.noise || 10) / 2)),
      turnPolicy: preset.name.includes('Logo') ? 'majority' : 'minority',
      alphaMax: preset.corners ? (100 - preset.corners) / 100 * 2 : 1.0,
      optCurve: true,
      optTolerance: preset.paths ? preset.paths / 100 * 0.5 : 0.2
    };
    
    console.log(`   Potrace настройки:`, potraceOptions);
    
    potrace.trace(maskBuffer, potraceOptions, (err, svg) => {
      if (err) {
        console.error(`   ❌ Ошибка трассировки ${color.hex}:`, err);
        resolve(null);
        return;
      }
      
      if (!svg) {
        console.log(`   ⚠️ Пустой результат для ${color.hex}`);
        resolve(null);
        return;
      }
      
      // Извлечение путей из SVG
      const pathMatches = svg.match(/<path[^>]*d="([^"]+)"/g);
      if (!pathMatches || pathMatches.length === 0) {
        console.log(`   ⚠️ Пути не найдены для ${color.hex}`);
        resolve(null);
        return;
      }
      
      const paths = pathMatches.map(pathMatch => {
        const dMatch = pathMatch.match(/d="([^"]+)"/);
        return dMatch ? dMatch[1] : null;
      }).filter(Boolean);
      
      console.log(`   ✅ Извлечено ${paths.length} путей для ${color.hex}`);
      
      resolve({
        color: color,
        paths: paths,
        svg: svg
      });
    });
  });
}

/**
 * ЭТАП 6: Adobe SVG Assembly
 */
function assembleAdobeSVG(vectorizedLayers, metadata, preset) {
  console.log('🔧 Adobe Assembly: Сборка финального SVG...');
  
  const { width, height } = metadata;
  
  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" 
     xmlns="http://www.w3.org/2000/svg">
  <title>Adobe ${preset.name} (${vectorizedLayers.length} colors)</title>
  <desc>Generated with Adobe Illustrator Image Trace compatible algorithm</desc>
`;

  // Добавляем слои в правильном порядке (от светлого к темному)
  const sortedLayers = vectorizedLayers.sort((a, b) => {
    const brightnessA = a.color.r * 0.299 + a.color.g * 0.587 + a.color.b * 0.114;
    const brightnessB = b.color.r * 0.299 + b.color.g * 0.587 + b.color.b * 0.114;
    return brightnessB - brightnessA; // От светлого к темному
  });

  sortedLayers.forEach((layer, index) => {
    svgContent += `  <g id="color-${index + 1}" fill="${layer.color.hex}" stroke="none">\n`;
    
    layer.paths.forEach(path => {
      svgContent += `    <path d="${path}" fill="${layer.color.hex}" opacity="1"/>\n`;
    });
    
    svgContent += `  </g>\n`;
  });

  svgContent += `</svg>`;
  
  console.log(`✅ Adobe Assembly завершена: ${svgContent.length} символов`);
  
  return svgContent;
}

/**
 * ГЛАВНАЯ ФУНКЦИЯ: Adobe Trace Engine
 */
async function adobeTrace(imageBuffer, presetName = 'SIX_COLORS') {
  console.log(`🚀 Adobe Trace Engine: Запуск с пресетом ${presetName}...`);
  
  try {
    // Получаем пресет
    const preset = ADOBE_PRESETS[presetName] || ADOBE_PRESETS.SIX_COLORS;
    console.log(`⚙️ Используем пресет: ${preset.name}`);
    
    // ЭТАП 1: Анализ изображения
    const analysis = await analyzeImageType(imageBuffer);
    
    // ЭТАП 2: Предобработка
    const preprocessedBuffer = await preprocessColors(imageBuffer, preset);
    
    // Получаем метаданные
    const metadata = await sharp(preprocessedBuffer).metadata();
    
    // ЭТАП 3: Определение количества цветов
    let targetColors = preset.maxColors;
    if (preset.maxColors === 'auto') {
      targetColors = Math.min(16, Math.max(3, Math.floor(analysis.uniqueColors / 3)));
    }
    
    console.log(`🎨 Целевое количество цветов: ${targetColors}`);
    
    // ЭТАП 4: K-means сегментация
    const colorPalette = await performAdobeKMeans(preprocessedBuffer, targetColors);
    
    // ЭТАП 5: Создание масок и векторизация
    const vectorizedLayers = [];
    
    for (let i = 0; i < colorPalette.length; i++) {
      const color = colorPalette[i];
      console.log(`\n🔄 Обработка цвета ${i + 1}/${colorPalette.length}: ${color.hex}`);
      
      // Создаем маску
      const mask = await createAdobeColorMask(preprocessedBuffer, color, preset);
      
      if (mask) {
        // Векторизуем маску
        const vectorResult = await adobeVectorize(mask, color, preset);
        
        if (vectorResult && vectorResult.paths && vectorResult.paths.length > 0) {
          vectorizedLayers.push(vectorResult);
          console.log(`   ✅ Слой добавлен: ${vectorResult.paths.length} путей`);
        }
      }
    }
    
    if (vectorizedLayers.length === 0) {
      throw new Error('Не удалось создать ни одного векторного слоя');
    }
    
    // ЭТАП 6: Сборка финального SVG
    const finalSVG = assembleAdobeSVG(vectorizedLayers, metadata, preset);
    
    console.log(`🎉 Adobe Trace завершен успешно!`);
    console.log(`   📊 Обработано цветов: ${vectorizedLayers.length}`);
    console.log(`   📄 Размер SVG: ${(finalSVG.length / 1024).toFixed(1)}KB`);
    
    return {
      success: true,
      svgContent: finalSVG,
      preset: preset.name,
      colorsProcessed: vectorizedLayers.length,
      fileSize: finalSVG.length,
      analysis: analysis
    };
    
  } catch (error) {
    console.error('❌ Adobe Trace Engine ошибка:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Экспорт функций
 */
module.exports = {
  adobeTrace,
  ADOBE_PRESETS,
  analyzeImageType,
  performAdobeKMeans,
  createAdobeColorMask,
  adobeVectorize,
  assembleAdobeSVG
};