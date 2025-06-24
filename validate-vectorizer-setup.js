#!/usr/bin/env node
/**
 * Валидация настройки векторизатора
 * Проверяет готовность к Этапу 5
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Валидация настройки векторизатора...\n');

// Проверка файлов конфигурации
const checks = [
  {
    name: 'Package.json scripts',
    check: () => {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return pkg.scripts['dev:vectorizer'] && pkg.scripts['dev:all'];
    }
  },
  {
    name: 'Environment variables',
    check: () => {
      const env = fs.readFileSync('.env', 'utf8');
      return env.includes('VECTORIZER_PORT=5006');
    }
  },
  {
    name: 'Vectorizer server file',
    check: () => fs.existsSync('server/vectorizer-server.js')
  },
  {
    name: 'Vectorizer manager',
    check: () => fs.existsSync('server/vectorizer-manager.js')
  },
  {
    name: 'Vectorizer routes',
    check: () => fs.existsSync('server/advanced-vectorizer-routes.js')
  },
  {
    name: 'TypeScript types',
    check: () => fs.existsSync('server/types/vectorizer.d.ts')
  },
  {
    name: 'System health checker',
    check: () => fs.existsSync('server/system-health-checker.js')
  },
  {
    name: 'Start script',
    check: () => fs.existsSync('start-vectorizer.js')
  }
];

let passed = 0;
let total = checks.length;

checks.forEach(({ name, check }) => {
  try {
    const result = check();
    if (result) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
    }
  } catch (error) {
    console.log(`❌ ${name} - Error: ${error.message}`);
  }
});

console.log(`\n📊 Результат: ${passed}/${total} проверок пройдено`);

if (passed === total) {
  console.log('\n🎉 Все проверки пройдены! Система готова к Этапу 5.');
} else {
  console.log('\n⚠️ Некоторые компоненты отсутствуют или неправильно настроены.');
}

// Проверка интеграции в routes.ts
try {
  const routes = fs.readFileSync('server/routes.ts', 'utf8');
  const hasVectorizerRoutes = routes.includes('/api/vectorizer');
  const hasSystemHealth = routes.includes('/api/system-health');
  
  console.log(`\n🔗 Интеграция в routes.ts:`);
  console.log(`${hasVectorizerRoutes ? '✅' : '❌'} Vectorizer routes`);
  console.log(`${hasSystemHealth ? '✅' : '❌'} System health endpoint`);
} catch (error) {
  console.log('\n❌ Не удалось проверить routes.ts');
}

console.log('\n📋 Следующий этап: Тестирование интеграции');
console.log('   - Запуск основных endpoints');
console.log('   - Проверка загрузки файлов');
console.log('   - Валидация качественных режимов');