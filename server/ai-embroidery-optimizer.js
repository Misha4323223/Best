/**
 * AI-оптимизатор для улучшения дизайнов вышивки
 * Использует искусственный интеллект для анализа и оптимизации изображений
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

/**
 * Анализирует изображение с помощью AI и предлагает оптимизации
 */
async function analyzeImageForEmbroidery(imageBuffer, originalPrompt) {
  try {
    console.log('🔍 Начинаем AI-анализ изображения для вышивки...');
    
    // Получаем метаданные изображения
    const metadata = await sharp(imageBuffer).metadata();
    
    // Анализируем сложность изображения
    const complexityAnalysis = await analyzeImageComplexity(imageBuffer);
    
    // Анализируем цветовую схему
    const colorAnalysis = await analyzeColors(imageBuffer);
    
    // Получаем AI рекомендации по оптимизации
    const aiRecommendations = await getAIOptimizationRecommendations(
      complexityAnalysis, 
      colorAnalysis, 
      originalPrompt
    );
    
    // Формируем отчет с рекомендациями
    const optimizationReport = {
      imageInfo: {
        width: metadata.width,
        height: metadata.height,
        channels: metadata.channels
      },
      complexity: complexityAnalysis,
      colors: colorAnalysis,
      recommendations: aiRecommendations,
      optimizedSettings: calculateOptimalSettings(complexityAnalysis, colorAnalysis)
    };
    
    console.log('✅ AI-анализ завершен');
    return optimizationReport;
    
  } catch (error) {
    console.error('❌ Ошибка при AI-анализе:', error);
    return null;
  }
}

/**
 * Анализирует сложность изображения
 */
async function analyzeImageComplexity(imageBuffer) {
  try {
    // Получаем статистику изображения
    const { channels, density, width, height } = await sharp(imageBuffer).metadata();
    
    // Анализируем края и контуры
    const edges = await sharp(imageBuffer)
      .greyscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
      })
      .toBuffer();
    
    const edgeStats = await sharp(edges).stats();
    
    // Вычисляем метрики сложности
    const totalPixels = width * height;
    const edgeIntensity = edgeStats.channels[0].mean;
    
    let complexityLevel = 'простой';
    if (edgeIntensity > 100) complexityLevel = 'сложный';
    else if (edgeIntensity > 50) complexityLevel = 'средний';
    
    return {
      level: complexityLevel,
      edgeIntensity: Math.round(edgeIntensity),
      totalPixels,
      suitableForEmbroidery: edgeIntensity < 120, // Простые контуры лучше для вышивки
      recommendedSimplification: edgeIntensity > 80
    };
    
  } catch (error) {
    console.error('❌ Ошибка анализа сложности:', error);
    return { level: 'неизвестно', error: error.message };
  }
}

/**
 * Анализирует цветовую схему изображения
 */
async function analyzeColors(imageBuffer) {
  try {
    // Получаем статистику по каналам
    const stats = await sharp(imageBuffer).stats();
    
    // Уменьшаем изображение для анализа цветов
    const smallImage = await sharp(imageBuffer)
      .resize(100, 100, { fit: 'inside' })
      .raw()
      .toBuffer();
    
    // Анализируем доминирующие цвета
    const dominantColors = extractDominantColors(smallImage);
    
    // Оцениваем подходящность для вышивки
    const embroideryScore = calculateEmbroideryColorScore(dominantColors);
    
    return {
      totalColors: dominantColors.length,
      dominantColors: dominantColors.slice(0, 8), // Топ-8 цветов
      embroideryScore,
      recommendedColors: Math.min(dominantColors.length, 15), // Максимум 15 для DST
      needsColorReduction: dominantColors.length > 15,
      brightness: Math.round(stats.channels[0].mean),
      contrast: Math.round(stats.channels[0].stdev)
    };
    
  } catch (error) {
    console.error('❌ Ошибка анализа цветов:', error);
    return { totalColors: 0, error: error.message };
  }
}

/**
 * Извлекает доминирующие цвета из изображения
 */
