/**
 * Adobe Illustrator Image Trace - точная реализация цветовой сегментации
 * Исправляет проблему "серого отображения" через создание отдельных цветовых слоев
 */

const sharp = require('sharp');
const potrace = require('potrace');
const fs = require('fs').promises;

/**
 * Adobe Limited Color - извлечение основных цветов
 */
async function extractAdobeColors(imageBuffer, maxColors = 6) {
  console.log('🎨 Adobe Limited Color - анализ изображения');
  
  // Adobe использует ресемплинг для анализа цветов
  const { data, info } = await sharp(imageBuffer)
    .resize(150, 150, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  // Adobe цветовая кластеризация с увеличенными допусками
  const colorClusters = new Map();
  const clusterSize = 32; // Adobe квантует до больших групп
  
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i];
    const g = data[i + 1]; 
    const b = data[i + 2];
    
    // Adobe "Ignore White" - пропускаем светлые области
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    if (brightness > 230) continue;
    
    // Группировка в крупные кластеры для четкого разделения
    const clusterR = Math.floor(r / clusterSize) * clusterSize;
    const clusterG = Math.floor(g / clusterSize) * clusterSize;
    const clusterB = Math.floor(b / clusterSize) * clusterSize;
    
    const key = `${clusterR}-${clusterG}-${clusterB}`;
    colorClusters.set(key, (colorClusters.get(key) || 0) + 1);
  }
  
  // Adobe автоматический выбор доминирующих цветов
  const sortedClusters = Array.from(colorClusters.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColors);
  
  const colors = sortedClusters.map(([key, count], index) => {
    const [r, g, b] = key.split('-').map(Number);
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    const percentage = ((count / (data.length / 3)) * 100).toFixed(1);
    
    console.log(`🎨 Adobe цвет ${index + 1}: ${hex} (${percentage}%)`);
    
    return { r, g, b, hex, count, percentage };
  });
  
  return colors;
}

/**
 * Adobe цветовая изоляция - создание отдельной маски для каждого цвета
 */
async function createAdobeColorMask(imageBuffer, targetColor) {
  console.log(`🎯 Adobe маска для ${targetColor.hex}`);
  
  const { data, info } = await sharp(imageBuffer)
    .resize(800, 800, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const maskData = Buffer.alloc(info.width * info.height);
  const tolerance = 40; // Adobe использует больший допуск для захвата всех оттенков
  
  let matchedPixels = 0;
  
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const pixelIndex = (y * info.width + x) * 3;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      
      // Adobe цветовое расстояние в RGB пространстве
      const colorDistance = Math.sqrt(
        Math.pow(r - targetColor.r, 2) +
        Math.pow(g - targetColor.g, 2) +
        Math.pow(b - targetColor.b, 2)
      );
      
      const maskIndex = y * info.width + x;
      
      if (colorDistance <= tolerance) {
        maskData[maskIndex] = 255; // Белый = пиксель этого цвета
        matchedPixels++;
      } else {
        maskData[maskIndex] = 0; // Черный = другие цвета
      }
    }
  }
  
  const coverage = ((matchedPixels / (info.width * info.height)) * 100).toFixed(1);
  console.log(`📊 Adobe маска ${targetColor.hex}: ${coverage}% покрытия`);
  
  return {
    data: maskData,
    width: info.width,
    height: info.height,
    coverage: parseFloat(coverage)
  };
}

/**
 * Adobe Abutting Method - создание касающихся путей
 */
