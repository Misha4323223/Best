/**
 * Запуск векторизатора в фоновом режиме с автоперезапуском
 */

import { spawn } from 'child_process';
import fs from 'fs';

console.log('🚀 Запуск BOOOMERANGS Vectorizer в фоновом режиме...');

let vectorizerProcess = null;
let restartCount = 0;
const maxRestarts = 10;
const restartDelay = 5000; // 5 секунд

function startVectorizer() {
  if (restartCount >= maxRestarts) {
    console.error(`❌ Превышено максимальное количество перезапусков (${maxRestarts})`);
    process.exit(1);
  }

  console.log(`🔄 Запуск векторизатора (попытка ${restartCount + 1}/${maxRestarts})`);
  
  vectorizerProcess = spawn('node', ['server/vectorizer-server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd(),
    detached: false
  });

  // Логирование вывода
  vectorizerProcess.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      console.log(`[VECTORIZER] ${message}`);
      
      // Записываем в лог файл
      fs.appendFileSync('/tmp/vectorizer-background.log', `${new Date().toISOString()} [OUT] ${message}\n`);
    }
  });

  vectorizerProcess.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      console.error(`[VECTORIZER ERROR] ${message}`);
      
      // Записываем в лог файл
      fs.appendFileSync('/tmp/vectorizer-background.log', `${new Date().toISOString()} [ERR] ${message}\n`);
    }
  });

  vectorizerProcess.on('close', (code) => {
    console.log(`⚠️ Векторизатор завершился с кодом ${code}`);
    fs.appendFileSync('/tmp/vectorizer-background.log', `${new Date().toISOString()} [EXIT] Process exited with code ${code}\n`);
    
    restartCount++;
    
    if (code !== 0 && restartCount < maxRestarts) {
      console.log(`🔄 Перезапуск через ${restartDelay/1000} секунд...`);
      setTimeout(startVectorizer, restartDelay);
    } else {
      console.log('🛑 Векторизатор остановлен');
    }
  });

  vectorizerProcess.on('error', (error) => {
    console.error('❌ Ошибка запуска векторизатора:', error.message);
    fs.appendFileSync('/tmp/vectorizer-background.log', `${new Date().toISOString()} [ERROR] ${error.message}\n`);
  });

  // Сбрасываем счетчик при успешном запуске
  setTimeout(() => {
    if (vectorizerProcess && !vectorizerProcess.killed) {
      restartCount = 0;
      console.log('✅ Векторизатор работает стабильно');
    }
  }, 10000);
}

// Обработчики завершения
process.on('SIGINT', () => {
  console.log('📥 Получен сигнал остановки...');
  if (vectorizerProcess) {
    vectorizerProcess.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('📥 Получен SIGTERM...');
  if (vectorizerProcess) {
    vectorizerProcess.kill('SIGTERM');
  }
  process.exit(0);
});

// Создаем лог файл
fs.writeFileSync('/tmp/vectorizer-background.log', `${new Date().toISOString()} [START] Background vectorizer started\n`);

// Запускаем векторизатор
startVectorizer();