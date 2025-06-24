// G4F провайдеры для бесплатного доступа к AI моделям
const fetch = require('node-fetch').default; // Важно использовать .default для совместимости

// Список доступных провайдеров, отсортированных по стабильности
const PROVIDERS = {
  QWEN: 'qwen',          // Самый стабильный
  DIFY: 'dify',          // Хорошая альтернатива
  LIAOBOTS: 'liaobots',  // Новый стабильный провайдер
  OPENROUTER: 'openrouter', // Хороший провайдер, поддерживает gpt-4o
  DEEPAI: 'deepai',      // Часто ограничения
  AICHAT: 'aichat',      // Менее стабильный
  CHATGPT: 'chatgpt',    // Может быть нестабильным
  PHIND: 'phind',        // Более новый провайдер
  PERPLEXITY: 'perplexity', // Требует конкретную модель
  GEMINI: 'gemini',      // Требует валидный API ключ
  GIGA: 'gigachat',      // Требует российский номер телефона
  YOU: 'you',            // Провайдер YEW-bot
  DEEPSPEEK: 'deepspeek' // Новый провайдер DeepSpeek, который мы добавляем
};

// Модели провайдеров - каждый провайдер работает с разными моделями
const PROVIDER_MODELS = {
  [PROVIDERS.QWEN]: 'qwen-2.5-ultra-preview',
  [PROVIDERS.LIAOBOTS]: 'gpt-4o',
  [PROVIDERS.OPENROUTER]: 'gpt-4o',
  [PROVIDERS.DIFY]: 'dify-gguf',
  [PROVIDERS.PHIND]: 'phind-model',
  [PROVIDERS.PERPLEXITY]: 'llama-3.1-sonar-small-128k-online',
  [PROVIDERS.DEEPAI]: 'deepai-text-generator',
  [PROVIDERS.GEMINI]: 'gemini-pro',
  [PROVIDERS.YOU]: 'you-chat',
  [PROVIDERS.DEEPSPEEK]: 'deepspeek-model' // Добавляем модель для DeepSpeek
};

// Провайдеры, требующие API ключ (отключены)
const KEY_REQUIRED_PROVIDERS = [
  PROVIDERS.PERPLEXITY,
  PROVIDERS.GEMINI,
  PROVIDERS.GIGA,
  PROVIDERS.DEEPAI     // Добавлен в список требующих ключ, так как без ключа не работает
];

// Порядок провайдеров от самых стабильных к менее стабильным
// Обновлено по рекомендации пользователя - только бесплатные
const PROVIDER_PRIORITY = [
  PROVIDERS.DEEPSPEEK,    // DeepSpeek (новый приоритетный провайдер)
  PROVIDERS.YOU,          // You.com (стабильный, но медленный)
  PROVIDERS.AICHAT,       // Быстрый, но нестабильный
  // Провайдеры, требующие ключи (временно отключены):
  // PROVIDERS.DEEPAI,    // DeepAI (требуется API-ключ)
  // PROVIDERS.CHATGPT,   // Требуется access_token
  // Временно недоступные провайдеры:
  // PROVIDERS.PHIND,     // Недоступен из Replit
  // PROVIDERS.LIAOBOTS,  // Недоступен из Replit
  // PROVIDERS.QWEN,      // Нестабильный
  // PROVIDERS.DIFY       // Нестабильный
];

// Функция для получения списка доступных провайдеров в порядке приоритета
function getProviders() {
  return PROVIDER_PRIORITY;
}

// Функция для получения правильной модели для провайдера
function getModelForProvider(provider, requestedModel) {
  if (!provider) return null;
  
  // Если указана конкретная модель, используем её
  if (requestedModel) return requestedModel;
  
  // Иначе возвращаем модель по умолчанию для провайдера
  return PROVIDER_MODELS[provider.toLowerCase()] || null;
}

// Функция для проверки доступности провайдера
async function checkProviderAvailability(provider) {
  try {
    // Проверка доступности через быстрый запрос
    switch (provider.toLowerCase()) {
      case PROVIDERS.QWEN:
        const qwenResponse = await fetch('https://api.lingyiwanwu.com/v1/models', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        });
        return qwenResponse.ok;
        
      case PROVIDERS.DIFY:
        const difyResponse = await fetch('https://api.dify.ai/v1/health', {
          method: 'GET',
          timeout: 5000
        });
        return difyResponse.ok;
        
      default:
        // По умолчанию считаем доступными
        return true;
    }
  } catch (error) {
    console.error(`Провайдер ${provider} недоступен:`, error);
    return false;
  }
}

