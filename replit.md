# BOOOMERANGS AI Platform

## Overview

Полнофункциональная AI-платформа для генерации изображений, интеллектуального чата и конвертации в форматы вышивки. Специализируется на создании дизайнов для вышивальных машин и текстильного производства.

## System Architecture

### Backend Services
- **Node.js Main Server**: Порт 5000 (Express + TypeScript)
- **Python G4F Service**: Порт 5001 (Flask + G4F интеграция)  
- **Python Streaming Service**: Порт 5004 (Потоковая генерация)
- **Vectorizer Service**: Порт 5006 (Advanced векторизация)

### Core Components
- **Мультимодальный AI чат**: 194 провайдера через G4F
- **Генерация изображений**: Без API ключей, множественные стили
- **Векторизация**: Advanced-vectorizer.cjs с поддержкой Adobe-подобных алгоритмов
- **Конвертация в вышивку**: DST, PES, JEF, EXP, VP3 форматы
- **WebSocket**: Real-time коммуникация

### Database Layer
- **PostgreSQL**: Drizzle ORM для управления данными
- **Memory Management**: Система чекпоинтов для сохранения состояния

### Frontend Technology
- **React + TypeScript**: Современный UI
- **Tailwind CSS + Shadcn/ui**: Стилизация
- **WebSocket**: Реальное время
- **Responsive Design**: Адаптивность

## Key Features

### AI Chat System
- Интеграция с 194 AI провайдерами
- Умная маршрутизация запросов
- Потоковая генерация ответов
- История чатов и сессии

### Image Generation & Processing
- Бесплатная генерация изображений
- Множественные стили: реалистичный, художественный, аниме
- Редактирование: добавление/удаление объектов
- Высокое качество до 1024x1024

### Embroidery Conversion Pipeline
- Автоматический анализ цветовой схемы
- Оптимизация для вышивки
- Извлечение палитры до 15 цветов
- Генерация инструкций по ниткам
- Создание готовых файлов для машин

## Architecture Patterns

### Microservices Design
- Модульная архитектура с независимыми сервисами
- Каждый сервис имеет свою область ответственности
- Координация через главный Node.js сервер

### Data Flow
1. **Request Ingestion**: Основной сервер получает запросы
2. **Service Routing**: Маршрутизация к специализированным микросервисам
3. **AI Processing**: Обработка через Python/Node.js сервисы
4. **State Management**: Сохранение состояния через чекпоинты
5. **Response Delivery**: Возврат результатов через основной сервер

## Deployment Configuration

### Development Environment
- **Development Command**: `npm run dev`
- **Combined Services**: `npm run dev:all`
- **Vectorizer Only**: `npm run dev:vectorizer`

### Production Setup
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Health Checks**: Встроенные endpoints для мониторинга

## Recent Changes

✅ 18 июня 2025: ПРОЕКТ КЛОНИРОВАН ИЗ GITHUB
  • Успешно клонирован репозиторий https://github.com/Misha4323223/4servera
  • Установлены все Node.js и Python зависимости
  • Инициализированы все компоненты системы:
    - Основной сервер на порту 5000
    - Python G4F сервер на порту 5001
    - Advanced векторизатор на порту 5006
    - WebSocket сервер для real-time коммуникации
  • Подтверждена работоспособность всех ключевых сервисов

✅ 18 июня 2025: ЗАМЕНА ВЕКТОРИЗАТОРА НА IMAGETRACERJS
  • Установлена библиотека imagetracerjs (v1.2.6) - популярная JS библиотека для векторизации
  • Создан новый векторизатор server/imagetracer-vectorizer.js с современным API
  • Удалены старые векторизаторы: advanced-vectorizer.cjs, vectorizer-server.js
  • Обновлена интеграция в vectorizer-chat-integration.cjs для работы с ImageTracerJS
  • Настроены высококачественные параметры векторизации:
    - 12 цветов для оптимального качества
    - Качественное цветовое сэмплирование
    - Удаление мелких деталей (pathomit: 8)
    - Высокое разрешение (ltres: 1, qtres: 1)
  • Поддержка векторизации по URL и загрузке файлов
  • Автоматическое сохранение результатов в директорию output/

✅ 18 июня 2025: ИСПРАВЛЕНИЕ ИНТЕГРАЦИИ С ЧАТОМ
  • Исправлена структура ответов в smart-router.js для совместимости с ImageTracerJS
  • Обновлены endpoints: /api/vectorizer/convert-url → /vectorize-url
  • Оптимизирована передача больших SVG файлов (>500KB) через чат
  • Добавлена альтернативная загрузка изображений через axios
  • Система успешно создает SVG файлы размером до 1.4MB
  • Подтверждена работоспособность векторизации через чат-интерфейс

✅ 18 июня 2025: ОПТИМИЗАЦИЯ ОТОБРАЖЕНИЯ SVG
  • Убрано превью SVG изображений по запросу пользователя
  • Система теперь показывает только ссылки для скачивания SVG файлов
  • Векторизация работает стабильно через ImageTracerJS v1.2.6
  • Файлы сохраняются в директорию output/ с уникальными именами
  • Поддержка векторизации изображений до 10MB
  • Настроено качество: 5 цветов для оптимального результата

## User Preferences

Preferred communication style: Simple, everyday language.
Do not show execution time and cost information (like "37s +0 -0 $0.09").
Do not create reports about code changes or work duration.