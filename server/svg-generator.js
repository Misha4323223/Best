const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const sharp = require('sharp');
const potrace = require('potrace');

// Создаем директории, если они не существуют
const tempDir = path.join(__dirname, '..', 'temp');
const outputDir = path.join(__dirname, '..', 'output');

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// Объект для хранения сгенерированных изображений
const generatedImages = new Map();

// Генерирует уникальный ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// HTML страница для интерфейса
const htmlPage = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Генератор SVG</title>
    <style>
        :root {
            --primary-color: #4a56e2;
            --primary-dark: #3a46c2;
            --secondary-color: #6c63ff;
            --background-color: #f9fafc;
            --card-bg: #ffffff;
            --text-color: #333;
            --border-color: #ddd;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --primary-color: #5e68fa;
                --primary-dark: #4a54e6;
                --secondary-color: #8c85ff;
                --background-color: #1a1a2e;
                --card-bg: #252538;
                --text-color: #f0f0f0;
                --border-color: #40405c;
            }
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: var(--background-color);
            padding: 1rem;
            max-width: 1000px;
            margin: 0 auto;
        }

        h1 {
            font-size: 2rem;
            margin-bottom: 1rem;
            background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            display: inline-block;
        }

        .card {
            background-color: var(--card-bg);
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }

        form {
            margin-bottom: 1.5rem;
        }

        label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }

        input, textarea, select {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            font-family: inherit;
            background-color: var(--card-bg);
            color: var(--text-color);
        }

        textarea {
            min-height: 100px;
            resize: vertical;
        }

        button {
            padding: 0.75rem 1.5rem;
            background: linear-gradient(120deg, var(--primary-color), var(--primary-dark));
            color: white;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        }

        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }

        button:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        #result {
            display: none;
        }

        .image-preview {
            background-color: white;
            border-radius: 0.5rem;
            padding: 1rem;
            text-align: center;
            margin-bottom: 1rem;
        }

        .image-preview img, .image-preview svg {
            max-width: 100%;
            max-height: 400px;
        }

        .download-btn {
            display: inline-block;
            margin-top: 0.5rem;
            padding: 0.5rem 1rem;
            background-color: #28a745;
            color: white;
            text-decoration: none;
            border-radius: 0.25rem;
        }

        .loader {
            border: 5px solid #f3f3f3;
            border-top: 5px solid var(--primary-color);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 1rem auto;
            display: none;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .alert {
            padding: 0.75rem 1rem;
            border-radius: 0.25rem;
            margin-bottom: 1rem;
            display: none;
        }

        .alert-error {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }

        .alert-success {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }

        .code-block {
            background-color: #f6f8fa;
            border: 1px solid #e1e4e8;
            border-radius: 0.25rem;
            padding: 1rem;
            margin: 1rem 0;
            font-family: monospace;
            white-space: pre-wrap;
            overflow-x: auto;
            max-height: 300px;
            overflow-y: auto;
            color: #333;
        }

        @media (prefers-color-scheme: dark) {
            .code-block {
                background-color: #1e2030;
                border-color: #2a2f45;
                color: #f0f0f0;
            }
        }
    </style>
</head>
<body>
    <h1>Генератор SVG изображений</h1>
    
    <div class="card">
        <form id="generate-form">
            <div>
                <label for="prompt">Описание изображения:</label>
                <textarea id="prompt" placeholder="Напишите детальное описание желаемого изображения..." required></textarea>
            </div>
            
            <div>
                <label for="style">Стиль изображения:</label>
                <select id="style">
                    <option value="realistic">Реалистичный</option>
                    <option value="abstract">Абстрактный</option>
                    <option value="geometric">Геометрический</option>
                    <option value="minimalist">Минималистичный</option>
                </select>
            </div>
            
            <button type="submit" id="generate-btn">Создать SVG</button>
        </form>
        
        <div class="loader" id="loader"></div>
        <div class="alert alert-error" id="error-message"></div>
        <div class="alert alert-success" id="success-message"></div>
    </div>
    
    <div class="card" id="result">
        <h2>Результат</h2>
        
        <div class="image-preview" id="image-preview"></div>
        
        <h3>Скачать:</h3>
        <div>
            <a href="#" class="download-btn" id="download-svg">SVG</a>
            <a href="#" class="download-btn" id="download-png" style="margin-left: 10px;">PNG</a>
        </div>
        
        <h3 style="margin-top: 1.5rem;">SVG код:</h3>
        <div class="code-block" id="svg-code"></div>
    </div>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const generateForm = document.getElementById('generate-form');
            const generateBtn = document.getElementById('generate-btn');
            const promptInput = document.getElementById('prompt');
            const styleSelect = document.getElementById('style');
            const loader = document.getElementById('loader');
            const resultDiv = document.getElementById('result');
            const imagePreview = document.getElementById('image-preview');
            const svgCode = document.getElementById('svg-code');
            const downloadSvgBtn = document.getElementById('download-svg');
            const downloadPngBtn = document.getElementById('download-png');
            const errorMessage = document.getElementById('error-message');
            const successMessage = document.getElementById('success-message');
            
            generateForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const prompt = promptInput.value.trim();
                const style = styleSelect.value;
                
                if (!prompt) {
                    showError('Пожалуйста, введите описание изображения');
                    return;
                }
                
                // Сбрасываем предыдущий результат
                errorMessage.style.display = 'none';
                successMessage.style.display = 'none';
                
                // Показываем индикатор загрузки
                loader.style.display = 'block';
                generateBtn.disabled = true;
                
                try {
                    // Отправляем запрос на сервер
                    const response = await fetch('/api/svg/generate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ prompt, style })
                    });
                    
                    if (!response.ok) {
                        throw new Error('Ошибка при генерации изображения');
                    }
                    
                    const data = await response.json();
                    
                    // Отображаем результат
                    imagePreview.innerHTML = data.svg;
                    svgCode.textContent = data.svg;
                    
                    // Настраиваем кнопки скачивания
                    setupDownloadButtons(data);
                    
                    // Показываем блок с результатом
                    resultDiv.style.display = 'block';
                    
                    // Показываем сообщение об успехе
                    showSuccess('Изображение успешно создано!');
                    
                } catch (error) {
                    console.error('Ошибка:', error);
                    showError('Произошла ошибка при создании изображения: ' + error.message);
                } finally {
                    // Скрываем индикатор загрузки
                    loader.style.display = 'none';
                    generateBtn.disabled = false;
                }
            });
            
            function setupDownloadButtons(data) {
                // Настраиваем скачивание SVG
                const svgBlob = new Blob([data.svg], { type: 'image/svg+xml' });
                const svgUrl = URL.createObjectURL(svgBlob);
                downloadSvgBtn.href = svgUrl;
                downloadSvgBtn.download = 'image.svg';
                
                // Настраиваем скачивание PNG
                downloadPngBtn.href = '/api/svg/download?id=' + data.id + '&format=png';
                downloadPngBtn.download = 'image.png';
            }
            
            function showError(message) {
                errorMessage.textContent = message;
                errorMessage.style.display = 'block';
                setTimeout(() => {
                    errorMessage.style.display = 'none';
                }, 5000);
            }
            
            function showSuccess(message) {
                successMessage.textContent = message;
                successMessage.style.display = 'block';
                setTimeout(() => {
                    successMessage.style.display = 'none';
                }, 5000);
            }
        });
    </script>
