import { useState, useRef, useEffect } from "react";
import BooomerangsLogo from "@/components/BooomerangsLogo";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Функция для получения иконки провайдера в метаданных
const getProviderIcon = (provider?: string) => {
  // Преобразуем название провайдера к нижнему регистру для сравнения
  const providerName = provider?.toLowerCase() || '';
  
  switch(providerName) {
    case 'deepspeek':
      return <span className="mr-1">👨‍💻</span>;
    case 'claude':
    case 'anthropic':
      return <span className="mr-1">🪃</span>;
    case 'chatfree':
      return <span className="mr-1">💬</span>;
    case 'deepinfra':
      return <span className="mr-1">🧠</span>;
    case 'qwen':
    case 'aitianhu':
      return <span className="mr-1">🚀</span>;
    case 'ollama':
      return <span className="mr-1">🦙</span>;
    case 'phind':
      return <span className="mr-1">📚</span>;
    default:
      return <span className="mr-1">🪃</span>;
  }
}

// Функция для получения аватара провайдера в кружке
const getProviderAvatar = (provider?: string) => {
  const providerName = provider?.toLowerCase() || '';
  
  switch(providerName) {
    case 'deepspeek':
      return "👨‍💻";
    case 'claude':
    case 'anthropic':
      return "C";
    case 'chatfree':
      return "CF";
    case 'deepinfra':
      return "DI";
    case 'qwen':
    case 'aitianhu':
      return "Q";
    case 'ollama':
      return "🦙";
    case 'phind':
      return "P";
    default:
      return "B";
  }
}

// Функция для получения градиента фона аватара провайдера
const getProviderGradient = (provider?: string) => {
  const providerName = provider?.toLowerCase() || '';
  
  switch(providerName) {
    case 'deepspeek':
      return 'linear-gradient(135deg, #4f46e5, #3b82f6)'; // Indigo to blue
    case 'claude':
    case 'anthropic':
      return 'linear-gradient(135deg, #7c3aed, #8b5cf6)'; // Purple shades
    case 'chatfree':
      return 'linear-gradient(135deg, #0ea5e9, #38bdf8)'; // Sky blue shades
    case 'deepinfra':
      return 'linear-gradient(135deg, #475569, #64748b)'; // Slate shades
    case 'qwen':
    case 'aitianhu':
      return 'linear-gradient(135deg, #ef4444, #f87171)'; // Red shades
    case 'ollama':
      return 'linear-gradient(135deg, #16a34a, #4ade80)'; // Green shades
    case 'phind':
      return 'linear-gradient(135deg, #eab308, #facc15)'; // Yellow shades
    default:
      return 'linear-gradient(135deg, #8b5cf6, #6366f1)'; // Default gradient
  }
}

// Тип данных для сообщений
interface Message {
  id: number;
  text: string;
  sender: "user" | "ai";
  model?: string;
  provider?: string;
  backupInfo?: string;
  time: string;
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Автоматическая прокрутка вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Состояние для выбранного провайдера
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  // Функция для автоматического определения наилучшего провайдера
  const detectBestProvider = (message: string): string | null => {
    message = message.toLowerCase();
    
    // Технические вопросы и код - Phind или DeepInfra
    const techKeywords = ["код", "программирование", "javascript", "python", "java", "c++", "api", 
                         "функция", "coding", "programming", "code", "algorithm", "database", "git",
                         "разработка", "development", "framework", "библиотека", "library", "debug",
                         "баг", "ошибка", "error", "exception", "компилятор", "compiler"];
    
    if (techKeywords.some(keyword => message.includes(keyword))) {
      return 'Phind'; // Phind отлично справляется с вопросами о коде
    }
    
    // Образование, наука, глубокий анализ - Claude или DeepInfra
    const scienceKeywords = ["наука", "исследование", "образование", "учеба", "история", 
                           "физика", "химия", "математика", "research", "science", "education", "math",
                           "анализ", "мышление", "логика", "философия", "ethics", "сравнение", "обоснование",
                           "аргументы", "доказательство", "гипотеза", "теория"];
    
    if (scienceKeywords.some(keyword => message.includes(keyword))) {
      return Math.random() > 0.5 ? 'Claude' : 'DeepInfra';
    }
    
    // Актуальная информация с поиском - Perplexity или You
    const infoKeywords = ["новости", "последние", "актуально", "сегодня", "текущий", "recent",
                         "news", "information", "событие", "аналитика", "прогноз", "текущий год",
                         "данные", "статистика", "инфографика"];
    
    if (infoKeywords.some(keyword => message.includes(keyword))) {
      return 'Perplexity';
    }
    
    // Длинные сложные вопросы или творческие задачи - Claude или Qwen
    if (message.length > 150 || 
        message.includes("сложн") || 
        message.includes("творчес") || 
        message.includes("креатив") ||
        message.includes("complex") ||
        message.includes("creative")) {
      return 'Claude';
    }
    
    // По умолчанию: FreeChat (каскадная система выберет лучший доступный провайдер)
    return 'FreeChat';
  };

