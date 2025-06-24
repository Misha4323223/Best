// Прямая интеграция с AI API (без использования g4f пакета)
const fetch = require('node-fetch').default;

// Набор рабочих API-провайдеров - обновленные провайдеры из списка G4F
const AI_PROVIDERS = {
  // ChatFree API - новый стабильный провайдер без необходимости API ключа
  CHATFREE: {
    name: 'ChatFree',
    url: 'https://chatfree.org/api/chat/completions',
    needsKey: false,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    },
    prepareRequest: (message, options = {}) => {
      const systemPrompt = options.systemPrompt || 'Вы полезный ассистент. Отвечайте коротко и по существу.';
      return {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        stream: false
      };
    },
    extractResponse: async (response) => {
      const jsonResponse = await response.json();
      if (jsonResponse && jsonResponse.choices && jsonResponse.choices.length > 0) {
        return jsonResponse.choices[0].message.content;
      }
      throw new Error('Некорректный ответ от ChatFree API');
    }
  },
  
  // FreeGPT API - настроен по списку G4F
  FREEGPT: {
    name: 'FreeGPT', 
    url: 'https://api.freegpt.ml/v1/chat/completions',
    needsKey: false,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    },
    prepareRequest: (message) => {
      return {
        model: "gemini-pro",
        messages: [{ role: "user", content: message }],
        temperature: 0.7
      };
    },
    extractResponse: async (response) => {
      const jsonResponse = await response.json();
      if (jsonResponse && jsonResponse.choices && jsonResponse.choices.length > 0) {
        return jsonResponse.choices[0].message.content;
      }
      throw new Error('Некорректный ответ от FreeGPT API');
    }
  },
  
  // Liaobots - без авторизации, сильный провайдер
  LIAOBOTS: {
    name: 'Liaobots',
    url: 'https://liaobots.work/api/chat',
    needsKey: false,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    },
    prepareRequest: (message) => {
      return {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: message }],
        temperature: 0.7,
        stream: false
      };
    },
    extractResponse: async (response) => {
      const jsonResponse = await response.json();
      if (jsonResponse && jsonResponse.message && jsonResponse.message.content) {
        return jsonResponse.message.content;
      }
      throw new Error('Некорректный ответ от Liaobots');
    }
  },
  
  // You.com - без авторизации, Claude-модели - использует расширенную имплементацию для надежности
  YOUCOM: {
    name: 'You.com-AI',
    url: 'https://you.com/api/streamingSearch',
    needsKey: false,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Origin': 'https://you.com',
      'Referer': 'https://you.com/search?q=test&tbm=youchat'
    },
    prepareRequest: (message) => {
      return {
        q: message,
        page: 1,
        count: 10,
        safeSearch: 'Moderate',
        onShoppingPage: false,
        mkt: '',
        responseFilter: 'WebPages,Translations,TimeZone,Computation,RelatedSearches',
        domain: 'youchat',
        queryTraceId: Date.now().toString(),
        chat: {
          messages: [
            {
              author: 'user',
              text: message
            }
          ]
        },
        chatId: Date.now().toString(),
        extras: {
          count: 20,
          offset: 0,
          blockAdvancedEditing: false,
          insights: {
            count: 20,
            offset: 0
          }
        }
      };
    },
    extractResponse: async (response) => {
      // You.com API может возвращать данные в разных форматах
      try {
        const jsonResponse = await response.json();
        
        // Проверяем разные пути получения текста ответа
        if (jsonResponse && jsonResponse.youChatToken && jsonResponse.youChatToken.length > 0) {
          return jsonResponse.youChatToken;
        }
        
        if (jsonResponse && jsonResponse.response && jsonResponse.response.text) {
          return jsonResponse.response.text;
        }
        
        if (jsonResponse && jsonResponse.text) {
          return jsonResponse.text;
        }
        
        throw new Error('Не удалось найти текст ответа в ответе You.com');
      } catch (error) {
        // Пытаемся прочитать как текст, если это не JSON
        try {
          const textResponse = await response.text();
          if (textResponse && textResponse.length > 0) {
            return textResponse;
          }
        } catch (textError) {
          // Игнорируем ошибку чтения текста
        }
        
        throw new Error(`Ошибка при обработке ответа You.com: ${error.message}`);
      }
    }
  },
  
  // DeepInfraChat - бесплатные LLM модели
  DEEPINFRA: {
    name: 'DeepInfra',
    url: 'https://api.deepinfra.com/v1/openai/chat/completions',
    needsKey: false,
    headers: {
      'Content-Type': 'application/json'
    },
    prepareRequest: (message) => {
      return {
        model: "llama-3.1-8b",
        messages: [{ role: "user", content: message }],
        temperature: 0.7,
        stream: false
      };
    },
    extractResponse: async (response) => {
      const jsonResponse = await response.json();
      if (jsonResponse && jsonResponse.choices && jsonResponse.choices.length > 0) {
        return jsonResponse.choices[0].message.content;
      }
      throw new Error('Некорректный ответ от DeepInfra');
    }
  },
  
  // Интеграция с Perplexity AI - дает доступ к текущей информации из интернета
  PERPLEXITY: {
    name: 'Perplexity',
    url: 'https://api.perplexity.ai/chat/completions',
    needsKey: true,
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }),
    prepareRequest: (message) => {
      return {
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content: "Отвечай точно и кратко, используя актуальную информацию из интернета."
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
        top_p: 0.9,
        search_recency_filter: "month",
        stream: false
      };
    },
    extractResponse: async (response) => {
      const jsonResponse = await response.json();
      if (jsonResponse && jsonResponse.choices && jsonResponse.choices.length > 0) {
        const content = jsonResponse.choices[0].message.content;
        const sources = jsonResponse.citations || [];
        
        // Добавляем источники, если они есть
        if (sources && sources.length > 0) {
          const sourcesText = "\n\n**Источники:**\n" + sources.slice(0, 3).map((src, i) => `${i+1}. ${src}`).join('\n');
          return content + sourcesText;
        }
        
        return content;
      }
      throw new Error('Некорректный ответ от Perplexity');
    }
  },
  
  // HuggingFace Inference API - бесплатный доступ к моделям
  HUGGINGFACE: {
    name: 'HuggingFace',
    url: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
    needsKey: false,
    headers: {
      'Content-Type': 'application/json'
    },
    prepareRequest: (message) => {
      return {
        inputs: message,
        parameters: {
          temperature: 0.7,
          max_new_tokens: 512
        }
      };
    },
    extractResponse: async (response) => {
      try {
        const jsonResponse = await response.json();
        if (jsonResponse && jsonResponse[0] && jsonResponse[0].generated_text) {
          return jsonResponse[0].generated_text;
        }
        throw new Error('Неправильный формат ответа');
      } catch (error) {
        throw new Error(`Ошибка при обработке ответа: ${error.message}`);
      }
    }
  },
  
  // FreeGPT4 - бесплатный API для доступа к моделям
  FREEGPT4: {
    name: 'FreeGPT4',
    url: 'https://freegpt4.org/api/generate',
    needsKey: false,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Origin': 'https://freegpt4.org',
      'Referer': 'https://freegpt4.org/'
    },
    prepareRequest: (message) => {
      return {
        prompt: message,
        model: "meta/llama-3-8b-instruct",
        max_tokens: 800,
        temperature: 0.7
      };
    },
    extractResponse: async (response) => {
      const jsonResponse = await response.json();
      if (jsonResponse && jsonResponse.response) {
        return jsonResponse.response;
      }
      throw new Error('Некорректный ответ от FreeGPT4');
    }
  },
  
  // Bing Chat - использует поисковый API Bing для получения ответов
  BING: {
    name: 'Bing Chat',
    url: 'https://www.bing.com/search',
    needsKey: false,
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0'
    },
    prepareRequest: (message) => {
      // В данном случае, мы формируем query параметры напрямую в URL
      // Это GET запрос, и нам не нужен body
      return {};
    },
    modifyUrl: (url, message) => {
      // Добавляем параметры к URL
      return `${url}?q=${encodeURIComponent(message)}&form=QBLH`;
    },
    extractResponse: async (response) => {
      try {
        // Получаем HTML-страницу результата поиска
        const html = await response.text();
        
        // Простая функция для извлечения описания первого результата
        function extractFirstResult(html) {
          // Ищем описание первого результата (простая эвристика)
          const descriptionMatch = html.match(/<p class="b_paractl">(.*?)<\/p>/);
          if (descriptionMatch && descriptionMatch[1]) {
            // Удаляем HTML-теги
            return descriptionMatch[1].replace(/<[^>]*>/g, '');
          }
          
          // Если не нашли конкретное описание, ищем любой текстовый фрагмент с информацией
          const contentMatch = html.match(/<div class="b_caption">(.*?)<\/div>/);
          if (contentMatch && contentMatch[1]) {
            return contentMatch[1].replace(/<[^>]*>/g, '');
          }
          
          return null;
        }
        
        // Получаем первый результат
        const result = extractFirstResult(html);
        
        if (result) {
          return result;
        }
        
        throw new Error('Не удалось извлечь ответ из результатов поиска');
      } catch (error) {
        throw new Error(`Ошибка при обработке ответа от Bing: ${error.message}`);
      }
    }
  },
  
  // Альтернативный сервис для демо-режима
  DEMO: {
    name: 'BOOOMERANGS-Demo',
    url: 'http://localhost:5000', // Фиктивный URL, который не будет использоваться
    needsKey: false,
    prepareRequest: (message) => message,
    extractResponse: async (response) => {
      return response;
    }
  }
}

