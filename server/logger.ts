import { db } from './db.js';
import { aiMessages } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR';
  category: string;
  action: string;
  details: any;
  sessionId?: number;
  messageId?: number;
  userId?: number;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Максимальное количество логов в памяти

  private createEntry(
    level: LogEntry['level'],
    category: string,
    action: string,
    details: any,
    context?: { sessionId?: number; messageId?: number; userId?: number }
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      action,
      details,
      sessionId: context?.sessionId,
      messageId: context?.messageId,
      userId: context?.userId
    };
  }

  info(category: string, action: string, details: any, context?: { sessionId?: number; messageId?: number; userId?: number }) {
    const entry = this.createEntry('INFO', category, action, details, context);
    this.logs.push(entry);
    this.trimLogs();
    console.log(`ℹ️ [${category}] ${action}:`, details);
  }

  debug(category: string, action: string, details: any, context?: { sessionId?: number; messageId?: number; userId?: number }) {
    const entry = this.createEntry('DEBUG', category, action, details, context);
    this.logs.push(entry);
    this.trimLogs();
    console.log(`🔍 [${category}] ${action}:`, details);
  }

  warn(category: string, action: string, details: any, context?: { sessionId?: number; messageId?: number; userId?: number }) {
    const entry = this.createEntry('WARN', category, action, details, context);
    this.logs.push(entry);
    this.trimLogs();
    console.warn(`⚠️ [${category}] ${action}:`, details);
  }

  error(category: string, action: string, details: any, context?: { sessionId?: number; messageId?: number; userId?: number }) {
    const entry = this.createEntry('ERROR', category, action, details, context);
    this.logs.push(entry);
    this.trimLogs();
    console.error(`❌ [${category}] ${action}:`, details);
  }

  private trimLogs() {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  // Получить логи для определенной сессии
  getSessionLogs(sessionId: number): LogEntry[] {
    return this.logs.filter(log => log.sessionId === sessionId);
  }

  // Получить логи по категории
  getCategoryLogs(category: string): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  // Получить последние логи
  getRecentLogs(limit: number = 50): LogEntry[] {
    return this.logs.slice(-limit);
  }

  // Очистить логи
  clearLogs() {
    this.logs = [];
    console.log('🧹 Логи очищены');
  }

  // Экспорт логов в JSON
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Статистика логов
  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {} as Record<string, number>,
      byCategory: {} as Record<string, number>
    };

    this.logs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    });

    return stats;
  }
}

// Специализированные логгеры для разных компонентов
class ImageProcessLogger {
  constructor(private logger: Logger) {}

  requestReceived(prompt: string, sessionId: number, userId: number) {
    this.logger.info('IMAGE_GENERATION', 'REQUEST_RECEIVED', {
      prompt,
      promptLength: prompt.length,
      isRussian: /[а-яё]/i.test(prompt)
    }, { sessionId, userId });
  }

  promptTranslation(originalPrompt: string, translatedPrompt: string, method: string, sessionId: number) {
    this.logger.debug('IMAGE_GENERATION', 'PROMPT_TRANSLATION', {
      original: originalPrompt,
      translated: translatedPrompt,
      method,
      improvement: translatedPrompt.length > originalPrompt.length
    }, { sessionId });
  }

  aiEnhancement(prompt: string, aiResponse: string, provider: string, duration: number, sessionId: number) {
    this.logger.debug('IMAGE_GENERATION', 'AI_ENHANCEMENT', {
      inputPrompt: prompt,
      enhancedPrompt: aiResponse,
      provider,
      durationMs: duration,
      success: !!aiResponse
    }, { sessionId });
  }

  generationStarted(prompt: string, provider: string, sessionId: number) {
    this.logger.info('IMAGE_GENERATION', 'GENERATION_STARTED', {
      prompt,
      provider,
      seed: Date.now()
    }, { sessionId });
  }

