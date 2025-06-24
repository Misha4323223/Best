import { searchRealTimeInfo } from './free-web-search.js';

console.log('🧪 ТЕСТИРУЕМ СИСТЕМУ ПОИСКА...\n');

// Тест 1: Поиск мест
console.log('=== ТЕСТ 1: ПОИСК МАГАЗИНОВ ===');
try {
  const result1 = await searchRealTimeInfo('магазины в Москве');
  console.log('✅ Успех:', result1.success);
  console.log('📊 Результатов:', result1.results.length);
  if (result1.results.length > 0) {
    console.log('📍 Первый результат:', result1.results[0].title);
  }
} catch (error) {
  console.log('❌ Ошибка:', error.message);
}

console.log('\n=== ТЕСТ 2: ПОИСК ПОГОДЫ ===');
try {
  const result2 = await searchRealTimeInfo('погода в Москве');
  console.log('✅ Успех:', result2.success);
  console.log('📊 Результатов:', result2.results.length);
  if (result2.results.length > 0) {
    console.log('🌤️ Результат погоды:', result2.results[0].title);
  }
} catch (error) {
  console.log('❌ Ошибка:', error.message);
}

console.log('\n=== ТЕСТ 3: ОБЩИЙ ПОИСК ===');
try {
  const result3 = await searchRealTimeInfo('что делать в выходные');
  console.log('✅ Успех:', result3.success);
  console.log('📊 Результатов:', result3.results.length);
} catch (error) {
  console.log('❌ Ошибка:', error.message);
}

console.log('\n🎯 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');