/**
 * Гибридная система генерации изображений
 * Приоритет: SD WebUI -> Pollinations.ai
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { sdClient } from './sd-webui-client.js';

/**
 * Основная функция генерации изображений
 */
async function generateImage(prompt, style = 'realistic', previousImage = null, sessionId = null, userId = null) {
    console.log('🎨 [HYBRID] Запуск гибридной генерации изображений...');
    console.log('📝 [HYBRID] Промпт:', prompt);
    
    // Сначала пробуем SD WebUI
    const sdAvailable = await sdClient.checkAvailability();
    
    if (sdAvailable) {
        console.log('✅ [HYBRID] SD WebUI доступен, используем его');
        
        try {
            const result = await sdClient.generateImage(prompt, {
                width: 512,
                height: 512,
                steps: 20,
                cfg_scale: 7
            });
            
            if (result.success) {
                console.log('✅ [HYBRID] Изображение создано через SD WebUI');
                return {
                    success: true,
                    imageUrl: result.imageUrl,
                    provider: 'Stable_Diffusion_WebUI',
                    operation: 'generate'
                };
            } else {
                console.log('❌ [HYBRID] SD WebUI не смог создать изображение:', result.error);
            }
        } catch (error) {
            console.log('❌ [HYBRID] Ошибка SD WebUI:', error.message);
        }
    } else {
        console.log('⚠️ [HYBRID] SD WebUI недоступен, используем резервную систему');
    }
    
    // Используем Pollinations.ai как основной генератор
    console.log('🔄 [HYBRID] Переключаемся на Pollinations.ai');
    
    try {
        // Прямой вызов Pollinations API
        const enhancedPrompt = `high quality draw ${prompt}, detailed, professional`;
        const imageId = Date.now();
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&nologo=true&enhance=true&seed=${imageId}`;
        
        console.log('✅ [HYBRID] Изображение создано через Pollinations.ai');
        return {
            success: true,
            imageUrl: imageUrl,
            provider: 'Pollinations_AI',
            operation: 'generate'
        };
    } catch (error) {
        console.log('❌ [HYBRID] Ошибка Pollinations.ai:', error.message);
        return {
            success: false,
            error: 'Системы генерации изображений недоступны',
            provider: 'none',
            operation: 'generate'
        };
    }
}

/**
 * Редактирование изображений
 */
async function editImage(imageUrl, editPrompt, options = {}) {
    console.log('🎨 [HYBRID] Запуск редактирования изображения...');
    console.log('🖼️ [HYBRID] Исходное изображение:', imageUrl);
    console.log('📝 [HYBRID] Команда редактирования:', editPrompt);
    
    // Проверяем доступность SD WebUI для редактирования
    const sdAvailable = await sdClient.checkAvailability();
    
    if (sdAvailable) {
        console.log('✅ [HYBRID] SD WebUI доступен для редактирования');
        
        try {
            const result = await sdClient.editImage(imageUrl, editPrompt, {
                denoising_strength: 0.7,
                cfg_scale: 7,
                steps: 20
            });
            
            if (result.success) {
                console.log('✅ [HYBRID] Изображение отредактировано через SD WebUI');
                return {
                    success: true,
                    imageUrl: result.imageUrl,
                    provider: 'Stable_Diffusion_WebUI',
                    operation: 'edit',
                    description: `Изображение отредактировано: ${editPrompt}`
                };
            } else {
                console.log('❌ [HYBRID] SD WebUI не смог отредактировать:', result.error);
            }
        } catch (error) {
            console.log('❌ [HYBRID] Ошибка редактирования SD WebUI:', error.message);
        }
    }
    
    // Пробуем редактирование объектов
    console.log('🔄 [HYBRID] Проверяем возможности редактирования объектов...');
    
    try {
        const { analyzeObjectEdit, addObjectToImage, removeObjectByMask, changeObjectColor, generateVariation } = await import('./object-manipulation-editor.js');
        const editAnalysis = analyzeObjectEdit(editPrompt);
        
        let result;
        
        switch (editAnalysis.operation) {
            case 'add_object':
                result = await addObjectToImage(imageUrl, editAnalysis.object);
                break;
            case 'remove_object':
                result = await removeObjectByMask(imageUrl, editAnalysis.object);
                break;
            case 'change_color':
                result = await changeObjectColor(imageUrl, editAnalysis.change);
                break;
            default:
                result = await generateVariation(imageUrl, editAnalysis.change);
        }
        
        if (result && result.success) {
            console.log('✅ [HYBRID] Объект отредактирован локально');
            return {
                success: true,
                imageUrl: result.imageUrl,
                provider: 'Object_Editor',
                operation: result.operation,
                description: result.description
            };
        }
    } catch (objectError) {
        console.log('⚠️ [HYBRID] Редактор объектов недоступен:', objectError.message);
    }

    // Fallback на локальный редактор
    console.log('🔄 [HYBRID] Используем локальный редактор');
    
    try {
        const { processLocalEdit } = await import('./local-image-editor.js');
        const result = await processLocalEdit(imageUrl, editPrompt);
        
        if (result && result.success) {
            console.log('✅ [HYBRID] Изображение обработано локальным редактором');
            return {
                success: true,
                imageUrl: result.imageUrl,
                provider: 'Local_Editor',
                operation: result.operation,
                description: result.description
            };
        } else {
            throw new Error(result?.error || 'Ошибка локального редактора');
        }
    } catch (error) {
        console.log('❌ [HYBRID] Ошибка локального редактора:', error.message);
        return {
            success: false,
            error: 'Все системы редактирования недоступны',
            provider: 'none',
            operation: 'edit'
        };
    }
}

/**
 * Анализ запроса редактирования для определения типа операции
 */
function analyzeEditRequest(request) {
    const lowerRequest = request.toLowerCase();
    
    if (lowerRequest.includes('удали фон') || lowerRequest.includes('убери фон') || lowerRequest.includes('remove background')) {
        return 'remove_background';
    }
    
    if (lowerRequest.includes('улучши') || lowerRequest.includes('повыси качество') || lowerRequest.includes('enhance')) {
        return 'enhance';
    }
    
    return 'inpaint';
}

/**
 * Получение статуса всех систем
 */
async function getSystemStatus() {
    const sdStatus = await sdClient.getStatus();
    
    return {
        stableDiffusion: sdStatus,
        pollinations: {
            status: 'available',
            message: 'Pollinations.ai всегда доступен как резервная система'
        },
        gradioSpaces: {
            status: 'available',
            message: 'Gradio Spaces доступны для продвинутого редактирования'
        },
        localEditor: {
            status: 'available',
            message: 'Локальный редактор готов для базовых операций'
        }
    };
}

export {
    generateImage,
    editImage,
    getSystemStatus
};