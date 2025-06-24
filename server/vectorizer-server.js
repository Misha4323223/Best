/**
 * Standalone сервер векторизатора изображений
 * Работает на порту 3001, изолированно от основного приложения
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Определяем порт для векторизатора
const PORT = process.env.VECTORIZER_PORT || 5006;

// Настройка детального логирования в файл
const logFile = '/tmp/vectorizer-detailed.log';
const logStream = fs.createWriteStream(logFile, { flags: 'w' });

function detailedLog(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${type}] ${message}\n`;
  
  // Пишем в файл
  logStream.write(logEntry);
  
  // Также выводим в консоль
  console.log(`${message}`);
}

function logError(message, error = null) {
  const timestamp = new Date().toISOString();
  let logEntry = `[${timestamp}] [ERROR] ${message}\n`;
  
  if (error) {
    logEntry += `[${timestamp}] [ERROR] Stack: ${error.stack}\n`;
    logEntry += `[${timestamp}] [ERROR] Message: ${error.message}\n`;
    logEntry += `[${timestamp}] [ERROR] Type: ${error.constructor.name}\n`;
    logEntry += `[${timestamp}] [ERROR] Code: ${error.code}\n`;
    logEntry += `[${timestamp}] [ERROR] Errno: ${error.errno}\n`;
  }
  
  logStream.write(logEntry);
  console.error(message);
  if (error) {
    console.error('Stack:', error.stack);
  }
}

// Добавляем обработчики всех критических событий процесса
function setupProcessEventHandlers() {
  detailedLog('🔧 Настройка обработчиков критических событий процесса...');
  
  process.on('uncaughtException', (error) => {
    logError('🚨 КРИТИЧЕСКАЯ ОШИБКА: Необработанное исключение', error);
    logError('🔍 Process exit с кодом 1 из-за uncaughtException');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logError('🚨 КРИТИЧЕСКАЯ ОШИБКА: Необработанное отклонение Promise', reason);
    logError(`🔍 Promise: ${promise}`);
    logError('🔍 Process exit с кодом 1 из-за unhandledRejection');
    process.exit(1);
  });

  process.on('beforeExit', (code) => {
    detailedLog(`🚨 Process beforeExit event с кодом: ${code}`);
  });

  process.on('exit', (code) => {
    detailedLog(`🚨 Process exit event с кодом: ${code}`);
  });

  process.on('SIGTERM', () => {
    detailedLog('🚨 Получен сигнал SIGTERM');
    detailedLog('🔍 Graceful shutdown...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    detailedLog('🚨 Получен сигнал SIGINT (Ctrl+C)');
    detailedLog('🔍 Graceful shutdown...');
    process.exit(0);
  });

  process.on('SIGHUP', () => {
    detailedLog('🚨 Получен сигнал SIGHUP');
  });

  process.on('warning', (warning) => {
    logError('⚠️ Node.js предупреждение', warning);
  });

  detailedLog('✅ Все обработчики событий процесса установлены');
}

// Глубокая диагностика системы
function logSystemState(reason = 'periodic') {
  const timestamp = new Date().toISOString();
  const mem = process.memoryUsage();
  const handles = process._getActiveHandles();
  const requests = process._getActiveRequests();
  
  let logEntry = `[${timestamp}] [SYSTEM] === SYSTEM STATE (${reason}) ===\n`;
  logEntry += `[${timestamp}] [SYSTEM] PID: ${process.pid}\n`;
  logEntry += `[${timestamp}] [SYSTEM] Uptime: ${process.uptime()}s\n`;
  logEntry += `[${timestamp}] [SYSTEM] Memory RSS: ${Math.round(mem.rss/1024/1024)}MB\n`;
  logEntry += `[${timestamp}] [SYSTEM] Memory HeapUsed: ${Math.round(mem.heapUsed/1024/1024)}MB\n`;
  logEntry += `[${timestamp}] [SYSTEM] Memory HeapTotal: ${Math.round(mem.heapTotal/1024/1024)}MB\n`;
  logEntry += `[${timestamp}] [SYSTEM] Memory External: ${Math.round(mem.external/1024/1024)}MB\n`;
  logEntry += `[${timestamp}] [SYSTEM] Active Handles: ${handles.length}\n`;
  logEntry += `[${timestamp}] [SYSTEM] Active Requests: ${requests.length}\n`;
  logEntry += `[${timestamp}] [SYSTEM] Event Loop Delay: ${process.hrtime.bigint()}\n`;
  
  // Детали активных handles (ограничиваем до 5)
  handles.slice(0, 5).forEach((handle, index) => {
    if (handle && handle.constructor) {
      logEntry += `[${timestamp}] [SYSTEM] Handle ${index}: ${handle.constructor.name}\n`;
    }
  });
  if (handles.length > 5) {
    logEntry += `[${timestamp}] [SYSTEM] ... и еще ${handles.length - 5} handles\n`;
  }
  
  logStream.write(logEntry);
  detailedLog(`SYSTEM STATE: PID=${process.pid}, Handles=${handles.length}, Memory=${Math.round(mem.heapUsed/1024/1024)}MB`, 'SYSTEM');
}

// Ленивая загрузка векторизатора для предотвращения блокировки Event Loop
function createLazyVectorizerRouter() {
  const router = express.Router();
  let realRoutes = null;
  
  // Middleware для ленивой загрузки
  router.use(async (req, res, next) => {
    if (!realRoutes) {
      try {
        detailedLog('🔄 Первый запрос - загружаем vectorizer routes...');
        const module = await import('./advanced-vectorizer-routes.js');
        realRoutes = module.default;
        detailedLog('  ✅ Vectorizer routes загружены по требованию');
      } catch (error) {
        logError('❌ ОШИБКА ленивой загрузки vectorizer routes', error);
        return res.status(500).json({ error: 'Vectorizer temporarily unavailable' });
      }
    }
    
    // Перенаправляем на реальный роутер
    realRoutes(req, res, next);
  });
  
  return router;
}

detailedLog('🚀 VECTORIZER SERVER STARTUP INITIATED');
detailedLog('📁 Log file created: ' + logFile);

// Асинхронная функция запуска сервера с ленивой загрузкой
async function startVectorizerServer() {
  // Откладываем загрузку тяжелых модулей до первого запроса
  let vectorizerRoutes;
  try {
    detailedLog('🔍 Подготовка ленивой загрузки vectorizer routes...');
    // Создаем lightweight роутер который загружает модули по требованию
    vectorizerRoutes = createLazyVectorizerRouter();
    detailedLog('  ✓ Lazy vectorizer router создан');
  } catch (error) {
    logError('❌ ОШИБКА создания lazy router', error);
    process.exit(1);
  }

  // Детальное логирование для диагностики
  detailedLog('🔍 Диагностика запуска векторизатора:');
  detailedLog('  ✓ Express импортирован');
  detailedLog('  ✓ CORS импортирован');
  detailedLog(`  ✓ Порт: ${PORT}`);
  detailedLog('  ✓ __dirname: ' + __dirname);

  // Настройка детального логирования критических событий
  setupProcessEventHandlers();
  logSystemState('startup');

  // Создание Express приложения с детальным логированием
  detailedLog('🔧 Создание Express приложения...');
  let app;
  try {
    app = express();
    detailedLog('  ✅ Express приложение создано успешно');
  } catch (error) {
    logError('❌ ОШИБКА создания Express приложения', error);
    process.exit(1);
  }

  // Настройка CORS с детальным логированием
  detailedLog('🔧 Настройка CORS middleware...');
  try {
    app.use(cors({
      origin: ['http://localhost:3001', 'http://localhost:5000', 'http://localhost:3000', /\.replit\.app$/],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));
    detailedLog('  ✅ CORS middleware настроен успешно');
  } catch (error) {
    logError('❌ ОШИБКА настройки CORS', error);
    process.exit(1);
  }

  // Настройка middleware с оптимизированными лимитами
  detailedLog('🔧 Настройка middleware для парсинга данных...');
  try {
    app.use(express.json({ limit: '30mb' }));
    detailedLog('  ✅ JSON middleware настроен (лимит: 30mb)');
    
    app.use(express.urlencoded({ extended: true, limit: '30mb' }));
    detailedLog('  ✅ URL-encoded middleware настроен (лимит: 30mb)');
  } catch (error) {
    logError('❌ ОШИБКА настройки middleware', error);
    process.exit(1);
  }

  // Статическая раздача с детальным логированием
  detailedLog('🔧 Настройка статической раздачи файлов...');
  try {
    const outputPath = path.join(__dirname, '..', 'output');
    app.use('/output', express.static(outputPath));
    detailedLog(`  ✅ Статическая раздача настроена: ${outputPath}`);
  } catch (error) {
    logError('❌ ОШИБКА настройки статической раздачи', error);
    process.exit(1);
  }

  // Middleware для логирования запросов с детальным отслеживанием
  detailedLog('🔧 Настройка middleware для логирования запросов...');
  try {
    app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      detailedLog(`[REQUEST] ${req.method} ${req.path} - ${req.ip || 'unknown'}`);
      
      // Логируем завершение запроса
      res.on('finish', () => {
        detailedLog(`[RESPONSE] ${req.method} ${req.path} - ${res.statusCode}`);
      });
      
      next();
    });
    detailedLog('  ✅ Request logging middleware настроен');
  } catch (error) {
    logError('❌ ОШИБКА настройки request logging middleware', error);
    process.exit(1);
  }

  // Подключение маршрутов векторизатора с детальным логированием
  detailedLog('🔧 Подключение маршрутов векторизатора...');
  try {
    app.use('/api/vectorizer', vectorizerRoutes);
    detailedLog('  ✅ Маршруты векторизатора подключены к /api/vectorizer');
  } catch (error) {
    logError('❌ ОШИБКА подключения маршрутов векторизатора', error);
    process.exit(1);
  }

// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'vectorizer-server',
    port: PORT,
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/vectorizer/analyze',
      '/api/vectorizer/convert',
      '/api/vectorizer/professional',
      '/api/vectorizer/batch',
      '/api/vectorizer/previews',
      '/api/vectorizer/multi-format',
      '/api/vectorizer/formats',
      '/api/vectorizer/health'
    ]
  });
});

// Информация о сервисе
app.get('/', (req, res) => {
  res.json({
    name: 'BOOOMERANGS AI - Vectorizer Service',
    description: 'Продвинутая векторизация изображений в SVG/EPS/PDF форматы',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      health: '/health',
      api: '/api/vectorizer/*',
      output: '/output/*'
    }
  });
});

// Обработка 404 ошибок
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Path ${req.path} не существует в векторизаторе`,
    availableEndpoints: [
      '/health',
      '/api/vectorizer/*'
    ]
  });
});

// Глобальная обработка ошибок
app.use((err, req, res, next) => {
  console.error('Vectorizer Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Внутренняя ошибка сервера векторизации',
    timestamp: new Date().toISOString()
  });
});

  // Запуск сервера с максимально детальным логированием
  detailedLog(`🚀 Попытка запуска сервера на порту ${PORT}...`);
  
  let server;
  try {
    server = app.listen(PORT, '0.0.0.0', () => {
      detailedLog(`✅ Сервер успешно запущен на порту ${PORT}`);
      detailedLog(`📍 API доступен по адресу: http://localhost:${PORT}/api/vectorizer`);
      detailedLog(`🏥 Health check: http://localhost:${PORT}/health`);
      detailedLog(`📁 Output files: http://localhost:${PORT}/output`);
      detailedLog(`⏰ Время запуска: ${new Date().toISOString()}`);
      detailedLog(`✅ Векторизатор полностью инициализирован и готов к работе`);
      
      // Логируем состояние после успешного запуска
      logSystemState('after_startup');
    });
    
    // Обработчик ошибок сервера
    server.on('error', (error) => {
      logError('🚨 КРИТИЧЕСКАЯ ОШИБКА СЕРВЕРА', error);
      if (error.code === 'EADDRINUSE') {
        logError(`❌ Порт ${PORT} уже используется другим процессом`);
      } else if (error.code === 'EACCES') {
        logError(`❌ Нет прав доступа к порту ${PORT}`);
      }
      process.exit(1);
    });
    
    // Обработчик закрытия сервера
    server.on('close', () => {
      detailedLog('🚨 Сервер закрыт');
    });
    
  } catch (error) {
    logError('🚨 КРИТИЧЕСКАЯ ОШИБКА при запуске сервера', error);
    process.exit(1);
  }

  // Убираем периодическое логирование - оно блокирует Event Loop
  
  // Убираем heartbeat интервал - основная причина блокировки Event Loop
  
  // HTTP сервер сам поддерживает процесс активным
  
  
  // Обработчики завершения без интервалов
  const cleanupAndExit = (code = 0) => {
    detailedLog(`🧹 Graceful shutdown...`);
    if (server.listening) {
      server.close(() => {
        detailedLog('  ✓ HTTP сервер закрыт');
        process.exit(code);
      });
    } else {
      process.exit(code);
    }
  };
  
  // Устанавливаем обработчики сигналов только один раз
  if (!process.listenerCount('SIGTERM')) {
    process.on('SIGTERM', () => {
      console.log('📥 Получен SIGTERM, завершаем работу...');
      cleanupAndExit(0);
    });
  }
  
  if (!process.listenerCount('SIGINT')) {
    process.on('SIGINT', () => {
      console.log('📥 Получен SIGINT, завершаем работу...');
      cleanupAndExit(0);
    });
  }

  // Упрощенные обработчики серверных событий
  server.on('error', (error) => {
    console.error('❌ Server Error:', error.message);
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} уже используется`);
      process.exit(1);
    }
  });

  server.on('close', () => {
    detailedLog('🛑 Сервер закрыт');
  });

  detailedLog('✅ Векторизатор полностью инициализирован и готов к работе');
}

// Запуск сервера
startVectorizerServer().catch(error => {
  logError('❌ КРИТИЧЕСКАЯ ОШИБКА запуска сервера', error);
  process.exit(1);
});