</body>
</html>`;

// Генерирует изображение на основе текстового описания
async function generateImage(prompt, style = 'realistic') {
    try {
        console.log(`Генерация изображения для запроса: "${prompt}" в стиле "${style}"`);
        
        // Создаем хеш из промпта для получения стабильных, но разных изображений
        const seed = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000;
        
        // Получаем случайное изображение от Picsum Photos
        let imageUrl = `https://picsum.photos/seed/${seed}/800/600`;
        
        const response = await fetch(imageUrl);
        
        if (!response.ok) {
            throw new Error(`Ошибка при загрузке изображения: ${response.status}`);
        }
        
        // Получаем изображение как буфер
        const buffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(buffer);
        
        // Применяем фильтры в зависимости от стиля
        let processedBuffer = imageBuffer;
        
        if (style !== 'realistic') {
            const sharpImage = sharp(imageBuffer);
            
            switch (style) {
                case 'abstract':
                    processedBuffer = await sharpImage
                        .modulate({ brightness: 1.2, saturation: 1.5 })
                        .blur(5)
                        .toBuffer();
                    break;
                case 'geometric':
                    processedBuffer = await sharpImage
                        .modulate({ brightness: 1.1 })
                        .sharpen()
                        .threshold(128)
                        .toBuffer();
                    break;
                case 'minimalist':
                    processedBuffer = await sharpImage
                        .grayscale()
                        .modulate({ brightness: 1.3 })
                        .threshold(150)
                        .blur(2)
                        .toBuffer();
                    break;
                default:
                    processedBuffer = await sharpImage.toBuffer();
                    break;
            }
        }
        
        return processedBuffer;
    } catch (error) {
        console.error('Ошибка при генерации изображения:', error);
        
        // Создаем градиент, если API недоступно
        try {
            console.log('Создание резервного изображения...');
            
            // Выбираем цвет на основе промпта и стиля
            const seed = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            
            let r, g, b;
            switch (style) {
                case 'abstract':
                    r = (seed * 123) % 255;
                    g = (seed * 45) % 255;
                    b = (seed * 67) % 255;
                    break;
                case 'minimalist':
                    r = g = b = 240;
                    break;
                case 'geometric':
                    r = 40; g = 40; b = 40;
                    break;
                default:
                    r = 100; g = 100; b = 200;
                    break;
            }
            
            // Создаем простое изображение в зависимости от стиля
            return await sharp({
                create: {
                    width: 800,
                    height: 600,
                    channels: 3,
                    background: { r, g, b }
                }
            })
            .png()
            .toBuffer();
        } catch (err) {
            console.error('Ошибка при создании резервного изображения:', err);
            throw error;
        }
    }
}

