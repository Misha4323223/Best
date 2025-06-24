const { db } = require("./db");
const { chatSessions, aiMessages } = require("@shared/schema");
const { eq, desc } = require("drizzle-orm");

/**
 * Создание новой сессии чата
 */
async function createChatSession(userId: number, title: string) {
  try {
    const [session] = await db
      .insert(chatSessions)
      .values({
        userId,
        title,
      })
      .returning();
    
    return session;
  } catch (error) {
    console.error('Ошибка создания сессии чата:', error);
    throw new Error('Не удалось создать сессию чата');
  }
}

/**
 * Получение всех сессий пользователя
 */
async function getUserChatSessions(userId) {
  try {
    return await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt));
  } catch (error) {
    console.error('Ошибка получения сессий пользователя:', error);
    return [];
  }
}

/**
 * Сохранение сообщения в чат
 */
async function saveMessage(messageData) {
  try {
    const [message] = await db
      .insert(aiMessages)
      .values(messageData)
      .returning();
    
    // Обновляем время последнего сообщения в сессии
    await db
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, messageData.sessionId));
    
    return message;
  } catch (error) {
    console.error('Ошибка сохранения сообщения:', error);
    throw new Error('Не удалось сохранить сообщение');
  }
}

/**
 * Получение сообщений из сессии
 */
async function getSessionMessages(sessionId) {
  // Получаем AI сообщения из базы данных
  const aiMessagesData = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.sessionId, sessionId))
    .orderBy(aiMessages.createdAt);
    
  // Преобразуем в формат для отображения в чате
  const formattedMessages = aiMessagesData.map(msg => ({
    id: msg.id,
    content: msg.content, // Используем content для совместимости
    text: msg.content,
    sender: msg.sender, // 'user' или 'ai'
    timestamp: msg.createdAt,
    provider: msg.provider
  }));
    
  return formattedMessages;
}

/**
 * Обновление заголовка сессии
 */
async function updateSessionTitle(sessionId, title) {
  const [session] = await db
    .update(chatSessions)
    .set({ 
      title,
      updatedAt: new Date()
    })
    .where(eq(chatSessions.id, sessionId))
    .returning();
  
  return session;
}

/**
 * Удаление сессии и всех её сообщений
 */
async function deleteSession(sessionId) {
  console.log(`🗑️ Начинаем удаление сессии ${sessionId} из БД`);
  
  try {
    // Сначала проверяем, существует ли сессия
    const existingSessions = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId));
    
    console.log(`🔍 Найдено сессий с ID ${sessionId}:`, existingSessions.length);
    
    if (existingSessions.length === 0) {
      console.log(`⚠️ Сессия ${sessionId} уже не существует в БД`);
      return false;
    }
    
    // Проверяем сколько сообщений в сессии
    const existingMessages = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.sessionId, sessionId));
    
    console.log(`🔍 Найдено ${existingMessages.length} сообщений в сессии ${sessionId}`);
    
    // Удаляем все сообщения
    const deletedMessages = await db
      .delete(aiMessages)
      .where(eq(aiMessages.sessionId, sessionId))
      .returning();
    
    console.log(`🗑️ Удалено ${deletedMessages.length} сообщений из сессии ${sessionId}`);
    
    // Затем удаляем сессию
    const deletedSession = await db
      .delete(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .returning();
    
    console.log(`🗑️ Результат удаления сессии:`, deletedSession);
    
    if (deletedSession.length > 0) {
      console.log(`✅ Сессия ${sessionId} успешно удалена из БД`);
      return true;
    } else {
      console.log(`❌ Не удалось удалить сессию ${sessionId} из БД`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Ошибка при удалении сессии ${sessionId}:`, error);
    return false;
  }
}

module.exports = {
  createChatSession,
  getUserChatSessions,
  saveMessage,
  getSessionMessages,
  updateSessionTitle,
  deleteSession
};