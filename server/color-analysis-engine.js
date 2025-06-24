/**
 * Интеллектуальный анализатор цветов для определения оптимального количества цветов в печати
 */

const sharp = require('sharp');

/**
 * Анализ сложности изображения и рекомендации по количеству цветов
 */
async function analyzeImageComplexity(imageBuffer) {
  console.log('🔍 [COLOR-ANALYSIS] Начинаем анализ сложности изображения');
  
  try {
    // 1. Базовый анализ изображения
    const { data, info } = await sharp(imageBuffer)
      .resize(256, 256)
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // 2. Подсчет уникальных цветов
    const colorMap = new Map();
    const pixelCount = info.width * info.height;
    
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Группируем похожие цвета (tolerance = 8)
      const colorKey = `${Math.floor(r/8)*8},${Math.floor(g/8)*8},${Math.floor(b/8)*8}`;
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }
    
    const uniqueColors = colorMap.size;
    
    // 3. Анализ распределения цветов
    const colorDistribution = Array.from(colorMap.values())
      .sort((a, b) => b - a)
      .map(count => count / pixelCount);
    
    // 4. Расчет энтропии (разнообразие цветов)
    let entropy = 0;
    for (const probability of colorDistribution) {
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    }
    
    // 5. Анализ градиентов
    const gradientComplexity = await analyzeGradients(imageBuffer);
    
    // 6. Анализ краев и деталей
    const edgeComplexity = await analyzeEdgeComplexity(imageBuffer);
    
    // 7. Определение сложности изображения
    const complexity = calculateComplexityScore({
      uniqueColors,
      entropy,
      gradientComplexity,
      edgeComplexity,
      colorDistribution
    });
    
    // 8. Рекомендации по количеству цветов
    const recommendations = generateColorRecommendations(complexity, uniqueColors);
    
    console.log(`✅ [COLOR-ANALYSIS] Анализ завершен. Сложность: ${complexity.level}`);
    
    return {
      success: true,
      complexity: complexity,
      uniqueColors: uniqueColors,
      recommendations: recommendations,
      analysis: {
        entropy: entropy.toFixed(2),
        gradientComplexity: gradientComplexity.toFixed(2),
        edgeComplexity: edgeComplexity.toFixed(2),
        dominantColors: getTopColors(colorMap, 5)
      }
    };
    
  } catch (error) {
    console.error('❌ [COLOR-ANALYSIS] Ошибка анализа:', error);
    throw error;
  }
}

/**
 * Анализ градиентов в изображении
 */
async function analyzeGradients(imageBuffer) {
  try {
    // Конвертируем в grayscale и применяем фильтр градиента
    const gradientData = await sharp(imageBuffer)
      .resize(128, 128)
      .greyscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1]
      })
      .raw()
      .toBuffer();
    
    // Вычисляем среднюю интенсивность градиента
    let sum = 0;
    for (let i = 0; i < gradientData.length; i++) {
      sum += gradientData[i];
    }
    
    return sum / gradientData.length / 255; // Нормализуем от 0 до 1
    
  } catch (error) {
    console.error('❌ [GRADIENT] Ошибка анализа градиентов:', error);
    return 0;
  }
}

/**
 * Анализ сложности краев
 */
async function analyzeEdgeComplexity(imageBuffer) {
  try {
    // Применяем edge detection
    const edgeData = await sharp(imageBuffer)
      .resize(128, 128)
      .greyscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
      })
      .raw()
      .toBuffer();
    
    // Подсчитываем количество значимых краев
    let edgePixels = 0;
    for (let i = 0; i < edgeData.length; i++) {
      if (edgeData[i] > 50) { // Порог для обнаружения краев
        edgePixels++;
      }
    }
    
    return edgePixels / edgeData.length; // Процент краевых пикселей
    
  } catch (error) {
    console.error('❌ [EDGE] Ошибка анализа краев:', error);
    return 0;
  }
}

/**
 * Расчет общего показателя сложности
 */
function calculateComplexityScore(metrics) {
  const {
    uniqueColors,
    entropy,
    gradientComplexity,
    edgeComplexity,
    colorDistribution
  } = metrics;
  
  // Веса для разных факторов
  const weights = {
    colors: 0.3,
    entropy: 0.25,
    gradients: 0.25,
    edges: 0.2
  };
  
  // Нормализуем показатели
  const normalizedColors = Math.min(uniqueColors / 100, 1);
  const normalizedEntropy = Math.min(entropy / 8, 1);
  const normalizedGradients = Math.min(gradientComplexity, 1);
  const normalizedEdges = Math.min(edgeComplexity, 1);
  
  // Расчитываем общий score
  const totalScore = 
    normalizedColors * weights.colors +
    normalizedEntropy * weights.entropy +
    normalizedGradients * weights.gradients +
    normalizedEdges * weights.edges;
  
  // Определяем уровень сложности
  let level, description;
  if (totalScore < 0.3) {
    level = 'простое';
    description = 'Изображение с простыми формами и ограниченной цветовой палитрой';
  } else if (totalScore < 0.6) {
    level = 'среднее';
    description = 'Изображение средней сложности с несколькими цветами и деталями';
  } else if (totalScore < 0.8) {
    level = 'сложное';
    description = 'Детализированное изображение с множеством цветов и переходов';
  } else {
    level = 'очень сложное';
    description = 'Высокодетализированное изображение с богатой цветовой палитрой';
  }
  
  return {
    score: totalScore,
    level: level,
    description: description,
    metrics: {
      normalizedColors,
      normalizedEntropy,
      normalizedGradients,
      normalizedEdges
    }
  };
}

