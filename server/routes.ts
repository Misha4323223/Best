import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupWebSocket } from "./ws";
import { setupProxyMiddleware } from "./middleware/proxy";
import { authMiddleware } from "./middleware/auth";
import { z } from "zod";
import { authSchema, messageSchema } from "@shared/schema";
import { logger, chatLogger } from "./logger";

// Система логирования
const Logger = {
  info: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`🔵 [${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  success: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`✅ [${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`❌ [${timestamp}] ${message}`, error ? error : '');
  },
  warning: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`⚠️ [${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  ai: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`🤖 [${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

// Импортируем модули для работы с изображениями и AI провайдерами
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(__filename);

// Настройка multer для загрузки изображений
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB лимит
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Только изображения разрешены'), false);
    }
  }
});
const svgGenerator = require('./svg-generator');
const g4fHandlers = require('./g4f-handlers');
const directAiRoutes = require('./direct-ai-routes');
const pythonProviderRoutes = require('./python_provider_routes');
const deepspeekProvider = require('./deepspeek-provider');
const chatFreeProvider = require('./chatfree-provider');

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Setup WebSocket server
  setupWebSocket(httpServer, storage);
  
  // Setup proxy middleware
  setupProxyMiddleware(app);
  
  // Статические файлы из корневой директории
  app.use(express.static(path.join(process.cwd())));
  
  // Специальный маршрут для файлов вышивки с правильными заголовками скачивания
  app.get('/output/embroidery/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'output', 'embroidery', filename);
    
    // Определяем тип контента на основе расширения
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.exp') contentType = 'application/x-melco-exp';
    else if (ext === '.dst') contentType = 'application/x-tajima-dst';
    else if (ext === '.pes') contentType = 'application/x-brother-pes';
    else if (ext === '.jef') contentType = 'application/x-janome-jef';
    else if (ext === '.vp3') contentType = 'application/x-husqvarna-vp3';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.json') contentType = 'application/json';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filePath);
  });
  
  // Подключаем генератор изображений
  app.use('/image-generator', (req, res) => {
    res.redirect('/api/svg');
  });
  
  // API для генератора изображений
  app.use('/api/svg', svgGenerator);
  
  // Расширенный поиск
  app.use('/api/search', require('./search-routes'));
  
  // Импортируем модуль генерации изображений с AI
  const aiImageGenerator = require('./ai-image-generator');

  // API для генерации изображений через бесплатные AI провайдеры
  app.post("/api/ai-image/generate", async (req, res) => {
    try {
      const { prompt, style = 'realistic' } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ 
          success: false, 
          error: 'Необходимо указать текстовый запрос (prompt)'
        });
      }
      
      // Вызываем функцию генерации изображения
      const result = await aiImageGenerator.generateImage(prompt, style);
      
      res.json(result);
    } catch (error) {
      console.error('Ошибка при генерации изображения:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Внутренняя ошибка сервера при генерации изображения'
      });
    }
  });
  
  // Создаем маршрут для доступа к сгенерированным изображениям с поддержкой скачивания
  app.use('/output', (req, res, next) => {
    const outputPath = path.join(__dirname, '..', 'output');
    const filePath = path.join(outputPath, req.path);
    
    // Проверяем параметр download для принудительного скачивания
    if (req.query.download === 'true') {
      const fileName = path.basename(req.path);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
    }
    
    res.sendFile(req.path, { root: outputPath });
  });
  
  // Тестовая страница
  app.get('/test', (req, res) => {
    res.sendFile('test-page.html', { root: '.' });
  });
  
  // Демо-страница генератора изображений
  app.get('/demo', (req, res) => {
    res.sendFile('demo.html', { root: '.' });
  });
  
  // Главная страница - BOOOMERANGS Smart Chat
  app.get('/', (req, res) => {
    res.sendFile('booomerangs-smart-chat.html', { root: '.' });
  });
  
  // Альтернативный доступ к HTML чату
  app.get('/smart-chat', (req, res) => {
    res.sendFile('booomerangs-smart-chat.html', { root: '.' });
  });
  
  // Страница отладки
  app.get('/debug', (req, res) => {
    res.sendFile('debug-info.html', { root: '.' });
  });

  // G4F чат интерфейс
  app.get('/g4f-chat', (req, res) => {
    res.sendFile('g4f-chat.html', { root: '.' });
  });
  
  // Простой G4F тест
  app.get('/simple-g4f', (req, res) => {
    res.sendFile('simple-g4f.html', { root: '.' });
  });
  
  // Прямой тест G4F
  app.get('/direct-g4f', (req, res) => {
    res.sendFile('direct-g4f-test.html', { root: '.' });
  });
  
  // Автономная версия G4F чата
  app.get('/standalone', (req, res) => {
    res.sendFile('standalone-g4f.html', { root: '.' });
  });
  
  // BOOOMERANGS приложение
  app.get('/booom', (req, res) => {
    res.sendFile('booomerangs-main.html', { root: '.' });
  });
  
  // BOOOMERANGS новый прямой доступ
  app.get('/ai', (req, res) => {
    res.sendFile('booomerangs-direct.html', { root: '.' });
  });
  
  // BOOOMERANGS новый мультимодальный интерфейс
  app.get('/new', (req, res) => {
    res.sendFile('booomerangs-new.html', { root: '.' });
  });
  
  // BOOOMERANGS чат с AI провайдерами (прямой интерфейс)
  app.get('/chat-ai', (req, res) => {
    res.sendFile('booomerangs-chat.html', { root: '.' });
  });
  
  // BOOOMERANGS универсальный интерфейс (чат + генератор изображений)
  app.get('/unified', (req, res) => {
    res.sendFile('public/unified-interface.html', { root: '.' });
  });
  
  // BOOOMERANGS фиксированный интерфейс с локальной генерацией изображений
  app.get('/fixed', (req, res) => {
    res.sendFile('public/fixed-interface.html', { root: '.' });
  });
  
  // BOOOMERANGS только генератор изображений (стабильная версия)
  app.get('/image-generator', (req, res) => {
    res.sendFile('public/image-generator.html', { root: '.' });
  });
  
  // Убираем дублирующий маршрут - используем только один выше с поддержкой параметра download
  
  // BOOOMERANGS AI генератор изображений
  app.get('/ai-images', (req, res) => {
    res.sendFile('public/ai-image-app.html', { root: '.' });
  });
  
  // BOOOMERANGS приложение со стримингом
  app.get('/booom-streaming', (req, res) => {
    res.sendFile('booomerangs-app-streaming-fixed.html', { root: '.' });
  });
  
  // BOOOMERANGS с Qwen AI интеграцией
  app.get('/qwen', (req, res) => {
    res.sendFile('booomerangs-qwen.html', { root: '.' });
  });
  
  // BOOOMERANGS со стримингом ответов
  app.get('/streaming', (req, res) => {
    res.sendFile('booomerangs-streaming.html', { root: '.' });
  });
  
  // BOOOMERANGS быстрая версия (запасной вариант без стриминга)
  app.get('/quick', (req, res) => {
    res.sendFile('booomerangs-quick.html', { root: '.' });
  });
  
  // BOOOMERANGS стабильная версия (только провайдеры с поддержкой стриминга)
  app.get('/stable', (req, res) => {
    res.sendFile('booomerangs-stable.html', { root: '.' });
  });
  
  // BOOOMERANGS с Flask-стримингом (самая надежная версия)
  app.get('/flask', (req, res) => {
    res.sendFile('booomerangs-flask-stream.html', { root: '.' });
  });

  // Страница просмотра логов системы
  app.get('/logs', (req, res) => {
    res.sendFile('logs-viewer.html', { root: '.' });
  });
  

  
  // Перенаправляем запрос умного чата на HTML-страницу
  app.get('/smart-chat', (req, res) => {
    res.sendFile('booomerangs-smart-chat.html', { root: '.' });
  });
  
  // Командный чат для переписки участников
  app.get('/team-chat', (req, res) => {
    res.sendFile('team-chat.html', { root: '.' });
  });
  
  // API для работы с G4F провайдерами
  app.use('/api/g4f', g4fHandlers);
  
  // API с прямым доступом к AI провайдерам (более стабильный вариант)
  app.use('/api/direct-ai', directAiRoutes);
  
  // API с Python-версией G4F
  app.use('/api/python', pythonProviderRoutes.router);
  
  // API для стриминга от провайдеров, поддерживающих stream=True
  const streamingRoutes = require('./streaming-routes');
  app.use('/api/streaming', streamingRoutes);
  
  // ImageTracerJS векторизатор работает независимо на порту 5006
  // Старые маршруты /api/vectorizer удалены для совместимости с новым векторизатором
  
  // Статус векторизатора
  app.get('/api/vectorizer-status', async (req, res) => {
    try {
      const vectorizerManager = require('./vectorizer-manager');
      const status = await vectorizerManager.checkHealth();
      res.json({
        success: true,
        vectorizer: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.json({
        success: false,
        vectorizer: { status: 'unavailable', available: false },
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Полная проверка системы
  app.get('/api/system-health', async (req, res) => {
    try {
      const { SystemHealthChecker } = require('./system-health-checker');
      const checker = new SystemHealthChecker();
      const results = await checker.performFullHealthCheck();
      res.json({
        success: true,
        ...results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Тестирование векторизатора endpoints
  app.get('/api/test-vectorizer', async (req, res) => {
    try {
      const fetch = require('node-fetch');
      const endpoints = [
        'http://localhost:5006/health',
        'http://localhost:5006/api/vectorizer/health',
        'http://localhost:5006/api/vectorizer/formats'
      ];

      const results = {};
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, { timeout: 3000 });
          const data = await response.json();
          results[endpoint] = {
            status: response.status,
            ok: response.ok,
            data: data
          };
        } catch (error) {
          results[endpoint] = {
            error: error.message,
            accessible: false
          };
        }
      }

      res.json({
        success: true,
        vectorizerEndpoints: results,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // API для Flask-стриминга (надежный вариант)
  const flaskStreamBridge = require('./stream-flask-bridge');
  app.use('/api/flask-stream', flaskStreamBridge);
  
  // API для DeepSpeek - специализированного AI для технических вопросов
  const deepspeekRoutes = require('./deepspeek-routes');
  app.use('/api/deepspeek', deepspeekRoutes);
  
  // API для проверки состояния провайдеров (отключено)
  
  // API для Ollama - локальный AI провайдер
  const ollamaProvider = require('./ollama-provider');
  app.use('/api/ollama', ollamaProvider);
  
  // API для ChatFree провайдера
  app.use('/api/chatfree', chatFreeProvider);
  
  // API для FreeChat (отключено)
  
  // API для Claude от Anthropic через Python G4F
  const claudeProvider = require('./claude-provider');
  app.use('/api/claude', claudeProvider);
  
  // API для DeepInfra - высококачественные модели
  const deepInfraProvider = require('./deepinfra-provider');
  app.use('/api/deepinfra', deepInfraProvider);
  
  // API для мультимодального анализа изображений
  const multimodalProvider = require('./multimodal-provider');
  app.use('/api/multimodal', multimodalProvider);

  // API для конвертации в форматы вышивки
  const embroideryRoutes = require('./embroidery-routes');
  app.use('/api/embroidery', embroideryRoutes);
  
  // API для тестирования провайдеров (отключено)
  
  // API для умной маршрутизации сообщений к подходящим провайдерам
  const smartRouter = require('./smart-router');
  app.use('/api/smart', smartRouter);

  // API для сохранения истории чатов
  const chatHistory = require('./chat-history');
  const { insertChatSessionSchema, insertAiMessageSchema } = require('@shared/schema');

  // Создание новой сессии чата
  app.post('/api/chat/sessions', async (req, res) => {
    try {
      const { userId, title } = req.body;
      
      if (!userId || !title) {
        return res.status(400).json({ 
          success: false, 
          error: 'userId и title обязательны' 
        });
      }

      const session = await chatHistory.createChatSession(userId, title);
      res.json({ success: true, session });
    } catch (error) {
      console.error('Ошибка создания сессии:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Не удалось создать сессию' 
      });
    }
  });

  // Получение всех сессий пользователя (без параметра - для текущего пользователя)
  app.get('/api/chat/sessions', async (req, res) => {
    try {
      const userId = 1; // Временно используем фиксированный ID пользователя
      const sessions = await chatHistory.getUserChatSessions(userId);
      res.json({ success: true, sessions });
    } catch (error) {
      console.error('Ошибка получения сессий:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Не удалось получить сессии' 
      });
    }
  });

  // Удаление сессии чата
  app.delete('/api/chat/sessions/:sessionId', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      console.log(`🗑️ Запрос на удаление сессии ${sessionId}`);
      
      const deleteResult = await chatHistory.deleteSession(sessionId);
      
      if (deleteResult) {
        console.log(`✅ Сессия ${sessionId} успешно удалена с сервера`);
        res.json({ success: true, message: 'Сессия удалена' });
      } else {
        console.log(`⚠️ Сессия ${sessionId} не найдена или уже была удалена`);
        res.json({ success: true, message: 'Сессия уже была удалена' });
      }
    } catch (error) {
      console.error('❌ Ошибка удаления сессии:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Не удалось удалить сессию' 
      });
    }
  });

  // Получение всех сессий конкретного пользователя
  app.get('/api/chat/sessions/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const sessions = await chatHistory.getUserChatSessions(userId);
      res.json({ success: true, sessions });
    } catch (error) {
      console.error('Ошибка получения сессий:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Не удалось получить сессии' 
      });
    }
  });

  // Сохранение сообщения в сессию с автоматическим AI ответом
  app.post('/api/chat/sessions/:sessionId/messages', async (req, res) => {
    console.log('🚨🚨🚨 ВЫЗВАН ОБРАБОТЧИК /api/chat/sessions/:sessionId/messages');
    console.log('🚨 ЗАПРОС К /api/chat/sessions/:sessionId/messages');
    console.log('📝 Данные запроса:', req.body);
    console.log('🆔 ID сессии:', req.params.sessionId);
    try {
      const sessionId = parseInt(req.params.sessionId);
      const messageData = { 
        ...req.body, 
        sessionId,
        timestamp: new Date().toISOString()
      };
      
      console.log('💾 Подготовленные данные сообщения:', messageData);
      console.log('✅ Сохраняем сообщение пользователя');
      const userMessage = await chatHistory.saveMessage(messageData);
      
      // Если это сообщение от пользователя, получаем ответ AI
      if (messageData.sender === 'user') {
        console.log('🤖 Получаем ответ AI для сообщения:', messageData.content);
        try {
          // Очищаем кэш и загружаем модуль заново
          delete require.cache[require.resolve('./smart-router')];
          const smartRouter = require('./smart-router');
          const aiResponse = await smartRouter.getChatResponse(messageData.content, {
            userId: `session_${sessionId}`,
            sessionId: sessionId
          });
          
          console.log('🎯 AI ответил:', aiResponse);
          
          if (aiResponse && aiResponse.success) {
            // Формируем ответ для пользователя
            let responseContent = aiResponse.response;
            
            // Если это результат вышивки без текстового ответа
            if (!responseContent && aiResponse.embroideryGenerated && aiResponse.embroideryFiles) {
              responseContent = `🧵 Создана вышивка по вашему запросу!

✅ Изображение: готово
✅ Файл вышивки (DST): готов 
✅ Цветовая схема: готова

Файлы сохранены и готовы к использованию на вышивальной машине.`;
            }
            
            // Если все еще нет контента, используем fallback
            if (!responseContent) {
              responseContent = 'Запрос обработан успешно.';
            }
            
            // Сохраняем ответ AI в ту же сессию
            const aiMessageData = {
              sessionId,
              content: responseContent,
              sender: 'ai',
              provider: aiResponse.provider,
              timestamp: new Date().toISOString()
            };
            
            console.log('💾 Сохраняем ответ AI в БД:', aiMessageData);
            await chatHistory.saveMessage(aiMessageData);
            console.log('✅ Ответ AI успешно сохранен в сессию');
            
            // Отправляем ответ клиенту
            console.log('📤 Отправляем ответ клиенту');
            res.json({ 
              success: true, 
              message: userMessage,
              aiResponse: responseContent,
              provider: aiResponse.provider,
              files: aiResponse.embroideryFiles || aiResponse.files || null,
              details: aiResponse.details || null,
              embroideryGenerated: aiResponse.embroideryGenerated || false,
              imageGenerated: aiResponse.imageGenerated || false
            });
            return;
          } else {
            console.log('⚠️ AI не вернул ответ');
          }
        } catch (aiError) {
          console.error('❌ Ошибка получения ответа AI:', aiError);
        }
      }
      
      // Возвращаем успешный ответ с информацией об AI ответе
      res.json({ 
        success: true, 
        message: userMessage,
        hasAiResponse: messageData.sender === 'user'
      });
    } catch (error) {
      console.error('Ошибка сохранения сообщения:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Не удалось сохранить сообщение' 
      });
    }
  });

  // Сохранение сообщения с автоматическим AI ответом (старый путь)
  app.post('/api/chat/messages', async (req, res) => {
    console.log('🚨 СТАРАЯ СТРАНИЦА ИСПОЛЬЗУЕТ /api/chat/messages');
    console.log('📝 Данные запроса:', req.body);
    try {
      const messageData = req.body;
      console.log('💾 Сохраняем сообщение через старый путь:', messageData);
      const message = await chatHistory.saveMessage(messageData);
      
      // Если это сообщение от пользователя, получаем ответ AI
      if (messageData.sender === 'user') {
        console.log('🤖 Получаем ответ AI для сообщения:', messageData.content);
        try {
          const smartRouter = require('./smart-router');
          const conversationMemory = require('./conversation-memory');
          
          // Получаем контекст разговора с анализом намерений
          const userId = `session_${messageData.sessionId || 'default'}`;
          const contextInfo = conversationMemory.getMessageContext(userId, messageData.content);
          
          console.log('🧠 Анализ контекста:', {
            hasIntent: !!contextInfo.intent,
            isSearchQuery: contextInfo.intent?.isSearchQuery,
            location: contextInfo.intent?.location,
            contextLength: contextInfo.context?.length || 0
          });
          
          const aiResponse = await smartRouter.getChatResponse(messageData.content, {
            userId: userId,
            context: contextInfo.context,
            preferredProvider: contextInfo.currentProvider
          });
          
          console.log('🎯 AI ответил:', aiResponse);
          
          if (aiResponse && aiResponse.response) {
            // Делаем ссылки более компактными
            let processedResponse = aiResponse.response;
            
            // Заменяем длинные описания файлов на короткие
            processedResponse = processedResponse.replace(/🧵 \[Скачать файл вышивки \([^)]+\)\]/g, '🧵 [DST файл]');
            processedResponse = processedResponse.replace(/🖼️ \[Скачать подготовленное изображение \([^)]+\)\]/g, '🖼️ [PNG превью]');
            processedResponse = processedResponse.replace(/🎨 \[Скачать цветовую схему \([^)]+\)\]/g, '🎨 [JSON схема]');
            
            // Сохраняем ответ AI
            const aiMessageData = {
              ...messageData,
              content: processedResponse,
              sender: 'ai',
              provider: aiResponse.provider,
              timestamp: new Date().toISOString()
            };
            
            console.log('💾 Сохраняем ответ AI:', aiMessageData);
            await chatHistory.saveMessage(aiMessageData);
            console.log('✅ Ответ AI успешно сохранен в чат');
          }
        } catch (aiError) {
          console.error('❌ Ошибка получения ответа AI:', aiError);
        }
      }
      
      res.json({ success: true, message });
    } catch (error) {
      console.error('Ошибка сохранения сообщения:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Не удалось сохранить сообщение' 
      });
    }
  });

  // Получение сообщений сессии
  app.get('/api/chat/sessions/:sessionId/messages', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      console.log(`📋 Загружаем сообщения для сессии ${sessionId}...`);
      
      const messages = await chatHistory.getSessionMessages(sessionId);
      console.log(`✅ Найдено ${messages.length} сообщений для сессии ${sessionId}`);
      
      // Отключаем кэширование для этого API
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json({ success: true, messages });
    } catch (error) {
      console.error('Ошибка получения сообщений:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Не удалось получить сообщения' 
      });
    }
  });

  // API для простой авторизации
  const { users, messages } = require('@shared/schema');
  const { eq } = require('drizzle-orm');
  
  // Вход в систему
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Логин и пароль обязательны' 
        });
      }

      const { db } = require('./db');
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
        
      if (!user || user.password !== password) {
        return res.status(401).json({ 
          success: false, 
          error: 'Неверный логин или пароль' 
        });
      }
      
      // Генерируем простой токен
      const token = `${user.id}_${Date.now()}_${Math.random().toString(36)}`;
      
      // Обновляем токен в базе
      await db
        .update(users)
        .set({ token, isOnline: true })
        .where(eq(users.id, user.id));
      
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          token
        }
      });
    } catch (error) {
      console.error('Ошибка авторизации:', error);
      res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });
  
  // Выход из системы
  app.post('/api/auth/logout', async (req, res) => {
    try {
      const { token } = req.body;
      
      if (token) {
        const { db } = require('./db');
        await db
          .update(users)
          .set({ token: null, isOnline: false })
          .where(eq(users.token, token));
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Ошибка выхода:', error);
      res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });
  
  // Проверка токена
  app.get('/api/auth/user', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
      }

      const { db } = require('./db');
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.token, token));
        
      if (!user) {
        return res.status(401).json({ success: false, error: 'Недействительный токен' });
      }
      
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName
        }
      });
    } catch (error) {
      console.error('Ошибка проверки токена:', error);
      res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });

  // API для переписки между пользователями (импорт уже выше)
  
  // Отправка сообщения пользователю
  app.post('/api/messages', async (req, res) => {
    try {
      const { senderId, receiverId, text } = req.body;
      
      if (!senderId || !receiverId || !text) {
        return res.status(400).json({ 
          success: false, 
          error: 'senderId, receiverId и text обязательны' 
        });
      }

      const { db } = require('./db');
      const [message] = await db
        .insert(messages)
        .values({ senderId, receiverId, text })
        .returning();
        
      res.json({ success: true, message });
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      res.status(500).json({ success: false, error: 'Ошибка отправки сообщения' });
    }
  });
  
  // Получение переписки между пользователями
  app.get('/api/messages/:userId1/:userId2', async (req, res) => {
    try {
      const { userId1, userId2 } = req.params;
      const { db } = require('./db');
      const { or, and, eq, desc } = require('drizzle-orm');
      
      const conversation = await db
        .select()
        .from(messages)
        .where(
          or(
            and(eq(messages.senderId, parseInt(userId1)), eq(messages.receiverId, parseInt(userId2))),
            and(eq(messages.senderId, parseInt(userId2)), eq(messages.receiverId, parseInt(userId1)))
          )
        )
        .orderBy(desc(messages.timestamp));
        
      res.json({ success: true, messages: conversation });
    } catch (error) {
      console.error('Ошибка получения переписки:', error);
      res.status(500).json({ success: false, error: 'Ошибка получения переписки' });
    }
  });
  
  // Получение списка всех диалогов пользователя
  app.get('/api/conversations/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { db } = require('./db');
      const { or, eq, desc } = require('drizzle-orm');
      
      const conversations = await db
        .select()
        .from(messages)
        .where(
          or(
            eq(messages.senderId, parseInt(userId)),
            eq(messages.receiverId, parseInt(userId))
          )
        )
        .orderBy(desc(messages.timestamp));
        
      // Группируем по собеседникам для показа последних сообщений
      const conversationMap = new Map();
      conversations.forEach(msg => {
        const partnerId = msg.senderId === parseInt(userId) ? msg.receiverId : msg.senderId;
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            partnerId,
            lastMessage: msg,
            timestamp: msg.timestamp
          });
        }
      });
      
      res.json({ success: true, conversations: Array.from(conversationMap.values()) });
    } catch (error) {
      console.error('Ошибка получения диалогов:', error);
      res.status(500).json({ success: false, error: 'Ошибка получения диалогов' });
    }
  });
  
  // API для загрузки изображений
  const imageUpload = require('./image-upload');
  app.use('/api/upload', imageUpload);
  
  // Статический доступ к загруженным изображениям
  app.use('/uploads', (req, res, next) => {
    const uploadPath = path.join(process.cwd(), 'uploads');
    res.sendFile(req.path, { root: uploadPath }, (err) => {
      if (err) next('route');
    });
  });
  
  // Проверка работы Python провайдера через HTTP запрос (без запуска дублирующего процесса)
  (async () => {
    try {
      console.log('Проверка работоспособности Python G4F...');
      
      // Ждем 3 секунды чтобы основной G4F процесс успел запуститься
      setTimeout(async () => {
        try {
          const response = await fetch('http://localhost:5004/python/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'test' })
          });
          
          if (response.ok) {
            console.log('✅ Python G4F провайдер готов к работе');
          } else {
            console.warn('⚠️ Python G4F провайдер может работать некорректно');
          }
        } catch (error) {
          console.warn('⚠️ Python G4F провайдер недоступен:', error.message);
        }
      }, 3000);
    } catch (error) {
      console.error('❌ Ошибка при проверке Python G4F:', error);
    }
  })();
  
  // Вспомогательная функция для вызова G4F API
  async function callG4F(message: string, provider: string) {
    const startTime = Date.now();
    Logger.ai(`Начинаем AI запрос`, { provider, messageLength: message.length });
    
    try {
      // Получаем ответ от прямого провайдера
      const directAiProvider = require('./direct-ai-provider');
      
      // Если провайдер qwen, используем AItianhu который реализует доступ к Qwen AI
      // Если провайдер chatfree, используем наш локальный провайдер
      let actualProvider = provider;
      
      if (provider === 'qwen') {
        actualProvider = 'AItianhu';
      } else if (provider === 'claude') {
        // Используем Claude через Python G4F
        try {
          console.log(`Пробуем использовать Claude через Python G4F...`);
          const claudeProvider = require('./claude-provider');
          const claudeResponse = await claudeProvider.getClaudeResponse(message);
          
          if (claudeResponse.success) {
            const duration = Date.now() - startTime;
            Logger.success(`Claude ответил успешно`, { 
              duration: `${duration}ms`, 
              responseLength: claudeResponse.response?.length || 0 
            });
            return claudeResponse;
          } else {
            throw new Error(claudeResponse.error || 'Ошибка Claude');
          }
        } catch (error) {
          Logger.error(`Ошибка при использовании Claude`, error);
          actualProvider = 'AItianhu'; // Фолбэк на стабильный провайдер
        }
      } else if (provider === 'ollama') {
        // Используем Ollama через Python G4F
        try {
          console.log(`Пробуем использовать Ollama через Python G4F...`);
          const ollamaResponse = await pythonProviderRoutes.callPythonAI(message, 'Ollama');
          
          if (ollamaResponse) {
            return {
              success: true,
              response: ollamaResponse,
              provider: 'Ollama',
              model: 'llama3'
            };
          } else {
            throw new Error('Ollama не вернул ответ через Python G4F');
          }
        } catch (error) {
          console.error(`❌ Ошибка при использовании Ollama через Python:`, error);
          
          // Пробуем использовать локальный Ollama провайдер как запасной вариант
          try {
            const ollamaProvider = require('./ollama-provider');
            const isOllamaAvailable = await ollamaProvider.checkOllamaAvailability();
            
            if (isOllamaAvailable) {
              const ollamaDirectResponse = await ollamaProvider.getOllamaResponse(message);
              if (ollamaDirectResponse.success) {
                return ollamaDirectResponse;
              }
            }
          } catch (localError) {
            console.error(`❌ Локальный Ollama тоже недоступен:`, localError);
          }
          
          // Фолбэк на стабильный провайдер
          actualProvider = 'AItianhu';
        }
      } else if (provider === 'chatfree') {
        // Используем улучшенный провайдер для ChatFree с системой обхода блокировок
        try {
          const chatFreeImproved = require('./chatfree-improved');
          console.log(`Пробуем использовать улучшенную версию ChatFree...`);
          
          const chatFreeResponse = await chatFreeImproved.getChatFreeResponse(message, {
            systemPrompt: "Вы полезный ассистент. Отвечайте точно и по существу, используя дружелюбный тон."
          });
          
          if (chatFreeResponse.success) {
            console.log(`✅ Успешно получен ответ от улучшенного ChatFree провайдера`);
            return chatFreeResponse;
          } else {
            // Пробуем использовать простую версию как запасной вариант
            const simpleChatFree = require('./simple-chatfree');
            const simpleResponse = await simpleChatFree.getChatFreeResponse(message);
            
            if (simpleResponse.success) {
              console.log(`✅ Успешно получен ответ от простого ChatFree провайдера`);
              return simpleResponse;
            }
            
            throw new Error(chatFreeResponse.error || 'Ошибка ChatFree');
          }
        } catch (error) {
          console.error(`❌ Ошибка при использовании ChatFree:`, error);
          actualProvider = 'AItianhu'; // Фолбэк на стабильный провайдер
        }
      }
      
      // Получаем ответ
      const response = await directAiProvider.getChatResponse(message, { provider: actualProvider });
      
      return {
        success: true,
        response: response,
        provider: actualProvider
      };
    } catch (error) {
      console.error(`❌ Ошибка при вызове G4F:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }
  
  // API для конвертации изображений в SVG для печати
  app.post('/api/convert/svg-print', upload.single('image'), async (req, res) => {
    try {
      const { printType = 'both', designName } = req.body;
      const uploadedImage = req.file;
      
      if (!uploadedImage) {
        return res.status(400).json({ 
          success: false, 
          error: 'Изображение для конвертации не предоставлено' 
        });
      }

      // Используем новый продвинутый векторизатор вместо старого svg-print-converter
      const advancedVectorizer = require('../advanced-vectorizer.cjs');
      
      // Используем буфер изображения для обработки
      const baseName = designName || `uploaded-design-${Date.now()}`;
      
      console.log(`🎨 [SVG-CONVERT] Конвертируем загруженное изображение через продвинутый векторизатор`);
      
      // Определяем настройки на основе типа печати
      const quality = printType === 'high' ? 'premium' : 'standard';
      const optimizeFor = 'print';
      
      const result = await advancedVectorizer.professionalVectorize(
        uploadedImage.buffer,
        baseName,
        {
          quality,
          formats: ['svg'],
          optimizeFor,
          includeMetadata: true
        }
      );
      
      if (result.success) {
        res.json({
          success: true,
          message: 'Изображение успешно конвертировано в SVG через продвинутый векторизатор',
          svgContent: result.main.svgContent,
          detectedType: result.main.detectedType,
          quality: result.main.quality,
          optimization: result.optimization
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
      
    } catch (error) {
      console.error('Ошибка конвертации в SVG:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера при конвертации'
      });
    }
  });

  // API для работы с BOOOMERANGS AI интеграцией (с поддержкой Qwen и других провайдеров)
  app.post('/api/ai/chat', upload.single('image'), async (req, res) => {
    try {
      const { message, provider } = req.body;
      const uploadedImage = req.file;
      
      console.log(`🔍 Проверка загрузки: message="${message}", uploadedImage=${uploadedImage ? 'ЕСТЬ' : 'НЕТ'}`);
      
      if (!message && !uploadedImage) {
        return res.status(400).json({ 
          success: false, 
          error: 'Сообщение или изображение должны быть предоставлены' 
        });
      }

      // Если есть изображение, но нет сообщения, установим стандартный запрос
      let finalMessage = message || 'Анализируй это изображение и опиши что на нем видно';
      
      // Импортируем провайдер напрямую
      const directAiProvider = require('./direct-ai-provider');
      const { AI_PROVIDERS } = directAiProvider;
      
      // Импортируем Python провайдер
      const pythonProviderRoutes = require('./python_provider_routes');
      
      // 🧠 ДОБАВЛЯЕМ КОНТЕКСТ РАЗГОВОРА И АНАЛИЗ НАМЕРЕНИЙ
      console.log('🧠 [STREAM] === НАЧАЛО АНАЛИЗА КОНТЕКСТА ===');
      console.log('🧠 [STREAM] req.body:', JSON.stringify(req.body, null, 2));
      
      const conversationMemory = require('./conversation-memory');
      const userId = req.body.userId || `session_${req.body.sessionId || 'stream'}`;
      console.log('🧠 [STREAM] userId для контекста:', userId);
      
      // Получаем контекст разговора с анализом намерений
      console.log('🧠 [STREAM] Получаем контекст для сообщения:', finalMessage);
      const contextInfo = conversationMemory.getMessageContext(userId, finalMessage);
      
      console.log('🧠 [STREAM] ДЕТАЛЬНЫЙ анализ контекста:', {
        hasIntent: !!contextInfo.intent,
        intent: contextInfo.intent,
        isSearchQuery: contextInfo.intent?.isSearchQuery,
        location: contextInfo.intent?.location,
        contextLength: contextInfo.context?.length || 0,
        context: contextInfo.context?.substring(0, 200) + '...',
        messageHistory: contextInfo.messageHistory?.length || 0
      });

      // 🎨 АНАЛИЗ НАМЕРЕНИЙ ДЛЯ РЕДАКТИРОВАНИЯ ИЗОБРАЖЕНИЙ
      const smartRouter = require('./smart-router');
      const messageAnalysis = smartRouter.analyzeMessage(finalMessage);
      
      console.log('📝 [STREAM] Категория сообщения:', messageAnalysis.category);
      console.log('📝 [STREAM] Промпт для обработки:', messageAnalysis.prompt);

      // Ищем предыдущее изображение, если запрос — редактирование картинки
      let previousImage = null;
      if (messageAnalysis.category === 'image_edit') {
        console.log('🔍 [STREAM] Ищем предыдущее изображение для userId:', userId);
        const conversation = conversationMemory.getConversation(userId);
        console.log('💬 [STREAM] Получена беседа, сообщений в памяти:', conversation?.messages?.length || 0);
        previousImage = conversation.getLastImageInfo();
        console.log('🔄 [STREAM] Найдено предыдущее изображение:', previousImage ? 'ДА' : 'НЕТ');
        
        if (previousImage) {
          console.log('🎯 [STREAM] URL предыдущего изображения:', previousImage.url);
          console.log('🎯 [STREAM] Описание предыдущего изображения:', previousImage.description);
        } else {
          console.log('⚠️ [STREAM] Предыдущее изображение НЕ найдено - команда редактирования не может быть выполнена');
        }
      }
      
      // Используем сообщение с контекстом
      if (contextInfo.context && contextInfo.context.trim()) {
        const originalMessage = finalMessage;
        finalMessage = contextInfo.context + finalMessage;
        console.log('🧠 [STREAM] КОНТЕКСТ ДОБАВЛЕН!');
        console.log('🧠 [STREAM] Оригинальное сообщение:', originalMessage);
        console.log('🧠 [STREAM] Сообщение с контекстом:', finalMessage.substring(0, 300) + '...');
      } else {
        console.log('🧠 [STREAM] КОНТЕКСТ НЕ ДОБАВЛЕН - нет контекста или пустой');
      }
      console.log('🧠 [STREAM] === КОНЕЦ АНАЛИЗА КОНТЕКСТА ===');
      
      // Сначала создаем демо-ответ для запасного варианта
      const demoResponse = generateDemoResponse(finalMessage);
      
      // Определяем, какой провайдер использовать (всегда начинаем с лучшего)
      let selectedProvider = 'Qwen_Qwen_2_72B'; // Принудительно используем лучший провайдер
      
      console.log(`🔧 [PROVIDER] Исходный provider из запроса: "${provider}"`);
      console.log(`🔧 [PROVIDER] Наш selectedProvider: "${selectedProvider}"`);
      console.log(`🔧 [PROVIDER] Принудительно переопределяем на лучший провайдер!`);
      let base64Image = null;
      
      // Специальная обработка для изображений - используем мультимодальные провайдеры
      if (uploadedImage) {
        // Конвертируем изображение в base64 для передачи AI провайдерам
        base64Image = uploadedImage.buffer.toString('base64');
        const imageDataUrl = `data:${uploadedImage.mimetype};base64,${base64Image}`;
        
        // Для изображений используем специализированные провайдеры с поддержкой vision
        selectedProvider = 'multimodal'; // Принудительно используем мультимодальный провайдер
        
        finalMessage = `${finalMessage}\n\nИзображение для анализа: ${imageDataUrl}`;
        console.log(`🖼️ Обрабатываем изображение: ${uploadedImage.originalname} (${Math.round(uploadedImage.size / 1024)}KB)`);
      }
      
      // Автоматическое определение технических вопросов для перенаправления на DeepSpeek/Phind
      const techKeywords = [
        "код", "программирование", "javascript", "python", "java", "c++", "c#", 
        "coding", "programming", "code", "алгоритм", "algorithm", "функция", "function",
        "api", "сервер", "server", "backend", "frontend", "фронтенд", "бэкенд",
        "database", "база данных", "sql", "nosql", "json", "html", "css",
        "git", "github", "docker", "kubernetes", "devops"
      ];
      
      // Проверяем, является ли вопрос техническим
      const isTechnicalQuestion = techKeywords.some(keyword => finalMessage.toLowerCase().includes(keyword));
      
      // Специальная обработка для любых запросов с изображениями
      if (uploadedImage) {
        console.log(`🖼️ НАЙДЕНО ИЗОБРАЖЕНИЕ! Размер: ${uploadedImage.size} байт, тип: ${uploadedImage.mimetype}`);
        
        // Импортируем мультимодальный провайдер
        const multimodalProvider = require('./multimodal-provider');
        
        try {
          // Импортируем новый анализатор изображений
          const imageAnalyzer = require('./image-analyzer');
          
          console.log('🔍 Запускаем продвинутый анализ изображения...');
          
          // Используем буфер изображения для анализа
          const analysisResult = await imageAnalyzer.analyzeImage(uploadedImage.buffer, uploadedImage.originalname);
          
          const imageInfo = {
            filename: uploadedImage.originalname,
            size: Math.round(uploadedImage.size / 1024),
            type: uploadedImage.mimetype
          };

          const smartResponse = `🖼️ **AI Анализ изображения:**

📁 **Файл:** ${imageInfo.filename}
📏 **Размер:** ${imageInfo.size}KB
🎨 **Формат:** ${imageInfo.type.includes('jpeg') ? 'JPEG фотография' : imageInfo.type.includes('png') ? 'PNG изображение' : 'Графический файл'}

${analysisResult.success ? `🤖 **Описание содержимого:**
${analysisResult.description}

🔧 **Сервис:** ${analysisResult.service}
📊 **Точность:** ${Math.round(analysisResult.confidence * 100)}%` : `⚠️ **Анализ содержимого:**
${analysisResult.description}`}

${message ? `\n💭 **Ваш запрос:** ${message}` : ''}

*🚀 Анализ выполнен с помощью бесплатных AI сервисов!*`;

          return res.json({
            success: true,
            response: smartResponse,
            provider: analysisResult.success ? analysisResult.service : 'Fallback Analyzer',
            model: analysisResult.success ? `AI Vision (${Math.round(analysisResult.confidence * 100)}% точность)` : 'Local Analysis'
          });
        } catch (error) {
          console.error('❌ Ошибка анализа изображения:', error);
          // Продолжаем с обычными провайдерами
        }
      }

      // Для DeepSpeek используем оптимизированный подход с локальным ответом при необходимости
      if (provider === 'deepspeek') {
        console.log(`📊 Для DeepSpeek используем быстрый режим`);
        
        // Получаем функцию для генерации ответа от DeepSpeek
        const deepspeekProvider = require('./deepspeek-provider');
        
        // Вызываем функцию DeepSpeek для обработки запроса
        try {
          const deepspeekResponse = await deepspeekProvider.getDeepSpeekResponse(message);
          
          // Проверяем успешность ответа
          if (deepspeekResponse.success) {
            console.log(`✅ Успешно получен ответ от DeepSpeek`);
            
            return res.json({
              success: true,
              response: deepspeekResponse.response,
              provider: 'DeepSpeek',
              model: 'DeepSpeek AI'
            });
          } else {
            // В случае ошибки используем резервного провайдера
            throw new Error(deepspeekResponse.error || 'Ошибка DeepSpeek');
          }
        } catch (error) {
          console.error(`❌ Ошибка при использовании DeepSpeek:`, error);
          
          // Если DeepSpeek не сработал - используем Qwen/Phind как резерв
          selectedProvider = isTechnicalQuestion ? 'Phind' : 'AItianhu';
          console.log(`⚠️ DeepSpeek не сработал, переключаемся на ${selectedProvider}`);
        }
      }
      
      // Автоматическое определение технических запросов
      if (isTechnicalQuestion && !provider) {
        selectedProvider = 'Phind';
        console.log(`📊 Обнаружен технический вопрос, переключаемся на провайдер Phind`);
      }
      
      // Проверяем доступность Ollama как бесплатного локального провайдера
      if (!provider) {
        try {
          const ollamaProvider = require('./ollama-provider');
          const isOllamaAvailable = await ollamaProvider.checkOllamaAvailability();
          
          if (isOllamaAvailable) {
            console.log(`Обнаружен локальный Ollama, используем его как предпочтительный провайдер`);
            selectedProvider = 'Ollama';
          }
        } catch (error) {
          console.log(`Lokальный Ollama не обнаружен, используем стандартные провайдеры`);
        }
      }
      
      // Всегда пытаемся сначала использовать Python G4F сервер для любого запроса
      try {
        // Пытаемся получить ответ от Python провайдера с использованием callPythonAI
        console.log(`Пробуем использовать Python провайдер ${selectedProvider}...`);
        
        // Используем нашу новую функцию callPythonAI
        const aiResponse = await pythonProviderRoutes.callPythonAI(message, selectedProvider);
        
        if (aiResponse) {
          console.log(`✅ Успешно получен ответ от Python провайдера ${selectedProvider}`);
          
          // Определяем отображаемое имя модели
          let modelName = "AI";
          if (selectedProvider.includes('Qwen') || selectedProvider === 'AItianhu') {
            modelName = "Qwen AI";
          } else if (selectedProvider === 'Phind') {
            modelName = "Phind AI";
          } else {
            modelName = selectedProvider;
          }
            
          return res.json({
            success: true,
            response: aiResponse,
            provider: selectedProvider,
            model: modelName
          });
        }
      } catch (pythonError) {
        console.log(`❌ Ошибка при использовании Python провайдера:`, 
                  pythonError instanceof Error ? pythonError.message : 'Неизвестная ошибка');
        // Продолжаем выполнение и пробуем другие провайдеры
      }
      
      // Если указан стандартный провайдер, пытаемся использовать его
      if (provider && AI_PROVIDERS && AI_PROVIDERS[provider]) {
        try {
          // Получаем информацию о выбранном провайдере
          const selectedProvider = AI_PROVIDERS[provider];
          console.log(`Пробуем использовать провайдер ${selectedProvider.name} (${provider})...`);
          
          // Для демо-режима мы уже возвращаем демо-ответ
          if (provider === 'DEMO') {
            return res.json({
              success: true,
              response: demoResponse,
              provider: 'BOOOMERANGS-Demo',
              model: 'demo-mode'
            });
          }
          
          // Создаем таймаут для ограничения времени ожидания ответа
          const timeout = 3000; // 3 секунды максимум на ответ
          
          // Готовим запрос к выбранному провайдеру
          const requestData = selectedProvider.prepareRequest(message);
          
          // Создаем обработчик запроса с таймаутом
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const fetchPromise = fetch(selectedProvider.url, {
              method: 'POST',
              headers: selectedProvider.headers || { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestData),
              signal: controller.signal
            });
            
            // Запускаем запрос с ограничением по времени
            const fetchWithTimeout = Promise.race([
              fetchPromise,
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Таймаут запроса (${timeout}ms)`)), timeout)
              )
            ]);
            
            // Устанавливаем таймер для возврата демо-ответа
            let responseTimedOut = false;
            const responseTimer = setTimeout(() => {
              responseTimedOut = true;
              console.log(`Превышено время ожидания ответа от ${selectedProvider.name}, возвращаем демо-ответ`);
              return res.json({
                success: true,
                response: demoResponse,
                provider: 'BOOOMERANGS-Live',
                model: 'instant-response'
              });
            }, timeout);
            
            // Пытаемся получить ответ от провайдера
            fetchWithTimeout
              .then(async (response: any) => {
                // Очищаем таймер для AbortController
                clearTimeout(timeoutId);
                
                // Если уже отправили демо-ответ из-за таймаута, не выполняем дальнейшую обработку
                if (responseTimedOut) return;
                
                // Очищаем таймер
                clearTimeout(responseTimer);
                
                if (!response.ok) {
                  throw new Error(`Ошибка HTTP: ${response.status}`);
                }
                
                try {
                  // Извлекаем ответ из ответа API
                  const responseText = await selectedProvider.extractResponse(response);
                  
                  console.log(`✅ Успешно получен ответ от ${selectedProvider.name}`);
                  
                  // Отправляем реальный ответ от провайдера
                  return res.json({
                    success: true,
                    response: responseText,
                    provider: selectedProvider.name,
                    model: provider
                  });
                } catch (extractError) {
                  console.log(`Ошибка при извлечении ответа от ${selectedProvider.name}:`, 
                              extractError instanceof Error ? extractError.message : 'Неизвестная ошибка');
                  
                  // В случае ошибки извлечения отправляем демо-ответ
                  return res.json({
                    success: true,
                    response: demoResponse,
                    provider: 'BOOOMERANGS-Live',
                    model: 'instant-response'
                  });
                }
              })
              .catch((error) => {
                // Очищаем таймер для AbortController
                clearTimeout(timeoutId);
                
                // Если уже отправили демо-ответ из-за таймаута, не выполняем дальнейшую обработку
                if (responseTimedOut) return;
                
                // Очищаем таймер
                clearTimeout(responseTimer);
                
                console.log(`❌ Ошибка при запросе к ${selectedProvider.name}:`, 
                            error instanceof Error ? error.message : 'Неизвестная ошибка');
                
                // В случае ошибки отправляем демо-ответ
                return res.json({
                  success: true,
                  response: demoResponse,
                  provider: 'BOOOMERANGS-Live',
                  model: 'instant-response'
                });
              });
            
            // Завершаем функцию без явного return, т.к. ответ будет отправлен в обработчиках промисов
            return;
          } catch (fetchError) {
            console.log(`❌ Ошибка при создании запроса к ${selectedProvider.name}:`, 
                      fetchError instanceof Error ? fetchError.message : 'Неизвестная ошибка');
            
            // Продолжаем выполнение и отправляем демо-ответ
          }
        } catch (error) {
          console.log(`Ошибка при подготовке запроса к провайдеру ${provider}:`, 
                    error instanceof Error ? error.message : 'Неизвестная ошибка');
          
          // Продолжаем выполнение и отправляем демо-ответ
        }
      }
      
      // Мгновенно возвращаем демо-ответ
      return res.json({
        success: true,
        response: demoResponse,
        provider: 'BOOOMERANGS-Live',
        model: 'instant-response'
      });
      
    } catch (error) {
      console.error('Ошибка при обработке запроса:', error);
      
      // Используем заглушку в случае любой ошибки
      return res.json({
        success: true,
        response: "Я BOOOMERANGS AI ассистент. Чем могу помочь?",
        provider: 'BOOOMERANGS-Fallback',
        model: 'error-recovery'
      });
    }
  });
  
  // Функция для генерации демо-ответов
  function generateDemoResponse(message: string) {
    const lowerMessage = message.toLowerCase();
    let response;
    
    if (lowerMessage.includes('привет') || lowerMessage.includes('здравствуй')) {
      response = 'Привет! Я ассистент BOOOMERANGS. Чем могу помочь?';
    } else if (lowerMessage.includes('как дела') || lowerMessage.includes('как ты')) {
      response = 'У меня всё отлично! А как ваши дела?';
    } else if (lowerMessage.includes('изображени') || lowerMessage.includes('картинк')) {
      response = 'Если вы хотите создать изображение, перейдите на вкладку "Генератор Изображений" в верхней части страницы.';
    } else if (lowerMessage.includes('booomerangs')) {
      response = 'BOOOMERANGS - это мультимодальный AI-сервис для общения и создания изображений без API-ключей.';
    } else {
      const backupResponses = [
        `Спасибо за ваш вопрос! BOOOMERANGS предоставляет доступ к AI моделям без необходимости платных API ключей.`,
        `Интересный вопрос! BOOOMERANGS позволяет генерировать тексты и изображения бесплатно через интерфейс браузера.`,
        `BOOOMERANGS - это инновационный инструмент для работы с искусственным интеллектом без платных подписок.`
      ];
      response = backupResponses[Math.floor(Math.random() * backupResponses.length)];
    }
    
    return {
      response,
      provider: 'BOOOMERANGS-Demo',
      model: 'demo-mode'
    };
  }

  // Streaming API endpoint для потоковой генерации - используем streaming-routes.js
  const streamingHandler = require('./streaming-routes');
  app.post("/api/stream", streamingHandler);

  // API для просмотра логов системы
  app.get('/api/logs/recent', (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = logger.getRecentLogs(limit);
      res.json({ success: true, logs });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Ошибка получения логов' });
    }
  });

  app.get('/api/logs/session/:sessionId', (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const logs = logger.getSessionLogs(sessionId);
      res.json({ success: true, logs, sessionId });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Ошибка получения логов сессии' });
    }
  });

  app.get('/api/logs/category/:category', (req, res) => {
    try {
      const category = req.params.category;
      const logs = logger.getCategoryLogs(category);
      res.json({ success: true, logs, category });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Ошибка получения логов категории' });
    }
  });

  app.get('/api/logs/stats', (req, res) => {
    try {
      const stats = logger.getStats();
      res.json({ success: true, stats });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Ошибка получения статистики логов' });
    }
  });

  app.delete('/api/logs', (req, res) => {
    try {
      logger.clearLogs();
      res.json({ success: true, message: 'Логи очищены' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Ошибка очистки логов' });
    }
  });

  // Подключаем маршруты продвинутого векторизатора - временно отключено из-за ES6 модулей
  // const advancedVectorizerRoutes = require('./advanced-vectorizer-routes');
  // app.use('/api/vectorizer', advancedVectorizerRoutes);
  Logger.info('Подключены маршруты продвинутого векторизатора: /api/vectorizer');

  // Обновляем вызовы генерации изображений для передачи sessionId и userId
  const originalSmartRouter = require('./smart-router');
  
  return httpServer;
}
