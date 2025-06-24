/**
 * Тестовый модуль для проверки интеграции векторизатора
 * Запускается автоматически при старте приложения
 */

const vectorizerManager = require('./vectorizer-manager');

async function testVectorizerIntegration() {
  console.log('🧪 Тестирование интеграции векторизатора...');
  
  try {
    // Проверяем состояние векторизатора
    const health = await vectorizerManager.checkHealth();
    console.log('📊 Состояние векторизатора:', health);
    
    if (health.available) {
      console.log('✅ Векторизатор доступен и готов к работе');
      console.log(`🌐 API URL: ${vectorizerManager.getApiUrl()}`);
      
      // Тестируем endpoints
      const fetch = require('node-fetch');
      
      try {
        const formatsResponse = await fetch(`${vectorizerManager.getApiUrl()}/formats`);
        if (formatsResponse.ok) {
          const formats = await formatsResponse.json();
          console.log('📋 Доступные форматы:', Object.keys(formats.formats || {}));
        }
      } catch (endpointError) {
        console.log('⚠️ Некоторые endpoints могут быть недоступны:', endpointError.message);
      }
      
    } else {
      console.log('❌ Векторизатор недоступен:', health.status);
    }
    
    return health.available;
    
  } catch (error) {
    console.error('❌ Ошибка тестирования векторизатора:', error.message);
    return false;
  }
}

module.exports = { testVectorizerIntegration };