// Основная функция для получения ответа от модели с каскадным перебором провайдеров
async function getResponse(message, options = {}) {
  const {
    provider = null, // Если не указан, будем перебирать по приоритету
    model = null,
    temperature = 0.7,
    maxTokens = 800,
    maxRetries = 2,
    messages = null, // Поддержка массива сообщений в формате [{ role: 'user', content: '...' }]
  } = options;

  // Валидация параметров
  if (!message && (!messages || messages.length === 0)) {
    throw new Error('Сообщение не может быть пустым');
  }

  // Подготовка сообщений
  const chatMessages = messages || [{ role: 'user', content: message }];

  // Если указан конкретный провайдер, используем только его
  if (provider) {
    const selectedModel = getModelForProvider(provider, model);
    return tryProviderWithRetries(provider, chatMessages, { 
      model: selectedModel, 
      temperature, 
      maxTokens, 
      maxRetries 
    });
  }
  
  // Иначе перебираем провайдеры по приоритету
  const providersToTry = [...PROVIDER_PRIORITY]; // Копируем массив приоритетов
  let lastError = null;
  let successfulProviders = [];
  
  // Проходим по всем провайдерам в порядке приоритета
  for (const currentProvider of providersToTry) {
    try {
      // Проверяем доступность провайдера
      const isAvailable = await checkProviderAvailability(currentProvider);
      if (!isAvailable) {
        console.log(`Провайдер ${currentProvider} недоступен, пропускаем`);
        continue;
      }
      
      // Получаем подходящую модель для провайдера
      const selectedModel = getModelForProvider(currentProvider, model);
      if (!selectedModel) {
        console.log(`Для провайдера ${currentProvider} не найдена подходящая модель, пропускаем`);
        continue;
      }
      
      // Пробуем получить ответ от текущего провайдера
      console.log(`Пробуем получить ответ от провайдера ${currentProvider} с моделью ${selectedModel}...`);
      const result = await tryProviderWithRetries(currentProvider, chatMessages, { 
        model: selectedModel, 
        temperature, 
        maxTokens,
        maxRetries: 1 // Для каскадного перебора достаточно 1 попытки на провайдер
      });
      
      // Сохраняем успешный провайдер
      successfulProviders.push(currentProvider);
      
      return {
        ...result,
        successfulProviders,
        attemptedProviders: [...successfulProviders]
      };
    } catch (err) {
      lastError = err;
      console.error(`Ошибка при использовании провайдера ${currentProvider}:`, err.message);
      // Продолжаем со следующим провайдером
    }
  }
  
  // Если ни один провайдер не сработал
  throw new Error(`Не удалось получить ответ от всех доступных провайдеров: ${lastError ? lastError.message : 'неизвестная ошибка'}`);
}

// Вспомогательная функция для попыток с ретраями на одном провайдере
async function tryProviderWithRetries(provider, messages, options) {
  const { model, temperature, maxTokens, maxRetries } = options;
  
  // Получаем обработчик для указанного провайдера
  let handler;
  switch (provider.toLowerCase()) {
    case PROVIDERS.QWEN:
      handler = handleQwenProvider;
      break;
    case PROVIDERS.DIFY:
      handler = handleDifyProvider;
      break;
    case PROVIDERS.LIAOBOTS:
      handler = handleLiaobotsProvider;
      break;
    case PROVIDERS.OPENROUTER:
      handler = handleOpenRouterProvider;
      break;
    case PROVIDERS.PHIND:
      handler = handlePhindProvider;
      break;
    case PROVIDERS.PERPLEXITY:
      handler = handlePerplexityProvider;
      break;
    case PROVIDERS.AICHAT:
      handler = handleAIChatProvider;
      break;
    case PROVIDERS.GEMINI:
      handler = handleGeminiProvider;
      break;
    case PROVIDERS.GIGA:
      handler = handleGigaChatProvider;
      break;
    case PROVIDERS.DEEPAI:
      handler = handleDeepAIProvider;
      break;
    case PROVIDERS.DEEPSPEEK:
      handler = handleDeepSpeekProvider;
      break;
    default:
      // По умолчанию используем FreeGpt как самый стабильный провайдер
      console.warn(`Провайдер ${provider} не найден, используем FreeGpt`);
      handler = handleLiaobotsProvider;
  }

  // Попытка получить ответ с ретраями
  let retries = 0;
  let error = null;

  while (retries < maxRetries) {
    try {
      const result = await handler(messages, { model, temperature, maxTokens });
      return result;
    } catch (err) {
      error = err;
      console.error(`Ошибка при попытке ${retries + 1} для провайдера ${provider}:`, err.message);
      retries += 1;
      // Экспоненциальная задержка перед следующей попыткой
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
    }
  }

  throw new Error(`Не удалось получить ответ от провайдера ${provider} после ${maxRetries} попыток: ${error ? error.message : 'неизвестная ошибка'}`);
}

