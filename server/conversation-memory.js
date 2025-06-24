/**
 * Система памяти разговоров для поддержания контекста между сообщениями
 */

// Хранилище активных разговоров
const activeConversations = new Map();

/**
 * Структура разговора
 */
class Conversation {
  constructor(userId = 'anonymous') {
    this.userId = userId;
    this.messages = [];
    this.currentProvider = null;
    this.currentModel = null;
    this.category = null;
    this.createdAt = new Date();
    this.lastActivity = new Date();
  }

  /**
   * Добавление сообщения в разговор
   */
  addMessage(message, sender, provider = null, model = null) {
    this.messages.push({
      content: message,
      sender,
      provider,
      model,
      timestamp: new Date()
    });
    
    // Обновляем информацию о текущем провайдере
    if (sender === 'ai' && provider) {
      this.currentProvider = provider;
      this.currentModel = model;
    }
    
    this.lastActivity = new Date();
    
    // Ограничиваем историю последними 20 сообщениями для производительности
    if (this.messages.length > 20) {
      this.messages = this.messages.slice(-20);
    }
  }

  /**
   * Извлечение информации о последнем сгенерированном изображении
   */
  getLastImageInfo() {
    console.log('🔍 [MEMORY] Ищем последнее изображение в истории...');
    console.log('📊 [MEMORY] Всего сообщений:', this.messages.length);
    
    // Ищем последнее сообщение AI с изображением
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const message = this.messages[i];
      console.log(`📝 [MEMORY] Сообщение ${i}: ${message.sender} - ${message.content.substring(0, 100)}...`);
      
      if (message.sender === 'ai' && message.content.includes('![')) {
        console.log('🖼️ [MEMORY] Найдено сообщение с изображением!');
        
        // Извлекаем URL изображения и описание
        const imageMatch = message.content.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        if (imageMatch) {
          const imageInfo = {
            description: imageMatch[1] || 'Сгенерированное изображение',
            url: imageMatch[2],
            fullContent: message.content,
            timestamp: message.timestamp
          };
          
          console.log('✅ [MEMORY] Извлечена информация об изображении:');
          console.log('  - Описание:', imageInfo.description);
          console.log('  - URL:', imageInfo.url);
          console.log('  - Временная метка:', imageInfo.timestamp);
          
          return imageInfo;
        }
      }
    }
    
    console.log('❌ [MEMORY] Изображения в истории не найдены');
    return null;
  }

  /**
   * Анализ контекста разговора для понимания намерений
   */
  analyzeIntent() {
    if (this.messages.length < 2) return null;
    
    const lastMessages = this.messages.slice(-5); // Последние 5 сообщений
    const userMessages = lastMessages.filter(m => m.sender === 'user');
    
    // Ищем паттерны запросов о поиске
    const searchPatterns = [
      /найди.*магазин/i, /где.*купить/i, /магазины.*в/i, /ищу.*магазин/i,
      /find.*store/i, /where.*buy/i, /shops.*in/i, /looking.*for.*store/i
    ];
    
    const locationPatterns = [
      /в\s+(\w+)/i, /город\s+(\w+)/i, /in\s+(\w+)/i, /city\s+(\w+)/i
    ];
    
    let isSearchQuery = false;
    let location = null;
    
    // Проверяем есть ли запрос на поиск
    for (const msg of userMessages) {
      if (searchPatterns.some(pattern => pattern.test(msg.content))) {
        isSearchQuery = true;
        break;
      }
    }
    
    // Если есть запрос на поиск, ищем упоминание города
    if (isSearchQuery) {
      for (const msg of this.messages) {
        for (const pattern of locationPatterns) {
          const match = msg.content.match(pattern);
          if (match) {
            location = match[1];
            break;
          }
        }
        if (location) break;
      }
    }
    
    return {
      isSearchQuery,
      location,
      context: isSearchQuery && location ? `Пользователь ищет магазины в городе ${location}. ` : null
    };
  }

  /**
   * Получение контекста для AI провайдера
   */
  getContext() {
    if (this.messages.length === 0) return '';
    
    // Берем последние 5 сообщений для контекста
    const recentMessages = this.messages.slice(-5);
    
    let context = 'Контекст предыдущих сообщений:\n';
    recentMessages.forEach(msg => {
      const role = msg.sender === 'user' ? 'Пользователь' : 'AI';
      context += `${role}: ${msg.content}\n`;
    });
    
    return context + '\nТекущий вопрос: ';
  }

  /**
   * Проверка, нужно ли продолжить с тем же провайдером
   */
  shouldContinueWithProvider() {
    // Если есть активный провайдер и последняя активность была недавно (меньше 10 минут)
    const timeSinceLastActivity = new Date() - this.lastActivity;
    return this.currentProvider && timeSinceLastActivity < 10 * 60 * 1000;
  }
}

