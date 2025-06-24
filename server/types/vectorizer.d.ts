/**
 * TypeScript определения для системы векторизации BOOOMERANGS AI
 * Описывает все интерфейсы, типы запросов и ответов векторизатора
 */

// Базовые типы качества и форматов
export type QualityLevel = 'draft' | 'standard' | 'premium' | 'ultra';
export type OutputFormat = 'svg' | 'eps' | 'pdf';
export type ContentType = 'logo' | 'artwork' | 'photo' | 'icon' | 'text' | 'complex';
export type OptimizationTarget = 'web' | 'print' | 'logo' | 'icon' | 'embroidery';

// Структуры конфигурации
export interface QualityPreset {
  name: string;
  description: string;
  colors: number;
  threshold: number;
  turnPolicy: string;
  turdSize: number;
  alphaMax: number;
  curveOptimizing: boolean;
  optCurve: boolean;
}

export interface OutputFormatConfig {
  extension: string;
  mimeType: string;
  description: string;
  supportsColors: boolean;
  maxSize?: string;
}

export interface ContentTypeConfig {
  description: string;
  optimizations: {
    threshold?: number;
    colors?: number;
    turnPolicy?: string;
  };
}

// Структуры запросов к API endpoints

export interface AnalyzeImageRequest {
  image: File | Buffer;
}

export interface ConvertImageRequest {
  image: File | Buffer;
  quality?: QualityLevel;
  format?: OutputFormat;
  optimizeFor?: OptimizationTarget;
  autoDetectType?: boolean;
}

export interface ProfessionalVectorizeRequest {
  image: File | Buffer;
  quality?: QualityLevel;
  formats?: OutputFormat[];
  generatePreviews?: boolean;
  optimizeFor?: OptimizationTarget;
  includeMetadata?: boolean;
}

export interface BatchVectorizeRequest {
  images: (File | Buffer)[];
  quality?: QualityLevel;
  format?: OutputFormat;
  optimizeFor?: OptimizationTarget;
}

export interface MultiFormatRequest {
  image: File | Buffer;
  formats: OutputFormat[];
  quality?: QualityLevel;
  optimizeFor?: OptimizationTarget;
}

// Структуры ответов от API endpoints

export interface BaseApiResponse {
  success: boolean;
  error?: string;
  timestamp?: string;
}

export interface ImageAnalysisResult {
  detectedType: ContentType;
  confidence: number;
  recommendedQuality: QualityLevel;
  recommendedFormat: OutputFormat;
  description: string;
}

export interface AnalyzeImageResponse extends BaseApiResponse {
  analysis?: ImageAnalysisResult;
}

export interface VectorizationResult {
  svgContent?: string;
  detectedType?: ContentType;
  quality?: QualityLevel;
  filename?: string;
  optimizationStats?: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    processingTime: number;
  };
}

export interface ConvertImageResponse extends BaseApiResponse {
  result?: VectorizationResult;
}

export interface FormatResult {
  format: OutputFormat;
  content: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface ProfessionalVectorizeResult {
  main: {
    detectedType: ContentType;
    formats: FormatResult[];
    previews?: {
      thumbnail: string;
      preview: string;
    };
  };
  metadata?: {
    processingTime: number;
    originalDimensions: { width: number; height: number };
    colors: number;
    complexity: number;
  };
}

export interface ProfessionalVectorizeResponse extends BaseApiResponse {
  result?: ProfessionalVectorizeResult;
}

export interface BatchResult {
  successful: VectorizationResult[];
  failed: Array<{
    filename: string;
    error: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalTime: number;
  };
}

export interface BatchVectorizeResponse extends BaseApiResponse {
  result?: BatchResult;
}

export interface MultiFormatResult {
  formats: FormatResult[];
  metadata: {
    detectedType: ContentType;
    processingTime: number;
    quality: QualityLevel;
  };
}

export interface MultiFormatResponse extends BaseApiResponse {
  result?: MultiFormatResult;
}

export interface FormatsInfoResponse extends BaseApiResponse {
  formats?: Record<OutputFormat, OutputFormatConfig>;
  qualities?: Record<QualityLevel, QualityPreset>;
  contentTypes?: Record<ContentType, ContentTypeConfig>;
}

export interface HealthCheckResponse extends BaseApiResponse {
  status?: 'healthy' | 'unhealthy';
  module?: string;
  version?: string;
  directories?: {
    output: string;
    temp: string;
  };
  capabilities?: string[];
}

// Интерфейсы для векторизатор-менеджера

export interface VectorizerManagerHealth {
  status: 'running' | 'stopped' | 'unhealthy' | 'unreachable';
  available: boolean;
  data?: HealthCheckResponse;
  error?: string;
}

export interface VectorizerManagerConfig {
  port: number;
  maxRestartAttempts: number;
  restartAttempts: number;
  isRunning: boolean;
}

// Интерфейсы для Smart Router интеграции

export interface ChatVectorizationOptions {
  quality: QualityLevel;
  formats: OutputFormat[];
  optimizeFor: OptimizationTarget;
  generatePreviews: boolean;
  includeMetadata: boolean;
}

export interface ChatVectorizationContext {
  lastImageUrl: string | null;
  sessionId: string;
  userId: string;
  requestText: string;
}

// Интерфейсы для внутренних модулей

export interface AdvancedVectorizerModule {
  vectorizeImage(
    imageBuffer: Buffer,
    originalName: string,
    options?: Partial<ConvertImageRequest>
  ): Promise<ConvertImageResponse>;

