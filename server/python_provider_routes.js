/**
 * Маршруты для Python-провайдера G4F
 */
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { spawn } = require('child_process');
const { pipeline } = require('stream');
const path = require('path');

// Хранилище для процесса Python-сервера
let pythonProcess = null;
let isStarting = false;
let demoResponse = null;

// Запуск Python-сервера
async function startPythonServer() {
  if (pythonProcess || isStarting) return;
  
  isStarting = true;
  console.log('Запуск Python G4F сервера...');
  
  pythonProcess = spawn('python', ['server/g4f_python_provider.py']);
  
  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python G4F] ${data.toString().trim()}`);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python G4F Error] ${data.toString().trim()}`);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`Python G4F процесс завершился с кодом ${code}`);
    pythonProcess = null;
    isStarting = false;
  });
  
  // Ждем, пока сервер запустится
  await new Promise(resolve => setTimeout(resolve, 2000));
  isStarting = false;
}

// Проверка работоспособности Python-провайдера
async function checkPythonProvider() {
  try {
    console.log('Проверка работоспособности Python G4F...');
    
    // Используем http.request вместо fetch (которого нет в Node.js)
    const http = require('http');
    
    return new Promise((resolve, reject) => {
      const testData = JSON.stringify({
        message: 'hi',
        provider: 'FreeGpt',
        timeout: 5000
      });
      
      const options = {
        hostname: 'localhost',
        port: 5004,
        path: '/python/test',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(testData)
        }
      };
      
      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode !== 200) {
            console.error(`HTTP ошибка: ${res.statusCode}`);
            reject(new Error(`HTTP ошибка: ${res.statusCode}`));
            return;
          }
          
          try {
            const data = JSON.parse(responseData);
            if (data.response) {
              demoResponse = data.response; // Сохраняем для демо-режима
              console.log('✅ Python G4F провайдер готов к работе');
              resolve(true);
            } else {
              throw new Error('Ответ не содержит данных');
            }
          } catch (err) {
            reject(new Error(`Ошибка при парсинге ответа: ${err.message}`));
          }
        });
      });
      
      req.on('error', (err) => {
        console.error('❌ Ошибка при проверке Python G4F:', err.message);
        reject(err);
      });
      
      // Установка таймаута в 5 секунд
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Таймаут соединения'));
      });
      
      // Отправляем данные
      req.write(testData);
      req.end();
    }).catch(err => {
      console.error('❌ Ошибка при проверке Python G4F:', err.message);
      return false;
    });
  } catch (error) {
    console.error('❌ Ошибка при проверке Python G4F:', error.message);
    return false;
  }
}

// Получение демо-ответа, если настоящий сервис недоступен
function getDemoResponse(message = '') {
  const messageLower = message.toLowerCase();
  
  if (messageLower.includes('привет') || messageLower.includes('здравствуй') || 
      messageLower.includes('hello') || messageLower.includes('hi')) {
    return 'Привет! Я BOOOMERANGS AI ассистент. Чем могу помочь вам сегодня?';
  } else if (messageLower.includes('как дела') || messageLower.includes('как ты') || 
             messageLower.includes('how are you')) {
    return 'У меня всё отлично, спасибо что спросили! Как ваши дела?';
  } else if (messageLower.includes('изображен') || messageLower.includes('картин') || 
             messageLower.includes('image') || messageLower.includes('picture')) {
    return 'Вы можете создать изображение, перейдя на вкладку "Генератор изображений". Просто опишите то, что хотите увидеть, и выберите стиль!';
  } else if (messageLower.includes('booomerangs')) {
    return 'BOOOMERANGS - это бесплатный мультимодальный AI-сервис для общения и создания изображений. Мы обеспечиваем доступ к возможностям искусственного интеллекта без необходимости платных API ключей!';
  } else if (demoResponse) {
    // Если у нас есть сохраненный ответ от предыдущей успешной проверки
    return demoResponse;
  } else {
    const responses = [
      'Это демо-режим BOOOMERANGS. Я могу отвечать на простые вопросы, но для полноценной работы необходимо подключение к AI-провайдерам.',
      'BOOOMERANGS использует различные AI-провайдеры, чтобы предоставлять ответы бесплатно. Сейчас вы видите демо-ответ, поскольку провайдеры недоступны.',
      'В данный момент BOOOMERANGS работает в демо-режиме. Попробуйте перезагрузить страницу или зайти позже для доступа к полной версии.'
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

// Обработка стандартного API запроса
router.post('/chat', async (req, res) => {
  try {
    const { message, provider = 'FreeGpt', timeout = 20000, context, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Не указан текст сообщения' 
      });
    }
    
    // Подготавливаем финальное сообщение с контекстом
    let finalMessage = message;
    if (context) {
      finalMessage = `${context}${message}`;
      console.log(`🧠 [PYTHON-PROVIDER] Добавлен контекст к сообщению: ${context.length} символов`);
    }
    
    // Запускаем Python-сервер, если он не запущен
    if (!pythonProcess && !isStarting) {
      await startPythonServer();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    try {
      // Используем http.request вместо fetch
      const http = require('http');
      
      const requestData = JSON.stringify({ message: finalMessage, provider, timeout });
      
      const data = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'localhost',
          port: 5004,
          path: '/python/chat',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestData)
          },
          timeout: timeout + 5000 // Добавляем запас по времени
        };
        
        const req = http.request(options, (res) => {
          let responseData = '';
          
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          
          res.on('end', () => {
            if (res.statusCode !== 200) {
              return reject(new Error(`HTTP ошибка: ${res.statusCode}`));
            }
            
            try {
              const parsedData = JSON.parse(responseData);
              resolve(parsedData);
            } catch (err) {
              reject(new Error(`Ошибка при парсинге ответа: ${err.message}`));
            }
          });
        });
        
        req.on('error', (err) => reject(err));
        
        req.write(requestData);
        req.end();
      });
      
      // Сохраняем успешный ответ для демо-режима
      if (data.response) {
        demoResponse = data.response;
      }
      
      return res.json(data);
    } catch (error) {
      console.error('Ошибка при запросе к Python G4F:', error.message);
      
      // Возвращаем демо-ответ в случае ошибки
      return res.json({
        success: true,
        response: getDemoResponse(message),
        provider: 'BOOOMERANGS-Demo',
        model: 'demo-mode',
        elapsed: 0.5
      });
    }
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

