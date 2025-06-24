/**
 * Демонстрационный модуль для тестирования продвинутого векторизатора
 * Показывает все возможности и создает примеры использования
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const advancedVectorizer = require('../advanced-vectorizer.cjs');

/**
 * Создание демонстрационного изображения для тестирования
 */
async function createDemoImage() {
  // Создаем простое SVG изображение для демонстрации
  const demoSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="300" fill="#f0f8ff"/>
  <circle cx="200" cy="150" r="80" fill="#ff6b6b" stroke="#333" stroke-width="3"/>
  <rect x="150" y="100" width="100" height="100" fill="#4ecdc4" stroke="#333" stroke-width="2"/>
  <text x="200" y="250" text-anchor="middle" font-family="Arial" font-size="24" fill="#333">
    DEMO IMAGE
  </text>
</svg>`;
  
  const demoPath = path.join(__dirname, '..', 'temp', 'demo-image.svg');
  await fs.writeFile(demoPath, demoSvg, 'utf8');
  
  // Конвертируем SVG в PNG для демонстрации
  const sharp = require('sharp');
  const pngPath = path.join(__dirname, '..', 'temp', 'demo-image.png');
  
  try {
    await sharp(Buffer.from(demoSvg))
      .png()
      .toFile(pngPath);
    
    return pngPath;
  } catch (error) {
    console.log('Sharp недоступен, используем исходный SVG');
    return demoPath;
  }
}

/**
 * Демонстрация базовой векторизации
 */
async function demonstrateBasicVectorization() {
  console.log('\n🎯 === ДЕМОНСТРАЦИЯ БАЗОВОЙ ВЕКТОРИЗАЦИИ ===');
  
  try {
    const demoImagePath = await createDemoImage();
    const imageBuffer = await fs.readFile(demoImagePath);
    
    console.log(`📁 Тестовое изображение: ${demoImagePath}`);
    
    // Тестируем базовую векторизацию
    const result = await advancedVectorizer.vectorizeImage(
      imageBuffer,
      'demo-basic',
      {
        quality: 'standard',
        outputFormat: 'svg'
      }
    );
    
    if (result.success) {
      console.log('✅ Базовая векторизация успешна');
      console.log(`📊 Результат: ${result.filename}`);
      console.log(`🎨 Обнаруженный тип: ${result.detectedType}`);
      console.log(`📏 Размер SVG: ${result.svgContent.length} символов`);
      return true;
    } else {
      console.error('❌ Ошибка базовой векторизации:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Критическая ошибка в демонстрации:', error);
    return false;
  }
}

/**
 * Демонстрация профессиональной векторизации
 */
async function demonstrateProfessionalVectorization() {
  console.log('\n🚀 === ДЕМОНСТРАЦИЯ ПРОФЕССИОНАЛЬНОЙ ВЕКТОРИЗАЦИИ ===');
  
  try {
    const demoImagePath = await createDemoImage();
    const imageBuffer = await fs.readFile(demoImagePath);
    
    // Тестируем профессиональную векторизацию
    const result = await advancedVectorizer.professionalVectorize(
      imageBuffer,
      'demo-professional',
      {
        quality: 'premium',
        formats: ['svg', 'eps'],
        generatePreviews: true,
        optimizeFor: 'print',
        includeMetadata: true
      }
    );
    
    if (result.success) {
      console.log('✅ Профессиональная векторизация успешна');
      console.log(`📊 Создано форматов: ${result.main.formats.length}`);
      
      if (result.previews && result.previews.length > 0) {
        console.log(`🔍 Превью качеств: ${result.previews.length}`);
        result.previews.forEach(preview => {
          console.log(`  - ${preview.qualityName}: ${preview.description}`);
        });
      }
      
      if (result.optimization && result.optimization.success) {
        console.log(`⚡ Оптимизация: ${result.optimization.compressionRatio}% сжатие`);
      }
      
      return true;
    } else {
      console.error('❌ Ошибка профессиональной векторизации:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Критическая ошибка в профессиональной демонстрации:', error);
    return false;
  }
}

/**
 * Демонстрация анализа контента
 */
async function demonstrateContentAnalysis() {
  console.log('\n🔍 === ДЕМОНСТРАЦИЯ АНАЛИЗА КОНТЕНТА ===');
  
  try {
    const demoImagePath = await createDemoImage();
    const imageBuffer = await fs.readFile(demoImagePath);
    
    // Тестируем анализ контента
    const analysis = await advancedVectorizer.detectContentType(imageBuffer);
    
    console.log('✅ Анализ контента выполнен');
    console.log(`🎨 Обнаруженный тип: ${analysis.type}`);
    console.log(`📊 Уверенность: ${Math.round(analysis.confidence * 100)}%`);
    console.log(`💡 Описание: ${analysis.description}`);
    console.log(`⚙️ Рекомендуемое качество: ${analysis.recommendedSettings.quality}`);
    console.log(`📁 Рекомендуемый формат: ${analysis.recommendedSettings.outputFormat}`);
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка анализа контента:', error);
    return false;
  }
}

/**
 * Демонстрация многоформатной конвертации
 */
async function demonstrateMultiFormat() {
  console.log('\n🎨 === ДЕМОНСТРАЦИЯ МНОГОФОРМАТНОЙ КОНВЕРТАЦИИ ===');
  
  try {
    const demoImagePath = await createDemoImage();
    const imageBuffer = await fs.readFile(demoImagePath);
    
    // Тестируем многоформатную векторизацию
    const result = await advancedVectorizer.multiFormatVectorize(
      imageBuffer,
      'demo-multiformat',
      {
        quality: 'premium',
        formats: ['svg', 'eps', 'pdf']
      }
    );
    
    if (result.success) {
      console.log('✅ Многоформатная векторизация успешна');
      console.log(`📊 ${result.message}`);
      
      result.formats.forEach(format => {
        console.log(`  📁 ${format.format.toUpperCase()}: ${format.description}`);
        console.log(`     Файл: ${format.filename}`);
      });
      
      return true;
    } else {
      console.error('❌ Ошибка многоформатной векторизации:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Критическая ошибка в многоформатной демонстрации:', error);
    return false;
  }
}

/**
 * Демонстрация оптимизации
 */
async function demonstrateOptimization() {
  console.log('\n⚡ === ДЕМОНСТРАЦИЯ ОПТИМИЗАЦИИ ===');
  
  try {
    const testSvg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="red" opacity="0.5" />
      <circle cx="50" cy="50" r="30" fill="blue" stroke-width="5" />
    </svg>`;
    
    const optimizations = ['web', 'print', 'logo', 'icon'];
    
    for (const usage of optimizations) {
      const result = await advancedVectorizer.optimizeForUsage(testSvg, usage);
      
      if (result.success) {
        console.log(`✅ Оптимизация для ${usage}:`);
        console.log(`  📊 Сжатие: ${result.compressionRatio}%`);
        console.log(`  📏 Размер до: ${result.originalSize} байт`);
        console.log(`  📏 Размер после: ${result.optimizedSize} байт`);
      } else {
        console.error(`❌ Ошибка оптимизации для ${usage}:`, result.error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Критическая ошибка в демонстрации оптимизации:', error);
    return false;
  }
}

/**
 * Запуск полной демонстрации
 */
async function runFullDemo() {
  console.log('🎪 === ЗАПУСК ПОЛНОЙ ДЕМОНСТРАЦИИ ПРОДВИНУТОГО ВЕКТОРИЗАТОРА ===');
  console.log(`⏰ Время начала: ${new Date().toLocaleString()}`);
  
  const results = {
    basic: false,
    professional: false,
    analysis: false,
    multiformat: false,
    optimization: false
  };
  
  // Убеждаемся, что директории существуют
  const outputDir = path.join(__dirname, '..', 'output');
  const tempDir = path.join(__dirname, '..', 'temp');
  
  try {
    await fs.access(outputDir);
  } catch {
    await fs.mkdir(outputDir, { recursive: true });
  }
  
  try {
    await fs.access(tempDir);
  } catch {
    await fs.mkdir(tempDir, { recursive: true });
  }
  
  // Запускаем все демонстрации
  results.basic = await demonstrateBasicVectorization();
  results.professional = await demonstrateProfessionalVectorization();
  results.analysis = await demonstrateContentAnalysis();
  results.multiformat = await demonstrateMultiFormat();
  results.optimization = await demonstrateOptimization();
  
  // Подводим итоги
  console.log('\n📊 === ИТОГИ ДЕМОНСТРАЦИИ ===');
  const successCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`✅ Успешных тестов: ${successCount}/${totalTests}`);
  console.log(`📈 Процент успеха: ${Math.round(successCount/totalTests*100)}%`);
  
  Object.entries(results).forEach(([test, success]) => {
    console.log(`  ${success ? '✅' : '❌'} ${test}: ${success ? 'ПРОЙДЕН' : 'ПРОВАЛЕН'}`);
  });
  
  console.log(`⏰ Время завершения: ${new Date().toLocaleString()}`);
  
  return {
    success: successCount === totalTests,
    results,
    summary: {
      total: totalTests,
      passed: successCount,
      failed: totalTests - successCount,
      percentage: Math.round(successCount/totalTests*100)
    }
  };
}

/**
 * Быстрый тест интеграции
 */
async function quickIntegrationTest() {
  console.log('⚡ === БЫСТРЫЙ ТЕСТ ИНТЕГРАЦИИ ===');
  
  try {
    // Проверяем доступность всех экспортированных функций
    const exports = Object.keys(advancedVectorizer);
    console.log(`📦 Доступные функции: ${exports.join(', ')}`);
    
    // Проверяем константы
    const qualities = Object.keys(advancedVectorizer.QUALITY_PRESETS);
    const formats = Object.keys(advancedVectorizer.OUTPUT_FORMATS);
    const types = Object.keys(advancedVectorizer.CONTENT_TYPES);
    
    console.log(`🎚️ Качества: ${qualities.join(', ')}`);
    console.log(`📁 Форматы: ${formats.join(', ')}`);
    console.log(`🎨 Типы контента: ${types.join(', ')}`);
    
    // Быстрый тест создания демо-изображения
    const demoPath = await createDemoImage();
    console.log(`✅ Демо-изображение создано: ${demoPath}`);
    
    return {
      success: true,
      exports: exports.length,
      qualities: qualities.length,
      formats: formats.length,
      types: types.length
    };
  } catch (error) {
    console.error('❌ Ошибка быстрого теста:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  runFullDemo,
  quickIntegrationTest,
  demonstrateBasicVectorization,
  demonstrateProfessionalVectorization,
  demonstrateContentAnalysis,
  demonstrateMultiFormat,
  demonstrateOptimization,
  createDemoImage
};