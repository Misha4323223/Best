/**
 * ImageTracerJS векторизатор для BOOOMERANGS AI
 * Заменяет advanced-vectorizer на основе популярной библиотеки imagetracerjs
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ImageTracer from 'imagetracerjs';
import { createCanvas, loadImage } from 'canvas';
import fetch from 'node-fetch';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.VECTORIZER_PORT || 5006;

// Middleware
app.use(cors());
app.use(express.json());

// Настройка multer для загрузки файлов
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB лимит
});

// Директория для выходных файлов
const outputDir = path.join(process.cwd(), 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Основной endpoint для векторизации изображений
 */
app.post('/vectorize', upload.single('image'), async (req, res) => {
  try {
    console.log('🎨 Начинаем векторизацию с ImageTracerJS...');
    
    if (!req.file) {
      return res.status(400).json({ 
        error: 'Изображение не предоставлено',
        success: false 
      });
    }

    const imageBuffer = req.file.buffer;
    const timestamp = Date.now();
    const filename = `vectorized_${timestamp}`;
    
    // Настройки векторизации для высокого качества
    const options = {
      // Основные параметры качества
      ltres: 1,        // Порог яркости (0-255)
      qtres: 1,        // Порог квантования (0-255)
      pathomit: 8,     // Минимальная длина пути
      colorsampling: 1, // Сэмплирование цветов (0-2)
      numberofcolors: 5, // Количество цветов (2-256)
      mincolorratio: 0.02, // Минимальное соотношение цветов
      colorquantcycles: 3, // Циклы квантования цветов
      
      // Параметры сглаживания
      scale: 1,        // Масштаб
      simplifytolerance: 0, // Упрощение (0-отключено)
      roundcoords: 1,  // Округление координат
      lcpr: 0,         // Сглаживание углов
      qcpr: 0,         // Сглаживание кривых
      
      // Настройки SVG
      desc: false,     // Описание в SVG
      viewbox: false,  // ViewBox в SVG
      blurradius: 0,   // Радиус размытия
      blurdelta: 20    // Дельта размытия
    };

    // Создаем Image объект для ImageTracer с использованием canvas
    console.log('🔄 Создаем canvas image из файла...');
    const image = await loadImage(imageBuffer);
    
    // Выполняем векторизацию через canvas
    console.log('🎨 Запуск ImageTracer.imagedataToSVG...');
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    
    const svgString = ImageTracer.imagedataToSVG(imageData, options);

    // Сохраняем SVG файл
    const svgPath = path.join(outputDir, `${filename}.svg`);
    fs.writeFileSync(svgPath, svgString);
    
    console.log(`✅ Векторизация завершена: ${filename}.svg`);

    // Создаем метаданные
    const metadata = {
      filename: `${filename}.svg`,
      timestamp: timestamp,
      originalSize: imageBuffer.length,
      svgSize: svgString.length,
      options: options,
      vectorizer: 'ImageTracerJS',
      version: '1.2.6'
    };

    // Сохраняем метаданные
    const metaPath = path.join(outputDir, `${filename}_meta.json`);
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

    res.json({
      success: true,
      message: 'Векторизация выполнена успешно',
      data: {
        svgContent: svgString,
        filename: `${filename}.svg`,
        url: `/output/${filename}.svg`,
        metadata: metadata
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

/**
 * Endpoint для векторизации по URL
 */
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
    const filename = `vectorized_${timestamp}`;
    
    // Настройки по умолчанию с возможностью кастомизации
    const options = {
      ltres: 1,
      qtres: 1,
      pathomit: 8,
      colorsampling: 1,
      numberofcolors: 16,
      mincolorratio: 0.02,
      colorquantcycles: 3,
      scale: 1,
      simplifytolerance: 0,
      roundcoords: 1,
      ...customOptions
    };

    // Загружаем изображение по URL с расширенной обработкой
    console.log('📥 Загружаем изображение по URL...');
    let imageBuffer;
    
    try {
      // Пробуем загрузить с помощью node-fetch  
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        timeout: 20000,
        follow: 5
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      
      console.log(`✅ Изображение загружено: ${imageBuffer.length} байт`);
      
    } catch (fetchError) {
      console.log(`❌ Ошибка fetch: ${fetchError.message}`);
      
      // Альтернативный способ с использованием axios
      try {
        console.log('🔄 Пробуем загрузить через axios...');
        
        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 20000,
          headers: {
            'User-Agent': 'BOOOMERANGS-AI-Vectorizer/1.0'
          }
        });
        
        imageBuffer = Buffer.from(response.data);
        console.log(`✅ Изображение загружено через axios: ${imageBuffer.length} байт`);
        
      } catch (axiosError) {
        throw new Error(`Не удалось загрузить изображение: ${fetchError.message} | ${axiosError.message}`);
      }
    }
    
    // Создаем Image объект для ImageTracer с использованием canvas
    console.log('🔄 Создаем canvas image...');
    const image = await loadImage(imageBuffer);
    
    // Выполняем векторизацию через canvas
    console.log('🎨 Запуск ImageTracer.imagedataToSVG...');
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    
    const svgString = ImageTracer.imagedataToSVG(imageData, options);

    // Сохраняем результат
    const svgPath = path.join(outputDir, `${filename}.svg`);
    fs.writeFileSync(svgPath, svgString);
    
    const metadata = {
      filename: `${filename}.svg`,
      timestamp: timestamp,
      sourceUrl: imageUrl,
      svgSize: svgString.length,
      options: options,
      vectorizer: 'ImageTracerJS',
      version: '1.2.6'
    };

    const metaPath = path.join(outputDir, `${filename}_meta.json`);
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

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

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ImageTracerJS Vectorizer',
    port: PORT,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * Информация о доступных опциях
 */
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
      simplifytolerance: 'Упрощение (0-отключено, по умолчанию: 0)',
      roundcoords: 'Округление координат (по умолчанию: 1)',
      lcpr: 'Сглаживание углов (по умолчанию: 0)',
      qcpr: 'Сглаживание кривых (по умолчанию: 0)'
    },
    presets: {
      'default': 'Стандартные настройки',
      'posterized1': 'Постеризация (мало цветов)',
      'posterized2': 'Постеризация (средне цветов)',
      'curvy': 'Плавные кривые',
      'sharp': 'Четкие углы',
      'detailed': 'Детализированный результат'
    }
  });
});

// Статический сервер для выходных файлов
app.use('/output', express.static(outputDir));

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 ImageTracerJS Vectorizer запущен на порту ${PORT}`);
  console.log(`📁 Выходная директория: ${outputDir}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Доступные опции: http://localhost:${PORT}/options`);
});

export default app;