// Потоковый API для вывода данных в режиме реального времени
router.post('/chat/stream', async (req, res) => {
  try {
    const { message, provider = 'FreeGpt', timeout = 20000 } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Не указан текст сообщения' 
      });
    }
    
    // Настраиваем SSE заголовки
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // Сообщаем клиенту, что соединение установлено
    res.write(`event: connected\ndata: ${JSON.stringify({
      message: 'Соединение установлено',
      clientId: Date.now().toString()
    })}\n\n`);
    
    // Запускаем Python-сервер, если он не запущен
    if (!pythonProcess && !isStarting) {
      await startPythonServer();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`Запрос к Python G4F (стриминг): ${message.substring(0, 30)}${message.length > 30 ? '...' : ''}`);
    
    // Настраиваем таймеры
    const demoFallbackTimeout = 5000; // 5 секунд на демо-фоллбэк
    const totalTimeout = timeout || 25000; // Общий таймаут
    
    let demoTimeoutId = null;
    let totalTimeoutId = null;
    let isDemoSent = false;
    let isResponseComplete = false;
    
    // Функция для отправки демо-ответа, если нет ответа от API
    const sendDemoFallback = () => {
      if (isResponseComplete || isDemoSent) return;
      
      isDemoSent = true;
      console.log('⏱️ Превышен таймаут демо-ответа, отправляем резервный ответ');
      
      const demoText = getDemoResponse(message);
      
      // Отправляем демо-ответ порциями для имитации стриминга
      res.write(`event: fallback\ndata: ${JSON.stringify({
        text: demoText,
        demo: true
      })}\n\n`);
      
      // Имитируем окончание ответа
      res.write(`event: complete\ndata: ${JSON.stringify({
        text: demoText,
        provider: 'BOOOMERANGS-Demo',
        model: 'demo-mode',
        elapsed: 0.5
      })}\n\n`);
      
      res.end();
    };
    
    // Установка таймаутов
    console.log(`⏱️ Настроен таймаут для демо-ответа: ${demoFallbackTimeout}мс, общий таймаут: ${totalTimeout}мс`);
    demoTimeoutId = setTimeout(sendDemoFallback, demoFallbackTimeout);
    totalTimeoutId = setTimeout(() => {
      if (!isResponseComplete) {
        console.log('⏱️ Превышен общий таймаут запроса');
        if (!isDemoSent) {
          sendDemoFallback();
        }
        res.end();
      }
    }, totalTimeout);
    
    try {
      // Используем http.request вместо fetch
      const http = require('http');
      
      const requestData = JSON.stringify({ message, provider, timeout });
      
      // Подключаемся к Python потоковому серверу
      await new Promise((resolve, reject) => {
        const options = {
          hostname: 'localhost',
          port: 5004,
          path: '/python/chat/stream',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'Connection': 'keep-alive',
            'Content-Length': Buffer.byteLength(requestData)
          }
        };
        
        const pythonReq = http.request(options, (pythonRes) => {
          if (pythonRes.statusCode !== 200) {
            reject(new Error(`HTTP ошибка: ${pythonRes.statusCode}`));
            return;
          }
          
          // Получен ответ от сервера, останавливаем таймаут демо-ответа
          clearTimeout(demoTimeoutId);
          
          // Настройка обработки потокового ответа
          pythonRes.on('data', (chunk) => {
            // Пересылаем данные клиенту без изменений
            res.write(chunk);
            
            // Форсируем отправку данных
            if (res.flush) {
              res.flush();
            }
          });
          
          pythonRes.on('end', () => {
            isResponseComplete = true;
            resolve();
          });
          
          // Ошибка со стороны Python сервера
          pythonRes.on('error', (err) => {
            console.error('Ошибка при получении данных от Python:', err.message);
            isResponseComplete = true;
            reject(err);
          });
        });
        
        // Ошибка соединения с Python сервером
        pythonReq.on('error', (err) => {
          console.error('Ошибка при подключении к Python серверу:', err.message);
          reject(err);
        });
        
        // Установка таймаута запроса
        pythonReq.setTimeout(timeout + 5000, () => {
          pythonReq.destroy();
          reject(new Error('Таймаут соединения с Python сервером'));
        });
        
        // Отправляем данные
        pythonReq.write(requestData);
        pythonReq.end();
      });
      
    } catch (error) {
      console.error('Ошибка при получении стримингового ответа:', error.message);
      
      // Если еще не отправлен демо-ответ, отправляем его
      if (!isDemoSent && !isResponseComplete) {
        sendDemoFallback();
      } else if (!isResponseComplete) {
        // Отправляем ошибку, если демо-ответ уже отправлен
        res.write(`event: error\ndata: ${JSON.stringify({
          error: 'Ошибка соединения с сервером',
          message: error.message
        })}\n\n`);
        
        res.end();
      }
    } finally {
      // Очищаем таймеры
      clearTimeout(demoTimeoutId);
      clearTimeout(totalTimeoutId);
      
      // Закрываем соединение, если оно еще открыто
      if (!isResponseComplete) {
        res.end();
      }
    }
  } catch (error) {
    console.error('Ошибка обработки стримингового запроса:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({ 
        success: false, 
        error: 'Внутренняя ошибка сервера',
        message: error.message
      });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({
        error: 'Внутренняя ошибка сервера',
        message: error.message
      })}\n\n`);
      
      res.end();
    }
  }
  
  // Обработка закрытия соединения клиентом
  req.on('close', () => {
    console.log('Клиент отключился');
  });
});

// Тестовый маршрут
router.post('/test', async (req, res) => {
  try {
    const { message, provider, timeout } = req.body;
    
    // Запускаем Python-сервер, если он не запущен
    if (!pythonProcess && !isStarting) {
      await startPythonServer();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const result = await checkPythonProvider();
    
    if (result) {
      return res.json({
        success: true,
        response: demoResponse || 'Python G4F провайдер работает',
        provider: 'Python-Test',
        model: 'test-mode'
      });
    } else {
      return res.json({
        success: false,
        error: 'Python G4F провайдер недоступен'
      });
    }
  } catch (error) {
    console.error('Ошибка при тестировании Python G4F:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

// Инициализация
(async () => {
  // Запускаем сервер и проверяем его работоспособность
  await startPythonServer();
  await checkPythonProvider();
})();

// Функция для прямого вызова Python AI с использованием http.request
async function callPythonAI(message, provider = null) {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const queryParams = provider ? `?provider=${provider}` : '';
    const requestData = JSON.stringify({ message });
    
    const options = {
      hostname: 'localhost',
      port: 5004,
      path: `/python/chat${queryParams}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    const req = http.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        if (response.statusCode === 200) {
          try {
            const parsedData = JSON.parse(data);
            console.log('Ответ от Python:', parsedData);
            if (parsedData && parsedData.response) {
              console.log('✅ Python G4F вернул реальный ответ от AI: ' + parsedData.provider);
              resolve(parsedData.response);
            } else {
              console.log('⚠️ Python G4F вернул некорректный формат данных');
              resolve(getDemoResponse(message));
            }
          } catch (err) {
            console.log(`Ошибка при парсинге ответа: ${err.message}`);
            console.log('Сырые данные:', data);
            resolve(getDemoResponse(message));
          }
        } else {
          console.log(`Ошибка от Python G4F: ${response.statusCode}`);
          resolve(getDemoResponse(message));
        }
      });
    });

    req.on('error', (error) => {
      console.log(`Ошибка при обращении к Python G4F: ${error.message}`);
      resolve(getDemoResponse(message));
    });

    req.write(requestData);
    req.end();
  });
}

module.exports = { router, startPythonServer, checkPythonProvider, callPythonAI };