async function createAdobePaths(maskData, width, height, targetColor) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Adobe трассировка ${targetColor.hex}`);
    
    // Создаем временное изображение из маски
    const tempImageBuffer = Buffer.alloc(width * height * 4);
    
    for (let i = 0; i < maskData.length; i++) {
      const pixelValue = maskData[i];
      const bufferIndex = i * 4;
      
      tempImageBuffer[bufferIndex] = pixelValue;     // R
      tempImageBuffer[bufferIndex + 1] = pixelValue; // G  
      tempImageBuffer[bufferIndex + 2] = pixelValue; // B
      tempImageBuffer[bufferIndex + 3] = 255;        // A
    }
    
    // Adobe настройки Potrace для Limited Color mode
    const params = {
      threshold: 128,
      optTolerance: 0.2,
      turdSize: 8,
      alphaMax: 1.0,
      optCurve: true,
      color: 'auto',
      background: 'transparent'
    };
    
    // Создаем изображение через Sharp и передаем в Potrace
    sharp(tempImageBuffer, { raw: { width, height, channels: 4 } })
      .png()
      .toBuffer()
      .then(pngBuffer => {
        potrace.trace(pngBuffer, params, (err, svg) => {
          if (err) {
            console.error(`❌ Adobe трассировка ошибка:`, err);
            reject(err);
            return;
          }
          
          // Извлекаем пути из SVG
          const pathMatch = svg.match(/<path[^>]*d="([^"]*)"[^>]*>/g);
          
          if (!pathMatch || pathMatch.length === 0) {
            console.log(`⚠️ Adobe пустая маска для ${targetColor.hex}`);
            resolve([]);
            return;
          }
          
          const paths = pathMatch.map(pathElement => {
            const dMatch = pathElement.match(/d="([^"]*)"/);
            return dMatch ? dMatch[1] : '';
          }).filter(path => path.length > 0);
          
          console.log(`✅ Adobe пути ${targetColor.hex}: ${paths.length} элементов`);
          resolve(paths);
        });
      })
      .catch(reject);
  });
}

/**
 * Adobe SVG структура - отдельная группа для каждого цвета
 */
function createAdobeSVG(colorPaths, width, height) {
  console.log('📝 Adobe SVG композиция');
  
  const viewBox = `0 0 ${width} ${height}`;
  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
  <title>Adobe Illustrator Limited Color (${colorPaths.length} colors)</title>
  <desc>Generated with Adobe Illustrator Image Trace compatible algorithm</desc>
`;

  // Adobe создает отдельную группу для каждого цвета
  colorPaths.forEach((colorData, index) => {
    if (colorData.paths.length === 0) return;
    
    svgContent += `  <g id="color-${index + 1}" fill="${colorData.color.hex}" stroke="none">\n`;
    
    colorData.paths.forEach(pathData => {
      svgContent += `    <path d="${pathData}"/>\n`;
    });
    
    svgContent += `  </g>\n`;
    
    console.log(`📄 Adobe группа ${index + 1}: ${colorData.color.hex} (${colorData.paths.length} путей)`);
  });

  svgContent += '</svg>';
  return svgContent;
}

/**
 * Основная функция Adobe векторизации
 */
async function vectorizeWithAdobe(imageBuffer, maxColors = 6) {
  try {
    console.log('🚀 Adobe Illustrator Image Trace запуск');
    
    // 1. Adobe извлечение цветов
    const colors = await extractAdobeColors(imageBuffer, maxColors);
    
    if (colors.length === 0) {
      throw new Error('Adobe: не найдено цветов для векторизации');
    }
    
    // 2. Adobe создание отдельных масок для каждого цвета
    const colorPaths = [];
    
    for (const color of colors) {
      try {
        const mask = await createAdobeColorMask(imageBuffer, color);
        
        // Пропускаем цвета с очень малым покрытием
        if (mask.coverage < 2.0) {
          console.log(`⏭️ Adobe пропуск ${color.hex}: покрытие ${mask.coverage}%`);
          continue;
        }
        
        const paths = await createAdobePaths(mask.data, mask.width, mask.height, color);
        
        if (paths.length > 0) {
          colorPaths.push({
            color: color,
            paths: paths,
            coverage: mask.coverage
          });
        }
      } catch (error) {
        console.error(`❌ Adobe ошибка для ${color.hex}:`, error.message);
        continue;
      }
    }
    
    if (colorPaths.length === 0) {
      throw new Error('Adobe: не создано ни одного пути');
    }
    
    // 3. Adobe SVG композиция
    const svgContent = createAdobeSVG(colorPaths, 800, 800);
    
    console.log(`✅ Adobe векторизация завершена: ${colorPaths.length} цветовых слоев`);
    
    return {
      svg: svgContent,
      colors: colorPaths.length,
      method: 'Adobe Illustrator Limited Color'
    };
    
  } catch (error) {
    console.error('❌ Adobe векторизация ошибка:', error);
    throw error;
  }
}

module.exports = {
  vectorizeWithAdobe,
  extractAdobeColors,
  createAdobeColorMask,
  createAdobePaths
};