/**
 * Тест исправленного алгоритма кластеризации цветов
 */
const fs = require('fs');
const fetch = require('node-fetch');

// Импортируем исправленный векторизатор
const vectorizer = require('./advanced-vectorizer.cjs');

async function testColorFix() {
  console.log('🧪 Тестирование исправленного алгоритма кластеризации цветов...');
  
  try {
    // Загружаем то же изображение дракона
    const imageUrl = 'https://image.pollinations.ai/prompt/A%20majestic%20dragon%20with%20detailed%20scales%20in%20warm%20brown%20and%20gold%20tones,%20traditional%20fantasy%20style,%20high%20detail?width=800&height=800&seed=12345&nologo=true';
    
    console.log('📥 Загружаем изображение...');
    const response = await fetch(imageUrl);
    const imageBuffer = await response.buffer();
    
    console.log('🎨 Запускаем векторизацию с исправленным алгоритмом...');
    const result = await vectorizer.vectorizeImage(imageBuffer, 'test_dragon', {
      maxColors: 5,
      mode: 'screenprint',
      outputFormat: 'svg'
    });
    
    if (result.success) {
      console.log('✅ Векторизация успешна!');
      console.log(`📄 Размер SVG: ${result.fileSize} байт`);
      
      // Анализируем количество цветов в SVG
      const colorMatches = result.svgContent.match(/fill="#[0-9a-fA-F]{6}"/g);
      const uniqueColors = [...new Set(colorMatches)];
      
      console.log(`🎨 Найдено цветов в SVG: ${uniqueColors.length}`);
      uniqueColors.forEach((color, i) => {
        console.log(`   Цвет ${i + 1}: ${color}`);
      });
      
      // Сохраняем результат
      const outputPath = `output/vectorizer/test_color_fix_${Date.now()}.svg`;
      await fs.promises.writeFile(outputPath, result.svgContent, 'utf8');
      console.log(`💾 Сохранено: ${outputPath}`);
      
      return { success: true, colors: uniqueColors.length, path: outputPath };
    } else {
      console.log('❌ Ошибка векторизации:', result.error);
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
    return { success: false, error: error.message };
  }
}

// Запускаем тест
testColorFix().then(result => {
  if (result.success) {
    console.log(`🎉 УСПЕХ! Создан SVG с ${result.colors} цветами`);
    console.log(`📁 Файл: ${result.path}`);
  } else {
    console.log(`💔 НЕУДАЧА: ${result.error}`);
  }
  process.exit(0);
});