/**
 * Получение или создание разговора для пользователя
 */
function getConversation(userId = 'anonymous') {
  if (!activeConversations.has(userId)) {
    activeConversations.set(userId, new Conversation(userId));
  }
  return activeConversations.get(userId);
}

/**
 * Добавление сообщения пользователя в разговор
 */
function addUserMessage(userId, message) {
  const conversation = getConversation(userId);
  conversation.addMessage(message, 'user');
  return conversation;
}

/**
 * Добавление ответа AI в разговор
 */
function addAiResponse(userId, response, provider, model) {
  const conversation = getConversation(userId);
  conversation.addMessage(response, 'ai', provider, model);
  return conversation;
}

/**
 * Получение контекста для следующего сообщения
 */
function getMessageContext(userId, newMessage) {
  const conversation = getConversation(userId);
  
  // Добавляем новое сообщение пользователя
  conversation.addMessage(newMessage, 'user');
  
  // Анализируем намерения для понимания контекста
  const intent = conversation.analyzeIntent();
  
  let enhancedContext = conversation.getContext();
  
  // Если обнаружен запрос на поиск с указанием локации
  if (intent && intent.isSearchQuery && intent.location) {
    enhancedContext = `ВАЖНО: ${intent.context}Пользователь НЕ спрашивает про город в общем, а именно ИЩЕТ МАГАЗИНЫ в городе ${intent.location}. Предоставь конкретные адреса магазинов, торговых центров и мест для покупок в этом городе. Не рассказывай про город, а дай практическую информацию где можно что-то купить.\n\n${enhancedContext}`;
  }
  
  return {
    context: enhancedContext,
    shouldContinueWithProvider: conversation.shouldContinueWithProvider(),
    currentProvider: conversation.currentProvider,
    currentModel: conversation.currentModel,
    messageHistory: conversation.messages,
    intent: intent
  };
}

/**
 * Очистка старых разговоров (запускается периодически)
 */
function cleanupOldConversations() {
  const now = new Date();
  const maxAge = 60 * 60 * 1000; // 1 час
  
  for (const [userId, conversation] of activeConversations.entries()) {
    if (now - conversation.lastActivity > maxAge) {
      activeConversations.delete(userId);
      console.log(`🧹 Очищен старый разговор для пользователя ${userId}`);
    }
  }
}

/**
 * Создание нового разговора (сброс контекста)
 */
function startNewConversation(userId = 'anonymous') {
  activeConversations.set(userId, new Conversation(userId));
  console.log(`🆕 Начат новый разговор для пользователя ${userId}`);
  return activeConversations.get(userId);
}

/**
 * Получение статистики разговоров
 */
function getConversationStats() {
  return {
    activeConversations: activeConversations.size,
    conversations: Array.from(activeConversations.entries()).map(([userId, conv]) => ({
      userId,
      messageCount: conv.messages.length,
      currentProvider: conv.currentProvider,
      lastActivity: conv.lastActivity
    }))
  };
}

// Автоматическая очистка каждые 30 минут
setInterval(cleanupOldConversations, 30 * 60 * 1000);

module.exports = {
  getConversation,
  addUserMessage,
  addAiResponse,
  getMessageContext,
  startNewConversation,
  getConversationStats,
  cleanupOldConversations
};