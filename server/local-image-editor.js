/**
 * Локальный редактор изображений с базовыми функциями
 * Использует Sharp для обработки без внешних API
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import fetch from 'node-fetch';
import path from 'path';

/**
 * Конвертация URL в буфер
 */
async function urlToBuffer(imageUrl) {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Ошибка загрузки изображения: ${response.status}`);
    }
    return await response.buffer();
}

/**
 * Сохранение буфера как файла
 */
async function saveImageBuffer(buffer, filename) {
    const outputDir = './output';
    await fs.mkdir(outputDir, { recursive: true });
    
    const filePath = path.join(outputDir, filename);
    await fs.writeFile(filePath, buffer);
    
    return filePath;
}

/**
 * Удаление фона (простая версия - прозрачность по краям)
 */
async function removeBackground(imageUrl) {
    try {
        const buffer = await urlToBuffer(imageUrl);
        
        const processed = await sharp(buffer)
            .png()
            .flatten({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toBuffer();
            
        const filename = `removed_bg_${Date.now()}.png`;
        const filePath = await saveImageBuffer(processed, filename);
        
        return {
            success: true,
            imageUrl: `/output/${filename}`,
            localPath: filePath,
            operation: 'remove_background',
            description: 'Фон обработан (базовая версия)'
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            operation: 'remove_background'
        };
    }
}

/**
 * Изменение размера изображения
 */
async function resizeImage(imageUrl, width, height) {
    try {
        const buffer = await urlToBuffer(imageUrl);
        
        const processed = await sharp(buffer)
            .resize(width, height, { fit: 'inside' })
            .toBuffer();
            
        const filename = `resized_${width}x${height}_${Date.now()}.jpg`;
        const filePath = await saveImageBuffer(processed, filename);
        
        return {
            success: true,
            imageUrl: `/output/${filename}`,
            localPath: filePath,
            operation: 'resize',
            description: `Размер изменен на ${width}x${height}`
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            operation: 'resize'
        };
    }
}

/**
 * Применение фильтров
 */
async function applyFilter(imageUrl, filterType) {
    try {
        const buffer = await urlToBuffer(imageUrl);
        let processed;
        
        switch (filterType) {
            case 'grayscale':
            case 'черно-белый':
                processed = await sharp(buffer).grayscale().toBuffer();
                break;
                
            case 'blur':
            case 'размытие':
                processed = await sharp(buffer).blur(3).toBuffer();
                break;
                
            case 'sharpen':
            case 'резкость':
                processed = await sharp(buffer).sharpen().toBuffer();
                break;
                
            case 'bright':
            case 'яркость':
                processed = await sharp(buffer).modulate({ brightness: 1.3 }).toBuffer();
                break;
                
            case 'contrast':
            case 'контраст':
                processed = await sharp(buffer).modulate({ brightness: 1, saturation: 1.2 }).toBuffer();
                break;
                
            default:
                processed = buffer;
        }
        
        const filename = `filtered_${filterType}_${Date.now()}.jpg`;
        const filePath = await saveImageBuffer(processed, filename);
        
        return {
            success: true,
            imageUrl: `/output/${filename}`,
            localPath: filePath,
            operation: 'filter',
            description: `Применен фильтр: ${filterType}`
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            operation: 'filter'
        };
    }
}

/**
 * Поворот изображения
 */
async function rotateImage(imageUrl, angle) {
    try {
        const buffer = await urlToBuffer(imageUrl);
        
        const processed = await sharp(buffer)
            .rotate(angle)
            .toBuffer();
            
        const filename = `rotated_${angle}_${Date.now()}.jpg`;
        const filePath = await saveImageBuffer(processed, filename);
        
        return {
            success: true,
            imageUrl: `/output/${filename}`,
            localPath: filePath,
            operation: 'rotate',
            description: `Повернуто на ${angle} градусов`
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            operation: 'rotate'
        };
    }
}

/**
 * Обрезка изображения
 */
async function cropImage(imageUrl, left, top, width, height) {
    try {
        const buffer = await urlToBuffer(imageUrl);
        
        const processed = await sharp(buffer)
            .extract({ left, top, width, height })
            .toBuffer();
            
        const filename = `cropped_${Date.now()}.jpg`;
        const filePath = await saveImageBuffer(processed, filename);
        
        return {
            success: true,
            imageUrl: `/output/${filename}`,
            localPath: filePath,
            operation: 'crop',
            description: 'Изображение обрезано'
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            operation: 'crop'
        };
    }
}

/**
 * Анализ команды редактирования
 */
function parseEditCommand(command) {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('убери фон') || lowerCommand.includes('удали фон') || 
        lowerCommand.includes('remove background')) {
        return { type: 'remove_background' };
    }
    
    if (lowerCommand.includes('размер') || lowerCommand.includes('resize')) {
        const sizeMatch = command.match(/(\d+).*?(\d+)/);
        if (sizeMatch) {
            return { 
                type: 'resize', 
                width: parseInt(sizeMatch[1]), 
                height: parseInt(sizeMatch[2]) 
            };
        }
        return { type: 'resize', width: 800, height: 600 };
    }
    
    if (lowerCommand.includes('поверни') || lowerCommand.includes('rotate')) {
        const angleMatch = command.match(/(\d+)/);
        const angle = angleMatch ? parseInt(angleMatch[1]) : 90;
        return { type: 'rotate', angle };
    }
    
    if (lowerCommand.includes('черно-белый') || lowerCommand.includes('черно белый') || 
        lowerCommand.includes('сделай черно') || lowerCommand.includes('grayscale')) {
        return { type: 'filter', filter: 'grayscale' };
    }
    
    if (lowerCommand.includes('размытие') || lowerCommand.includes('blur')) {
        return { type: 'filter', filter: 'blur' };
    }
    
    if (lowerCommand.includes('резкость') || lowerCommand.includes('sharpen')) {
        return { type: 'filter', filter: 'sharpen' };
    }
    
    if (lowerCommand.includes('яркость') || lowerCommand.includes('bright')) {
        return { type: 'filter', filter: 'bright' };
    }
    
    if (lowerCommand.includes('контраст') || lowerCommand.includes('contrast')) {
        return { type: 'filter', filter: 'contrast' };
    }
    
    return { type: 'unknown' };
}

/**
 * Основная функция обработки локального редактирования
 */
async function processLocalEdit(imageUrl, editCommand) {
    try {
        const command = parseEditCommand(editCommand);
        
        switch (command.type) {
            case 'remove_background':
                return await removeBackground(imageUrl);
                
            case 'resize':
                return await resizeImage(imageUrl, command.width, command.height);
                
            case 'rotate':
                return await rotateImage(imageUrl, command.angle);
                
            case 'filter':
                return await applyFilter(imageUrl, command.filter);
                
            default:
                return {
                    success: false,
                    error: 'Команда не распознана. Доступны: убери фон, измени размер, поверни, фильтры',
                    operation: 'unknown'
                };
        }
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            operation: 'edit'
        };
    }
}

export {
    processLocalEdit,
    removeBackground,
    resizeImage,
    applyFilter,
    rotateImage,
    cropImage,
    parseEditCommand
};