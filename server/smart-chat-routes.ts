/**
 * Маршруты для умного чата с системой чекпоинтов
 */

import { Router, Request, Response } from 'express';
import { checkpointManager } from './checkpoint-system.js';
import { z } from 'zod';

const router = Router();

// Схема валидации для чат-запроса
const chatRequestSchema = z.object({
  message: z.string().min(1, 'Сообщение не может быть пустым'),
  username: z.string().min(1, 'Имя пользователя обязательно'),
  useCheckpoints: z.boolean().optional().default(true)
});

/**
 * Обработка сообщений умного чата
 * POST /api/chat/smart
 */
router.post('/smart', async (req: Request, res: Response) => {
  try {
    const { message, username, useCheckpoints } = chatRequestSchema.parse(req.body);
    
    // Сохраняем чекпоинт входящего сообщения
    if (useCheckpoints) {
      await checkpointManager.saveCheckpoint(
        `Получено сообщение от ${username}`,
        'create',
        {
          code: message,
          metadata: { 
            type: 'user_message',
            username,
            messageLength: message.length,
            timestamp: new Date().toISOString()
          }
        }
      );
    }

    // Простой ответ (можно заменить на реальный AI провайдер)
    let aiResponse = generateSmartResponse(message, username);
    
    // Сохраняем чекпоинт ответа
    if (useCheckpoints) {
      await checkpointManager.saveCheckpoint(
        `Сгенерирован ответ для ${username}`,
        'execute',
        {
          code: aiResponse,
          metadata: { 
            type: 'ai_response',
            username,
            responseLength: aiResponse.length,
            originalMessage: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
            timestamp: new Date().toISOString()
          }
        }
      );
    }

    res.json({
      success: true,
      response: aiResponse,
      provider: 'booomerangs-smart',
      model: 'checkpoint-enabled',
      metadata: {
        checkpointsEnabled: useCheckpoints,
        username,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Ошибка обработки чата:', error);
    
    // Сохраняем чекпоинт ошибки
    await checkpointManager.saveCheckpoint(
      'Ошибка обработки чат-сообщения',
      'execute',
      {
        metadata: { 
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }
    );

    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
});

/**
 * Генерация умного ответа (обычный чат без упоминания чекпоинтов)
 */
function generateSmartResponse(message: string, username: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('привет') || lowerMessage.includes('hello')) {
    return `Привет, ${username}! Как дела? Чем могу помочь?`;
  }
  
  if (lowerMessage.includes('как дела') || lowerMessage.includes('что нового')) {
    return `У меня всё отлично, ${username}! Готов помочь с любыми задачами. Что вас интересует?`;
  }
  
  if (lowerMessage.includes('код') || lowerMessage.includes('программир')) {
    return `Отлично, ${username}! Я помогу с программированием. Какой язык или технологию используем? Могу создать проект, написать функции, исправить ошибки или объяснить концепции.`;
  }
  
  if (lowerMessage.includes('помощ') || lowerMessage.includes('help')) {
    return `Конечно помогу, ${username}! Я могу:

- Программировать на разных языках
- Создавать веб-приложения и API
- Работать с базами данных
- Помочь с дизайном и UI/UX
- Анализировать и решать проблемы
- Объяснять технические концепции

Просто скажите, что нужно сделать!`;
  }
  
  if (lowerMessage.includes('спасибо') || lowerMessage.includes('благодар')) {
    return `Пожалуйста, ${username}! Всегда рад помочь. Если появятся ещё вопросы - обращайтесь!`;
  }
  
  if (lowerMessage.includes('создай') || lowerMessage.includes('сделай')) {
    return `Хорошо, ${username}! Расскажите подробнее, что именно нужно создать? Я готов приступить к работе.`;
  }
  
  // Общий ответ
  return `Понял, ${username}! Вы написали: "${message.substring(0, 80)}${message.length > 80 ? '...' : ''}". 

Чем конкретно могу помочь? Готов работать над любыми задачами!`;
}

export default router;