  // Функция для отправки сообщения к AI провайдеру
  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!newMessage.trim()) return;
    
    // Добавляем сообщение пользователя
    const userMessage: Message = {
      id: Date.now(),
      text: newMessage,
      sender: "user",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    setIsLoading(true);
    
    try {
      let endpoint = "/api/ai/chat";
      let requestData: any = { message: newMessage };
      
      // Если провайдер не выбран вручную, используем автоматический выбор
      const effectiveProvider = selectedProvider || detectBestProvider(newMessage);
      
      // Выбираем API в зависимости от выбранного или определенного провайдера
      if (effectiveProvider) {
        switch(effectiveProvider.toLowerCase()) {
          case 'freechat':
            endpoint = "/api/freechat/chat";
            break;
          case 'deepspeek':
            endpoint = "/api/deepspeek/chat";
            break;
          case 'claude':
            endpoint = "/api/claude/chat";
            break;
          case 'deepinfra':
            endpoint = "/api/deepinfra/chat";
            break;
          case 'phind':
            requestData = { message: newMessage, provider: 'phind' };
            break;
          case 'qwen':
            requestData = { message: newMessage, provider: 'qwen' };
            break;
          default:
            // Если что-то пошло не так, используем стандартный автоматический выбор
            break;
        }
      }
      
      // Показываем пользователю, какой провайдер автоматически выбран (если это автоматический режим)
      if (!selectedProvider && effectiveProvider) {
        setIsLoading(true);
        // Временно показываем выбранного провайдера
        const autoDetectMessage: Message = {
          id: Date.now() + 0.5,
          text: `💡 Определен лучший провайдер для вашего вопроса: ${effectiveProvider}`,
          sender: "ai",
          model: "Auto-Detect",
          provider: "System",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages(prev => [...prev, autoDetectMessage]);
        
        // Делаем небольшую паузу, чтобы пользователь успел увидеть сообщение
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    
      // Отправляем запрос к выбранному API
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Добавляем ответ от AI с информацией о провайдере
        const aiMessage: Message = {
          id: Date.now() + 1,
          text: data.response,
          sender: "ai",
          model: data.model || "Unknown",
          provider: data.provider || "Unknown",
          backupInfo: data.backupInfo,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages(prev => [...prev, aiMessage]);
      } else {
        // Обработка ошибки
        const errorMessage: Message = {
          id: Date.now() + 1,
          text: `Извините, произошла ошибка при получении ответа: ${data.error || "Неизвестная ошибка"}. Пожалуйста, попробуйте еще раз или выберите другого провайдера.`,
          sender: "ai",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      // Обработка ошибки
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: "Произошла ошибка при обращении к серверу. Пожалуйста, проверьте соединение и попробуйте еще раз.",
        sender: "ai",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Заголовок */}
      <header className="p-4 border-b shadow-sm" 
              style={{background: 'linear-gradient(135deg, rgba(219, 234, 254, 0.8), rgba(224, 231, 255, 0.8))'}}>
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BooomerangsLogo size={36} />
            <h1 className="text-xl font-bold bg-clip-text text-transparent" 
                style={{background: 'linear-gradient(to right, #3b82f6, #6366f1)'}}>
              BOOOMERANGS AI ЧАТБОТ
            </h1>
          </div>
          <div className="bg-white py-1.5 px-3 rounded-full shadow-sm border border-blue-50 text-sm">
            <span className="font-medium text-blue-700">Доступ без API ключей</span>
          </div>
        </div>
      </header>
      
      {/* Основная область чата */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="container mx-auto max-w-4xl">
          {/* Приветственное сообщение, если нет сообщений */}
          {messages.length === 0 && (
            <div className="text-center p-10 rounded-3xl bg-white shadow-xl mb-6"
                style={{borderRadius: '24px', boxShadow: '0 20px 40px -10px rgba(59, 130, 246, 0.15)'}}>
              <BooomerangsLogo size={86} className="mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-3 bg-clip-text text-transparent"
                  style={{background: 'linear-gradient(135deg, #3b82f6, #6366f1)'}}>
                Добро пожаловать в BOOOMERANGS AI!
              </h2>
              <p className="text-gray-600 mb-4">
                Задайте любой вопрос и получите ответ от AI без необходимости платных API ключей.
                Система автоматически выберет наилучший доступный провайдер для вашего запроса.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                <div className="py-2 px-4 bg-blue-50 rounded-xl flex items-center"
                    style={{border: '1px solid rgba(59, 130, 246, 0.2)'}}>
                  <span className="text-lg mr-2">🧠</span>
                  <span className="text-blue-700">DeepInfra</span>
                </div>
                <div className="py-2 px-4 bg-blue-50 rounded-xl flex items-center"
                    style={{border: '1px solid rgba(59, 130, 246, 0.2)'}}>
                  <span className="text-lg mr-2">🤖</span>
                  <span className="text-blue-700">Claude</span>
                </div>
                <div className="py-2 px-4 bg-blue-50 rounded-xl flex items-center"
                    style={{border: '1px solid rgba(59, 130, 246, 0.2)'}}>
                  <span className="text-lg mr-2">💬</span>
                  <span className="text-blue-700">FreeChat</span>
                </div>
                <div className="py-2 px-4 bg-blue-50 rounded-xl flex items-center"
                    style={{border: '1px solid rgba(59, 130, 246, 0.2)'}}>
                  <span className="text-lg mr-2">👨‍💻</span>
                  <span className="text-blue-700">DeepSpeek</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Все ответы генерируются через бесплатные API без необходимости оплаты или регистрации
              </p>
            </div>
          )}
          
          {/* Сообщения */}
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : ""}`}>
                {message.sender === "ai" && (
                  <div 
                    className="w-9 h-9 rounded-full text-white flex items-center justify-center mr-2 flex-shrink-0 mb-1"
                    style={{
                      background: getProviderGradient(message.provider),
                      boxShadow: '0 4px 10px -2px rgba(99, 102, 241, 0.3)'
                    }}
                  >
                    {message.provider ? getProviderAvatar(message.provider) : "B"}
                  </div>
                )}
                
                <div className={`max-w-[80%] flex flex-col ${message.sender === "user" ? "items-end" : ""}`}>
                  {message.sender === "user" ? (
                    <div 
                      className="p-3 break-words text-white relative"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        borderRadius: '18px 18px 4px 18px',
                        boxShadow: '0 4px 15px -3px rgba(59, 130, 246, 0.3)'
                      }}
                    >
                      <p className="text-[15px] whitespace-pre-wrap">{message.text}</p>
                      <div 
                        className="absolute w-3 h-3 transform rotate-45 z-[-1]"
                        style={{
                          bottom: '-5px',
                          right: '-2px',
                          background: '#6366f1'
                        }}
                      ></div>
                    </div>
                  ) : (
                    <div 
                      className="p-3 break-words relative bg-white"
                      style={{
                        borderRadius: '18px 18px 18px 4px',
                        boxShadow: '0 4px 15px -5px rgba(0, 0, 0, 0.1)',
                        border: '1px solid rgba(243, 244, 246, 1)'
                      }}
                    >
                      {message.backupInfo && (
                        <div className="mb-2 text-sm py-1 px-2 rounded-lg" 
                             style={{
                               background: 'rgba(59, 130, 246, 0.1)',
                               color: '#4b5563',
                               fontWeight: '500'
                             }}>
                          {message.backupInfo}
                        </div>
                      )}
                      <div className="text-[15px] text-gray-800">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            img: ({src, alt}) => (
                              <img 
                                src={src} 
                                alt={alt} 
                                className="max-w-full h-auto rounded-lg mt-2 mb-2 shadow-lg"
                                style={{maxHeight: '400px'}}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            ),
                            p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({children}) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                            ol: ({children}) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                            strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                            em: ({children}) => <em className="italic">{children}</em>,
                            code: ({children}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{children}</code>,
                            pre: ({children}) => <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-sm">{children}</pre>
                          }}
                        >
                          {message.text}
                        </ReactMarkdown>
                      </div>
                      <div 
                        className="absolute w-3 h-3 transform rotate-45 z-[-1]"
                        style={{
                          bottom: '-5px',
                          left: '-2px',
                          background: 'white',
                          borderBottom: '1px solid rgba(243, 244, 246, 1)',
                          borderLeft: '1px solid rgba(243, 244, 246, 1)'
                        }}
                      ></div>
                    </div>
                  )}
                  
                  <div className={`flex items-center text-xs text-gray-500 mt-1 ${message.sender === "user" ? "justify-end" : ""} gap-2`}>
                    <span>{message.time}</span>
                    {message.provider && (
                      <>
                        <span 
                          className="px-2 py-0.5 rounded-full flex items-center"
                          style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: '#3b82f6',
                            fontWeight: '500'
                          }}
                        >
                          {getProviderIcon(message.provider)}
                          <span className="ml-1">{message.provider}</span>
                        </span>
                        {message.model && message.model !== message.provider && (
                          <span 
                            className="px-2 py-0.5 rounded-full"
                            style={{
                              background: 'rgba(99, 102, 241, 0.1)',
                              color: '#6366f1',
                              fontWeight: '500'
                            }}
                          >
                            {message.model}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Индикатор загрузки */}
            {isLoading && (
              <div className="flex items-center">
                <div 
                  className="w-9 h-9 rounded-full text-white flex items-center justify-center mr-2 flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    boxShadow: '0 4px 10px -2px rgba(99, 102, 241, 0.3)'
                  }}
                >
                  <span className="animate-pulse">B</span>
                </div>
                <div className="p-3 bg-white rounded-xl shadow-sm" style={{borderRadius: '18px 18px 18px 4px'}}>
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-blue-300 animate-bounce" style={{animationDelay: '0s'}}></div>
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 rounded-full bg-blue-700 animate-bounce" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
      
      {/* Провайдеры и Форма отправки сообщения */}
      <div className="border-t border-gray-100 p-4 bg-white" style={{boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.03)'}}>
        <div className="container mx-auto max-w-4xl">
          {/* Селектор провайдеров */}
          <div className="mb-3 flex flex-wrap gap-2">
            <div 
              onClick={() => setSelectedProvider(null)} 
              className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 ${
                selectedProvider === null 
                  ? 'bg-blue-100 text-blue-700 shadow-sm' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">🤖</span> Авто
            </div>
            
            <div 
              onClick={() => setSelectedProvider('FreeChat')} 
              className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 ${
                selectedProvider === 'FreeChat' 
                  ? 'bg-blue-100 text-blue-700 shadow-sm' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">💬</span> FreeChat
            </div>
            
            <div 
              onClick={() => setSelectedProvider('DeepSpeek')} 
              className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 ${
                selectedProvider === 'DeepSpeek' 
                  ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">👨‍💻</span> DeepSpeek
            </div>
            
            <div 
              onClick={() => setSelectedProvider('Phind')} 
              className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 ${
                selectedProvider === 'Phind' 
                  ? 'bg-yellow-100 text-yellow-700 shadow-sm' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">📚</span> Phind
            </div>
            
            <div 
              onClick={() => setSelectedProvider('Qwen')} 
              className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 ${
                selectedProvider === 'Qwen' 
                  ? 'bg-red-100 text-red-700 shadow-sm' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">🚀</span> Qwen
            </div>
          </div>
          
          {/* Форма отправки сообщения */}
          <form onSubmit={sendMessage} className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full px-5 py-3.5 border border-gray-200 rounded-xl bg-white text-gray-800"
                style={{
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease'
                }}
                placeholder={selectedProvider ? `Спросить ${selectedProvider}...` : "Введите сообщение..."}
                disabled={isLoading}
              />
            </div>
            <button 
              type="submit" 
              className="p-3.5 text-white rounded-xl disabled:opacity-50"
              style={{
                background: selectedProvider 
                  ? getProviderGradient(selectedProvider)
                  : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                boxShadow: '0 4px 10px -2px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.2s ease',
                transform: newMessage.trim() && !isLoading ? 'scale(1)' : 'scale(0.98)'
              }}
              disabled={isLoading || !newMessage.trim()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
          
          {/* Индикатор выбранного провайдера */}
          {selectedProvider && (
            <div className="mt-2 text-xs text-gray-500 pl-2 flex items-center">
              <span className="mr-1">
                {getProviderIcon(selectedProvider)}
              </span>
              <span>
                Используется {selectedProvider}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}