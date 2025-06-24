/**
 * Упрощенный стабильный сервер векторизатора
 * Работает на порту 3001, минимальная конфигурация
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Запуск упрощенного векторизатора...');

// Импортируем маршруты векторизатора
let vectorizerRoutes;
try {
  console.log('📥 Загрузка vectorizer routes...');
  vectorizerRoutes = await import('./advanced-vectorizer-routes.js');
  vectorizerRoutes = vectorizerRoutes.default;
  console.log('✅ Vectorizer routes загружены');
} catch (error) {
  console.error('❌ Ошибка загрузки routes:', error.message);
  process.exit(1);
}

const app = express();
const PORT = process.env.VECTORIZER_PORT || 3001;

// CORS
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:5000', 'http://localhost:3000', /\.replit\.app$/],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Статические файлы
app.use('/output', express.static(path.join(__dirname, '..', 'output')));

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Маршруты векторизатора
app.use('/api/vectorizer', vectorizerRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'vectorizer-server',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Главная страница
app.get('/', (req, res) => {
  res.json({
    name: 'BOOOMERANGS AI - Vectorizer Service',
    description: 'Векторизация изображений в SVG/EPS/PDF форматы',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      health: '/health',
      api: '/api/vectorizer/*',
      output: '/output/*'
    }
  });
});

// 404 обработка
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Path ${req.path} не существует`,
    availableEndpoints: ['/health', '/api/vectorizer/*']
  });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Запуск сервера
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Vectorizer Server запущен на порту ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api/vectorizer`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`📁 Output: http://localhost:${PORT}/output`);
});

// Простая обработка завершения
process.on('SIGTERM', () => {
  console.log('📥 SIGTERM получен, завершение...');
  server.close(() => {
    console.log('✅ Сервер закрыт');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📥 SIGINT получен, завершение...');
  server.close(() => {
    console.log('✅ Сервер закрыт');
    process.exit(0);
  });
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

console.log('🔒 Векторизатор готов к работе');