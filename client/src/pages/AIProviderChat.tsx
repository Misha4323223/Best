import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
// Импорт типов для сообщений
interface MessageWithSender {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

// Интерфейсы
interface Message {
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  provider?: string;
  model?: string;
}

interface ProviderInfo {
  name: string;
  description: string;
  endpoint: string;
  models: string[];
  icon: string;
  specialization?: string;
}

// Список доступных провайдеров
const providers: ProviderInfo[] = [
  {
    name: 'DeepInfra',
    description: 'Высококачественные модели от DeepInfra, включая Mixtral и Llama.',
    endpoint: '/api/deepinfra/chat',
    models: ['mixtral', 'llama', 'qwen', 'codellama'],
    icon: '🧠',
    specialization: 'general'
  },
  {
    name: 'Claude',
    description: 'Модель Claude от Anthropic через Python G4F.',
    endpoint: '/api/claude/chat',
    models: ['claude'],
    icon: '🪃',
    specialization: 'general'
  },
  {
    name: 'ChatFree',
    description: 'Бесплатный доступ к ChatGPT-подобным моделям.',
    endpoint: '/api/chatfree/chat',
    models: ['gpt-3.5'],
    icon: '💬',
    specialization: 'general'
  },
  {
    name: 'DeepSpeek',
    description: 'Специализированный AI для технических и программных вопросов.',
    endpoint: '/api/deepspeek/chat',
    models: ['technical-expert'],
    icon: '👨‍💻',
    specialization: 'programming'
  }
];

// Функция для рендеринга SVG из markdown
const renderMessageContent = (content: string) => {
  // Проверяем наличие SVG блоков
  const svgRegex = /```svg\n([\s\S]*?)\n```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = svgRegex.exec(content)) !== null) {
    // Добавляем текст до SVG
    if (match.index > lastIndex) {
      parts.push(
        <div key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {content.substring(lastIndex, match.index)}
        </div>
      );
    }

    // Добавляем SVG превью как изображение
    const svgContent = match[1].trim();
    console.log('AIProviderChat SVG Content length:', svgContent.length);
    
    try {
      // Кодируем SVG в base64 data URI
      const svgBase64 = btoa(unescape(encodeURIComponent(svgContent)));
      const dataUri = `data:image/svg+xml;base64,${svgBase64}`;
      
      parts.push(
        <div key={`svg-${match.index}`} className="my-4 text-center">
          <div className="text-sm text-gray-600 mb-2 font-medium">🎨 SVG Превью</div>
          <img 
            src={dataUri}
            alt="SVG векторное изображение"
            className="max-w-full h-auto rounded-lg shadow-sm border"
            style={{ maxHeight: '400px' }}
            onLoad={() => console.log('✅ AIProviderChat SVG изображение загружено')}
            onError={() => console.error('❌ AIProviderChat Ошибка загрузки SVG')}
          />
        </div>
      );
    } catch (error) {
      console.error('❌ AIProviderChat Ошибка создания SVG превью:', error);
      parts.push(
        <div key={`svg-${match.index}`} className="my-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm text-red-600">❌ Ошибка отображения SVG</div>
        </div>
      );
    }

    lastIndex = svgRegex.lastIndex;
  }

  // Добавляем оставшийся текст
  if (lastIndex < content.length) {
    parts.push(
      <div key={`text-${lastIndex}`} className="whitespace-pre-wrap">
        {content.substring(lastIndex)}
      </div>
    );
  }

  return parts.length > 0 ? parts : <div className="whitespace-pre-wrap">{content}</div>;
};

