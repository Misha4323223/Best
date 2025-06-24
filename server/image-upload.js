/**
 * Модуль для загрузки и хранения изображений
 * Поддерживает загрузку из файлов, URL и base64
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

// Создаем каталоги для хранения загруженных изображений
const ensureDirectories = () => {
  const dirs = [
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'uploads', 'images')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Вызываем функцию для создания каталогов при инициализации
ensureDirectories();

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), 'uploads', 'images'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Фильтр для проверки типа файла
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Неподдерживаемый формат изображения. Поддерживаются только JPEG, PNG, GIF и WebP'), false);
  }
};

// Инициализация загрузчика файлов
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Максимальный размер файла: 5MB
  fileFilter: fileFilter
});

/**
 * Сохраняет изображение из base64 строки
 * @param {string} base64String - Строка base64 изображения
 * @returns {Promise<string>} - Путь к сохраненному файлу
 */
async function saveBase64Image(base64String) {
  ensureDirectories();
  
  // Получаем данные и тип из строки base64
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  
  if (!matches || matches.length !== 3) {
    throw new Error('Некорректный формат base64 изображения');
  }
  
  const mimeType = matches[1];
  const data = Buffer.from(matches[2], 'base64');
  
  // Определяем расширение файла
  let extension = '.png';
  if (mimeType === 'image/jpeg') extension = '.jpg';
  if (mimeType === 'image/gif') extension = '.gif';
  if (mimeType === 'image/webp') extension = '.webp';
  
  // Создаем имя файла и путь для сохранения
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${extension}`;
  const filePath = path.join(process.cwd(), 'uploads', 'images', fileName);
  
  // Записываем файл
  await fs.promises.writeFile(filePath, data);
  
  // Возвращаем URL к файлу
  return `/uploads/images/${fileName}`;
}

/**
 * Скачивает изображение по URL
 * @param {string} url - URL изображения
 * @returns {Promise<string>} - Путь к сохраненному файлу
 */
async function downloadAndSaveImage(url) {
  ensureDirectories();
  
  try {
    // Получаем изображение
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Не удалось скачать изображение: ${response.statusText}`);
    }
    
    // Определяем тип файла и расширение
    const contentType = response.headers.get('content-type');
    let extension = '.png';
    
    if (contentType) {
      if (contentType.includes('jpeg')) extension = '.jpg';
      if (contentType.includes('gif')) extension = '.gif';
      if (contentType.includes('webp')) extension = '.webp';
    }
    
    // Создаем имя файла и путь для сохранения
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${extension}`;
    const filePath = path.join(process.cwd(), 'uploads', 'images', fileName);
    
    // Получаем данные и записываем в файл
    const buffer = await response.buffer();
    await fs.promises.writeFile(filePath, buffer);
    
    // Возвращаем URL к файлу
    return `/uploads/images/${fileName}`;
  } catch (error) {
    console.error('Ошибка при скачивании изображения:', error);
    throw error;
  }
}

// Маршрут для загрузки файла изображения
router.post('/file', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Изображение не было загружено' });
    }
    
    // Формируем URL к сохраненному изображению
    const imageUrl = `/uploads/images/${req.file.filename}`;
    
    return res.json({
      success: true,
      imageUrl,
      message: 'Изображение успешно загружено'
    });
  } catch (error) {
    console.error('Ошибка при загрузке файла:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Ошибка при загрузке изображения'
    });
  }
});

// Маршрут для загрузки изображения из base64
router.post('/base64', async (req, res) => {
  try {
    const { base64Image } = req.body;
    
    if (!base64Image) {
      return res.status(400).json({ success: false, error: 'Base64 изображение не предоставлено' });
    }
    
    // Сохраняем изображение
    const imageUrl = await saveBase64Image(base64Image);
    
    return res.json({
      success: true,
      imageUrl,
      message: 'Изображение успешно загружено'
    });
  } catch (error) {
    console.error('Ошибка при загрузке base64 изображения:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Ошибка при загрузке изображения'
    });
  }
});

// Маршрут для загрузки изображения по URL
router.post('/url', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: 'URL изображения не предоставлен' });
    }
    
    // Скачиваем и сохраняем изображение
    const savedImageUrl = await downloadAndSaveImage(imageUrl);
    
    return res.json({
      success: true,
      imageUrl: savedImageUrl,
      message: 'Изображение успешно загружено'
    });
  } catch (error) {
    console.error('Ошибка при загрузке изображения по URL:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Ошибка при загрузке изображения'
    });
  }
});

module.exports = router;