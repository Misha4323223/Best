/**
 * Типизированный помощник для интеграции векторизатора с основным TypeScript сервером
 * Обеспечивает type-safe взаимодействие между компонентами
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import {
  VectorizerManager,
  AdvancedVectorizerModule,
  VectorizerManagerHealth,
  ConvertImageResponse,
  ProfessionalVectorizeResponse,
  ChatVectorizationOptions,
  QualityLevel,
  OutputFormat,
  OptimizationTarget
} from './types/vectorizer';

class TypedVectorizerHelper {
  private vectorizerManager: VectorizerManager | null = null;
  private advancedVectorizer: AdvancedVectorizerModule | null = null;
  private initialized = false;

  /**
   * Lazy initialization векторизатора
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.vectorizerManager = require('./vectorizer-manager');
      this.advancedVectorizer = require('../advanced-vectorizer.cjs');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize vectorizer components:', error);
      throw new Error('Vectorizer initialization failed');
    }
  }

  /**
   * Проверка состояния векторизатора с типизацией
   */
  public async getVectorizerHealth(): Promise<VectorizerManagerHealth> {
    await this.initialize();
    
    if (!this.vectorizerManager) {
      return {
        status: 'stopped',
        available: false,
        error: 'Vectorizer manager not available'
      };
    }

    return this.vectorizerManager.checkHealth();
  }

  /**
   * Типизированная векторизация изображения
   */
  public async vectorizeImage(
    imageBuffer: Buffer,
    filename: string,
    options: {
      quality?: QualityLevel;
      format?: OutputFormat;
      optimizeFor?: OptimizationTarget;
    } = {}
  ): Promise<ConvertImageResponse> {
    await this.initialize();

    const opts = {
      quality: options.quality || 'standard' as QualityLevel,
      format: options.format || 'svg' as OutputFormat,
      optimizeFor: options.optimizeFor || 'web' as OptimizationTarget
    };

    // Приоритет векторизатор-менеджеру
    if (this.vectorizerManager) {
      try {
        return await this.vectorizerManager.vectorizeImage(imageBuffer, filename, opts);
      } catch (managerError) {
        console.warn('Vectorizer manager failed, falling back to direct module');
      }
    }

    // Fallback к прямому модулю
    if (this.advancedVectorizer) {
      return this.advancedVectorizer.vectorizeImage(imageBuffer, filename, opts);
    }

    throw new Error('No vectorizer backend available');
  }

  /**
   * Типизированная профессиональная векторизация
   */
  public async professionalVectorize(
    imageBuffer: Buffer,
    filename: string,
    options: {
      quality?: QualityLevel;
      formats?: OutputFormat[];
      optimizeFor?: OptimizationTarget;
      generatePreviews?: boolean;
      includeMetadata?: boolean;
    } = {}
  ): Promise<ProfessionalVectorizeResponse> {
    await this.initialize();

    const opts = {
      quality: options.quality || 'premium' as QualityLevel,
      formats: options.formats || ['svg'] as OutputFormat[],
      optimizeFor: options.optimizeFor || 'web' as OptimizationTarget,
      generatePreviews: options.generatePreviews || false,
      includeMetadata: options.includeMetadata !== false
    };

    // Приоритет векторизатор-менеджеру
    if (this.vectorizerManager) {
      try {
        return await this.vectorizerManager.professionalVectorize(imageBuffer, filename, opts);
      } catch (managerError) {
        console.warn('Vectorizer manager failed, falling back to direct module');
      }
    }

    // Fallback к прямому модулю
    if (this.advancedVectorizer) {
      return this.advancedVectorizer.professionalVectorize(imageBuffer, filename, opts);
    }

    throw new Error('No vectorizer backend available');
  }

  /**
   * Парсинг опций векторизации из текста запроса пользователя
   */
  public parseVectorizationOptions(query: string): ChatVectorizationOptions {
    const lowerQuery = query.toLowerCase();

    // Определение качества
    let quality: QualityLevel = 'standard';
    if (lowerQuery.includes('ультра') || lowerQuery.includes('ultra')) {
      quality = 'ultra';
    } else if (lowerQuery.includes('премиум') || lowerQuery.includes('профи')) {
      quality = 'premium';
    } else if (lowerQuery.includes('драфт') || lowerQuery.includes('черновик')) {
      quality = 'draft';
    }

    // Определение форматов
    const formats: OutputFormat[] = ['svg'];
    if (lowerQuery.includes('eps')) formats.push('eps');
    if (lowerQuery.includes('pdf')) formats.push('pdf');
    if (lowerQuery.includes('многоформат') || lowerQuery.includes('все форматы')) {
      formats.length = 0;
      formats.push('svg', 'eps', 'pdf');
    }

    // Определение оптимизации
    let optimizeFor: OptimizationTarget = 'web';
    if (lowerQuery.includes('печат')) {
      optimizeFor = 'print';
    } else if (lowerQuery.includes('лого')) {
      optimizeFor = 'logo';
    } else if (lowerQuery.includes('икон')) {
      optimizeFor = 'icon';
    } else if (lowerQuery.includes('вышив')) {
      optimizeFor = 'embroidery';
    }

    return {
      quality,
      formats,
      optimizeFor,
      generatePreviews: lowerQuery.includes('превью'),
      includeMetadata: !lowerQuery.includes('без метаданных')
    };
  }

  /**
   * Проверка доступности векторизатора
   */
  public async isVectorizerAvailable(): Promise<boolean> {
    try {
      const health = await this.getVectorizerHealth();
      return health.available;
    } catch {
      return false;
    }
  }

  /**
   * Получение URL API векторизатора
   */
  public getVectorizerApiUrl(): string | null {
    if (!this.vectorizerManager) return null;
    return this.vectorizerManager.getApiUrl();
  }

  /**
   * Валидация поддерживаемых типов изображений
   */
  public static validateImageType(mimeType: string): boolean {
    const supportedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp'
    ];
    return supportedTypes.includes(mimeType);
  }

  /**
   * Валидация размера файла
   */
  public static validateFileSize(size: number): boolean {
    const maxSize = 10 * 1024 * 1024; // 10MB
    return size <= maxSize;
  }
}

// Singleton instance для использования в проекте
export const typedVectorizerHelper = new TypedVectorizerHelper();

// Экспорт класса для создания дополнительных экземпляров
export { TypedVectorizerHelper };

// Реэкспорт типов для удобства
export type {
  VectorizerManagerHealth,
  ConvertImageResponse,
  ProfessionalVectorizeResponse,
  ChatVectorizationOptions,
  QualityLevel,
  OutputFormat,
  OptimizationTarget
} from './types/vectorizer';