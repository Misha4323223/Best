#!/usr/bin/env node

/**
 * Автоматический перезапуск серверов
 * Перезапускает векторизатор и основной сервер
 */

import { spawn, exec } from 'child_process';
import util from 'util';
const execAsync = util.promisify(exec);

async function killProcesses(pattern) {
  try {
    await execAsync(`pkill -f "${pattern}"`);
    console.log(`✅ Остановлены процессы: ${pattern}`);
  } catch (error) {
    // pkill возвращает код 1 если процессы не найдены, это нормально
    console.log(`ℹ️ Процессы ${pattern} не найдены или уже остановлены`);
  }
}

async function waitForPort(port, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { stdout } = await execAsync(`curl -s http://localhost:${port}/health || curl -s http://localhost:${port}/api/vectorizer/health`);
      if (stdout) {
        console.log(`✅ Порт ${port} доступен`);
        return true;
      }
    } catch (error) {
      // Порт еще не доступен
    }
    
    console.log(`⏳ Ожидание порта ${port}... (${i + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`❌ Порт ${port} не стал доступен`);
  return false;
}

async function restartVectorizer() {
  console.log('🔄 Перезапуск векторизатора...');
  
  // Останавливаем векторизатор
  await killProcesses('vectorizer-server');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Запускаем векторизатор
  const vectorizerProcess = spawn('node', ['server/vectorizer-server.js'], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, VECTORIZER_PORT: '5006' }
  });
  
  vectorizerProcess.unref();
  
  console.log('🚀 Векторизатор запущен, PID:', vectorizerProcess.pid);
  
  // Ждем готовности
  const ready = await waitForPort(5006);
  if (ready) {
    console.log('✅ Векторизатор готов на порту 5006');
  }
  
  return ready;
}

async function restartMainServer() {
  console.log('🔄 Перезапуск основного сервера...');
  
  // Останавливаем основной сервер
  await killProcesses('npm.*dev|tsx.*index');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Запускаем основной сервер
  const mainProcess = spawn('npm', ['run', 'dev'], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  mainProcess.unref();
  
  console.log('🚀 Основной сервер запущен, PID:', mainProcess.pid);
  
  // Ждем готовности
  const ready = await waitForPort(5000);
  if (ready) {
    console.log('✅ Основной сервер готов на порту 5000');
  }
  
  return ready;
}

async function restartAll() {
  console.log('🔄 ===== АВТОМАТИЧЕСКИЙ ПЕРЕЗАПУСК СЕРВЕРОВ =====');
  
  try {
    // Перезапускаем векторизатор
    const vectorizerOk = await restartVectorizer();
    
    // Перезапускаем основной сервер (если нужно)
    // const mainServerOk = await restartMainServer();
    
    console.log('🎉 ===== ПЕРЕЗАПУСК ЗАВЕРШЕН =====');
    console.log(`Векторизатор: ${vectorizerOk ? '✅ Работает' : '❌ Ошибка'}`);
    // console.log(`Основной сервер: ${mainServerOk ? '✅ Работает' : '❌ Ошибка'}`);
    
    if (vectorizerOk) {
      console.log('🚀 Системы готовы к работе!');
      console.log('📝 Команда "нужен вектор" теперь использует настройки для шелкографии');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при перезапуске:', error);
  }
}

// Запускаем если вызван напрямую
if (process.argv[1] === new URL(import.meta.url).pathname) {
  restartAll();
}

export { restartVectorizer, restartMainServer, restartAll };