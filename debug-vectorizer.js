/**
 * Отладочный векторизатор для диагностики цветовых проблем
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

const app = express();
const upload = multer({ dest: 'temp/' });

// Тестовая функция извлечения цветов
async function debugColorExtraction(imageBuffer) {
  console.log('🔬 DEBUG: Начинаем анализ цветов');
  
  try {
    const { data, info } = await sharp(imageBuffer)
      .resize(200, 200)
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    console.log(`📊 Изображение: ${info.width}x${info.height}, каналов: ${info.channels}`);
    
    // Извлекаем уникальные цвета
    const colorMap = new Map();
    
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Пропускаем прозрачные пиксели
      if (info.channels === 4 && data[i + 3] < 128) continue;
      
      const colorKey = `${r},${g},${b}`;
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }
    
    console.log(`🎨 Найдено уникальных цветов: ${colorMap.size}`);
    
    // Сортируем по частоте
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([colorKey, count]) => {
        const [r, g, b] = colorKey.split(',').map(Number);
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        return { r, g, b, hex, count };
      });
    
    console.log('🎯 Топ-10 цветов:');
    sortedColors.forEach((color, i) => {
      console.log(`  ${i + 1}. ${color.hex} (RGB: ${color.r},${color.g},${color.b}) - ${color.count} пикселей`);
    });
    
    return sortedColors.slice(0, 4);
    
  } catch (error) {
    console.error('❌ Ошибка анализа цветов:', error);
    return [];
  }
}

// Создание отладочного SVG
function createDebugSVG(colors, width = 400, height = 400) {
  console.log('🎨 Создаем отладочный SVG с цветами:', colors.map(c => c.hex));
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <title>Debug Color Test (${colors.length} colors)</title>
  <desc>Отладочный SVG для проверки цветового вывода</desc>
`;

  // Создаем цветные прямоугольники для каждого цвета
  const rectHeight = height / colors.length;
  
  colors.forEach((color, i) => {
    const y = i * rectHeight;
    svg += `  <g id="color-${i + 1}">
    <rect x="0" y="${y}" width="${width}" height="${rectHeight}" fill="${color.hex}" stroke="none"/>
    <text x="10" y="${y + rectHeight/2}" fill="${color.r + color.g + color.b > 384 ? '#000' : '#fff'}" font-family="Arial" font-size="14">
      ${color.hex} (${color.count} px)
    </text>
  </g>
`;
  });
  
  svg += '</svg>';
  return svg;
}

// Маршрут для отладочного тестирования
app.post('/debug-colors', upload.single('image'), async (req, res) => {
  try {
    console.log('🚀 Получен запрос на отладку цветов');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Нет файла изображения' });
    }
    
    const imageBuffer = await fs.readFile(req.file.path);
    console.log(`📁 Загружен файл: ${req.file.filename}, размер: ${imageBuffer.length} байт`);
    
    // Анализируем цвета
    const colors = await debugColorExtraction(imageBuffer);
    
    if (colors.length === 0) {
      return res.status(500).json({ error: 'Не удалось извлечь цвета' });
    }
    
    // Создаем отладочный SVG
    const svg = createDebugSVG(colors);
    
    // Сохраняем результат
    const outputPath = path.join('output/vectorizer', `debug_${Date.now()}.svg`);
    await fs.writeFile(outputPath, svg);
    
    console.log(`✅ Отладочный SVG сохранен: ${outputPath}`);
    
    // Очищаем временный файл
    await fs.unlink(req.file.path);
    
    res.json({
      success: true,
      colors: colors.length,
      file: path.basename(outputPath),
      url: `/output/vectorizer/${path.basename(outputPath)}`,
      extracted_colors: colors
    });
    
  } catch (error) {
    console.error('❌ Ошибка отладки:', error);
    res.status(500).json({ error: error.message });
  }
});

// Статические файлы
app.use('/output', express.static('output'));

const PORT = 5007;
app.listen(PORT, () => {
  console.log(`🔬 Отладочный сервер запущен на порту ${PORT}`);
  console.log(`📡 Тест: curl -X POST http://localhost:${PORT}/debug-colors -F "image=@dragon_embroidery.jpg"`);
});