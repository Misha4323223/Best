/**
 * Минимальный тест векторизатора для изоляции проблемы
 */

import express from 'express';

console.log('🧪 Минимальный тест векторизатора запущен');

const app = express();
const PORT = 3001;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Тестовый сервер на порту ${PORT}`);
});

// Добавляем keep-alive механизм
const keepAlive = setInterval(() => {
  console.log('💓 Keep-alive ping');
}, 5000);

process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  clearInterval(keepAlive);
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received');
  clearInterval(keepAlive);
  server.close(() => process.exit(0));
});

console.log('🔒 Минимальный сервер готов');