// Набор предустановленных ответов для демо-режима
const DEMO_RESPONSES = [
  // Приветствия и базовые вопросы
  {
    pattern: /привет|здравствуй|hello|hi/i,
    responses: [
      "Привет! Я BOOOMERANGS AI ассистент. Чем могу помочь вам сегодня?",
      "Здравствуйте! Я ассистент BOOOMERANGS. Готов ответить на вопросы о нашем сервисе или просто поболтать!",
      "Добрый день! BOOOMERANGS AI на связи. Как я могу вам помочь?"
    ]
  },
  
  // О проекте BOOOMERANGS
  {
    pattern: /что такое booomerangs|расскажи о booomerangs|booomerangs это/i,
    responses: [
      "BOOOMERANGS - это инновационный инструмент для работы с искусственным интеллектом, который объединяет возможности текстовых AI-моделей и генерации изображений. С BOOOMERANGS вы можете бесплатно использовать функции, аналогичные ChatGPT и DALL-E, без необходимости платить за подписки или покупать API ключи. Наше приложение работает напрямую в браузере и оптимизировано для использования на мобильных устройствах.",
      "BOOOMERANGS - это мультимодальная AI-платформа, предоставляющая доступ к генерации текста и изображений без необходимости покупки API ключей. Мы используем свободные AI провайдеры, обеспечиваем постоянное переключение между ними для стабильной работы и предлагаем удобный интерфейс для всех устройств."
    ]
  },
  
  // Функциональность и возможности
  {
    pattern: /что ты умеешь|возможности|функции/i,
    responses: [
      "Я умею многое! Вот мои основные возможности:\n\n1. Отвечать на ваши вопросы с использованием современных AI-моделей\n2. Генерировать текстовые описания и контент\n3. Помогать с решением проблем\n4. Давать рекомендации\n\nКроме того, BOOOMERANGS приложение позволяет:\n• Создавать изображения по текстовому описанию\n• Конвертировать изображения в SVG формат\n• Использовать различные AI-провайдеры для получения разнообразных ответов"
    ]
  },
  
  // О генерации изображений
  {
    pattern: /генер.*изображен|созда.*картин|картинк|изображен|рисун|как создать изображение|иллюстрац/i,
    responses: [
      "Для генерации изображений в BOOOMERANGS:\n\n1. Перейдите на вкладку 'Генератор Изображений'\n2. Введите текстовое описание изображения, которое хотите создать\n3. Нажмите кнопку 'Сгенерировать изображение'\n4. Дождитесь результата и используйте полученное изображение\n5. При желании конвертируйте его в SVG формат, нажав соответствующую кнопку\n\nСоветы для лучших результатов:\n• Давайте подробные описания\n• Указывайте стиль (акварель, фотореализм, аниме и т.д.)\n• Используйте слова, описывающие настроение и атмосферу"
    ]
  },
  
  // О технологиях и внутреннем устройстве
  {
    pattern: /технолог|как работает|api|llm|gpt|модел|нейросет|g4f|провайдер/i,
    responses: [
      "BOOOMERANGS использует различные бесплатные AI-провайдеры, работающие через JavaScript и Python интерфейсы. Для генерации изображений применяются свободные API, а для получения текстов - различные LLM модели, доступные без API ключей. Наша система автоматически переключается между провайдерами для обеспечения стабильной работы.",
      "В основе BOOOMERANGS лежат современные AI-технологии с прямым доступом к провайдерам через HTTP запросы. Мы используем You.com, Bing и другие сервисы для обработки текстовых запросов, а также API для генерации изображений с последующей векторизацией через алгоритмы трассировки."
    ]
  },
  
  // SVG конвертация
  {
    pattern: /svg|векториза|трассир|конверт|преобразова/i,
    responses: [
      "BOOOMERANGS позволяет конвертировать растровые изображения в SVG (векторный формат). Для этого:\n\n1. Сначала сгенерируйте изображение или загрузите существующее\n2. Нажмите на кнопку 'Конвертировать в SVG'\n3. После конвертации вы можете скачать SVG файл\n\nПреимущества SVG формата:\n• Масштабируемость без потери качества\n• Меньший размер файла\n• Возможность редактирования в векторных редакторах\n• Лучшая совместимость с веб-сайтами и приложениями"
    ]
  },
  
  // Общие вопросы об искусственном интеллекте
  {
    pattern: /что такое (ии|ai|искусственн.*интеллект|машин.*обучен)/i,
    responses: [
      "Искусственный интеллект (ИИ или AI) - это компьютерные системы, способные выполнять задачи, которые обычно требуют человеческого интеллекта, такие как понимание естественного языка, распознавание образов, обучение и принятие решений. В BOOOMERANGS мы используем различные типы ИИ, включая языковые модели для генерации текста и диффузионные модели для создания изображений."
    ]
  },
  
  // Нейронные сети
  {
    pattern: /нейрон.*сет|нейросет|deep learning|глубок.*обучен/i,
    responses: [
      "Нейронные сети — это вычислительные системы, имитирующие работу нейронов в мозге человека. Они состоят из взаимосвязанных узлов (искусственных нейронов), организованных в слои, которые обрабатывают входные данные и передают результаты на следующие слои. Нейронные сети способны обучаться на примерах, распознавать паттерны и решать сложные задачи, такие как распознавание изображений, обработка естественного языка и генерация контента. В BOOOMERANGS для создания изображений используются специальные типы нейронных сетей — диффузионные модели."
    ]
  },
  
  // ML и типы моделей
  {
    pattern: /машинн.*обучен|ml|модел.*ai|gpt|большие языков.*модел|llm|генератив.*ai/i,
    responses: [
      "Машинное обучение (ML) — это подраздел искусственного интеллекта, который позволяет компьютерам учиться на данных без явного программирования. Существует несколько типов ML-моделей:\n\n• Большие языковые модели (LLM) как GPT и Claude обрабатывают и генерируют текст\n• Диффузионные модели как Stable Diffusion и DALL-E генерируют изображения\n• Мультимодальные модели работают одновременно с текстом, изображениями и другими типами данных\n\nBOOOMERANGS предоставляет доступ к различным моделям через бесплатные API, создавая надежный сервис без необходимости платных ключей."
    ]
  },
  
  // Вопросы о генеративном AI
  {
    pattern: /генеративн.*ai|генеративн.*ии|синтез.*контент|ai арт|нейросет.*искусств/i,
    responses: [
      "Генеративный AI — это системы искусственного интеллекта, которые создают новый контент на основе обучения на существующих данных. Сейчас активно развиваются такие направления как:\n\n• Генерация текста (GPT, Claude, Llama)\n• Создание изображений (DALL-E, Midjourney, Stable Diffusion)\n• Синтез аудио и музыки (MusicLM, Bark)\n• Генерация видео (Sora, Gen-2)\n\nBOOOMERANGS предоставляет доступ к генеративным AI-моделям для создания текста и изображений через единый интерфейс, причем полностью бесплатно!"
    ]
  },
  
  // О мобильной версии
  {
    pattern: /мобильн|телефон|смартфон|андроид|iphone|ios/i,
    responses: [
      "BOOOMERANGS полностью адаптирован для мобильных устройств! Вы можете использовать все функции нашего приложения (генерацию текста и изображений, конвертацию в SVG) прямо в браузере вашего смартфона или планшета. Интерфейс оптимизирован для сенсорного ввода и отзывчив на любых размерах экрана."
    ]
  },
  
  // О генерации текста
  {
    pattern: /генер.*текс|написа|сочин|созда.*текст|копирайт/i,
    responses: [
      "BOOOMERANGS позволяет генерировать разнообразный текстовый контент. Просто введите запрос с описанием того, что вы хотите получить - от коротких ответов на вопросы до развернутых текстов. Модели, используемые в BOOOMERANGS, могут помочь с:\n\n• Созданием креативных текстов\n• Структурированием информации\n• Генерацией идей\n• Переводом и перефразированием\n• Составлением планов и списков\n\nПопробуйте задать более конкретный запрос, чтобы увидеть, на что способен наш AI!"
    ]
  }
];

