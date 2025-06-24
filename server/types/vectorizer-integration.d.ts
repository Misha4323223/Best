/**
 * Типы для интеграции векторизатора с основным TypeScript сервером
 * Обеспечивает типобезопасность при взаимодействии между компонентами
 */

import { Request, Response, NextFunction } from 'express';
import { 
  VectorizerManager, 
  AdvancedVectorizerModule,
  ConvertImageRequest,
  ProfessionalVectorizeRequest,
  AnalyzeImageRequest,
  ConvertImageResponse,
  ProfessionalVectorizeResponse,
  AnalyzeImageResponse,
  VectorizerManagerHealth
} from './vectorizer';

// Типизированные Express маршруты для векторизатора
export interface TypedVectorizerRequest<T = any> extends Request {
  body: T;
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}

export interface VectorizerAnalyzeRequest extends TypedVectorizerRequest<{}> {
  file: Express.Multer.File;
}

export interface VectorizerConvertRequest extends TypedVectorizerRequest<{
  quality?: string;
  format?: string;
  optimizeFor?: string;
  autoDetectType?: string;
}> {
  file: Express.Multer.File;
}

export interface VectorizerProfessionalRequest extends TypedVectorizerRequest<{
  quality?: string;
  formats?: string;
  generatePreviews?: string;
  optimizeFor?: string;
  includeMetadata?: string;
}> {
  file: Express.Multer.File;
}

export interface VectorizerBatchRequest extends TypedVectorizerRequest<{
  quality?: string;
  format?: string;
  optimizeFor?: string;
}> {
  files: Express.Multer.File[];
}

// Типизированные обработчики маршрутов
export type VectorizerRouteHandler<TRequest = Request> = (
  req: TRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export type AnalyzeHandler = VectorizerRouteHandler<VectorizerAnalyzeRequest>;
export type ConvertHandler = VectorizerRouteHandler<VectorizerConvertRequest>;
export type ProfessionalHandler = VectorizerRouteHandler<VectorizerProfessionalRequest>;
export type BatchHandler = VectorizerRouteHandler<VectorizerBatchRequest>;

// Интерфейсы для Smart Router интеграции
export interface SmartRouterVectorizerContext {
  vectorizerManager: VectorizerManager;
  advancedVectorizer: AdvancedVectorizerModule;
  isVectorizerAvailable(): Promise<boolean>;
  getLastImageFromSession(sessionId: string): Promise<string | null>;
  parseVectorizationRequest(query: string): {
    quality: string;
    formats: string[];
    optimizeFor: string;
    generatePreviews: boolean;
  };
}

// Middleware типы
export interface VectorizerMiddleware {
  logRequest: VectorizerRouteHandler;
  handleErrors: (error: Error, req: Request, res: Response, next: NextFunction) => void;
  validateFile: VectorizerRouteHandler;
  validateMultipleFiles: VectorizerRouteHandler;
}

// Конфигурация сервера векторизатора
export interface VectorizerServerConfig {
  port: number;
  corsOrigins: string[];
  maxFileSize: string;
  allowedMethods: string[];
  allowedHeaders: string[];
  staticPaths: {
    output: string;
    temp?: string;
  };
}

// Типы для мониторинга и статистики
export interface VectorizerStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  lastRequestTime: string;
  uptime: number;
}

export interface VectorizerHealthCheck extends VectorizerManagerHealth {
  stats?: VectorizerStats;
  endpoints?: {
    [endpoint: string]: {
      available: boolean;
      lastChecked: string;
      responseTime?: number;
    };
  };
}

// Типы для интеграции с основными маршрутами
export interface MainServerVectorizerIntegration {
  isEnabled: boolean;
  managerInstance: VectorizerManager | null;
  fallbackModule: AdvancedVectorizerModule | null;
  healthCheckInterval: number;
  autoRestart: boolean;
  
  // Методы интеграции
  initializeVectorizer(): Promise<boolean>;
  getVectorizerStatus(): Promise<VectorizerHealthCheck>;
  processVectorizationRequest(
    imageUrl: string,
    options: any,
    context: { sessionId: string; userId: string }
  ): Promise<any>;
}

// Утилитарные типы для TypeScript интеграции
export type VectorizerModuleImport = () => Promise<{
  vectorizerManager: VectorizerManager;
  advancedVectorizer: AdvancedVectorizerModule;
}>;

export type VectorizerAPICall<TRequest, TResponse> = (
  request: TRequest
) => Promise<TResponse>;

// Типы для валидации запросов
export interface RequestValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

export type ValidateVectorizerRequest<T> = (data: T) => RequestValidationResult;

// Экспорт всех необходимых типов для импорта в основной проект
export {
  VectorizerManager,
  AdvancedVectorizerModule,
  ConvertImageRequest,
  ConvertImageResponse,
  ProfessionalVectorizeRequest,
  ProfessionalVectorizeResponse,
  AnalyzeImageRequest,
  AnalyzeImageResponse,
  VectorizerManagerHealth
} from './vectorizer';