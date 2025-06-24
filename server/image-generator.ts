import fetch from 'node-fetch';
import potrace from 'potrace';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Router } from 'express';

// Создаем роутер
const router = Router();

// Настройка пути для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Создаем директории
const tempDir = path.join(__dirname, '..', 'temp');
const publicDir = path.join(__dirname, '..', 'public');
const outputDir = path.join(__dirname, '..', 'output');

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// HTML страница для нашего генератора
const htmlPage = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Генератор SVG + G4F</title>
    <style>
        :root {
            --primary-color: #4a56e2;
            --primary-dark: #3a46c2;
            --secondary-color: #6c63ff;
            --success-color: #28a745;
            --warning-color: #ffc107;
            --error-color: #dc3545;
            --background-color: #f9fafc;
            --card-bg: #ffffff;
            --text-color: #333;
            --border-color: #ddd;
            --shadow-color: rgba(0, 0, 0, 0.1);
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
                --shadow-color: rgba(0, 0, 0, 0.3);
            }
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: var(--background-color);
            padding: 1rem;
            margin: 0 auto;
            max-width: 1000px;
        }

        header {
            margin-bottom: 1.5rem;
            text-align: center;
            padding: 1rem;
        }

        h1 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
            background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            display: inline-block;
        }

        p {
            margin-bottom: 1rem;
            color: var(--text-color);
            opacity: 0.9;
        }

        .subtitle {
            font-size: 1rem;
            opacity: 0.8;
            max-width: 600px;
            margin: 0 auto;
        }

        .card {
            background-color: var(--card-bg);
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px var(--shadow-color);
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            border: 1px solid var(--border-color);
        }

        .tabs {
            display: flex;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 1.5rem;
        }

        .tab {
            padding: 0.75rem 1.5rem;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            font-weight: 500;
            transition: all 0.2s;
        }

        .tab.active {
            border-bottom: 2px solid var(--primary-color);
            color: var(--primary-color);
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .form-group {
            margin-bottom: 1rem;
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
            background-color: var(--card-bg);
            color: var(--text-color);
            font-family: inherit;
            font-size: 1rem;
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
            display: inline-block;
        }

        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 2px 5px var(--shadow-color);
        }

        button:active {
            transform: translateY(0);
        }

        button:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        .btn-group {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
        }

        .button-secondary {
            background: transparent;
            border: 1px solid var(--primary-color);
            color: var(--primary-color);
        }

        .result-container {
            display: none;
            margin-top: 1.5rem;
        }

        .image-preview {
            background-color: white;
            border-radius: 0.5rem;
            border: 1px solid var(--border-color);
            padding: 1rem;
            text-align: center;
            margin-bottom: 1rem;
        }

        .image-preview img, .image-preview svg {
            max-width: 100%;
            max-height: 500px;
            border-radius: 0.25rem;
        }

        .formats-container {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            margin: 1rem 0;
        }

        .format-item {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            padding: 1rem;
            flex: 1 0 calc(33.333% - 1rem);
            min-width: 200px;
            display: flex;
            flex-direction: column;
        }

        .format-item h3 {
            margin-bottom: 0.5rem;
            font-size: 1.1rem;
        }

        .format-item p {
            font-size: 0.9rem;
            flex-grow: 1;
        }

        .download-btn {
            display: inline-block;
            padding: 0.5rem 1rem;
            background-color: var(--success-color);
            color: white;
            text-decoration: none;
            border-radius: 0.25rem;
            font-size: 0.9rem;
            text-align: center;
            margin-top: 0.5rem;
            transition: all 0.2s;
        }

        .download-btn:hover {
            background-color: #218838;
            transform: translateY(-2px);
        }

        .code-block {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            padding: 1rem;
            margin: 1rem 0;
            font-family: monospace;
            white-space: pre-wrap;
            overflow-x: auto;
            font-size: 0.9rem;
            max-height: 300px;
            overflow-y: auto;
        }

        .ai-response {
            background-color: var(--card-bg);
            border-left: 3px solid var(--primary-color);
            padding: 1rem;
            margin: 1rem 0;
            border-radius: 0 0.5rem 0.5rem 0;
        }

        .loader {
            border: 5px solid var(--border-color);
            border-top: 5px solid var(--primary-color);
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 2rem auto;
            display: none;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .alert {
            padding: 1rem;
            border-radius: 0.5rem;
            margin: 1rem 0;
            display: none;
        }

        .alert-error {
            background-color: rgba(220, 53, 69, 0.1);
            border: 1px solid rgba(220, 53, 69, 0.5);
            color: var(--error-color);
        }

        .alert-success {
            background-color: rgba(40, 167, 69, 0.1);
            border: 1px solid rgba(40, 167, 69, 0.5);
            color: var(--success-color);
        }

        /* Responsive design */
        @media (max-width: 768px) {
            .format-item {
                flex: 1 0 100%;
            }
            
            .btn-group {
                flex-direction: column;
            }
            
            .tab {
                padding: 0.5rem 1rem;
                font-size: 0.9rem;
            }
        }
    </style>
</head>
<body>
    <header>
        <h1>Универсальный генератор графики</h1>
        <p class="subtitle">Создавайте, преобразуйте и улучшайте изображения с помощью искусственного интеллекта</p>
    </header>

    <div class="card">
        <div class="tabs">
            <div class="tab active" data-tab="generate">Создать изображение</div>
            <div class="tab" data-tab="convert">Конвертировать</div>
            <div class="tab" data-tab="enhance">Улучшить</div>
        </div>

        <div class="tab-content active" id="generate-tab">
            <form id="generate-form">
                <div class="form-group">
                    <label for="prompt">Описание изображения:</label>
                    <textarea id="prompt" placeholder="Напишите детальное описание желаемого изображения... например, 'Космический корабль в стиле киберпанк на фоне неоновых огней города'" required></textarea>
                </div>
                
                <div class="form-group">
                    <label for="style">Стиль изображения:</label>
                    <select id="style">
                        <option value="realistic">Реалистичный</option>
                        <option value="artistic">Художественный</option>
                        <option value="geometric">Геометрический</option>
                        <option value="abstract">Абстрактный</option>
                        <option value="minimalist">Минималистичный</option>
                    </select>
                </div>
                
                <div class="btn-group">
                    <button type="submit" id="generate-btn">Создать изображение</button>
                    <button type="button" class="button-secondary" id="generate-reset">Сбросить</button>
                </div>
            </form>
        </div>

        <div class="tab-content" id="convert-tab">
            <p>В этом разделе вы можете конвертировать изображение в различные форматы</p>
            <p>Сначала создайте изображение во вкладке "Создать изображение"</p>
        </div>

        <div class="tab-content" id="enhance-tab">
            <p>В этом разделе вы можете улучшить изображение с помощью ИИ</p>
            <p>Сначала создайте изображение во вкладке "Создать изображение"</p>
        </div>
    </div>

    <div class="loader" id="loader"></div>
    <div class="alert alert-error" id="error-message"></div>
    <div class="alert alert-success" id="success-message"></div>

    <div class="result-container" id="result-container">
        <h2>Результат:</h2>
        
        <div class="image-preview" id="image-preview"></div>
        
        <div class="card">
            <h3>Описание от G4F (Qwen):</h3>
            <div class="ai-response" id="ai-description">
                Загрузка описания...
            </div>
        </div>
        
        <div class="card">
            <h3>Доступные форматы:</h3>
            <div class="formats-container" id="formats-container">
                <div class="format-item">
                    <h3>SVG</h3>
                    <p>Векторный формат для масштабируемой графики без потери качества</p>
                    <a href="#" class="download-btn" id="download-svg">Скачать SVG</a>
                </div>
                <div class="format-item">
                    <h3>PNG</h3>
                    <p>Растровое изображение с поддержкой прозрачности</p>
                    <a href="#" class="download-btn" id="download-png">Скачать PNG</a>
                </div>
                <div class="format-item">
                    <h3>JPEG</h3>
                    <p>Сжатое растровое изображение для экономии места</p>
                    <a href="#" class="download-btn" id="download-jpeg">Скачать JPEG</a>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h3>SVG код:</h3>
            <div class="code-block" id="svg-code"></div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Функция для переключения вкладок
            function setupTabs() {
                const tabs = document.querySelectorAll('.tab');
                tabs.forEach(tab => {
                    tab.addEventListener('click', function() {
                        // Убираем активный класс у всех вкладок
                        tabs.forEach(t => t.classList.remove('active'));
                        // Добавляем активный класс текущей вкладке
                        this.classList.add('active');
                        
                        // Скрываем все контейнеры с содержимым
                        document.querySelectorAll('.tab-content').forEach(content => {
                            content.classList.remove('active');
                        });
                        
                        // Показываем нужный контейнер
                        const tabId = this.getAttribute('data-tab');
                        document.getElementById(tabId + '-tab').classList.add('active');
                    });
                });
            }
            
            // Функция для создания изображения
            async function generateImage() {
                const prompt = document.getElementById('prompt').value.trim();
                const style = document.getElementById('style').value;
                const generateBtn = document.getElementById('generate-btn');
                const loader = document.getElementById('loader');
                const resultContainer = document.getElementById('result-container');
                const errorMessage = document.getElementById('error-message');
                const successMessage = document.getElementById('success-message');
                
                // Проверяем, что промпт не пустой
                if (!prompt) {
                    errorMessage.textContent = 'Пожалуйста, введите описание изображения';
                    errorMessage.style.display = 'block';
                    setTimeout(() => { errorMessage.style.display = 'none'; }, 3000);
                    return;
                }
                
                // Сбрасываем предыдущие сообщения и результаты
                errorMessage.style.display = 'none';
                successMessage.style.display = 'none';
                
                // Показываем индикатор загрузки и блокируем кнопку
                loader.style.display = 'block';
                generateBtn.disabled = true;
                
                try {
                    // Отправляем запрос на генерацию изображения
                    const response = await fetch('/api/image-generator/generate', {
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
                    document.getElementById('image-preview').innerHTML = data.svg;
                    document.getElementById('svg-code').textContent = data.svg;
                    
                    // Настраиваем кнопки загрузки
                    setupDownloadButtons(data);
                    
                    // Получаем описание от G4F
                    getAIDescription(prompt);
                    
                    // Показываем результат
                    resultContainer.style.display = 'block';
                    
                    // Показываем сообщение об успехе
                    successMessage.textContent = 'Изображение успешно создано!';
                    successMessage.style.display = 'block';
                    setTimeout(() => { successMessage.style.display = 'none'; }, 3000);
                    
                } catch (error) {
                    console.error('Ошибка:', error);
                    errorMessage.textContent = 'Произошла ошибка при создании изображения: ' + error.message;
                    errorMessage.style.display = 'block';
                } finally {
                    // Скрываем индикатор загрузки и разблокируем кнопку
                    loader.style.display = 'none';
                    generateBtn.disabled = false;
                }
            }
            
            // Функция для настройки кнопок загрузки
            function setupDownloadButtons(data) {
                // SVG
                const svgBlob = new Blob([data.svg], { type: 'image/svg+xml' });
                const svgUrl = URL.createObjectURL(svgBlob);
                const downloadSvgBtn = document.getElementById('download-svg');
                downloadSvgBtn.href = svgUrl;
                downloadSvgBtn.download = 'image.svg';
                
                // Для PNG и JPEG используем ссылки API
                document.getElementById('download-png').href = '/api/image-generator/convert?format=png&id=' + data.id;
                document.getElementById('download-png').download = 'image.png';
                
                document.getElementById('download-jpeg').href = '/api/image-generator/convert?format=jpeg&id=' + data.id;
                document.getElementById('download-jpeg').download = 'image.jpg';
            }
            
            // Функция для получения описания от G4F
            async function getAIDescription(prompt) {
                const aiDescription = document.getElementById('ai-description');
                aiDescription.textContent = 'Получение описания от ИИ...';
                
                try {
                    const response = await fetch('/api/g4f/chat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message: \`Опиши подробно, как будет выглядеть изображение по запросу: "\${prompt}". Опиши визуальные элементы, стиль, цвета, композицию и детали.\`,
                            provider: 'Qwen_Qwen_2_5',
                            max_retries: 2
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error('Ошибка при получении описания');
                    }
                    
                    const data = await response.json();
                    
                    if (data.response) {
                        aiDescription.textContent = data.response;
                    } else {
                        aiDescription.textContent = 'Не удалось получить описание от ИИ';
                    }
                } catch (error) {
                    console.error('Ошибка при получении описания:', error);
                    aiDescription.textContent = 'Ошибка при получении описания от ИИ: ' + error.message;
                }
            }
            
            // Настройка обработчиков событий
            document.getElementById('generate-form').addEventListener('submit', function(e) {
                e.preventDefault();
                generateImage();
            });
            
            document.getElementById('generate-reset').addEventListener('click', function() {
                document.getElementById('prompt').value = '';
                document.getElementById('style').selectedIndex = 0;
                document.getElementById('result-container').style.display = 'none';
                document.getElementById('error-message').style.display = 'none';
                document.getElementById('success-message').style.display = 'none';
            });
            
            // Запускаем инициализацию
            setupTabs();
        });
    </script>
</body>
</html>`;

// Объект для временного хранения сгенерированных изображений
const generatedImages = new Map();

// Функция для генерации уникального ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Функция для генерации изображения через Picsum Photos API
async function generateImage(prompt: string, style = 'realistic') {
    console.log(`Генерация изображения для запроса: "${prompt}" в стиле "${style}"`);
    
    try {
        // Создаем хеш из промпта для получения стабильных, но разных изображений
        const seed = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000;
        
        // Изменяем параметры в зависимости от стиля
        let imageUrl = `https://picsum.photos/seed/${seed}/800/600`;
        
        if (style === 'artistic') {
            // Используем другой сервис для художественных изображений
            imageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(prompt)}`;
        }
        
        console.log(`Запрос изображения по URL: ${imageUrl}`);
        
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
        
        // Создаем градиент с помощью Sharp, если API недоступно
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
        } catch (sharpError) {
            console.error('Ошибка при создании резервного изображения:', sharpError);
            throw error;
        }
    }
}

// Функция для конвертации PNG в SVG с использованием Potrace
async function convertToSvg(imageBuffer: Buffer, style = 'realistic') {
    return new Promise<string>(async (resolve, reject) => {
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
                case 'artistic':
                    await sharpConfig.modulate({ brightness: 1.2 }).toFile(tempPngPath);
                    potraceParams.turdSize = 3;
                    potraceParams.optTolerance = 0.2;
                    break;
                default:
                    await sharpConfig.toFile(tempPngPath);
                    break;
            }
            
            // Выполняем трассировку изображения
            potrace.trace(tempPngPath, potraceParams, (err: Error | null, svg: string) => {
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

// Маршрут для отображения страницы генератора изображений
router.get('/', (req, res) => {
    res.send(htmlPage);
});

// Маршрут для генерации изображения
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
            message: error.message instanceof Error ? error.message : 'Неизвестная ошибка'
        });
    }
});

// Маршрут для конвертации в другие форматы
router.get('/convert', async (req, res) => {
    try {
        const { id, format } = req.query;
        
        if (!id || !format) {
            return res.status(400).json({ error: 'Отсутствуют обязательные параметры id и format' });
        }
        
        // Проверяем, есть ли изображение в кэше
        if (!generatedImages.has(id as string)) {
            return res.status(404).json({ error: 'Изображение не найдено' });
        }
        
        const imageInfo = generatedImages.get(id as string);
        
        // Проверяем, существует ли файл
        if (!fs.existsSync(imageInfo.path)) {
            return res.status(404).json({ error: 'Файл изображения не найден' });
        }
        
        // Настраиваем формат
        let contentType = 'image/png';
        let outputOptions = {};
        let outputFormat = 'png';
        
        switch ((format as string).toLowerCase()) {
            case 'jpeg':
            case 'jpg':
                contentType = 'image/jpeg';
                outputFormat = 'jpeg';
                outputOptions = { quality: 90 };
                break;
            case 'webp':
                contentType = 'image/webp';
                outputFormat = 'webp';
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
        const transform = sharp(imageInfo.path)
            .toFormat(outputFormat as any, outputOptions);
        
        // Отправляем изображение клиенту
        transform.pipe(res);
        
    } catch (error) {
        console.error('Ошибка при конвертации изображения:', error);
        res.status(500).json({ 
            error: 'Произошла ошибка при конвертации изображения',
            message: error instanceof Error ? error.message : 'Неизвестная ошибка'
        });
    }
});

// Очистка старых изображений (чтобы не засорять диск)
setInterval(() => {
    const now = Date.now();
    const expirationTime = 3600000; // 1 час
    
    // Используем Array.from для правильной типизации
    Array.from(generatedImages.entries()).forEach(([id, info]) => {
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
    });
}, 1800000); // каждые 30 минут

export default router;