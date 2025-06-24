/**
 * Тест команды "нужен вектор" для прямого обращения к векторизатору на порту 5006
 */

const path = require('path');

// Имитируем запрос с изображением
const testMessage = 'нужен вектор';
const testImagePath = path.join(__dirname, 'attached_assets', 'booomerangs_logo_detailed.png');

async function testVectorCommand() {
  try {
    console.log('🧪 Тестируем команду "нужен вектор"...');
    
    // Загружаем smart-router
    const smartRouter = require('./server/smart-router');
    
    // Тестируем с изображением
    const result = await smartRouter.getAIResponseWithSearch(testMessage, {
      imageUrl: testImagePath,
      sessionId: 'test-session-vector'
    });
    
    console.log('✅ Результат теста:', JSON.stringify(result, null, 2));
    
    if (result.success && result.provider === 'Vectorizer-5006') {
      console.log('✅ Команда "нужен вектор" работает корректно!');
      console.log('📁 SVG файл создан:', result.vectorUrl);
    } else {
      console.log('⚠️ Команда не сработала как ожидалось');
    }
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error.message);
  }
}

// Запускаем тест
testVectorCommand();