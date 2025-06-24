/**
 * Маршруты для продвинутого векторизатора
 * REST API endpoints для векторизации изображений
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const router = express.Router();

console.log('🔍 Загрузка advanced-vectorizer.cjs...');

// Принудительная очистка кэша для применения исправлений
const vectorizerPath = require.resolve('../advanced-vectorizer.cjs');
if (require.cache[vectorizerPath]) {
  delete require.cache[vectorizerPath];
  console.log('🔄 Очищен кэш advanced-vectorizer.cjs в routes');
}

let advancedVectorizer;
try {
  advancedVectorizer = require('../advanced-vectorizer.cjs');
  console.log('  ✓ advanced-vectorizer.cjs загружен успешно');
  console.log('  ✓ Доступные методы:', Object.keys(advancedVectorizer));
} catch (error) {
  console.error('❌ ОШИБКА загрузки advanced-vectorizer.cjs:', error.message);
  console.error('  Stack:', error.stack);
  process.exit(1);
}

// Middleware для логирования запросов векторизатора
const logVectorizerRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Vectorizer API: ${req.method} ${req.path}`);
  if (req.file) {
    console.log(`  📁 File: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)}KB)`);
  }
  if (req.files && req.files.length > 0) {
    console.log(`  📁 Files: ${req.files.length} files`);
  }
  next();
};

// Middleware для обработки ошибок векторизации
const handleVectorizerError = (error, req, res, next) => {
  console.error(`❌ Vectorizer Error [${req.method} ${req.path}]:`, error);
  
  // Специфичные ошибки векторизации
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'Файл слишком большой',
      message: 'Максимальный размер файла: 10MB'
    });
  }
  
  if (error.message && error.message.includes('Unsupported file type')) {
    return res.status(400).json({
      success: false,
      error: 'Неподдерживаемый тип файла',
      message: 'Поддерживаемые форматы: JPEG, PNG, GIF, WebP, BMP'
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Ошибка векторизации',
    message: error.message || 'Внутренняя ошибка сервера'
  });
};

// Применяем middleware ко всем маршрутам
router.use(logVectorizerRequest);

// Настройка multer для загрузки файлов
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB лимит
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  }
});

/**
 * POST /api/vectorizer/analyze
 * Анализирует изображение и определяет оптимальные настройки
 */