  generationCompleted(imageUrl: string, provider: string, duration: number, sessionId: number) {
    this.logger.info('IMAGE_GENERATION', 'GENERATION_COMPLETED', {
      imageUrl,
      provider,
      durationMs: duration,
      success: true
    }, { sessionId });
  }

  generationFailed(error: string, provider: string, sessionId: number) {
    this.logger.error('IMAGE_GENERATION', 'GENERATION_FAILED', {
      error,
      provider,
      timestamp: Date.now()
    }, { sessionId });
  }

  editingStarted(originalImage: string, editCommand: string, sessionId: number) {
    this.logger.info('IMAGE_EDITING', 'EDITING_STARTED', {
      originalImage,
      editCommand,
      editType: this.detectEditType(editCommand)
    }, { sessionId });
  }

  editingCompleted(originalImage: string, editedImage: string, duration: number, sessionId: number) {
    this.logger.info('IMAGE_EDITING', 'EDITING_COMPLETED', {
      originalImage,
      editedImage,
      durationMs: duration,
      success: true
    }, { sessionId });
  }

  editingFailed(error: string, sessionId: number) {
    this.logger.error('IMAGE_EDITING', 'EDITING_FAILED', {
      error,
      timestamp: Date.now()
    }, { sessionId });
  }

  private detectEditType(command: string): string {
    if (/убери|удали|remove/i.test(command)) return 'REMOVE';
    if (/добавь|add/i.test(command)) return 'ADD';
    if (/измени|change/i.test(command)) return 'MODIFY';
    return 'UNKNOWN';
  }
}

class ChatLogger {
  constructor(private logger: Logger) {}

  messageReceived(message: string, sessionId: number, userId: number) {
    this.logger.info('CHAT', 'MESSAGE_RECEIVED', {
      messageLength: message.length,
      hasImage: message.includes('!['),
      messageType: this.detectMessageType(message)
    }, { sessionId, userId });
  }

  routingDecision(message: string, category: string, providers: string[], sessionId: number) {
    this.logger.debug('CHAT', 'ROUTING_DECISION', {
      category,
      providers,
      messageLength: message.length
    }, { sessionId });
  }

  providerResponse(provider: string, responseLength: number, duration: number, sessionId: number) {
    this.logger.info('CHAT', 'PROVIDER_RESPONSE', {
      provider,
      responseLength,
      durationMs: duration,
      success: true
    }, { sessionId });
  }

  providerError(provider: string, error: string, sessionId: number) {
    this.logger.error('CHAT', 'PROVIDER_ERROR', {
      provider,
      error
    }, { sessionId });
  }

  private detectMessageType(message: string): string {
    if (/нарисуй|создай|generate|draw/i.test(message)) return 'IMAGE_REQUEST';
    if (/убери|удали|измени|edit/i.test(message)) return 'EDIT_REQUEST';
    return 'TEXT_CHAT';
  }
}

class SystemLogger {
  constructor(private logger: Logger) {}

  serverStarted(port: number) {
    this.logger.info('SYSTEM', 'SERVER_STARTED', { port });
  }

  databaseConnected() {
    this.logger.info('SYSTEM', 'DATABASE_CONNECTED', {});
  }

  providerInitialized(provider: string, status: 'success' | 'failed') {
    this.logger.info('SYSTEM', 'PROVIDER_INITIALIZED', { provider, status });
  }

  sessionCreated(sessionId: number, userId: number) {
    this.logger.info('SYSTEM', 'SESSION_CREATED', { sessionId, userId });
  }

  criticalError(error: string, context: any) {
    this.logger.error('SYSTEM', 'CRITICAL_ERROR', { error, context });
  }
}

// Создаем глобальные экземпляры логгеров
export const logger = new Logger();
export const imageLogger = new ImageProcessLogger(logger);
export const chatLogger = new ChatLogger(logger);
export const systemLogger = new SystemLogger(logger);