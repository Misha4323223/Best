import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Clock, Code, FileText, RotateCcw, Save, Download, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Checkpoint {
  step: number;
  description: string;
  code?: string;
  files?: string[];
  timestamp: string;
  sessionId: string;
  action: 'create' | 'modify' | 'delete' | 'execute';
  metadata?: Record<string, any>;
}

interface SessionStats {
  sessionId: string;
  totalSteps: number;
  actions: Record<string, number>;
  duration: string;
  firstStep?: string;
  lastStep?: string;
}

export function CheckpointManager() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const { toast } = useToast();

  // Загрузка чекпоинтов
  const loadCheckpoints = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/checkpoint/list');
      const data = await response.json();
      
      if (data.success) {
        setCheckpoints(data.checkpoints);
        setStats(data.stats);
      } else {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить чекпоинты",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Ошибка подключения к серверу",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Сохранение нового чекпоинта
  const saveCheckpoint = async (description: string, action: string, code?: string) => {
    try {
      const response = await fetch('/api/checkpoint/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          action,
          code,
          metadata: { manual: true }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Успешно",
          description: `Чекпоинт ${data.checkpoint.step} сохранён`
        });
        loadCheckpoints();
      } else {
        toast({
          title: "Ошибка",
          description: data.error || "Не удалось сохранить чекпоинт",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Ошибка сохранения чекпоинта",
        variant: "destructive"
      });
    }
  };

  // Откат к шагу
  const rollbackToStep = async (step: number) => {
    try {
      const response = await fetch(`/api/checkpoint/rollback/${step}`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Откат выполнен",
          description: `Возврат к шагу ${step}`
        });
        loadCheckpoints();
      } else {
        toast({
          title: "Ошибка",
          description: data.error || "Не удалось выполнить откат",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Ошибка выполнения отката",
        variant: "destructive"
      });
    }
  };

  // Экспорт сессии
  const exportSession = async () => {
    try {
      const response = await fetch('/api/checkpoint/export');
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Экспорт завершён",
          description: "Сессия экспортирована в файл"
        });
      } else {
        toast({
          title: "Ошибка",
          description: "Не удалось экспортировать сессию",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Ошибка экспорта",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadCheckpoints();
    
    // Автообновление каждые 10 секунд
    const interval = setInterval(loadCheckpoints, 10000);
    return () => clearInterval(interval);
  }, []);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <FileText className="h-4 w-4" />;
      case 'modify': return <Code className="h-4 w-4" />;
      case 'execute': return <Save className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'modify': return 'bg-blue-100 text-blue-800';
      case 'execute': return 'bg-purple-100 text-purple-800';
      case 'delete': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок и статистика */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Система чекпоинтов
          </CardTitle>
          <CardDescription>
            Автоматическое сохранение шагов работы вне ограничений агента
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalSteps}</div>
                <div className="text-sm text-gray-600">Всего шагов</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.duration}</div>
                <div className="text-sm text-gray-600">Длительность</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{Object.keys(stats.actions).length}</div>
                <div className="text-sm text-gray-600">Типов действий</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.sessionId.slice(-8)}</div>
                <div className="text-sm text-gray-600">ID сессии</div>
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              onClick={() => saveCheckpoint('Ручное сохранение', 'create')}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Сохранить шаг
            </Button>
            <Button 
              onClick={exportSession}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Экспорт
            </Button>
            <Button 
              onClick={loadCheckpoints}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              Обновить
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Список чекпоинтов */}
      <Card>
        <CardHeader>
          <CardTitle>История шагов</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {checkpoints.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Чекпоинты не найдены
              </div>
            ) : (
              <div className="space-y-4">
                {checkpoints.map((checkpoint) => (
                  <div 
                    key={checkpoint.step}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedStep === checkpoint.step 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedStep(
                      selectedStep === checkpoint.step ? null : checkpoint.step
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getActionColor(checkpoint.action)}>
                            {getActionIcon(checkpoint.action)}
                            <span className="ml-1">{checkpoint.action}</span>
                          </Badge>
                          <span className="text-sm font-medium">
                            Шаг {checkpoint.step}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(checkpoint.timestamp).toLocaleString('ru-RU')}
                          </span>
                        </div>
                        
                        <div className="text-sm font-medium mb-1">
                          {checkpoint.description}
                        </div>
                        
                        {checkpoint.files && checkpoint.files.length > 0 && (
                          <div className="text-xs text-gray-600">
                            Файлы: {checkpoint.files.join(', ')}
                          </div>
                        )}
                      </div>
                      
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          rollbackToStep(checkpoint.step);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Откат
                      </Button>
                    </div>
                    
                    {selectedStep === checkpoint.step && checkpoint.code && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium text-gray-700 mb-2">
                          Код:
                        </div>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                          {checkpoint.code}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}