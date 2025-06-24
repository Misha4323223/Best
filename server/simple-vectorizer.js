/**
 * Упрощенный векторизатор для BOOOMERANGS AI
 * Использует ImageTracerJS без canvas зависимостей
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ImageTracer from 'imagetracerjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.VECTORIZER_PORT || 5006;

// Создаем выходную директорию
const outputDir = path.join(process.cwd(), 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/output', express.static(outputDir));

// Настройка multer
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Simple ImageTracerJS Vectorizer',
    port: PORT.toString(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Опции векторизации
app.get('/options', (req, res) => {
  res.json({
    availableOptions: {
      ltres: 'Порог яркости (0-255, по умолчанию: 1)',
      qtres: 'Порог квантования (0-255, по умолчанию: 1)', 
      pathomit: 'Минимальная длина пути (по умолчанию: 8)',
      colorsampling: 'Сэмплирование цветов (0-2, по умолчанию: 1)',
      numberofcolors: 'Количество цветов (2-256, по умолчанию: 16)',
      mincolorratio: 'Минимальное соотношение цветов (по умолчанию: 0.02)',
      colorquantcycles: 'Циклы квантования цветов (по умолчанию: 3)',
      scale: 'Масштаб (по умолчанию: 1)',
      roundcoords: 'Округление координат (по умолчанию: 1)'
    },
    presets: {
      default: 'Стандартные настройки',
      simple: 'Упрощенный (мало цветов)',
      detailed: 'Детализированный результат'
    }
  });
});

// Векторизация файла
app.post('/vectorize', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Файл изображения не предоставлен'
      });
    }

    const imageBuffer = req.file.buffer;
    const timestamp = Date.now();
    const filename = `vectorized_${timestamp}`;

    // Базовые настройки ImageTracer
    const options = {
      ltres: 1,
      qtres: 1,
      pathomit: 8,
      colorsampling: 1,
      numberofcolors: 12,
      mincolorratio: 0.02,
      colorquantcycles: 3,
      scale: 1,
      roundcoords: 1
    };

    // Преобразуем Buffer в base64 data URL
    const mimeType = req.file.mimetype;
    const base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    
    console.log('🎨 Запуск простой векторизации...');
    
    // Выполняем векторизацию
    const svgString = await new Promise((resolve, reject) => {
      try {
        // Используем простой callback подход
        ImageTracer.imageToSVG(base64Image, (svgResult) => {
          if (svgResult && typeof svgResult === 'string') {
            resolve(svgResult);
          } else {
            reject(new Error('Некорректный результат векторизации'));
          }
        }, options);
      } catch (error) {
        reject(error);
      }
    });

    // Сохраняем результат
    const svgPath = path.join(outputDir, `${filename}.svg`);
    fs.writeFileSync(svgPath, svgString);
    
    console.log(`✅ Векторизация завершена: ${filename}.svg`);

    res.json({
      success: true,
      message: 'Векторизация выполнена успешно',
      data: {
        svgContent: svgString,
        filename: `${filename}.svg`,
        url: `/output/${filename}.svg`,
        metadata: {
          timestamp,
          originalSize: imageBuffer.length,
          svgSize: svgString.length,
          vectorizer: 'ImageTracerJS-Simple'
        }
      }
    });

  } catch (error) {
    console.error('❌ Ошибка векторизации:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при векторизации изображения',
      details: error.message
    });
  }
});

// Векторизация по URL
app.post('/vectorize-url', async (req, res) => {
  try {
    const { imageUrl, options: customOptions } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ 
        error: 'URL изображения не предоставлен',
        success: false 
      });
    }

    console.log(`🌐 Векторизация по URL: ${imageUrl}`);
    
    const timestamp = Date.now();
    const filename = `vectorized_url_${timestamp}`;
    
    // Настройки векторизации
    const options = {
      ltres: 1,
      qtres: 1,
      pathomit: 8,
      colorsampling: 1,
      numberofcolors: 12,
      mincolorratio: 0.02,
      colorquantcycles: 3,
      scale: 1,
      roundcoords: 1,
      ...customOptions
    };

    console.log('🎨 Запуск векторизации по URL...');
    
    // Выполняем векторизацию напрямую по URL
    const svgString = await new Promise((resolve, reject) => {
      try {
        ImageTracer.imageToSVG(imageUrl, (svgResult) => {
          if (svgResult && typeof svgResult === 'string') {
            resolve(svgResult);
          } else {
            reject(new Error('Некорректный результат векторизации'));
          }
        }, options);
      } catch (error) {
        reject(error);
      }
    });

    // Сохраняем результат
    const svgPath = path.join(outputDir, `${filename}.svg`);
    fs.writeFileSync(svgPath, svgString);
    
    const metadata = {
      filename: `${filename}.svg`,
      timestamp: timestamp,
      sourceUrl: imageUrl,
      svgSize: svgString.length,
      options: options,
      vectorizer: 'ImageTracerJS-Simple'
    };

    console.log(`✅ Векторизация по URL завершена: ${filename}.svg`);

    res.json({
      success: true,
      message: 'Векторизация по URL выполнена успешно',
      data: {
        svgContent: svgString,
        filename: `${filename}.svg`,
        url: `/output/${filename}.svg`,
        metadata: metadata
      }
    });

  } catch (error) {
    console.error('❌ Ошибка векторизации по URL:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при векторизации изображения по URL',
      details: error.message
    });
  }
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple ImageTracerJS Vectorizer запущен на порту ${PORT}`);
  console.log(`📁 Выходная директория: ${outputDir}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Доступные опции: http://localhost:${PORT}/options`);
});

export default app;