// Маршрут для перенаправления на генератор изображений
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// Создаем роутер
const router = express.Router();

// Получаем текущую директорию для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// HTML-страница с iframe для встраивания генератора изображений
const htmlPage = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Генератор SVG + G4F</title>
    <style>
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            background: linear-gradient(135deg, #4a56e2, #6c63ff);
            color: white;
            padding: 1rem;
            text-align: center;
        }
        
        h1 {
            margin: 0;
            font-size: 1.5rem;
        }
        
        .iframe-container {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        
        iframe {
            flex: 1;
            width: 100%;
            border: none;
        }
        
        .info {
            padding: 0.5rem;
            background-color: #f0f0f0;
            text-align: center;
            font-size: 0.8rem;
            color: #333;
        }
        
        @media (prefers-color-scheme: dark) {
            .header {
                background: linear-gradient(135deg, #5e68fa, #8c85ff);
            }
            
            .info {
                background-color: #252538;
                color: #f0f0f0;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Генератор SVG изображений + G4F</h1>
    </div>
    
    <div class="iframe-container">
        <iframe src="http://localhost:3100" id="generator-frame"></iframe>
    </div>
    
    <div class="info">
        Создавайте, конвертируйте и скачивайте векторные SVG изображения с описаниями от Qwen ИИ
    </div>
    
    <script>
        // Заменяем URL в iframe на актуальный для Replit
        document.addEventListener('DOMContentLoaded', function() {
            const iframe = document.getElementById('generator-frame');
            const currentHost = window.location.hostname;
            
            // Если мы на Replit
            if (currentHost.includes('replit')) {
                const newSrc = window.location.protocol + '//' + currentHost + ':3100';
                iframe.src = newSrc;
            }
        });
    </script>
</body>
</html>`;

// Функция для проверки, запущен ли сервер на порту 3100
async function checkImageGeneratorServer() {
    try {
        await fetch('http://localhost:3100');
        return true;
    } catch (error) {
        return false;
    }
}

// Маршрут для отображения страницы генератора изображений
router.get('/', async (req, res) => {
    // Проверяем, запущен ли сервер генерации изображений
    const isServerRunning = await checkImageGeneratorServer();
    
    if (isServerRunning) {
        res.send(htmlPage);
    } else {
        // Если сервер не запущен, показываем сообщение с инструкциями
        res.send(`
            <html>
                <head>
                    <title>Генератор SVG - Сервер не запущен</title>
                    <style>
                        body {
                            font-family: system-ui, sans-serif;
                            padding: 2rem;
                            max-width: 700px;
                            margin: 0 auto;
                            line-height: 1.6;
                        }
                        .card {
                            border: 1px solid #ddd;
                            border-radius: 8px;
                            padding: 1.5rem;
                            margin-bottom: 1rem;
                            background-color: #f9f9f9;
                        }
                        h1 {
                            color: #4a56e2;
                        }
                        pre {
                            background-color: #eee;
                            padding: 1rem;
                            border-radius: 4px;
                            overflow-x: auto;
                        }
                        .cmd {
                            font-family: monospace;
                            background-color: #eee;
                            padding: 0.2rem 0.4rem;
                            border-radius: 3px;
                        }
                    </style>
                </head>
                <body>
                    <h1>Генератор SVG + G4F не запущен</h1>
                    <div class="card">
                        <p>Сервер генерации SVG изображений не запущен на порту 3100.</p>
                        <p>Для запуска сервера выполните команду:</p>
                        <pre>node media-generator.js</pre>
                        <p>После запуска сервера вернитесь на эту страницу и обновите её.</p>
                    </div>
                </body>
            </html>
        `);
    }
});

export default router;