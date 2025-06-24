/**
 * Редактор изображений через Replicate API
 * Поддерживает FLUX, Stable Diffusion и специализированные модели для редактирования
 */

import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * Генерация изображений через FLUX
 */
async function generateWithFLUX(prompt, options = {}) {
    try {
        console.log('🎨 [Replicate] Генерация через FLUX...');
        
        const output = await replicate.run(
            "black-forest-labs/flux-schnell",
            {
                input: {
                    prompt: prompt,
                    num_outputs: 1,
                    aspect_ratio: options.aspect_ratio || "1:1",
                    output_format: "png",
                    output_quality: 90
                }
            }
        );

        return {
            success: true,
            imageUrl: output[0],
            provider: 'Replicate_FLUX',
            model: 'FLUX Schnell'
        };
    } catch (error) {
        console.error('❌ [Replicate] Ошибка FLUX:', error.message);
        return {
            success: false,
            error: error.message,
            provider: 'Replicate_FLUX'
        };
    }
}

/**
 * Инпейнтинг через Replicate
 */
async function inpaintImage(imageUrl, prompt, maskUrl = null) {
    try {
        console.log('🖌️ [Replicate] Инпейнтинг изображения...');
        
        const output = await replicate.run(
            "stability-ai/stable-diffusion-inpainting",
            {
                input: {
                    image: imageUrl,
                    mask: maskUrl,
                    prompt: prompt,
                    num_inference_steps: 25,
                    guidance_scale: 7.5
                }
            }
        );

        return {
            success: true,
            imageUrl: output[0],
            provider: 'Replicate_Inpaint',
            model: 'Stable Diffusion Inpainting'
        };
    } catch (error) {
        console.error('❌ [Replicate] Ошибка инпейнтинга:', error.message);
        return {
            success: false,
            error: error.message,
            provider: 'Replicate_Inpaint'
        };
    }
}

/**
 * Улучшение качества изображения
 */
async function enhanceImage(imageUrl) {
    try {
        console.log('✨ [Replicate] Улучшение качества...');
        
        const output = await replicate.run(
            "nightmareai/real-esrgan",
            {
                input: {
                    image: imageUrl,
                    scale: 2,
                    face_enhance: true
                }
            }
        );

        return {
            success: true,
            imageUrl: output,
            provider: 'Replicate_Enhance',
            model: 'Real-ESRGAN'
        };
    } catch (error) {
        console.error('❌ [Replicate] Ошибка улучшения:', error.message);
        return {
            success: false,
            error: error.message,
            provider: 'Replicate_Enhance'
        };
    }
}

/**
 * Удаление фона
 */
async function removeBackground(imageUrl) {
    try {
        console.log('🎭 [Replicate] Удаление фона...');
        
        const output = await replicate.run(
            "cjwbw/rembg",
            {
                input: {
                    image: imageUrl
                }
            }
        );

        return {
            success: true,
            imageUrl: output,
            provider: 'Replicate_RemoveBG',
            model: 'RemBG'
        };
    } catch (error) {
        console.error('❌ [Replicate] Ошибка удаления фона:', error.message);
        return {
            success: false,
            error: error.message,
            provider: 'Replicate_RemoveBG'
        };
    }
}

/**
 * Преобразование изображения в изображение
 */
async function img2img(imageUrl, prompt, strength = 0.7) {
    try {
        console.log('🔄 [Replicate] Преобразование изображения...');
        
        const output = await replicate.run(
            "stability-ai/stable-diffusion",
            {
                input: {
                    image: imageUrl,
                    prompt: prompt,
                    num_inference_steps: 25,
                    guidance_scale: 7.5,
                    strength: strength
                }
            }
        );

        return {
            success: true,
            imageUrl: output[0],
            provider: 'Replicate_Img2Img',
            model: 'Stable Diffusion'
        };
    } catch (error) {
        console.error('❌ [Replicate] Ошибка img2img:', error.message);
        return {
            success: false,
            error: error.message,
            provider: 'Replicate_Img2Img'
        };
    }
}

/**
 * Проверка доступности Replicate API
 */
async function checkReplicateAvailability() {
    try {
        if (!process.env.REPLICATE_API_TOKEN) {
            return {
                available: false,
                reason: 'REPLICATE_API_TOKEN не настроен'
            };
        }

        // Простой тест API
        await replicate.models.list();
        
        return {
            available: true,
            reason: 'Replicate API готов к работе'
        };
    } catch (error) {
        return {
            available: false,
            reason: `Ошибка API: ${error.message}`
        };
    }
}

export {
    generateWithFLUX,
    inpaintImage,
    enhanceImage,
    removeBackground,
    img2img,
    checkReplicateAvailability
};