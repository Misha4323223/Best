/**
 * Оптимизатор изображений для шелкографии и DTF печати
 * Использует Sharp.js для локальной обработки без внешних API
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

/**
 * Скачивает изображение по URL
 * @param {string} imageUrl - URL изображения
 * @returns {Promise<Buffer>} Буфер изображения
 */
async function downloadImage(imageUrl) {
    try {
        console.log('📥 [PRINT-OPT] Скачиваем изображение:', imageUrl);
        const response = await fetch(imageUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const buffer = await response.buffer();
        console.log('✅ [PRINT-OPT] Изображение скачано, размер:', buffer.length, 'байт');
        return buffer;
    } catch (error) {
        console.error('❌ [PRINT-OPT] Ошибка загрузки:', error.message);
        throw error;
    }
}

/**
 * Оптимизация для шелкографии
 * @param {Buffer} imageBuffer - Буфер изображения
 * @param {Object} options - Параметры оптимизации
 * @returns {Promise<Object>} Результат обработки
 */
async function optimizeForScreenPrint(imageBuffer, options = {}) {
    let {
        maxColors = 6,
        minContrast = 0.3,
        outputDir = './output/screen-print'
    } = options;
    
    // Интеллектуальное определение оптимального количества цветов
    try {
        const { getOptimalColorCount } = require('./color-analysis-engine');
        const colorAnalysis = await getOptimalColorCount(imageBuffer, 'screen-print');
        
        if (colorAnalysis.colors && colorAnalysis.colors !== maxColors) {
            console.log(`🎨 [SCREEN-PRINT] Автоопределение цветов: ${colorAnalysis.colors} (было: ${maxColors})`);
            maxColors = colorAnalysis.colors;
            options.intelligentAnalysis = colorAnalysis;
        }
    } catch (error) {
        console.log(`⚠️ [SCREEN-PRINT] Используем стандартные настройки цветов: ${error.message}`);
    }
    
    console.log('🖨️ [SCREEN-PRINT] Начинаем оптимизацию для шелкографии');
    
    try {
        // Создаем директорию если не существует
        await fs.mkdir(outputDir, { recursive: true });
        
        const timestamp = Date.now();
        const baseFilename = `screen-print-${timestamp}`;
        
        // 1. Увеличиваем контрастность и резкость
        const enhanced = await sharp(imageBuffer)
            .resize(3000, 3000, { 
                fit: 'inside', 
                withoutEnlargement: false,
                kernel: sharp.kernel.lanczos3 
            })
            .sharpen({ sigma: 1.5, m1: 1.0, m2: 2.0 })
            .modulate({ 
                brightness: 1.1, 
                saturation: 1.2, 
                lightness: 0 
            })
            .normalise()
            .toBuffer();
        
        // 2. Создаем высококонтрастную версию
        const highContrast = await sharp(enhanced)
            .threshold(128)
            .toBuffer();
        
        // 3. Создаем версию с ограниченной палитрой
        const limitedPalette = await sharp(enhanced)
            .png({ 
                palette: true,
                colours: maxColors,
                dither: 0.5
            })
            .toBuffer();
        
        // 4. Создаем контурную версию для трафаретов
        const edges = await sharp(enhanced)
            .greyscale()
            .convolve({
                width: 3,
                height: 3,
                kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
            })
            .threshold(50)
            .toBuffer();
        
        // Сохраняем все версии
        const files = {
            enhanced: path.join(outputDir, `${baseFilename}-enhanced.png`),
            highContrast: path.join(outputDir, `${baseFilename}-high-contrast.png`),
            limitedPalette: path.join(outputDir, `${baseFilename}-limited-palette.png`),
            edges: path.join(outputDir, `${baseFilename}-edges.png`)
        };
        
        await Promise.all([
            fs.writeFile(files.enhanced, enhanced),
            fs.writeFile(files.highContrast, highContrast),
            fs.writeFile(files.limitedPalette, limitedPalette),
            fs.writeFile(files.edges, edges)
        ]);
        
        console.log('✅ [SCREEN-PRINT] Файлы для шелкографии созданы');
        
        return {
            success: true,
            files: files,
            settings: {
                maxColors,
                resolution: '3000x3000',
                type: 'screen-print'
            },
            intelligentAnalysis: options.intelligentAnalysis || null
        };
        
    } catch (error) {
        console.error('❌ [SCREEN-PRINT] Ошибка оптимизации:', error);
        throw error;
    }
}

/**
 * Оптимизация для DTF печати
 * @param {Buffer} imageBuffer - Буфер изображения
 * @param {Object} options - Параметры оптимизации
 * @returns {Promise<Object>} Результат обработки
 */
async function optimizeForDTF(imageBuffer, options = {}) {
    const {
        addWhiteBase = true,
        enhanceColors = true,
        outputDir = './output/dtf-print'
    } = options;
    
    console.log('🎨 [DTF] Начинаем оптимизацию для DTF печати');
    
    try {
        // Создаем директорию если не существует
        await fs.mkdir(outputDir, { recursive: true });
        
        const timestamp = Date.now();
        const baseFilename = `dtf-print-${timestamp}`;
        
        // 1. Основная обработка - высокое разрешение с улучшенными цветами
        let processed = sharp(imageBuffer)
            .resize(3600, 3600, { 
                fit: 'inside', 
                withoutEnlargement: false,
                kernel: sharp.kernel.lanczos3 
            });
        
        if (enhanceColors) {
            processed = processed
                .modulate({ 
                    brightness: 1.05, 
                    saturation: 1.3, 
                    lightness: 0 
                })
                .sharpen({ sigma: 1.2, m1: 0.8, m2: 1.5 });
        }
        
        const mainImage = await processed.png({ quality: 95 }).toBuffer();
        
        // 2. Создаем версию с белой подложкой для темных тканей
        let whiteBase = null;
        if (addWhiteBase) {
            // Создаем маску для белой подложки
            const mask = await sharp(mainImage)
                .greyscale()
                .threshold(240, { greyscale: false })
                .negate()
                .blur(1)
                .toBuffer();
            
            // Создаем белую подложку
            whiteBase = await sharp({
                create: {
                    width: 3600,
                    height: 3600,
                    channels: 3,
                    background: { r: 255, g: 255, b: 255 }
                }
            })
            .composite([{ input: mask, blend: 'multiply' }])
            .png()
            .toBuffer();
        }
        
        // 3. Создаем версию с прозрачным фоном
        const transparent = await sharp(mainImage)
            .png({ palette: false })
            .toBuffer();
        
        // 4. Создаем увеличенную версию для крупной печати
        const large = await sharp(mainImage)
            .resize(5400, 5400, { 
                fit: 'inside', 
                withoutEnlargement: false,
                kernel: sharp.kernel.lanczos3 
            })
            .png({ quality: 95 })
            .toBuffer();
        
        // Сохраняем файлы
        const files = {
            main: path.join(outputDir, `${baseFilename}-main.png`),
            transparent: path.join(outputDir, `${baseFilename}-transparent.png`),
            large: path.join(outputDir, `${baseFilename}-large.png`)
        };
        
        const savePromises = [
            fs.writeFile(files.main, mainImage),
            fs.writeFile(files.transparent, transparent),
            fs.writeFile(files.large, large)
        ];
        
        if (whiteBase) {
            files.whiteBase = path.join(outputDir, `${baseFilename}-white-base.png`);
            savePromises.push(fs.writeFile(files.whiteBase, whiteBase));
        }
        
        await Promise.all(savePromises);
        
        console.log('✅ [DTF] Файлы для DTF печати созданы');
        
        return {
            success: true,
            files: files,
            settings: {
                resolution: '3600x3600',
                largeResolution: '5400x5400',
                whiteBase: addWhiteBase,
                type: 'dtf-print'
            }
        };
        
    } catch (error) {
        console.error('❌ [DTF] Ошибка оптимизации:', error);
        throw error;
    }
}

/**
 * Создание векторизованной версии
 * @param {Buffer} imageBuffer - Буфер изображения
 * @param {Object} options - Параметры векторизации
 * @returns {Promise<Object>} Результат обработки
 */
async function createVectorVersion(imageBuffer, options = {}) {
    const {
        threshold = 128,
        smoothing = 2,
        outputDir = './output/vector'
    } = options;
    
    console.log('📐 [VECTOR] Создаем векторизованную версию');
    
    try {
        await fs.mkdir(outputDir, { recursive: true });
        
        const timestamp = Date.now();
        const baseFilename = `vector-${timestamp}`;
        
        // Создаем высококонтрастную черно-белую версию
        const bw = await sharp(imageBuffer)
            .resize(2048, 2048, { fit: 'inside' })
            .greyscale()
            .blur(smoothing)
            .threshold(threshold)
            .png()
            .toBuffer();
        
        // Создаем контурную версию
        const contours = await sharp(imageBuffer)
            .resize(2048, 2048, { fit: 'inside' })
            .greyscale()
            .convolve({
                width: 3,
                height: 3,
                kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
            })
            .threshold(30)
            .png()
            .toBuffer();
        
        const files = {
            blackWhite: path.join(outputDir, `${baseFilename}-bw.png`),
            contours: path.join(outputDir, `${baseFilename}-contours.png`)
        };
        
        await Promise.all([
            fs.writeFile(files.blackWhite, bw),
            fs.writeFile(files.contours, contours)
        ]);
        
        console.log('✅ [VECTOR] Векторные версии созданы');
        
        return {
            success: true,
            files: files,
            settings: {
                threshold,
                smoothing,
                type: 'vector'
            }
        };
        
    } catch (error) {
        console.error('❌ [VECTOR] Ошибка векторизации:', error);
        throw error;
    }
}

/**
 * Основная функция оптимизации изображения для печати
 * @param {string} imageUrl - URL изображения
 * @param {string} printType - Тип печати (screen-print, dtf, both)
 * @param {Object} options - Дополнительные параметры
 * @returns {Promise<Object>} Результат обработки
 */
async function optimizeImageForPrint(imageUrl, printType = 'both', options = {}) {
    try {
        console.log(`🖨️ [PRINT-OPT] Начинаем оптимизацию для: ${printType}`);
        
        // Скачиваем изображение
        const imageBuffer = await downloadImage(imageUrl);
        
        const results = {
            success: true,
            optimizations: {},
            printType: printType,
            originalUrl: imageUrl
        };
        
        // Выполняем оптимизации в зависимости от типа
        if (printType === 'screen-print' || printType === 'both') {
            results.optimizations.screenPrint = await optimizeForScreenPrint(imageBuffer, options.screenPrint);
        }
        
        if (printType === 'dtf' || printType === 'both') {
            results.optimizations.dtf = await optimizeForDTF(imageBuffer, options.dtf);
        }
        
        // Всегда создаем векторную версию
        results.optimizations.vector = await createVectorVersion(imageBuffer, options.vector);
        
        console.log('✅ [PRINT-OPT] Все оптимизации завершены');
        return results;
        
    } catch (error) {
        console.error('❌ [PRINT-OPT] Общая ошибка оптимизации:', error);
        return {
            success: false,
            error: error.message,
            printType: printType
        };
    }
}

module.exports = {
    optimizeImageForPrint,
    optimizeForScreenPrint,
    optimizeForDTF,
    createVectorVersion
};