// Конвертирует изображение в SVG
async function convertToSvg(imageBuffer, style = 'realistic') {
    return new Promise(async (resolve, reject) => {
        try {
            // Создаем временный файл для трассировки
            const tempPngPath = path.join(tempDir, `temp_${Date.now()}.png`);
            
            // Оптимизируем изображение с помощью Sharp перед трассировкой
            let sharpConfig = sharp(imageBuffer).grayscale();
            
            // Настраиваем параметры трассировки в зависимости от стиля
            const potraceParams = {
                threshold: 128,
                turdSize: 2,
                optTolerance: 0.2,
                alphaMax: 1,
                color: '#000000'
            };
            
            switch (style) {
                case 'minimalist':
                    await sharpConfig.threshold(150).blur(2).toFile(tempPngPath);
                    potraceParams.turdSize = 5;
                    potraceParams.optTolerance = 0.5;
                    break;
                case 'geometric':
                    await sharpConfig.sharpen().threshold(128).toFile(tempPngPath);
                    potraceParams.turdSize = 1;
                    potraceParams.optTolerance = 0.1;
                    break;
                case 'abstract':
                    await sharpConfig.modulate({ brightness: 1.2 }).blur(3).toFile(tempPngPath);
                    potraceParams.turdSize = 4;
                    potraceParams.optTolerance = 0.3;
                    break;
                default:
                    await sharpConfig.toFile(tempPngPath);
                    break;
            }
            
            // Выполняем трассировку изображения
            potrace.trace(tempPngPath, potraceParams, (err, svg) => {
                // Удаляем временный файл после трассировки
                fs.unlink(tempPngPath, () => {});
                
                if (err) {
                    console.error('Ошибка при трассировке:', err);
                    return reject(err);
                }
                
                resolve(svg);
            });
        } catch (error) {
            console.error('Ошибка при конвертации в SVG:', error);
            reject(error);
        }
    });
}

// Главная страница
router.get('/', (req, res) => {
    res.send(htmlPage);
});

// API для генерации изображения
router.post('/generate', async (req, res) => {
    try {
        const { prompt, style = 'realistic' } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Отсутствует параметр prompt' });
        }
        
        console.log(`Получен запрос на генерацию: "${prompt}" в стиле "${style}"`);
        
        // Генерируем изображение
        const imageBuffer = await generateImage(prompt, style);
        
        // Конвертируем в SVG
        const svg = await convertToSvg(imageBuffer, style);
        
        // Сохраняем оригинальное изображение для последующей конвертации
        const id = generateId();
        const imagePath = path.join(outputDir, `${id}.png`);
        await sharp(imageBuffer).toFile(imagePath);
        
        // Сохраняем в кэш
        generatedImages.set(id, {
            id,
            prompt,
            style,
            timestamp: Date.now(),
            path: imagePath
        });
        
        // Отправляем SVG и ID в ответе
        res.json({ 
            svg,
            id
        });
        
    } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        res.status(500).json({ 
            error: 'Произошла ошибка при обработке запроса',
            message: error.message
        });
    }
});

// API для скачивания изображения в разных форматах
router.get('/download', async (req, res) => {
    try {
        const { id, format = 'png' } = req.query;
        
        if (!id) {
            return res.status(400).json({ error: 'Отсутствует обязательный параметр id' });
        }
        
        // Проверяем, есть ли изображение в кэше
        if (!generatedImages.has(id)) {
            return res.status(404).json({ error: 'Изображение не найдено' });
        }
        
        const imageInfo = generatedImages.get(id);
        
        // Проверяем, существует ли файл
        if (!fs.existsSync(imageInfo.path)) {
            return res.status(404).json({ error: 'Файл изображения не найден' });
        }
        
        // Настраиваем формат
        let contentType = 'image/png';
        let outputFormat = 'png';
        let outputOptions = {};
        
        switch (format.toLowerCase()) {
            case 'jpeg':
            case 'jpg':
                contentType = 'image/jpeg';
                outputFormat = 'jpeg';
                outputOptions = { quality: 90 };
                break;
            case 'png':
            default:
                // PNG настройки по умолчанию
                break;
        }
        
        // Устанавливаем заголовки ответа
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="image.${outputFormat}"`);
        
        // Создаем поток обработки изображения
        sharp(imageInfo.path)
            .toFormat(outputFormat, outputOptions)
            .pipe(res);
        
    } catch (error) {
        console.error('Ошибка при конвертации изображения:', error);
        res.status(500).json({ 
            error: 'Произошла ошибка при конвертации изображения',
            message: error.message
        });
    }
});

// Очистка старых изображений (каждый час)
setInterval(() => {
    const now = Date.now();
    const expirationTime = 3600000; // 1 час
    
    for (const [id, info] of generatedImages.entries()) {
        if (now - info.timestamp > expirationTime) {
            // Удаляем старые файлы
            try {
                if (fs.existsSync(info.path)) {
                    fs.unlinkSync(info.path);
                }
                generatedImages.delete(id);
                console.log(`Удален старый файл: ${id}`);
            } catch (err) {
                console.error(`Ошибка при удалении файла ${id}:`, err);
            }
        }
    }
}, 3600000); // каждый час

module.exports = router;