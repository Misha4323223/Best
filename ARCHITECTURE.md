# Архитектура проекта BOOOMERANGS

## Обзор

BOOOMERANGS - это мультимодальное AI приложение, состоящее из трех основных компонентов:
1. Фронтенд (React/TypeScript/Tailwind)
2. Основной бэкенд (Node.js/Express)
3. Python G4F сервер (Flask)

![Архитектура](https://mermaid.ink/img/pako:eNqNkk1rwzAMhv-K0alh9AfkUGib0UFhbGwrG4Oe7DhrItuxkXxYSv77nKRLs5aVHWRZ0vtItnQGZWoERYqGWmNaXJNtnKMNadcLsanVOHqpJSt81NQ621FrXfQdGx3pnsZcmYFalPnpIQYZKn2Wl8W8mM8PSXkbkawO4P4wZMnvfyTEIcI_XFkraoX5XoSvEPUV0-4L01uSHU2Yt7Lv9IKhW_KWZLFLrJl6Fy2M-dhbI_1NHyFbH5PyLFKK1Lm_pAGy_S5N8jgp0tMsjovoeDqN49lcx7KBSFx5bfBJD7OjAGkMoQcj_8sVldFnVfMTsm2lzk-X7gDX4BuQqKiDgjzlJ0e1ZDjIGjTVK_AKBRleq4Ea2xrGz4T6Dpwt3YBeKDKuA296R-Cb4S2FwQvySHkocKA1tKRSYYbCOYOvXYtasFKZleLHhkBbVlmWpeDYm2TtS9BszaNFbvZjUOQUOfcHRpMOow?type=png)

## Компоненты

### Фронтенд

- **Клиентское приложение** (`client/src`):
  - **App.tsx**: Основной компонент приложения
  - **pages/**: Страницы приложения (Chat, ImageGenerator и т.д.)
  - **components/**: UI компоненты
  - **lib/**: Утилиты, хуки и сервисы

### Бэкенд

- **Express сервер** (`server/index.ts` & `server/routes.ts`):
  - RESTful API для взаимодействия с AI
  - WebSocket сервер для мгновенных сообщений
  - Статическое обслуживание клиентского приложения
  - Проксирование запросов к Python G4F серверу

- **AI провайдеры** (`server/direct-ai-provider.js`):
  - JS-модули для работы с различными AI API
  - Интерфейс для единообразного доступа к разным провайдерам

- **Мост к Python G4F** (`server/python_provider_routes.js`):
  - Прокси для передачи запросов от Express к Python G4F серверу
  - Обработка ошибок и преобразование форматов данных

### Python G4F сервер

- **Основной сервер** (`server/g4f_python_provider.py`):
  - REST API для взаимодействия с G4F
  - Автоматический выбор подходящего провайдера для запроса
  - Интеллектуальное определение типа запроса

- **Streaming сервер** (`server/stream_server.py`):
  - Потоковая передача ответов от AI в режиме реального времени
  - Server-Sent Events для эффективной отправки данных

## Конфигурация и настройка

### Основные настройки

- **Порты**:
  - 5000: Express (основной сервер)
  - 5001: Flask Streaming сервер
  - 5004: Python G4F сервер

### Провайдеры AI

Все AI провайдеры сгруппированы по надежности и функциональности:

- **primary**: Основные провайдеры (AItianhu, Phind, Qwen)
- **secondary**: Резервные провайдеры (DeepInfra, GeminiPro)
- **technical**: Провайдеры для технических вопросов (Phind)
- **fallback**: Последняя линия провайдеров (You, DeepInfra)

## Процесс обработки запроса

1. Клиент отправляет запрос на `/api/ai/chat`
2. Express сервер анализирует запрос и определяет его тип
3. Если запрос технический, выбирается Phind провайдер
4. Запрос передается в Python G4F сервер
5. Python G4F пытается обработать запрос с выбранным провайдером
6. Если основной провайдер недоступен, используется каскадное переключение
7. Ответ возвращается клиенту через Express сервер

## Взаимодействие компонентов

```
Client <-> Express Server <-> Python G4F Server <-> AI Providers API
```

## Потоки данных

1. **Основной поток запросов**:
   ```
   Клиент -> Express -> Python G4F -> AI провайдер -> Python G4F -> Express -> Клиент
   ```

2. **Поток для стриминга**:
   ```
   Клиент -> Express -> Python Streaming Server -> AI провайдер (streaming) -> Python Streaming Server -> Express -> Клиент (SSE)
   ```

## Структура важных файлов

```
/
├── client/ 
│   └── src/
│       ├── App.tsx              # Основной компонент приложения
│       ├── pages/               # Страницы приложения
│       └── components/          # UI компоненты
├── server/
│   ├── index.ts                 # Входная точка Express
│   ├── routes.ts                # API маршруты
│   ├── g4f_python_provider.py   # Python G4F сервер
│   ├── stream_server.py         # Стриминг сервер
│   ├── python_provider_routes.js # Мост к Python G4F
│   └── direct-ai-provider.js    # JS AI провайдеры
├── README.md                    # Описание проекта
└── PYTHON_SETUP.md              # Настройка Python
```