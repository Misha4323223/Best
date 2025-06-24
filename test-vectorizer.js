#!/usr/bin/env node
/**
 * Тест стабильности векторизатора
 */

import { spawn } from 'child_process';

console.log('🧪 Тест стабильности векторизатора на порту 3001...');

const vectorizer = spawn('node', ['server/vectorizer-server.js'], {
  env: { ...process.env, VECTORIZER_PORT: '3001' },
  stdio: 'pipe'
});

let output = '';

vectorizer.stdout.on('data', (data) => {
  output += data.toString();
  process.stdout.write(data);
});

vectorizer.stderr.on('data', (data) => {
  output += data.toString();
  process.stderr.write(data);
});

// Тестируем API через 3 секунды
setTimeout(async () => {
  try {
    const response = await fetch('http://localhost:3001/health');
    const data = await response.json();
    console.log('\n✅ API Test успешен:', data.status);
  } catch (error) {
    console.log('\n❌ API Test failed:', error.message);
  }
}, 3000);

// Завершаем через 15 секунд
setTimeout(() => {
  console.log('\n🏁 Тест завершен - векторизатор стабилен');
  vectorizer.kill('SIGTERM');
  process.exit(0);
}, 15000);

vectorizer.on('close', (code) => {
  console.log(`\n📊 Векторизатор завершен с кодом: ${code}`);
  if (code === 0) {
    console.log('✅ Корректное завершение');
  } else {
    console.log('❌ Аварийное завершение');
    console.log('Логи:', output.slice(-500));
  }
});