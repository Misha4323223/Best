#!/usr/bin/env node
/**
 * Standalone запуск векторизатора
 * Используется для тестирования и автономной работы
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎨 Запуск BOOOMERANGS AI Vectorizer Server...');

const vectorizerPath = path.join(__dirname, 'server', 'imagetracer-vectorizer.js');

// Этап 2: Добавляем флаги Node.js для максимальной диагностики
const nodeFlags = [
  '--trace-warnings',           // Показать все предупреждения
  '--trace-uncaught',          // Трассировка необработанных исключений  
  '--trace-exit',              // Трассировка exit events
  '--trace-sigint',            // Трассировка SIGINT
  '--max-old-space-size=512',  // Ограничение памяти для контроля
  '--report-uncaught-exception', // Детальные отчеты об ошибках
  vectorizerPath
];

console.log('🔍 Запуск с диагностическими флагами для точного определения ошибки');

const vectorizer = spawn('node', nodeFlags, {
  stdio: 'inherit',
  env: {
    ...process.env,
    VECTORIZER_PORT: process.env.VECTORIZER_PORT || '3005',
    NODE_ENV: 'development',
    DEBUG: '*'
  }
});

vectorizer.on('error', (error) => {
  console.error('❌ Ошибка запуска векторизатора:', error);
  process.exit(1);
});

vectorizer.on('close', (code) => {
  console.log(`🛑 Vectorizer Server завершен с кодом ${code}`);
  process.exit(code);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Получен SIGTERM, завершение векторизатора...');
  vectorizer.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Получен SIGINT, завершение векторизатора...');
  vectorizer.kill('SIGINT');
});