// Компонент сообщения
const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isAi = message.sender === 'ai';
  
  return (
    <div className={`flex gap-3 ${isAi ? 'justify-start' : 'justify-end'} mb-4`}>
      {isAi && (
        <Avatar className="h-9 w-9">
          <AvatarImage src="/ai-avatar.png" />
          <AvatarFallback>{message.provider?.[0] || 'AI'}</AvatarFallback>
        </Avatar>
      )}
      
      <div className={`max-w-[80%] rounded-lg p-4 ${
        isAi 
          ? 'bg-primary-foreground text-primary' 
          : 'bg-primary text-primary-foreground'
      }`}>
        {renderMessageContent(message.content)}
        
        {isAi && message.provider && (
          <div className="text-xs opacity-75 mt-2">
            {message.provider} {message.model ? `(${message.model})` : ''}
          </div>
        )}
      </div>
      
      {!isAi && (
        <Avatar className="h-9 w-9">
          <AvatarImage src="/user-avatar.png" />
          <AvatarFallback>Me</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

// Основной компонент
const AIProviderChat: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<string>(providers[0].name);
  const [selectedModel, setSelectedModel] = useState<string>(providers[0].models[0]);
  const [selectedPromptType, setSelectedPromptType] = useState<string>('general');
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Выбранный провайдер
  const currentProvider = providers.find(p => p.name === selectedProvider);
  
  // Прогресс-таймер для улучшения UX
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(prev => {
          // Медленно увеличиваем прогресс, но не доходим до 100%
          const increment = (100 - prev) * 0.1;
          return Math.min(prev + increment, 95);
        });
      }, 300);
    } else {
      setProgress(100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);
  
  // Прокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Обработка изменения провайдера
  useEffect(() => {
    if (currentProvider) {
      setSelectedModel(currentProvider.models[0]);
    }
  }, [selectedProvider, currentProvider]);
  
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      content: input,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    
    try {
      // Находим endpoint для выбранного провайдера
      const endpoint = currentProvider?.endpoint || '/api/ai/chat';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          model: selectedModel,
          promptType: selectedPromptType
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const aiMessage: Message = {
          content: data.response,
          sender: 'ai',
          timestamp: new Date(),
          provider: data.provider || currentProvider?.name,
          model: data.model || selectedModel
        };
        
        setMessages(prev => [...prev, aiMessage]);
      } else {
        setError(`Ошибка: ${data.error || 'Не удалось получить ответ от AI'}`);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Сетевая ошибка при отправке запроса');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <div className="container mx-auto px-4 max-w-6xl py-8">
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            AI Чат с множеством провайдеров
          </CardTitle>
          <CardDescription>
            Бесплатный доступ к различным AI моделям без API ключей
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="chat">Чат</TabsTrigger>
              <TabsTrigger value="settings">Настройки</TabsTrigger>
              <TabsTrigger value="info">Информация</TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="space-y-4">
              <div className="flex space-x-4 mb-4">
                <div className="w-1/2">
                  <Label htmlFor="provider">Провайдер AI</Label>
                  <Select 
                    value={selectedProvider} 
                    onValueChange={setSelectedProvider}
                  >
                    <SelectTrigger id="provider">
                      <SelectValue placeholder="Выберите провайдера"/>
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map(provider => (
                        <SelectItem key={provider.name} value={provider.name}>
                          {provider.icon} {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-1/2">
                  <Label htmlFor="model">Модель</Label>
                  <Select 
                    value={selectedModel} 
                    onValueChange={setSelectedModel}
                  >
                    <SelectTrigger id="model">
                      <SelectValue placeholder="Выберите модель"/>
                    </SelectTrigger>
                    <SelectContent>
                      {currentProvider?.models.map(model => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="w-full mb-4">
                <Label htmlFor="prompt-type">Тип запроса</Label>
                <Select 
                  value={selectedPromptType} 
                  onValueChange={setSelectedPromptType}
                >
                  <SelectTrigger id="prompt-type">
                    <SelectValue placeholder="Тип запроса"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Общий</SelectItem>
                    <SelectItem value="technical">Технический</SelectItem>
                    <SelectItem value="creative">Творческий</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <ScrollArea className="h-[400px] border rounded-md p-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Начните общение с AI, отправив сообщение
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, index) => (
                      <MessageBubble key={index} message={msg} />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
              
              {error && (
                <div className="text-destructive text-sm p-2 bg-destructive/20 rounded">
                  {error}
                </div>
              )}
              
              {isLoading && (
                <div className="w-full space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-xs text-center text-muted-foreground">
                    AI обрабатывает ваш запрос...
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="settings">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">О выбранном провайдере</h3>
                  {currentProvider && (
                    <Card className="mt-2">
                      <CardHeader>
                        <CardTitle>{currentProvider.icon} {currentProvider.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>{currentProvider.description}</p>
                        <div className="mt-4">
                          <h4 className="font-medium">Доступные модели:</h4>
                          <ul className="list-disc list-inside">
                            {currentProvider.models.map(model => (
                              <li key={model}>{model}</li>
                            ))}
                          </ul>
                        </div>
                        {currentProvider.specialization && (
                          <div className="mt-2">
                            <h4 className="font-medium">Специализация:</h4>
                            <p>{currentProvider.specialization}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium">Типы запросов</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Общий</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>Стандартный режим для обычных вопросов и информации</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Технический</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>Режим для программирования и технических вопросов</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Творческий</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>Режим для создания историй, идей и творческих материалов</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="info">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">О проекте BOOOMERANGS AI</h3>
                <p>
                  BOOOMERANGS AI предоставляет бесплатный доступ к различным AI моделям без необходимости 
                  в API ключах или платной подписке. Проект использует множество провайдеров 
                  для обеспечения стабильной работы и высокого качества ответов.
                </p>
                
                <h3 className="text-lg font-medium">Доступные провайдеры</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {providers.map(provider => (
                    <Card key={provider.name}>
                      <CardHeader>
                        <CardTitle>{provider.icon} {provider.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>{provider.description}</p>
                        <div className="mt-2">
                          <h4 className="font-medium">Модели:</h4>
                          <p>{provider.models.join(', ')}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex flex-col">
          <div className="flex w-full items-center space-x-2">
            <Textarea
              placeholder="Введите ваше сообщение..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              disabled={isLoading}
              rows={3}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={isLoading || !input.trim()}
              className="self-end"
            >
              Отправить
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center w-full">
            Все AI провайдеры используются без API ключей. Качество и скорость ответов могут варьироваться.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AIProviderChat;