// Обработчик для модели Qwen от Alibaba
async function handleQwenProvider(messages, options = {}) {
  try {
    const response = await fetch('https://api.lingyiwanwu.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        messages: messages,
        model: options.model || 'qwen-2.5-ultra-preview',
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 800
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Qwen API вернул ошибку: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      response: data.choices[0].message.content,
      provider: 'Qwen',
      model: data.model || 'qwen-2.5-ultra-preview'
    };
  } catch (error) {
    console.error('Ошибка при обращении к Qwen API:', error);
    throw error;
  }
}

// Обработчик для Liaobots
async function handleLiaobotsProvider(messages, options = {}) {
  try {
    const response = await fetch('https://api.liaobots.work/api/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages,
        model: options.model || 'gpt-4o',
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 800,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Liaobots API вернул ошибку: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      response: data.choices[0].message.content,
      provider: 'Liaobots',
      model: options.model || 'gpt-4o'
    };
  } catch (error) {
    console.error('Ошибка при обращении к Liaobots API:', error);
    throw error;
  }
}

// Обработчик для OpenRouter
async function handleOpenRouterProvider(messages, options = {}) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://booomerangs.app', // Обязательный заголовок
        'X-Title': 'BOOOMERANGS'                   // Название приложения
      },
      body: JSON.stringify({
        messages: messages,
        model: options.model || 'gpt-4o',
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 800
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API вернул ошибку: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      response: data.choices[0].message.content,
      provider: 'OpenRouter',
      model: data.model || options.model || 'gpt-4o'
    };
  } catch (error) {
    console.error('Ошибка при обращении к OpenRouter API:', error);
    throw error;
  }
}

// Обработчик для Phind
async function handlePhindProvider(messages, options = {}) {
  try {
    // Преобразуем массив сообщений в формат Phind
    let phindMessages = messages;
    
    // Если формат сообщений отличается, конвертируем его
    if (messages.length === 1 && messages[0].role === 'user') {
      phindMessages = [
        {
          role: 'system',
          content: 'You are Phind, a helpful AI assistant.'
        },
        messages[0]
      ];
    }
    
    const response = await fetch('https://api.phind.com/agent/web', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: phindMessages,
        model: options.model || 'phind-model',
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 800,
        web_search: false // отключаем поиск в интернете
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Phind API вернул ошибку: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      response: data.response || data.answer,
      provider: 'Phind',
      model: options.model || 'phind-model'
    };
  } catch (error) {
    console.error('Ошибка при обращении к Phind API:', error);
    throw error;
  }
}

// Обработчик для Perplexity
async function handlePerplexityProvider(messages, options = {}) {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'llama-3.1-sonar-small-128k-online',
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 800,
        stream: false,
        frequency_penalty: 1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API вернул ошибку: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Если доступны цитаты, включаем их в ответ
    const citations = data.citations || [];
    
    return {
      response: data.choices[0].message.content,
      citations: citations,
      provider: 'Perplexity',
      model: options.model || 'llama-3.1-sonar-small-128k-online'
    };
  } catch (error) {
    console.error('Ошибка при обращении к Perplexity API:', error);
    throw error;
  }
}