  professionalVectorize(
    imageBuffer: Buffer,
    originalName: string,
    options?: Partial<ProfessionalVectorizeRequest>
  ): Promise<ProfessionalVectorizeResponse>;

  batchVectorize(
    imageBuffers: Array<{ buffer: Buffer; originalName: string }>,
    options?: Partial<BatchVectorizeRequest>
  ): Promise<BatchVectorizeResponse>;

  detectContentType(imageBuffer: Buffer): Promise<ContentType>;

  multiFormatVectorize(
    imageBuffer: Buffer,
    originalName: string,
    options?: Partial<MultiFormatRequest>
  ): Promise<MultiFormatResponse>;

  QUALITY_PRESETS: Record<QualityLevel, QualityPreset>;
  OUTPUT_FORMATS: Record<OutputFormat, OutputFormatConfig>;
  CONTENT_TYPES: Record<ContentType, ContentTypeConfig>;
}

export interface VectorizerManager {
  startVectorizer(): Promise<boolean>;
  stopVectorizer(): void;
  checkHealth(): Promise<VectorizerManagerHealth>;
  getApiUrl(): string;
  
  vectorizeImage(
    imageBuffer: Buffer,
    filename: string,
    options?: Partial<ConvertImageRequest>
  ): Promise<ConvertImageResponse>;

  professionalVectorize(
    imageBuffer: Buffer,
    filename: string,
    options?: Partial<ProfessionalVectorizeRequest>
  ): Promise<ProfessionalVectorizeResponse>;
}

// Express Router типы для маршрутов
export interface VectorizerRouterRequest extends Express.Request {
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
  body: {
    quality?: string;
    format?: string;
    formats?: string;
    optimizeFor?: string;
    autoDetectType?: string;
    generatePreviews?: string;
    includeMetadata?: string;
  };
}

// Утилитарные типы
export type VectorizerEndpoint = 
  | '/analyze'
  | '/convert' 
  | '/professional'
  | '/batch'
  | '/previews'
  | '/multi-format'
  | '/formats'
  | '/health';

export type VectorizerApiMethod = 'GET' | 'POST';

export interface VectorizerEndpointConfig {
  endpoint: VectorizerEndpoint;
  method: VectorizerApiMethod;
  requiresFile: boolean;
  allowsMultipleFiles: boolean;
  description: string;
}

// Константы для валидации
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'image/bmp'
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_BATCH_FILES = 10;

export const VECTORIZER_ENDPOINTS: Record<VectorizerEndpoint, VectorizerEndpointConfig> = {
  '/analyze': {
    endpoint: '/analyze',
    method: 'POST',
    requiresFile: true,
    allowsMultipleFiles: false,
    description: 'Анализ изображения и определение оптимальных настроек'
  },
  '/convert': {
    endpoint: '/convert', 
    method: 'POST',
    requiresFile: true,
    allowsMultipleFiles: false,
    description: 'Базовая векторизация изображения'
  },
  '/professional': {
    endpoint: '/professional',
    method: 'POST', 
    requiresFile: true,
    allowsMultipleFiles: false,
    description: 'Профессиональная векторизация с расширенными опциями'
  },
  '/batch': {
    endpoint: '/batch',
    method: 'POST',
    requiresFile: true, 
    allowsMultipleFiles: true,
    description: 'Пакетная обработка нескольких изображений'
  },
  '/previews': {
    endpoint: '/previews',
    method: 'POST',
    requiresFile: true,
    allowsMultipleFiles: false,
    description: 'Генерация превью с разными настройками'
  },
  '/multi-format': {
    endpoint: '/multi-format',
    method: 'POST',
    requiresFile: true,
    allowsMultipleFiles: false, 
    description: 'Конвертация в несколько форматов одновременно'
  },
  '/formats': {
    endpoint: '/formats',
    method: 'GET',
    requiresFile: false,
    allowsMultipleFiles: false,
    description: 'Получение списка доступных форматов и настроек'
  },
  '/health': {
    endpoint: '/health',
    method: 'GET',
    requiresFile: false,
    allowsMultipleFiles: false,
    description: 'Проверка состояния векторизатора'
  }
};