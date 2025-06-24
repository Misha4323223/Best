import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, RefreshCw, ThumbsUp, ThumbsDown, Image, Code, Search, BrainCog, Lightbulb, Calculator, X, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  category?: string;
  provider?: string;
  bestProvider?: string;
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
}

// Категории сообщений и их иконки
const categoryIcons: Record<string, React.ReactNode> = {
  technical: <Code className="h-4 w-4" />,
  creative: <Lightbulb className="h-4 w-4" />,
  analytical: <BrainCog className="h-4 w-4" />,
  factual: <Search className="h-4 w-4" />,
  current: <RefreshCw className="h-4 w-4" />,
  mathematical: <Calculator className="h-4 w-4" />,
  multimodal: <Image className="h-4 w-4" />,
  general: <BrainCog className="h-4 w-4" />
};

const SmartChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Скролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Обработка отправки сообщения
  const handleSend = async () => {
    if (!inputText.trim() && !imageUrl) return;

    // Сохраняем текст сообщения перед очисткой
    const messageText = inputText.trim();
    const currentImageUrl = imageUrl;

    const newUserMessageId = Date.now().toString();
    const userMessage: Message = {
      id: newUserMessageId,
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };

    // Добавляем сообщение пользователя
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputText("");
    setImageUrl(null); // Очищаем изображение после отправки

    // Добавляем временное сообщение для индикации загрузки
    const tempAiMessageId = (Date.now() + 1).toString();
    const tempAiMessage: Message = {
      id: tempAiMessageId,
      text: "...",
      sender: 'ai',
      timestamp: new Date(),
      loading: true
    };

    setMessages(prevMessages => [...prevMessages, tempAiMessage]);
    setIsLoading(true);

    try {
      // Сначала пробуем стриминговый ответ для изображений
      let streamingSuccessful = false;
      let fullResponse = '';
      let aiProvider = '';
      let aiCategory = '';
      let imageFound = false;

      try {
        console.log('🚀 [STREAMING] Начинаем потоковую генерацию для сообщения:', messageText);
        console.log('📡 [STREAMING] Отправляем запрос к /api/stream...');
        
        const streamResponse = await fetch('/api/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: messageText,
            sessionId: Date.now()
          }),
        });

        if (streamResponse.ok) {
          console.log('✅ [STREAMING] Получен ответ от сервера, начинаем чтение потока...');
          const reader = streamResponse.body?.getReader();
          const decoder = new TextDecoder();
          let chunkCount = 0;

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              chunkCount++;
              const chunk = decoder.decode(value);
              console.log(`📥 [STREAMING] Чанк ${chunkCount}:`, chunk.substring(0, 100) + '...');

              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    console.log('🔍 [STREAMING] Обработка данных:', data);
                    
                    if (data.imageUrl) {
                      imageFound = true;
                      fullResponse = `🎨 Изображение создано! Вот ваш дизайн:\n![Сгенерированное изображение](${data.imageUrl})`;
                      aiProvider = 'Image Generator';
                      aiCategory = 'image_generation';
                      streamingSuccessful = true;
                      
                      // Сразу обновляем сообщение когда получили изображение
                      setMessages(prevMessages => prevMessages.map(msg => 
                        msg.id === tempAiMessageId ? {
                          id: tempAiMessageId,
                          text: fullResponse,
                          sender: 'ai',
                          timestamp: new Date(),
                          loading: false,
                          category: aiCategory,
                          provider: aiProvider,
                          bestProvider: aiProvider,
                          error: false,
                          errorMessage: undefined
                        } : msg
                      ));
                      
                      // Изображение получено и отображено, завершаем стрим
                      console.log('✅ [STREAMING] Изображение получено и отображено');
                      reader.cancel();
                      return;
                    } else if (data.text) {
                      fullResponse += data.text;
                      if (data.provider) aiProvider = data.provider;
                      if (data.category) aiCategory = data.category;
                      streamingSuccessful = true;
                    }
                  } catch (e) {
                    console.log('⚠️ [STREAMING] Не удалось разобрать JSON:', line);
                  }
                }
              }
            }
            console.log(`📤 [STREAMING] Поток завершен. Получено чанков: ${chunkCount}`);
          }
        }
      } catch (streamError) {
        console.log('❌ [STREAMING] Ошибка потоковой генерации:', streamError);
      }

      // Если стриминг не сработал, используем обычный API
      if (!streamingSuccessful) {
        console.log('🔄 [FALLBACK] Переключаемся на обычный API...');
        
        const response = await fetch('/api/smart/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: messageText,
            userId: 'anonymous',
            imageUrl: currentImageUrl
          }),
        });

        if (!response.ok) {
          throw new Error(`Ошибка: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Получен ответ от сервера:', data);
        
        if (data.success && data.response) {
          fullResponse = data.response;
          if (data.imageUrl) {
            fullResponse += `\n\n![Сгенерированное изображение](${data.imageUrl})`;
          }
          aiProvider = data.provider || "AI";
          aiCategory = data.category || "general";
        } else {
          throw new Error(data.error || "Сервер вернул неуспешный ответ");
        }
      }

      // Обновляем временное сообщение реальным ответом
      if (fullResponse) {
        setMessages(prevMessages => prevMessages.map(msg => 
          msg.id === tempAiMessageId ? {
            id: tempAiMessageId,
            text: fullResponse,
            sender: 'ai',
            timestamp: new Date(),
            loading: false,
            category: aiCategory,
            provider: aiProvider,
            bestProvider: aiProvider,
            error: false,
            errorMessage: undefined
          } : msg
        ));
      } else {
        throw new Error("Не получен ответ от сервера");
      }
    } catch (error) {
      console.error('Ошибка:', error);
      
      // Обновляем временное сообщение с ошибкой
      setMessages(prevMessages => prevMessages.map(msg => 
        msg.id === tempAiMessageId ? {
          id: tempAiMessageId,
          text: "Произошла ошибка при получении ответа. Пожалуйста, попробуйте позже.",
          sender: 'ai',
          timestamp: new Date(),
          loading: false,
          error: true,
          errorMessage: error instanceof Error ? error.message : "Неизвестная ошибка"
        } : msg
      ));
    } finally {
      setIsLoading(false);
      setImageUrl(null); // Сбрасываем URL изображения после отправки
    }
  };

  // Обработка нажатия Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Обработка выбора изображения
  const { toast } = useToast();
  
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Ошибка загрузки",
          description: "Размер файла не должен превышать 5 МБ",
          variant: "destructive"
        });
        return;
      }
      
      try {
        // Создаем FormData для отправки файла
        const formData = new FormData();
        formData.append('image', file);
        
        // Отправляем запрос на загрузку
        const response = await fetch('/api/upload/file', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Ошибка при загрузке файла');
        }
        
        const data = await response.json();
        
        if (data.success) {
          // Устанавливаем URL загруженного изображения
          setImageUrl(data.imageUrl);
          toast({
            title: "Изображение загружено",
            description: "Изображение успешно загружено",
          });
        } else {
          throw new Error(data.error || 'Ошибка при загрузке');
        }
      } catch (error) {
        console.error('Ошибка загрузки изображения:', error);
        toast({
          title: "Ошибка загрузки",
          description: error instanceof Error ? error.message : "Не удалось загрузить изображение",
          variant: "destructive"
        });
        
        // Сбрасываем input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  // Запуск диалогового окна выбора файла
  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Удаление выбранного изображения
  const handleRemoveImage = () => {
    setImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col w-full mx-auto bg-[#1a1a2e] text-white rounded-lg shadow-lg border border-gray-700 overflow-hidden
                    h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] xl:h-[650px]
                    max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl">
      
      <ScrollArea className="flex-grow p-2 sm:p-3 md:p-4">
        <div className="space-y-2 sm:space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-2 sm:gap-3 max-w-[85%] sm:max-w-[80%] md:max-w-[75%] 
                               ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <Avatar className={`h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 flex-shrink-0
                                    ${message.sender === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                  <AvatarFallback className="text-xs sm:text-sm text-white">
                    {message.sender === 'user' ? 'U' : 'AI'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col min-w-0 flex-1">
                  <div className={`rounded-lg p-2 sm:p-3 text-sm sm:text-base break-words ${
                    message.loading ? 'bg-gray-700 text-gray-300' :
                    message.error ? 'bg-red-900/50 text-red-300' :
                    message.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'
                  }`}>
                    {message.loading ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                        <span className="text-sm">AI думает...</span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap word-break">
                        {/* ОТЛАДКА: показываем весь текст сообщения */}
                        {message.text.includes('![') && (
                          <div className="bg-yellow-900/50 p-2 mb-2 text-xs">
                            🔍 НАЙДЕН MARKDOWN ИЗОБРАЖЕНИЯ В СООБЩЕНИИ: {message.text.substring(0, 100)}...
                          </div>
                        )}
                        
                        {message.text.split('\n').map((line, i) => {
                          // Ищем markdown изображения
                          const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/g);
                          
                          if (imageMatch) {
                            console.log('🎨 НАЙДЕНО ИЗОБРАЖЕНИЕ:', imageMatch);
                            
                            // Показываем отладочную информацию и изображение
                            const fullMatch = imageMatch[0];
                            const urlMatch = fullMatch.match(/!\[([^\]]*)\]\(([^)]+)\)/);
                            if (urlMatch) {
                              const [, altText, imageUrl] = urlMatch;
                              
                              return (
                                <div key={i} className="my-3">
                                  <div className="bg-green-900/50 p-2 mb-2 text-xs">
                                    ✅ ОБНАРУЖЕН MARKDOWN ИЗОБРАЖЕНИЯ: {line}
                                  </div>
                                  
                                  {/* Отображаем изображение */}
                                  <div className="bg-gray-700 p-2 rounded-lg">
                                    <img 
                                      src={imageUrl} 
                                      alt={altText || 'Сгенерированное изображение'}
                                      className="max-w-full h-auto rounded-lg shadow-lg mx-auto block"
                                      style={{ maxHeight: '400px', objectFit: 'contain' }}
                                      onLoad={() => console.log('✅ Изображение загружено:', imageUrl)}
                                      onError={(e) => {
                                        console.error('❌ Ошибка загрузки изображения:', imageUrl);
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                    <p className="text-xs text-gray-400 text-center mt-2">
                                      {altText || 'Сгенерированное AI изображение'}
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                              
                              return (
                                <div key={i} className="my-3">
                                  {/* Показываем текст до изображения, если есть */}
                                  {line.replace(fullMatch, '').trim() && (
                                    <div className="mb-2">{line.replace(fullMatch, '').trim()}</div>
                                  )}
                                  
                                  {/* Отображаем изображение */}
                                  <div className="bg-gray-700 p-2 rounded-lg">
                                    <img 
                                      src={imageUrl} 
                                      alt={altText || 'Сгенерированное изображение'}
                                      className="max-w-full h-auto rounded-lg shadow-lg mx-auto block"
                                      style={{ maxHeight: '400px', objectFit: 'contain' }}
                                      onLoad={() => console.log('✅ Изображение загружено:', imageUrl)}
                                      onError={(e) => {
                                        console.error('❌ Ошибка загрузки изображения:', imageUrl);
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                    <p className="text-xs text-gray-400 text-center mt-2">
                                      {altText || 'Сгенерированное AI изображение'}
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                          }
                          
                          // Обычный текст
                          return (
                            <React.Fragment key={i}>
                              {line}
                              {i < message.text.split('\n').length - 1 && <br />}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {message.sender === 'ai' && !message.loading && !message.error && message.provider && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="secondary" className="text-xs px-1 py-0.5 h-4 bg-gray-700 text-gray-300 border-gray-600">
                        {message.provider}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-400 mt-0.5">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="border-t border-gray-700"></div>
      
      {imageUrl && (
        <div className="p-2 sm:p-3 flex items-center gap-2 border-t border-gray-700 bg-gray-800/50">
          <div className="relative">
            <img src={imageUrl} alt="Selected" className="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded-lg" />
            <button
              onClick={handleRemoveImage}
              className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-1 w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <span className="text-sm text-gray-400">Изображение загружено</span>
        </div>
      )}
      
      <div className="p-2 sm:p-3 md:p-4 border-t border-gray-700 bg-gray-800/30">
        <div className="flex gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImageButtonClick}
            disabled={isLoading}
            className="h-9 w-9 sm:h-10 sm:w-10 p-0 border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex-shrink-0"
          >
            <Image className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите сообщение..."
            disabled={isLoading}
            className="flex-grow h-9 sm:h-10 text-sm sm:text-base bg-gray-800 border-gray-600 text-white placeholder-gray-400 
                       focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || (!inputText.trim() && !imageUrl)}
            size="sm"
            className="h-9 w-9 sm:h-10 sm:w-10 p-0 bg-blue-600 hover:bg-blue-700 text-white transition-colors flex-shrink-0 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            ) : (
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SmartChat;