function extractDominantColors(imageBuffer) {
  const colors = new Map();
  
  // Простой алгоритм кластеризации цветов
  for (let i = 0; i < imageBuffer.length; i += 3) {
    const r = Math.floor(imageBuffer[i] / 32) * 32;
    const g = Math.floor(imageBuffer[i + 1] / 32) * 32;
    const b = Math.floor(imageBuffer[i + 2] / 32) * 32;
    
    const colorKey = `${r},${g},${b}`;
    colors.set(colorKey, (colors.get(colorKey) || 0) + 1);
  }
  
  // Сортируем по частоте использования
  return Array.from(colors.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([color, count]) => {
      const [r, g, b] = color.split(',').map(Number);
      return { r, g, b, count, hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}` };
    });
}

/**
 * Оценивает подходящность цветовой схемы для вышивки
 */
function calculateEmbroideryColorScore(colors) {
  let score = 100;
  
  // Штрафуем за слишком много цветов
  if (colors.length > 15) score -= (colors.length - 15) * 5;
  
  // Штрафуем за слишком похожие цвета
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const diff = colorDifference(colors[i], colors[j]);
      if (diff < 50) score -= 10; // Слишком похожие цвета
    }
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Вычисляет разность между цветами
 */
function colorDifference(color1, color2) {
  const dr = color1.r - color2.r;
  const dg = color1.g - color2.g;
  const db = color1.b - color2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Получает AI рекомендации по оптимизации
 */
async function getAIOptimizationRecommendations(complexity, colors, originalPrompt) {
  const recommendations = [];
  
  // Рекомендации по сложности
  if (complexity.recommendedSimplification) {
    recommendations.push({
      type: 'simplification',
      priority: 'высокий',
      message: 'Рекомендуется упрощение дизайна для лучшего качества вышивки',
      action: 'Уменьшить количество мелких деталей'
    });
  }
  
  // Рекомендации по цветам
  if (colors.needsColorReduction) {
    recommendations.push({
      type: 'colors',
      priority: 'средний',
      message: `Слишком много цветов (${colors.totalColors}). Рекомендуется сократить до ${colors.recommendedColors}`,
      action: 'Объединить похожие цвета'
    });
  }
  
  // Рекомендации по контрасту
  if (colors.contrast < 30) {
    recommendations.push({
      type: 'contrast',
      priority: 'средний',
      message: 'Низкий контраст может затруднить вышивку',
      action: 'Увеличить контрастность между элементами'
    });
  }
  
  // AI анализ промпта для улучшений
  const promptRecommendations = analyzePromptForEmbroidery(originalPrompt);
  recommendations.push(...promptRecommendations);
  
  return recommendations;
}

/**
 * Анализирует промпт и предлагает улучшения для вышивки
 */
function analyzePromptForEmbroidery(prompt) {
  const recommendations = [];
  const lowerPrompt = prompt.toLowerCase();
  
  // Проверяем наличие ключевых слов для вышивки
  const embroideryKeywords = ['простой', 'четкий', 'контур', 'вышивка', 'схема'];
  const hasEmbroideryTerms = embroideryKeywords.some(keyword => lowerPrompt.includes(keyword));
  
  if (!hasEmbroideryTerms) {
    recommendations.push({
      type: 'prompt',
      priority: 'низкий',
      message: 'Промпт можно улучшить для создания дизайнов вышивки',
      action: 'Добавить слова: "простой дизайн", "четкие контуры", "для вышивки"'
    });
  }
  
  // Проверяем на сложные элементы
  const complexTerms = ['реалистичный', 'фотография', 'детальный', 'градиент'];
  const hasComplexTerms = complexTerms.some(term => lowerPrompt.includes(term));
  
  if (hasComplexTerms) {
    recommendations.push({
      type: 'prompt',
      priority: 'высокий',
      message: 'Промпт содержит термины, усложняющие вышивку',
      action: 'Заменить на: "простой", "схематичный", "с четкими линиями"'
    });
  }
  
  return recommendations;
}

/**
 * Вычисляет оптимальные настройки для вышивки
 */
function calculateOptimalSettings(complexity, colors) {
  return {
    recommendedFormat: 'dst', // По умолчанию Tajima DST
    maxColors: Math.min(colors.recommendedColors, 15),
    stitchDensity: complexity.level === 'простой' ? 'нормальная' : 'низкая',
    needsSimplification: complexity.recommendedSimplification,
    optimalSize: {
      width: complexity.level === 'сложный' ? 300 : 400,
      height: complexity.level === 'сложный' ? 300 : 400
    }
  };
}

/**
 * Применяет AI оптимизации к изображению
 */
async function applyAIOptimizations(imageBuffer, optimizationReport) {
  try {
    console.log('🎨 Применяем AI оптимизации...');
    
    let processedImage = sharp(imageBuffer);
    
    // Применяем упрощение, если рекомендуется
    if (optimizationReport.optimizedSettings.needsSimplification) {
      // Сглаживание для упрощения деталей
      processedImage = processedImage.blur(1);
    }
    
    // Улучшаем контраст, если нужно
    if (optimizationReport.colors.contrast < 30) {
      processedImage = processedImage.normalise();
    }
    
    // Оптимизируем размер
    const optimalSize = optimizationReport.optimizedSettings.optimalSize;
    processedImage = processedImage.resize(optimalSize.width, optimalSize.height, {
      fit: 'inside',
      withoutEnlargement: true
    });
    
    const optimizedBuffer = await processedImage.toBuffer();
    
    console.log('✅ AI оптимизации применены');
    return optimizedBuffer;
    
  } catch (error) {
    console.error('❌ Ошибка применения оптимизаций:', error);
    return imageBuffer; // Возвращаем оригинал в случае ошибки
  }
}

/**
 * Генерирует отчет об оптимизации в читаемом виде
 */
function generateOptimizationReport(report, originalPrompt) {
  if (!report) return 'Анализ недоступен';
  
  let reportText = `🤖 **AI-анализ дизайна вышивки:**\n\n`;
  
  // Информация об изображении
  reportText += `📊 **Характеристики:**\n`;
  reportText += `• Размер: ${report.imageInfo.width}×${report.imageInfo.height}px\n`;
  reportText += `• Сложность: ${report.complexity.level}\n`;
  reportText += `• Цветов: ${report.colors.totalColors}\n`;
  reportText += `• Оценка для вышивки: ${report.colors.embroideryScore}/100\n\n`;
  
  // Рекомендации
  if (report.recommendations.length > 0) {
    reportText += `💡 **Рекомендации по улучшению:**\n`;
    
    const highPriority = report.recommendations.filter(r => r.priority === 'высокий');
    const mediumPriority = report.recommendations.filter(r => r.priority === 'средний');
    const lowPriority = report.recommendations.filter(r => r.priority === 'низкий');
    
    if (highPriority.length > 0) {
      reportText += `\n🔴 **Важные:**\n`;
      highPriority.forEach(rec => {
        reportText += `• ${rec.message}\n  *${rec.action}*\n`;
      });
    }
    
    if (mediumPriority.length > 0) {
      reportText += `\n🟡 **Рекомендуемые:**\n`;
      mediumPriority.forEach(rec => {
        reportText += `• ${rec.message}\n  *${rec.action}*\n`;
      });
    }
    
    if (lowPriority.length > 0) {
      reportText += `\n🟢 **Дополнительные:**\n`;
      lowPriority.forEach(rec => {
        reportText += `• ${rec.message}\n  *${rec.action}*\n`;
      });
    }
  } else {
    reportText += `✅ **Дизайн оптимален для вышивки!**\n`;
  }
  
  // Оптимальные настройки
  reportText += `\n⚙️ **Оптимальные настройки:**\n`;
  reportText += `• Формат: ${report.optimizedSettings.recommendedFormat.toUpperCase()}\n`;
  reportText += `• Максимум цветов: ${report.optimizedSettings.maxColors}\n`;
  reportText += `• Плотность стежков: ${report.optimizedSettings.stitchDensity}\n`;
  reportText += `• Рекомендуемый размер: ${report.optimizedSettings.optimalSize.width}×${report.optimizedSettings.optimalSize.height}мм\n`;
  
  return reportText;
}

module.exports = {
  analyzeImageForEmbroidery,
  applyAIOptimizations,
  generateOptimizationReport
};