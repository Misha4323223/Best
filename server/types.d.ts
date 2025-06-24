declare module 'potrace';

// Импорт типов векторизатора
/// <reference path="./types/vectorizer.d.ts" />
/// <reference path="./types/index.d.ts" />

// Расширение Express типов для векторизатора
declare namespace Express {
  interface Request {
    vectorizerFile?: Multer.File;
    vectorizerFiles?: Multer.File[];
  }
}