router.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Изображение не предоставлено'
      });
    }

    const detectedType = await advancedVectorizer.detectContentType(req.file.buffer);
    
    // Адаптируем результат под ожидаемый формат
    const analysis = {
      detectedType: detectedType || 'artwork',
      confidence: 0.8, // Фиксированная уверенность для совместимости
      recommendedQuality: detectedType === 'logo' ? 'premium' : 'standard',
      recommendedFormat: 'svg',
      description: `Автоматически определен тип: ${detectedType || 'artwork'}`
    };
    
    res.json({
      success: true,
      analysis: analysis
    });

  } catch (error) {
    console.error('Ошибка анализа изображения:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/vectorizer/convert
 * Основная конвертация изображения в векторный формат
 */
router.post('/convert', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Изображение не предоставлено'
      });
    }

    const options = {
      quality: req.body.quality || 'standard',
      outputFormat: req.body.format || 'svg',
      optimizeFor: req.body.optimizeFor || 'web',
      autoDetectType: req.body.autoDetectType !== 'false'
    };

    console.log(`🎯 Векторизация через API:`, {
      filename: req.file.originalname,
      size: req.file.size,
      options
    });

    // Используем исправленный Adobe алгоритм цветовой сегментации
    console.log('🎨 Применяем исправленный Adobe Illustrator алгоритм');
    const result = await advancedVectorizer.silkscreenVectorize(
      req.file.buffer,
      { maxColors: 6, ...options }
    );
    
    // Адаптируем результат под ожидаемый формат API
    if (result.success) {
      result.detectedType = 'silkscreen';
      result.filename = `vectorized_${Date.now().toString(36)}.svg`;
    }

    if (result.success) {
      res.json({
        success: true,
        result: {
          svgContent: result.svgContent,
          detectedType: result.detectedType,
          quality: result.quality,
          filename: result.filename,
          optimizationStats: result.optimization
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Ошибка векторизации:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/vectorizer/convert-url
 * Конвертация изображения по URL в векторный формат
 */
router.post('/convert-url', async (req, res) => {
  try {
    const { imageUrl, quality, outputFormat } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'URL изображения не предоставлен'
      });
    }

    // Проверяем что это валидный URL
    try {
      new URL(imageUrl);
    } catch (urlError) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный URL изображения'
      });
    }

    const options = {
      quality: quality || 'simple',
      outputFormat: outputFormat || 'svg',
      optimizeFor: 'web',
      autoDetectType: true
    };

    console.log(`🌐 Векторизация по URL:`, {
      url: imageUrl.substring(0, 100) + '...',
      options
    });

    // Используем исправленный Adobe алгоритм цветовой сегментации
    console.log('🎨 CONVERT-URL: Применяем исправленный Adobe Illustrator алгоритм');
    const result = await advancedVectorizer.vectorizeFromUrl(imageUrl, { maxColors: 6, ...options });
    
    // Адаптируем результат под ожидаемый формат API
    if (result.success) {
      result.detectedType = 'silkscreen';
      result.filename = `vectorized_${Date.now().toString(36)}.svg`;
    }

    if (result.success) {
      res.json({
        success: true,
        result: {
          svgContent: result.svgContent,
          detectedType: result.detectedType,
          quality: result.quality,
          filename: result.filename,
          optimizationStats: result.optimization
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Ошибка векторизации по URL:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/vectorizer/professional
 * Профессиональная векторизация с полным набором опций
 */
router.post('/professional', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Изображение не предоставлено'
      });
    }

    const options = {
      quality: req.body.quality || 'premium',
      formats: req.body.formats ? req.body.formats.split(',') : ['svg'],
      generatePreviews: req.body.generatePreviews === 'true',
      optimizeFor: req.body.optimizeFor || 'web',
      includeMetadata: req.body.includeMetadata !== 'false'
    };

    console.log(`🚀 Профессиональная векторизация через API:`, {
      filename: req.file.originalname,
      options
    });

    const result = await advancedVectorizer.professionalVectorize(
      req.file.buffer,
      req.file.originalname,
      options
    );

    res.json(result);

  } catch (error) {
    console.error('Ошибка профессиональной векторизации:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/vectorizer/batch
 * Пакетная обработка нескольких изображений
 */
router.post('/batch', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Изображения не предоставлены'
      });
    }

    const options = {
      quality: req.body.quality || 'standard',
      outputFormat: req.body.format || 'svg'
    };

    console.log(`📦 Пакетная векторизация: ${req.files.length} файлов`);

    const imageBuffers = req.files.map(file => ({
      buffer: file.buffer,
      originalName: file.originalname
    }));

    const result = await advancedVectorizer.batchVectorize(imageBuffers, options);

    res.json(result);

  } catch (error) {
    console.error('Ошибка пакетной векторизации:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/vectorizer/previews
 * Генерация превью с разными настройками качества
 */
router.post('/previews', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Изображение не предоставлено'
      });
    }

    console.log(`🔍 Генерация превью для: ${req.file.originalname}`);

    const result = await advancedVectorizer.generatePreviews(
      req.file.buffer,
      req.file.originalname
    );

    res.json(result);

  } catch (error) {
    console.error('Ошибка генерации превью:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/vectorizer/multi-format
 * Конвертация в несколько форматов одновременно
 */
router.post('/multi-format', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Изображение не предоставлено'
      });
    }

    const formats = req.body.formats ? req.body.formats.split(',') : ['svg', 'eps', 'pdf'];
    const options = {
      quality: req.body.quality || 'premium',
      formats: formats
    };

    console.log(`🎨 Многоформатная векторизация:`, {
      filename: req.file.originalname,
      formats: formats
    });

    const result = await advancedVectorizer.multiFormatVectorize(
      req.file.buffer,
      req.file.originalname,
      options
    );

    res.json(result);

  } catch (error) {
    console.error('Ошибка многоформатной векторизации:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/vectorizer/formats
 * Получение списка доступных форматов и настроек
 */
router.get('/formats', (req, res) => {
  res.json({
    success: true,
    formats: advancedVectorizer.OUTPUT_FORMATS,
    qualities: advancedVectorizer.QUALITY_PRESETS,
    contentTypes: advancedVectorizer.CONTENT_TYPES
  });
});

/**
 * GET /api/vectorizer/health
 * Проверка состояния модуля векторизации
 */
router.get('/health', async (req, res) => {
  try {
    // Проверяем доступность выходных директорий
    const outputDir = path.join(__dirname, '..', 'output');
    const tempDir = path.join(__dirname, '..', 'temp');
    
    await fs.access(outputDir).catch(() => fs.mkdir(outputDir, { recursive: true }));
    await fs.access(tempDir).catch(() => fs.mkdir(tempDir, { recursive: true }));

    res.json({
      success: true,
      status: 'healthy',
      module: 'advanced-vectorizer',
      version: '2.0',
      directories: {
        output: outputDir,
        temp: tempDir
      },
      capabilities: [
        'auto-detection',
        'multi-format',
        'quality-levels',
        'batch-processing',
        'optimization',
        'previews'
      ]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Применяем обработчик ошибок векторизации ко всем маршрутам
router.use(handleVectorizerError);

export default router;