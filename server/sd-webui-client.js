/**
 * Клиент для подключения к Stable Diffusion WebUI API
 * Обеспечивает интеграцию с внешним экземпляром SD WebUI
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

class SDWebUIClient {
    constructor(baseUrl = 'http://127.0.0.1:7860') {
        this.baseUrl = baseUrl;
        this.isAvailable = false;
    }

    /**
     * Проверка доступности SD WebUI
     */
    async checkAvailability() {
        try {
            const response = await fetch(`${this.baseUrl}/sdapi/v1/options`, {
                method: 'GET',
                timeout: 5000
            });
            
            this.isAvailable = response.ok;
            return this.isAvailable;
        } catch (error) {
            console.log('SD WebUI недоступен:', error.message);
            this.isAvailable = false;
            return false;
        }
    }

    /**
     * Генерация изображения
     */
    async generateImage(prompt, options = {}) {
        if (!await this.checkAvailability()) {
            return {
                success: false,
                error: 'Stable Diffusion WebUI недоступен',
                suggestion: 'Запустите SD WebUI с включенным API'
            };
        }

        try {
            const payload = {
                prompt: prompt,
                negative_prompt: options.negative_prompt || "blurry, low quality, distorted, ugly",
                width: options.width || 512,
                height: options.height || 512,
                steps: options.steps || 20,
                cfg_scale: options.cfg_scale || 7,
                sampler_index: options.sampler || "Euler a",
                seed: options.seed || -1,
                batch_size: 1,
                n_iter: 1
            };

            const response = await fetch(`${this.baseUrl}/sdapi/v1/txt2img`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`SD API ошибка: ${response.status}`);
            }

            const result = await response.json();
            
            // Сохраняем изображение
            const imageUrl = await this.saveBase64Image(result.images[0], `generated_${Date.now()}.png`);
            
            return {
                success: true,
                imageUrl: imageUrl,
                info: JSON.parse(result.info),
                operation: 'generate'
            };

        } catch (error) {
            console.error('Ошибка генерации SD:', error);
            return {
                success: false,
                error: error.message,
                operation: 'generate'
            };
        }
    }

    /**
     * Редактирование изображения (img2img)
     */
    async editImage(imageUrl, prompt, options = {}) {
        if (!await this.checkAvailability()) {
            return {
                success: false,
                error: 'Stable Diffusion WebUI недоступен',
                suggestion: 'Запустите SD WebUI с включенным API'
            };
        }

        try {
            // Конвертируем URL в base64
            const imageBase64 = await this.imageUrlToBase64(imageUrl);
            
            const payload = {
                init_images: [imageBase64],
                prompt: prompt,
                negative_prompt: options.negative_prompt || "blurry, low quality, distorted",
                width: options.width || 512,
                height: options.height || 512,
                steps: options.steps || 20,
                cfg_scale: options.cfg_scale || 7,
                denoising_strength: options.denoising_strength || 0.7,
                sampler_index: options.sampler || "Euler a",
                seed: options.seed || -1,
                batch_size: 1,
                n_iter: 1
            };

            const response = await fetch(`${this.baseUrl}/sdapi/v1/img2img`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`SD API ошибка: ${response.status}`);
            }

            const result = await response.json();
            
            // Сохраняем отредактированное изображение
            const editedImageUrl = await this.saveBase64Image(result.images[0], `edited_${Date.now()}.png`);
            
            return {
                success: true,
                imageUrl: editedImageUrl,
                info: JSON.parse(result.info),
                operation: 'edit'
            };

        } catch (error) {
            console.error('Ошибка редактирования SD:', error);
            return {
                success: false,
                error: error.message,
                operation: 'edit'
            };
        }
    }

    /**
     * Конвертация URL изображения в base64
     */
    async imageUrlToBase64(imageUrl) {
        try {
            const response = await fetch(imageUrl);
            const buffer = await response.buffer();
            return buffer.toString('base64');
        } catch (error) {
            throw new Error(`Ошибка конвертации изображения: ${error.message}`);
        }
    }

    /**
     * Сохранение base64 изображения в файл
     */
    async saveBase64Image(base64Data, filename) {
        try {
            const outputDir = './output';
            await fs.mkdir(outputDir, { recursive: true });
            
            const filePath = path.join(outputDir, filename);
            await fs.writeFile(filePath, base64Data, 'base64');
            
            return `/output/${filename}`;
        } catch (error) {
            throw new Error(`Ошибка сохранения изображения: ${error.message}`);
        }
    }

    /**
     * Получение списка доступных моделей
     */
    async getModels() {
        if (!await this.checkAvailability()) {
            return {
                success: false,
                error: 'SD WebUI недоступен',
                models: []
            };
        }

        try {
            const response = await fetch(`${this.baseUrl}/sdapi/v1/sd-models`);
            
            if (!response.ok) {
                throw new Error(`SD API ошибка: ${response.status}`);
            }

            const models = await response.json();
            return {
                success: true,
                models: models
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                models: []
            };
        }
    }

    /**
     * Получение статуса SD WebUI
     */
    async getStatus() {
        const available = await this.checkAvailability();
        
        if (!available) {
            return {
                status: 'unavailable',
                message: 'SD WebUI не запущен или недоступен',
                instructions: [
                    '1. Установите Stable Diffusion WebUI',
                    '2. Запустите с флагом --api',
                    '3. Убедитесь, что он работает на порту 7860'
                ]
            };
        }

        const models = await this.getModels();
        
        return {
            status: 'available',
            message: 'SD WebUI готов к работе',
            modelsCount: models.models?.length || 0,
            endpoint: this.baseUrl
        };
    }
}

// Создаем экземпляр клиента
const sdClient = new SDWebUIClient();

export {
    SDWebUIClient,
    sdClient
};