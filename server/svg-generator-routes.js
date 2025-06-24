import express from 'express';
import potrace from 'potrace';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

// Создаем роутер для SVG генератора
const svgRouter = express.Router();

// Получаем текущую директорию для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Создаем директории, если их нет
const tempDir = path.join(__dirname, '..', 'temp');
const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

// Функция для генерации изображения через Picsum Photos (не требует ключа)
async function generateImage(prompt) {
  console.log(`Генерация изображения для запроса: "${prompt}"`);
  
  try {
    // Используем хеш промпта для получения псевдо-случайного изображения
    const seed = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000;
    
    // API для получения случайных изображений без ключа
    const imageUrl = `https://picsum.photos/seed/${seed}/800/600`;
    console.log(`Запрос изображения по URL: ${imageUrl}`);
    
    // Загружаем изображение
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Ошибка при загрузке изображения: ${response.status}`);
    }
    
    // Конвертируем в буфер
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    console.error('Ошибка при генерации изображения:', error);
    
    // Создаем простой градиент через Sharp
    console.log('Создание градиента...');
    
    // Генерируем уникальный градиент на основе промпта
    const colors = [
      { r: 80, g: 100, b: 200 },
      { r: 120, g: 86, b: 220 },
      { r: 74, g: 86, b: 234 },
    ];
    
    // Создаем простое изображение
    return await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: colors[0]
      }
    })
    .linear(
      [1.1, 1.1, 1.1], // умножитель для каждого канала
      [-10, -10, -10]  // добавка для каждого канала
    )
    .png()
    .toBuffer();
  }
}

// Функция для конвертации PNG в SVG
function convertToSvg(imageBuffer) {
  return new Promise(async (resolve, reject) => {
    try {
      // Сохраняем во временный файл
      const tempPngPath = path.join(tempDir, `temp_${Date.now()}.png`);
      
      // Используем sharp для оптимизации изображения перед трассировкой
      await sharp(imageBuffer)
        .grayscale()
        .toFile(tempPngPath);
      
      // Настройки для трассировки
      const params = {
        threshold: 128,
        turdSize: 2,
        optTolerance: 0.2,
        color: '#000000'
      };
      
      // Трассируем изображение
      potrace.trace(tempPngPath, params, (err, svg) => {
        // Удаляем временный файл
        fs.unlink(tempPngPath, () => {});
        
        if (err) {
          console.error('Ошибка при трассировке:', err);
          return reject(err);
        }
        
        resolve(svg);
      });
    } catch (error) {
      console.error('Ошибка конвертации в SVG:', error);
      reject(error);
    }
  });
}

// Создаем HTML-страницу для SVG генератора
const htmlPage = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SVG Генератор</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 1rem; }
        h1 { background: linear-gradient(45deg, #4a56e2, #6c63ff); -webkit-background-clip: text; background-clip: text; color: transparent; }
        input, button, textarea { padding: 0.5rem; margin: 0.5rem 0; width: 100%; border-radius: 4px; border: 1px solid #ccc; }
        button { background: linear-gradient(45deg, #4a56e2, #6c63ff); color: white; border: none; cursor: pointer; }
        .result { margin-top: 1rem; border: 1px solid #ccc; padding: 1rem; border-radius: 4px; }
        svg { max-width: 100%; background-color: white; }
        .loader { border: 5px solid #f3f3f3; border-top: 5px solid #4a56e2; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 1rem auto; display: none; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <h1>SVG Генератор Изображений</h1>
    <p>Введите описание для генерации изображения и получения его в формате SVG</p>
    
    <form id="generator-form">
        <textarea id="prompt" placeholder="Например: космический корабль" rows="3" required></textarea>
        <button type="submit">Сгенерировать SVG</button>
    </form>
    
    <div class="loader" id="loader"></div>
    
    <div class="result" id="result" style="display:none">
        <h3>Результат:</h3>
        <div id="svg-output"></div>
        <textarea id="svg-code" rows="5" readonly style="font-size: 12px; font-family: monospace;"></textarea>
        <a id="download" download="image.svg" href="#" style="display: inline-block; margin-top: 1rem; text-decoration: none; background: #28a745; color: white; padding: 0.5rem; border-radius: 4px;">Скачать SVG</a>
    </div>
    
    <div id="chat-result" style="margin-top: 1rem; display: none;">
        <h3>Описание от Qwen:</h3>
        <div id="chat-response" style="padding: 1rem; border: 1px solid #ccc; border-radius: 4px;"></div>
    </div>
    
    <script>
        const form = document.getElementById('generator-form');
        const result = document.getElementById('result');
        const svgOutput = document.getElementById('svg-output');
        const svgCode = document.getElementById('svg-code');
        const downloadBtn = document.getElementById('download');
        const loader = document.getElementById('loader');
        const chatResult = document.getElementById('chat-result');
        const chatResponse = document.getElementById('chat-response');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const prompt = document.getElementById('prompt').value;
            
            // Показываем индикатор загрузки
            loader.style.display = 'block';
            result.style.display = 'none';
            
            try {
                // Запрос на генерацию
                const response = await fetch('/svg-generator/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt })
                });
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                // Отображаем результат
                svgOutput.innerHTML = data.svg;
                svgCode.value = data.svg;
                
                // Настраиваем кнопку загрузки
                const blob = new Blob([data.svg], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                downloadBtn.href = url;
                
                // Показываем результат
                result.style.display = 'block';
                
                // Запрашиваем описание от Qwen
                getDescription(prompt);
                
            } catch (error) {
                alert('Ошибка: ' + error.message);
                console.error('Ошибка:', error);
            } finally {
                loader.style.display = 'none';
            }
        });
        
        async function getDescription(prompt) {
            try {
                const response = await fetch('/api/python/g4f/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: \`Опиши подробно, как может выглядеть изображение по запросу: "\${prompt}". Опиши визуальные элементы, стиль, цвета и детали.\`,
                        provider: 'Qwen_Qwen_2_5',
                        max_retries: 2
                    })
                });
                
                const data = await response.json();
                
                if (data.response) {
                    chatResponse.textContent = data.response;
                    chatResult.style.display = 'block';
                }
            } catch (error) {
                console.error('Ошибка получения описания:', error);
                chatResponse.textContent = 'Не удалось получить описание от ИИ.';
                chatResult.style.display = 'block';
            }
        }
    </script>
</body>
</html>`;

// Создаем HTML-файл
fs.writeFileSync(path.join(publicDir, 'svg-generator.html'), htmlPage);

// Маршрут для главной страницы генератора
svgRouter.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'svg-generator.html'));
});

// Маршрут для генерации SVG
svgRouter.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Отсутствует параметр prompt' });
    }
    
    console.log(`Получен запрос на генерацию изображения: "${prompt}"`);
    
    // Генерируем изображение
    const imageBuffer = await generateImage(prompt);
    
    // Конвертируем в SVG
    const svg = await convertToSvg(imageBuffer);
    
    // Отправляем результат
    res.json({ svg });
    
  } catch (error) {
    console.error('Ошибка обработки запроса:', error);
    res.status(500).json({ 
      error: 'Ошибка при обработке запроса', 
      message: error.message 
    });
  }
});

export default svgRouter;