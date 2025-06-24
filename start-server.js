#!/usr/bin/env node

/**
 * Запуск сервера с системой чекпоинтов
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Запуск сервера с фоновой системой чекпоинтов...');

// Устанавливаем переменные окружения
process.env.NODE_ENV = 'development';
process.env.PORT = process.env.PORT || '5000';

// Запускаем сервер через tsx
const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: process.env
});

serverProcess.on('error', (error) => {
  console.error('❌ Ошибка запуска сервера:', error);
  process.exit(1);
});

serverProcess.on('close', (code) => {
  console.log(`📋 Сервер завершен с кодом ${code}`);
  process.exit(code);
});

// Обработка сигналов для корректного завершения
process.on('SIGINT', () => {
  console.log('\n🔄 Получен сигнал SIGINT, завершаем сервер...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🔄 Получен сигнал SIGTERM, завершаем сервер...');
  serverProcess.kill('SIGTERM');
});