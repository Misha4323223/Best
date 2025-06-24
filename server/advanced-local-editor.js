/**
 * Продвинутый локальный редактор изображений
 * Использует Sharp для сложных операций редактирования
 */

import sharp from 'sharp';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

/**
 * Добавление текста на изображение с продвинутыми настройками
 */
async function addTextToImage(imageUrl, text, options = {}) {
    try {
        const response = await fetch(imageUrl);
        const imageBuffer = await response.buffer();
        
        // Создаем SVG с текстом
        const svgText = `
        <svg width="1024" height="100">
            <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="black" flood-opacity="0.5"/>
                </filter>
            </defs>
            <text x="50%" y="50%" 
                  text-anchor="middle" 
                  dominant-baseline="middle"
                  font-family="Arial, sans-serif" 
                  font-size="${options.fontSize || 48}"
                  fill="${options.color || 'white'}"
                  filter="url(#shadow)">
                ${text}
            </text>
        </svg>`;
        
        const textBuffer = Buffer.from(svgText);
        
        // Накладываем текст на изображение
        const result = await sharp(imageBuffer)
            .composite([{
                input: textBuffer,
                top: options.y || 50,
                left: options.x || 50
            }])
            .png()
            .toBuffer();
        
        // Сохраняем результат
        const filename = `edited_${Date.now()}.png`;
        const filepath = path.join(process.cwd(), 'public', 'generated', filename);
        
        fs.writeFileSync(filepath, result);
        
        return {
            success: true,
            imageUrl: `/generated/${filename}`,
            operation: 'add_text',
            description: `Добавлен текст: "${text}"`
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            operation: 'add_text'
        };
    }
}

/**
 * Создание коллажа из нескольких изображений
 */
async function createCollage(imageUrls, layout = 'grid') {
    try {
        const images = [];
        
        // Загружаем все изображения
        for (const url of imageUrls) {
            const response = await fetch(url);
            const buffer = await response.buffer();
            const metadata = await sharp(buffer).metadata();
            images.push({ buffer, width: metadata.width, height: metadata.height });
        }
        
        if (images.length === 0) {
            throw new Error('Нет изображений для коллажа');
        }
        
        let result;
        
        if (layout === 'horizontal') {
            // Горизонтальный коллаж
            const totalWidth = images.reduce((sum, img) => sum + img.width, 0);
            const maxHeight = Math.max(...images.map(img => img.height));
            
            result = sharp({
                create: {
                    width: totalWidth,
                    height: maxHeight,
                    channels: 3,
                    background: { r: 255, g: 255, b: 255 }
                }
            });
            
            const composite = [];
            let left = 0;
            
            for (const img of images) {
                composite.push({
                    input: img.buffer,
                    left: left,
                    top: Math.floor((maxHeight - img.height) / 2)
                });
                left += img.width;
            }
            
            result = result.composite(composite);
            
        } else {
            // Сетка 2x2
            const targetSize = 512;
            const composite = [];
            
            for (let i = 0; i < Math.min(4, images.length); i++) {
                const resized = await sharp(images[i].buffer)
                    .resize(targetSize, targetSize)
                    .toBuffer();
                
                const row = Math.floor(i / 2);
                const col = i % 2;
                
                composite.push({
                    input: resized,
                    left: col * targetSize,
                    top: row * targetSize
                });
            }
            
            result = sharp({
                create: {
                    width: targetSize * 2,
                    height: targetSize * 2,
                    channels: 3,
                    background: { r: 255, g: 255, b: 255 }
                }
            }).composite(composite);
        }
        
        const buffer = await result.png().toBuffer();
        
        // Сохраняем результат
        const filename = `collage_${Date.now()}.png`;
        const filepath = path.join(process.cwd(), 'public', 'generated', filename);
        
        fs.writeFileSync(filepath, buffer);
        
        return {
            success: true,
            imageUrl: `/generated/${filename}`,
            operation: 'collage',
            description: `Коллаж из ${images.length} изображений`
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            operation: 'collage'
        };
    }
}

/**
 * Применение художественных фильтров
 */
async function applyArtisticFilter(imageUrl, filterType) {
    try {
        const response = await fetch(imageUrl);
        const imageBuffer = await response.buffer();
        
        let result = sharp(imageBuffer);
        
        switch (filterType) {
            case 'vintage':
                result = result
                    .modulate({ saturation: 0.8, brightness: 0.9 })
                    .tint({ r: 255, g: 240, b: 200 });
                break;
                
            case 'dramatic':
                result = result
                    .modulate({ saturation: 1.3, brightness: 0.8 })
                    .sharpen();
                break;
                
            case 'soft':
                result = result
                    .blur(1)
                    .modulate({ saturation: 0.9, brightness: 1.1 });
                break;
                
            case 'high_contrast':
                result = result
                    .normalise()
                    .modulate({ saturation: 1.2 });
                break;
                
            default:
                result = result.modulate({ saturation: 1.1 });
        }
        
        const buffer = await result.png().toBuffer();
        
        // Сохраняем результат
        const filename = `filtered_${filterType}_${Date.now()}.png`;
        const filepath = path.join(process.cwd(), 'public', 'generated', filename);
        
        fs.writeFileSync(filepath, buffer);
        
        return {
            success: true,
            imageUrl: `/generated/${filename}`,
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
 * Интеллектуальный анализ запроса и выбор операции
 */
function analyzeEditRequest(request) {
    const lower = request.toLowerCase();
    
    if (lower.includes('текст') || lower.includes('надпись') || lower.includes('подпись')) {
        const textMatch = request.match(/["']([^"']+)["']/) || request.match(/текст[:\s]+([^,.!?]+)/i);
        return {
            operation: 'add_text',
            text: textMatch ? textMatch[1].trim() : 'Образец текста'
        };
    }
    
    if (lower.includes('коллаж') || lower.includes('объедини') || lower.includes('соедини')) {
        return {
            operation: 'collage',
            layout: lower.includes('горизонт') ? 'horizontal' : 'grid'
        };
    }
    
    if (lower.includes('фильтр') || lower.includes('эффект')) {
        let filterType = 'vintage';
        if (lower.includes('драматич') || lower.includes('контраст')) filterType = 'dramatic';
        if (lower.includes('мягк') || lower.includes('размы')) filterType = 'soft';
        if (lower.includes('винтаж') || lower.includes('ретро')) filterType = 'vintage';
        if (lower.includes('контраст')) filterType = 'high_contrast';
        
        return {
            operation: 'filter',
            filterType: filterType
        };
    }
    
    return {
        operation: 'enhance',
        type: 'general'
    };
}

export {
    addTextToImage,
    createCollage,
    applyArtisticFilter,
    analyzeEditRequest
};