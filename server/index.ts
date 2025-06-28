import 'dotenv/config';

console.log(process.env.DATABASE_URL);

import express, { type Request, Response, NextFunction } from "express";
// Этот импорт вызывает ошибку из-за неверного форматирования в deepspeek-provider.js
// Отключаем прямой импорт проблемного файла
process.env.SKIP_DEEPSPEEK_ORIGINAL = 'true';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from 'cors';

// Убираем избыточный мониторинг - он может вызывать дисконнекты

// Инициализируем векторизатор-менеджер (lazy loading)
let vectorizerManager: any = null;
try {
  const { createRequire } = require('module');
  const customRequire = createRequire(import.meta.url);
  vectorizerManager = customRequire('./vectorizer-manager');
  log('Vectorizer Manager initialized');
} catch (error) {
  log('Vectorizer Manager initialization deferred');
}

const app = express();

// Настройки для предотвращения дисконнектов
app.use((req, res, next) => {
  // Keep-alive headers для стабильности соединения  
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=300, max=100');
  next();
});

app.use(cors()); // Разрешаем CORS для всех маршрутов
app.use(express.json({ limit: '50mb' })); // Увеличиваем лимит для больших запросов
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Статическая раздача загруженных файлов
app.use('/uploads', express.static('uploads'));
app.use('/public', express.static('public'));
app.use('/output', express.static('output'));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Используем переменную окружения PORT если она доступна, иначе 5000
  // Это критично для правильной работы в окружении Replit
  const PORT = process.env.PORT || 5000;
  
  // Настройки keep-alive для HTTP сервера
  server.keepAliveTimeout = 300000; // 5 минут
  server.headersTimeout = 310000; // 5 минут 10 секунд
  
  server.listen({
    port: PORT,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${PORT}`);
  });
  
  // Обработка неожиданных отключений
  server.on('clientError', (err, socket) => {
    console.error('Client error:', err);
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });
  
  server.on('error', (err) => {
    console.error('Server error:', err);
  });
})();