/**
 * Генерация рекомендаций по количеству цветов
 */
function generateColorRecommendations(complexity, uniqueColors) {
  const recommendations = [];
  
  if (complexity.score < 0.3) {
    // Простое изображение
    recommendations.push({
      technique: 'Одноцветная шелкография',
      colors: 1,
      cost: 'низкая',
      quality: 'отличная',
      description: 'Идеально для логотипов и простой графики'
    });
    
    recommendations.push({
      technique: 'Двухцветная шелкография',
      colors: 2,
      cost: 'низкая',
      quality: 'отличная',
      description: 'Добавляет акцентный цвет для большей выразительности'
    });
    
  } else if (complexity.score < 0.6) {
    // Среднее изображение
    recommendations.push({
      technique: 'Трехцветная шелкография',
      colors: 3,
      cost: 'средняя',
      quality: 'хорошая',
      description: 'Оптимальный баланс качества и стоимости'
    });
    
    recommendations.push({
      technique: 'Четырехцветная печать',
      colors: 4,
      cost: 'средняя',
      quality: 'хорошая',
      description: 'Позволяет передать основные цвета изображения'
    });
    
  } else if (complexity.score < 0.8) {
    // Сложное изображение
    recommendations.push({
      technique: 'Многоцветная шелкография',
      colors: Math.min(uniqueColors, 6),
      cost: 'высокая',
      quality: 'хорошая',
      description: 'Для сложных дизайнов с множеством деталей'
    });
    
    recommendations.push({
      technique: 'DTF печать',
      colors: 'полноцветная',
      cost: 'средняя',
      quality: 'отличная',
      description: 'Рекомендуется для сложных многоцветных изображений'
    });
    
  } else {
    // Очень сложное изображение
    recommendations.push({
      technique: 'DTF печать',
      colors: 'полноцветная',
      cost: 'средняя',
      quality: 'отличная',
      description: 'Лучший выбор для фотореалистичных изображений'
    });
    
    recommendations.push({
      technique: 'Сублимационная печать',
      colors: 'полноцветная',
      cost: 'средняя',
      quality: 'отличная',
      description: 'Идеально для полиэстера и синтетических тканей'
    });
  }
  
  return recommendations;
}

/**
 * Получение топ цветов
 */
function getTopColors(colorMap, count = 5) {
  return Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([color, frequency]) => {
      const [r, g, b] = color.split(',').map(Number);
      return {
        hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
        rgb: [r, g, b],
        frequency: frequency
      };
    });
}

/**
 * Автоматическое определение оптимального количества цветов для конкретной техники печати
 */
async function getOptimalColorCount(imageBuffer, printTechnique = 'screen-print') {
  try {
    const analysis = await analyzeImageComplexity(imageBuffer);
    
    if (!analysis.success) {
      return { colors: 4, reason: 'Ошибка анализа, использованы стандартные настройки' };
    }
    
    const { complexity, recommendations } = analysis;
    
    // Фильтруем рекомендации по технике печати
    let filteredRecommendations;
    
    if (printTechnique === 'screen-print') {
      filteredRecommendations = recommendations.filter(r => 
        r.technique.includes('шелкография') || r.technique.includes('цветная')
      );
    } else if (printTechnique === 'dtf') {
      filteredRecommendations = recommendations.filter(r => 
        r.technique.includes('DTF') || r.colors === 'полноцветная'
      );
    } else {
      filteredRecommendations = recommendations;
    }
    
    // Выбираем оптимальную рекомендацию
    const optimal = filteredRecommendations[0] || recommendations[0];
    
    return {
      colors: typeof optimal.colors === 'number' ? optimal.colors : 6,
      technique: optimal.technique,
      complexity: complexity.level,
      reason: optimal.description,
      analysis: analysis
    };
    
  } catch (error) {
    console.error('❌ [OPTIMAL-COLORS] Ошибка определения цветов:', error);
    return { colors: 4, reason: 'Ошибка анализа, использованы стандартные настройки' };
  }
}

module.exports = {
  analyzeImageComplexity,
  getOptimalColorCount,
  analyzeGradients,
  analyzeEdgeComplexity
};