// Функция для получения ответа из демо-режима
function getDemoResponse(message) {
  // Ищем подходящий паттерн
  for (const template of DEMO_RESPONSES) {
    if (template.pattern.test(message)) {
      // Выбираем случайный ответ из доступных
      const randomIndex = Math.floor(Math.random() * template.responses.length);
      return template.responses[randomIndex];
    }
  }
  
  // Общий ответ, если ни один паттерн не подошел
  return "Я BOOOMERANGS AI ассистент. К сожалению, внешние AI-провайдеры сейчас недоступны, но я все равно могу помочь с базовой информацией о BOOOMERANGS и подсказать, как использовать генератор изображений!";
}

// Функция для получения ответа от провайдера с таймаутом
async function getProviderResponseWithTimeout(providerKey, message, timeoutMs = 8000) {
  try {
    return await Promise.race([
      getProviderResponse(providerKey, message),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Таймаут запроса к ${providerKey} (${timeoutMs}мс)`)), timeoutMs)
      )
    ]);
  } catch (error) {
    console.error(`Ошибка получения ответа от ${providerKey}:`, error.message);
    throw error;
  }
}

// Функция для попытки получения ответа от провайдера с обработкой ошибок
async function tryProvider(providerKey, message, options = {}) {
  // Проверка существования провайдера
  if (!AI_PROVIDERS[providerKey]) {
    console.log(`Провайдер ${providerKey} не найден`);
    return null;
  }
  
  const provider = AI_PROVIDERS[providerKey];
  console.log(`Попытка использования провайдера ${provider.name}...`);
  
  // Специальная обработка для демо-провайдера
  if (providerKey === 'DEMO') {
    console.log('Использую демо-режим напрямую');
    return {
      response: getDemoResponse(message),
      provider: 'BOOOMERANGS-Demo',
      model: 'demo-mode'
    };
  }
  
  // Проверка наличия API ключа для провайдеров, которые его требуют
  if (provider.needsKey) {
    const apiKey = options.apiKey || process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.log(`❌ ${provider.name} требует API ключ, но он не предоставлен`);
      return null;
    }
  }
  
  try {
    // Подготовка запроса
    const requestData = provider.prepareRequest(message);
    
    // Подготовка заголовков с учетом API ключа
    let headers;
    if (provider.needsKey && typeof provider.headers === 'function') {
      const apiKey = options.apiKey || process.env.PERPLEXITY_API_KEY;
      headers = provider.headers(apiKey);
    } else {
      headers = provider.headers || { 'Content-Type': 'application/json' };
    }
    
    // Проверяем, нужно ли модифицировать URL (для GET запросов)
    let url = provider.url;
    let method = 'POST';
    let body = JSON.stringify(requestData);
    
    // Если провайдер поддерживает modifyUrl, используем GET запрос
    if (provider.modifyUrl) {
      url = provider.modifyUrl(url, message);
      method = 'GET';
      body = undefined; // GET запросы не имеют тела
    }
    
    // Выполнение запроса с учетом метода
    const response = await fetch(url, {
      method: method,
      headers: headers,
      body: body
    });
    
    // Проверка успешности запроса
    if (!response.ok) {
      throw new Error(`Статус ответа: ${response.status} ${response.statusText}`);
    }
    
    // Извлечение ответа
    const responseText = await provider.extractResponse(response);
    
    // Проверка на пустой или некорректный ответ
    if (!responseText || responseText.trim() === '') {
      throw new Error('Получен пустой ответ');
    }
    
    // Успешный ответ
    console.log(`✅ ${provider.name} успешно ответил`);
    return {
      response: responseText,
      provider: provider.name,
      model: provider.name === 'Perplexity' ? 'llama-3.1-sonar' : 'external-api'
    };
  } catch (error) {
    console.error(`❌ ${provider.name} не отвечает:`, error.message);
    return null; // Возвращаем null в случае ошибки
  }
}

// Основная функция для получения ответа от конкретного провайдера
async function getProviderResponse(providerKey, message) {
  // Если запрошен демо-режим, возвращаем предустановленный ответ
  if (providerKey === 'DEMO' || !AI_PROVIDERS[providerKey]) {
    return {
      response: getDemoResponse(message),
      provider: 'BOOOMERANGS-Demo',
      model: 'demo-mode'
    };
  }
  
  const provider = AI_PROVIDERS[providerKey];
  console.log(`Отправка запроса к провайдеру ${provider.name}...`);
  
  try {
    // Используем улучшенную функцию tryProvider
    const result = await tryProvider(providerKey, message);
    
    if (result) {
      return result;
    }
    
    // Если результат не получен, выбрасываем ошибку
    throw new Error(`Не удалось получить ответ от ${provider.name}`);
  } catch (error) {
    console.error(`Ошибка при обращении к провайдеру ${provider.name}:`, error.message);
    throw error;
  }
}

// Функция для каскадного перебора провайдеров
async function getChatResponse(message, options = {}) {
  const { specificProvider = null, timeout = 10000 } = options;
  
  // Если запрошен демо-режим, сразу возвращаем демо-ответ
  if (specificProvider === 'DEMO') {
    console.log('Использую демо-режим по запросу');
    return {
      response: getDemoResponse(message),
      provider: 'BOOOMERANGS-Demo',
      model: 'demo-mode'
    };
  }
  
  // Проверка конкретного запрошенного провайдера
  if (specificProvider && AI_PROVIDERS[specificProvider] && specificProvider !== 'DEMO') {
    console.log(`Пробуем получить ответ от указанного провайдера ${specificProvider}...`);
    try {
      // Для Yew-Bot провайдера, который часто недоступен, сокращаем таймаут
      const providerTimeout = specificProvider === 'YOU' ? Math.min(5000, timeout) : timeout;
      
      // Используем tryProvider с таймаутом для конкретного провайдера
      const result = await Promise.race([
        tryProvider(specificProvider, message, options),
        new Promise((resolve) => setTimeout(() => resolve(null), providerTimeout))
      ]);
      
      if (result) {
        console.log(`✅ Успешно получен ответ от ${result.provider}`);
        return result;
      }
      
      console.log(`❌ Указанный провайдер ${specificProvider} не ответил в течение ${providerTimeout}мс`);
      // Продолжаем со следующими провайдерами
    } catch (error) {
      console.log(`❌ Указанный провайдер ${specificProvider} недоступен:`, error.message);
      // Продолжаем со следующими провайдерами
    }
  }
  
  // Проверяем, хотим ли мы сразу использовать демо-режим (для тестирования)
  if (options.forceDemo === true) {
    console.log('Использую демо-режим по запросу (forceDemo=true)');
    return {
      response: getDemoResponse(message),
      provider: 'BOOOMERANGS-Demo',
      model: 'demo-mode'
    };
  }
  
  // Специальная обработка для демо-провайдера (избегаем сетевых запросов)
  const demoResponse = {
    response: getDemoResponse(message),
    provider: 'BOOOMERANGS-Demo',
    model: 'demo-mode'
  };
  
  // Массив провайдеров, которые будем пробовать по очереди с короткими таймаутами
  const providersToPrioritize = [
    { key: 'YOUCOM', timeout: 5000, name: 'You.com API' },
    { key: 'LIAOBOTS', timeout: 4000, name: 'Liaobots API' },
    { key: 'FREEGPT4', timeout: 4000, name: 'FreeGPT4 API' },
    { key: 'DEEPINFRA', timeout: 4000, name: 'DeepInfra API' }
  ];
  
  // Перебираем приоритетные провайдеры
  for (const provider of providersToPrioritize) {
    console.log(`🔄 Пробуем получить ответ от провайдера ${provider.name}...`);
    try {
      const result = await Promise.race([
        tryProvider(provider.key, message, options),
        new Promise((resolve) => setTimeout(() => resolve(null), provider.timeout))
      ]);
      
      if (result) {
        console.log(`✅ Успешно получен ответ от ${result.provider}`);
        return result;
      }
      
      console.log(`❌ Провайдер ${provider.name} не ответил в течение ${provider.timeout}мс`);
    } catch (error) {
      console.log(`❌ Ошибка при использовании провайдера ${provider.name}:`, error.message);
    }
  }
  
  // Если все провайдеры недоступны, возвращаем демо-ответ
  console.log('⚠️ Все провайдеры недоступны, используем демо-режим');
  return demoResponse;
}

// Экспортируем функции для использования
module.exports = {
  getChatResponse,
  getDemoResponse,
  tryProvider,
  AI_PROVIDERS
};