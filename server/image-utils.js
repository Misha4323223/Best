/**
 * Утилиты для работы с изображениями
 */

const sharp = require('sharp');

/**
 * Безопасная загрузка изображения по URL
 */
async function loadImageFromUrl(imageUrl, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
      
      console.log(`🔄 [IMAGE-UTILS] Загружаем изображение (попытка ${attempt}/${retries}): ${imageUrl}`);
      
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
        },
        timeout: 15000
      });
      
      if (!imageResponse.ok) {
        if (attempt < retries) {
          console.log(`⚠️ [IMAGE-UTILS] Попытка ${attempt} неудачна: HTTP ${imageResponse.status}, повторяем через 2 сек...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        throw new Error(`HTTP ${imageResponse.status}: ${imageResponse.statusText}`);
      }
      
      const contentType = imageResponse.headers.get('content-type');
      console.log(`📋 [IMAGE-UTILS] Content-Type: ${contentType}`);
      
      // Получаем данные как ArrayBuffer и конвертируем в Buffer
      const arrayBuffer = await imageResponse.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);
      
      console.log(`✅ [IMAGE-UTILS] Загружено ${imageBuffer.length} байт`);
      
      // Проверяем, что это действительно изображение
      const metadata = await sharp(imageBuffer).metadata();
      console.log(`📊 [IMAGE-UTILS] Размер: ${metadata.width}x${metadata.height}, формат: ${metadata.format}`);
      
      return imageBuffer;
      
    } catch (error) {
      if (attempt < retries) {
        console.log(`⚠️ [IMAGE-UTILS] Попытка ${attempt} неудачна: ${error.message}, повторяем через 3 сек...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }
      
      console.error(`❌ [IMAGE-UTILS] Ошибка загрузки изображения после ${retries} попыток: ${error.message}`);
      throw new Error(`Не удалось загрузить изображение: ${error.message}`);
    }
  }
}

/**
 * Проверка формата изображения
 */
async function validateImageFormat(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
    
    if (!supportedFormats.includes(metadata.format)) {
      throw new Error(`Неподдерживаемый формат: ${metadata.format}`);
    }
    
    return {
      valid: true,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels
    };
    
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Конвертация изображения в PNG если нужно
 */
async function ensurePngFormat(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    
    if (metadata.format === 'png') {
      return buffer;
    }
    
    // Конвертируем в PNG
    console.log(`🔄 [IMAGE-UTILS] Конвертируем ${metadata.format} в PNG`);
    const pngBuffer = await sharp(buffer).png().toBuffer();
    
    return pngBuffer;
    
  } catch (error) {
    console.error(`❌ [IMAGE-UTILS] Ошибка конвертации:`, error.message);
    throw error;
  }
}

module.exports = {
  loadImageFromUrl,
  validateImageFormat,
  ensurePngFormat
};