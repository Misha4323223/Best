// API маршруты для прямого доступа к AI провайдерам
const express = require('express');
const router = express.Router();
const aiProvider = require('./direct-ai-provider');

// API endpoint для чата с AI
router.post('/chat', async (req, res) => {
  try {
    const { 
      message, 
      provider = null, 
      timeout = 10000 
    } = req.body;
    
    // Проверяем, что сообщение присутствует
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Сообщение не может быть пустым' 
      });
    }
    
    console.log(`Запрос к AI: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    
    // Получаем ответ, автоматически перебирая провайдеров
    const result = await aiProvider.getChatResponse(message, {
      specificProvider: provider,
      timeout
    });
    
    // Возвращаем результат
    res.json({
      success: true,
      response: result.response,
      provider: result.provider,
      model: result.model
    });
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    
    // В случае ошибки возвращаем демо-ответ
    const demoResponse = aiProvider.getDemoResponse(req.body.message || '');
    
    res.json({
      success: true,
      response: demoResponse,
      provider: 'BOOOMERANGS-Demo',
      model: 'demo-mode',
      error: error.message
    });
  }
});

// Получение списка доступных провайдеров
router.get('/providers', (req, res) => {
  try {
    const providers = Object.keys(aiProvider.AI_PROVIDERS).map(key => {
      const provider = aiProvider.AI_PROVIDERS[key];
      return {
        id: key,
        name: provider.name,
        needsKey: provider.needsKey,
        isDemo: key === 'DEMO'
      };
    });
    
    res.json({
      success: true,
      providers
    });
  } catch (error) {
    console.error('Ошибка при получении списка провайдеров:', error);
    
    res.status(500).json({
      success: false,
      error: 'Не удалось получить список провайдеров',
      message: error.message
    });
  }
});

module.exports = router;