/**
 * Центральный файл экспорта всех типов векторизатора
 * Обеспечивает удобный импорт типов в основном TypeScript проекте
 */

export * from './vectorizer';
export * from './vectorizer-integration';

// Глобальные расширения для Express
declare global {
  namespace Express {
    interface Request {
      vectorizerContext?: {
        sessionId?: string;
        userId?: string;
        imageHistory?: string[];
      };
    }
  }
}

// Расширения для Node.js modules
declare module '../advanced-vectorizer.cjs' {
  import { AdvancedVectorizerModule } from './vectorizer';
  const advancedVectorizer: AdvancedVectorizerModule;
  export = advancedVectorizer;
}

declare module './vectorizer-manager' {
  import { VectorizerManager } from './vectorizer';
  const vectorizerManager: VectorizerManager;
  export = vectorizerManager;
}

declare module './advanced-vectorizer-routes' {
  import { Router } from 'express';
  const vectorizerRoutes: Router;
  export = vectorizerRoutes;
}