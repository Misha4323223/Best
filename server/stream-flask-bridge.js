/**
 * Мост между Express и Flask-сервером для стриминга
 */
const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const http = require('http');
const { pipeline } = require('stream');

// Глобальная переменная для хранения процесса Flask
let flaskProcess = null;
let flaskStarting = false;
let flaskPort = 5001;

// Проверяем, работает ли Flask-сервер
async function checkFlaskServer() {
  return new Promise((resolve) => {
    const req = http.request({
      host: 'localhost',
      port: flaskPort,
      path: '/stream',
      method: 'HEAD',
      timeout: 1000
    }, (res) => {
      resolve(res.statusCode < 500);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Запускаем Flask-сервер
async function startFlaskServer() {
  if (flaskProcess !== null || flaskStarting) return;
  
  flaskStarting = true;
  console.log('Запускаем Flask-сервер для стриминга AI...');
  
  flaskProcess = spawn('python', ['server/stream_server.py']);
  
  flaskProcess.stdout.on('data', (data) => {
    console.log(`[Flask] ${data.toString().trim()}`);
  });
  
  flaskProcess.stderr.on('data', (data) => {
    console.error(`[Flask Error] ${data.toString().trim()}`);
  });
  
  flaskProcess.on('close', (code) => {
    console.log(`Flask-сервер завершился с кодом ${code}`);
    flaskProcess = null;
    flaskStarting = false;
  });
  
  // Подождем немного, чтобы сервер успел запуститься
  await new Promise(resolve => setTimeout(resolve, 3000));
  flaskStarting = false;
}

// Проверяем и запускаем Flask при необходимости
router.use(async (req, res, next) => {
  const isFlaskRunning = await checkFlaskServer();
  
  if (!isFlaskRunning && !flaskStarting) {
    console.log('Flask-сервер не запущен, запускаем...');
    await startFlaskServer();
  }
  
  next();
});

// Маршрут для прокси к Flask серверу
router.post('/chat', async (req, res) => {
  try {
    const isFlaskRunning = await checkFlaskServer();
    
    if (!isFlaskRunning) {
      console.error('Flask-сервер не отвечает после попытки запуска');
      return res.status(503).json({ 
        error: 'Сервер стриминга не доступен',
        message: 'Не удалось запустить сервер стриминга. Пожалуйста, попробуйте позже.'
      });
    }
    
    // Настраиваем заголовки для SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    console.log(`Пересылаем запрос на Flask-сервер: ${JSON.stringify(req.body)}`);
    // Создаем запрос к Flask серверу
    const flaskReq = http.request({
      host: 'localhost',
      port: flaskPort,
      path: '/stream',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (flaskRes) => {
      // Проверяем статус ответа
      if (flaskRes.statusCode !== 200) {
        console.error(`Flask вернул код ${flaskRes.statusCode}`);
        
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ error: `Ошибка сервера: ${flaskRes.statusCode}` })}\n\n`);
        res.end();
        return;
      }
      
      // Пересылаем все данные от Flask клиенту
      flaskRes.on('data', (chunk) => {
        res.write(chunk);
        
        // Убеждаемся, что данные сразу отправляются клиенту
        if (res.flush) {
          res.flush();
        }
      });
      
      flaskRes.on('end', () => {
        res.end();
      });
    });
    
    // Обработка ошибок запроса к Flask
    flaskReq.on('error', (err) => {
      console.error('Ошибка при подключении к Flask:', err.message);
      
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: 'Ошибка подключения к серверу стриминга' })}\n\n`);
      res.end();
    });
    
    // Отправляем тело запроса в Flask
    flaskReq.write(JSON.stringify(req.body));
    flaskReq.end();
    
    // Обработка закрытия соединения клиентом
    req.on('close', () => {
      console.log('Клиент закрыл соединение');
    });
    
  } catch (error) {
    console.error('Ошибка при обработке запроса к Flask:', error);
    
    // Если ответ еще не отправлен, отправляем ошибку
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        message: error.message
      });
    }
  }
});

// Эндпоинт для проверки, что Flask-сервер запущен
router.get('/status', async (req, res) => {
  const isFlaskRunning = await checkFlaskServer();
  
  if (isFlaskRunning) {
    res.json({ status: 'online', message: 'Flask-сервер для стриминга запущен и работает' });
  } else {
    res.json({ status: 'offline', message: 'Flask-сервер для стриминга не запущен' });
  }
});

// Запускаем Flask-сервер при инициализации
startFlaskServer().then(() => {
  console.log('Flask-сервер инициализирован');
}).catch(err => {
  console.error('Ошибка при инициализации Flask-сервера:', err);
});

module.exports = router;