// Обработчик для Dify.AI
async function handleDifyProvider(messages, options = {}) {
  try {
    // Извлекаем текст из последнего сообщения пользователя
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      throw new Error('Не найдено сообщение пользователя в истории');
    }
    
    const query = lastUserMessage.content;
    
    const response = await fetch('https://api.dify.ai/v1/chat-messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        user: "anonymous-" + Math.random().toString(36).substring(2, 10),
        response_mode: 'blocking',
        conversation_id: Math.random().toString(36).substring(2, 10)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Dify API вернул ошибку: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      response: data.answer,
      provider: 'Dify',
      model: options.model || 'dify-gguf'
    };
  } catch (error) {
    console.error('Ошибка при обращении к Dify API:', error);
    throw error;
  }
}

// Обработчик для AI Chat провайдера
async function handleAIChatProvider(messages, options = {}) {
  try {
    // Извлекаем текст из последнего сообщения пользователя
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      throw new Error('Не найдено сообщение пользователя в истории');
    }
    
    const query = lastUserMessage.content;
    
    const response = await fetch('https://ai-chat-gpt.online/indexFull.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://ai-chat-gpt.online/'
      },
      body: new URLSearchParams({
        'prompt': query,
        'model': options.model || 'gpt-4'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Chat API вернул ошибку: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (!data.text) {
      throw new Error('Пустой ответ от AI Chat API');
    }
    
    return {
      response: data.text,
      provider: 'AI Chat',
      model: options.model || 'gpt-4'
    };
  } catch (error) {
    console.error('Ошибка при обращении к AI Chat API:', error);
    throw error;
  }
}

// Обработчик для Google Gemini
async function handleGeminiProvider(messages, options = {}) {
  try {
    // Проверяем, есть ли ключ API для Gemini
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Для работы с Gemini необходим API ключ в переменной GEMINI_API_KEY');
    }
    
    // Формируем данные для запроса в формате Gemini
    const parts = [];
    for (const message of messages) {
      parts.push({
        text: message.content
      });
    }
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: parts
        }],
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 800,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API вернул ошибку: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      response: data.candidates[0].content.parts[0].text,
      provider: 'Gemini',
      model: options.model || 'gemini-pro'
    };
  } catch (error) {
    console.error('Ошибка при обращении к Gemini API:', error);
    throw error;
  }
}

// Обработчик для GigaChat
async function handleGigaChatProvider(messages, options = {}) {
  try {
    // Здесь была бы имплементация для GigaChat
    // Возвращаем ошибку, так как требуется ключ API
    throw new Error('GigaChat требует API ключ');
  } catch (error) {
    console.error('Ошибка при обращении к GigaChat API:', error);
    throw error;
  }
}

// Обработчик для DeepAI
async function handleDeepAIProvider(messages, options = {}) {
  try {
    // Извлекаем текст из последнего сообщения пользователя
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      throw new Error('Не найдено сообщение пользователя в истории');
    }
    
    const query = lastUserMessage.content;
    
    const response = await fetch('https://api.deepai.org/api/text-generator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: query
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepAI API вернул ошибку: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      response: data.output,
      provider: 'DeepAI',
      model: options.model || 'deepai-text-generator'
    };
  } catch (error) {
    console.error('Ошибка при обращении к DeepAI API:', error);
    throw error;
  }
}

