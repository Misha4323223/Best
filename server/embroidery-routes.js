/**
 * Маршруты для конвертации изображений в форматы вышивки
 */

const express = require('express');
const multer = require('multer');
const { convertToEmbroidery, getSupportedFormats } = require('./embroidery-converter');

const router = express.Router();

// Настройка загрузки файлов
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Поддерживаются только изображения JPG, PNG, GIF'));
    }
  }
});

/**
 * Получение списка поддерживаемых форматов
 */
router.get('/formats', (req, res) => {
  try {
    const formats = getSupportedFormats();
    res.json({
      success: true,
      formats: formats,
      description: 'Поддерживаемые форматы для вышивки и шелкографии'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ошибка получения форматов'
    });
  }
});

/**
 * Конвертация изображения в формат вышивки
 */
router.post('/convert', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Не загружено изображение'
      });
    }

    const { format = 'dst', width, height, colors } = req.body;
    
    const options = {};
    if (width) options.width = parseInt(width);
    if (height) options.height = parseInt(height);
    if (colors) options.colors = parseInt(colors);

    console.log(`Конвертация ${req.file.originalname} в формат ${format}`);

    const result = await convertToEmbroidery(
      req.file.buffer,
      req.file.originalname,
      format,
      options
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Конвертация завершена успешно',
        format: result.format,
        analysis: result.analysis,
        colorPalette: result.colorPalette,
        files: result.files,
        instructions: result.instructions
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        supportedFormats: result.supportedFormats
      });
    }

  } catch (error) {
    console.error('Ошибка конвертации:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера при конвертации'
    });
  }
});

/**
 * Анализ изображения без конвертации
 */
router.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Не загружено изображение'
      });
    }

    const { analyzeImageForEmbroidery, extractColorPalette } = require('./embroidery-converter');
    
    const analysis = await analyzeImageForEmbroidery(req.file.buffer);
    const colorPalette = await extractColorPalette(req.file.buffer, 15);

    res.json({
      success: true,
      filename: req.file.originalname,
      analysis: analysis,
      colorPalette: colorPalette,
      recommendations: {
        recommendedFormat: analysis.recommendedFormat,
        colorReduction: colorPalette.length > 15 ? 'Рекомендуется упростить цветовую схему' : 'Цветовая схема подходит',
        sizeOptimal: analysis.width <= 400 && analysis.height <= 400 ? 'Размер подходит' : 'Рекомендуется уменьшить размер'
      }
    });

  } catch (error) {
    console.error('Ошибка анализа:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка анализа изображения'
    });
  }
});

module.exports = router;