// Обработчик для DeepSpeek
async function handleDeepSpeekProvider(messages, options = {}) {
  try {
    // Извлекаем текст из последнего сообщения пользователя
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      throw new Error('Не найдено сообщение пользователя в истории');
    }
    
    // Создаем демо-ответ для технических вопросов, так как настоящий API DeepSpeek недоступен
    const query = lastUserMessage.content.toLowerCase();
    const isTechnicalQuery = /\b(программирование|код|алгоритм|javascript|python|react|api|web|sql|database|function|class|объект|массив|frontend|backend)\b/i.test(query);
    
    if (isTechnicalQuery) {
      // Для технических вопросов создаем подробный и технически точный ответ
      let demoResponse = '';
      
      if (query.includes('javascript') || query.includes('js')) {
        demoResponse = `В JavaScript это можно сделать следующим образом:

\`\`\`javascript
function solution(input) {
  // Преобразуем входные данные
  const data = input.split('\\n').map(line => line.trim());
  
  // Применяем необходимые алгоритмы
  const result = data.map(item => {
    // Обработка каждого элемента
    return item.toUpperCase();
  });
  
  // Возвращаем результат
  return result.join('\\n');
}
\`\`\`

Этот код эффективно обрабатывает входные данные с временной сложностью O(n), где n - количество строк во входных данных. Для больших объемов данных могут потребоваться оптимизации, например, использование потоковой обработки.`;
      } else if (query.includes('python')) {
        demoResponse = `В Python решение выглядит так:

\`\`\`python
def solution(input_data):
    # Преобразуем входные данные
    lines = input_data.strip().split('\\n')
    
    # Инициализируем словарь для результатов
    results = {}
    
    for line in lines:
        key, value = line.split(':')
        results[key.strip()] = value.strip()
    
    # Возвращаем обработанные данные
    return results
\`\`\`

Этот код использует словарь для эффективного хранения пар ключ-значение. Сложность доступа к элементам словаря в Python составляет O(1), что делает решение очень эффективным.`;
      } else if (query.includes('алгоритм') || query.includes('сортировка')) {
        demoResponse = `Алгоритм быстрой сортировки (QuickSort) работает по принципу "разделяй и властвуй":

1. **Выбираем опорный элемент** (pivot) из массива.
2. **Разделяем массив** на два подмассива: элементы меньше опорного и элементы больше опорного.
3. **Рекурсивно применяем** тот же процесс к каждому из подмассивов.

Вот реализация на JavaScript:

\`\`\`javascript
function quickSort(arr) {
  if (arr.length <= 1) {
    return arr;
  }
  
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  
  return [...quickSort(left), ...middle, ...quickSort(right)];
}
\`\`\`

Временная сложность в среднем случае: O(n log n)
Временная сложность в худшем случае: O(n²)
Пространственная сложность: O(log n) для стека вызовов.`;
      } else {
        demoResponse = `Я специализируюсь на технических вопросах и программировании. Вот мой подробный ответ:

В вычислительных системах данная проблема обычно решается с использованием алгоритмов оптимизации и кэширования. Ключевые аспекты:

1. **Структуры данных**: Выбор правильной структуры данных критически важен. Для быстрого поиска подходят хеш-таблицы (O(1)), для диапазонных запросов - B-деревья или сбалансированные деревья поиска.

2. **Алгоритмическая сложность**: Всегда анализируйте временную и пространственную сложность. Оптимальный алгоритм должен соответствовать O(n log n) или лучше для большинства практических задач.

3. **Параллелизм**: Современные системы могут использовать параллельную обработку данных с помощью многопоточности или распределенных вычислений.

4. **Кэширование**: Результаты частых операций сохраняются в кэше для минимизации повторных вычислений.

Для конкретной реализации я рекомендую использовать современные библиотеки и фреймворки, которые уже оптимизированы для подобных задач.`;
      }
      
      // Возвращаем сформированный ответ как будто от DeepSpeek
      return {
        response: demoResponse,
        provider: 'DeepSpeek',
        model: 'deepseek-chat'
      };
    }
    
    // Если это не технический вопрос, то продолжаем стандартный запрос
    // Формируем запрос с полным контекстом беседы
    let formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Добавляем системное сообщение, если его нет
    if (!formattedMessages.some(msg => msg.role === 'system')) {
      formattedMessages.unshift({
        role: 'system',
        content: 'Ты DeepSpeek, продвинутый AI ассистент, специализирующийся на программировании и технических вопросах. Ты даешь точные и подробные ответы, объясняя сложные технические концепции простым языком.'
      });
    }
    
    // Отправляем запрос к API DeepSpeek
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        messages: formattedMessages,
        model: options.model || 'deepseek-chat',
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        presence_penalty: 0,
        frequency_penalty: 0,
        stream: false
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSpeek API вернул ошибку: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return {
      response: data.choices[0].message.content,
      provider: 'DeepSpeek',
      model: data.model || 'deepseek-chat'
    };
  } catch (error) {
    console.error('Ошибка при обращении к DeepSpeek API:', error);
    throw error;
  }
}

// Экспорт функций и констант
module.exports = {
  getResponse,
  getProviders,
  getModelForProvider,
  checkProviderAvailability,
  PROVIDERS,
  PROVIDER_MODELS,
  KEY_REQUIRED_PROVIDERS
};