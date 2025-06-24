import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Image as ImageIcon, X } from "lucide-react";

interface ImageGeneratorWidgetProps {
  onClose: () => void;
}

export default function ImageGeneratorWidget({ onClose }: ImageGeneratorWidgetProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');

  const generateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) {
      setError('Пожалуйста, введите описание изображения');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      // Используем Unsplash для поиска изображений по ключевым словам
      const encodedQuery = encodeURIComponent(input);
      const imageUrl = `https://source.unsplash.com/800x600/?${encodedQuery}`;
      
      // Добавляем случайный параметр для предотвращения кеширования
      const uniqueUrl = `${imageUrl}&random=${Math.random()}`;
      setImageUrl(uniqueUrl);
      
    } catch (err) {
      console.error('Error:', err);
      setError('Произошла ошибка при генерации изображения');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-4 shadow-lg">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center">
          <ImageIcon className="h-5 w-5 mr-2 text-primary" />
          <CardTitle className="text-lg">Генератор изображений</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={generateImage} className="space-y-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Опишите желаемое изображение..."
            className="min-h-[80px]"
          />
          
          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-2 rounded-md">
              {error}
            </div>
          )}
          
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Создание...
                </>
              ) : (
                'Создать изображение'
              )}
            </Button>
          </div>
        </form>

        {imageUrl && (
          <div className="mt-3">
            <div className="relative rounded-lg overflow-hidden border mt-2">
              <img 
                src={imageUrl} 
                alt={input}
                className="w-full h-auto object-contain max-h-[300px]"
              />
            </div>
            
            <div className="mt-2 flex justify-end">
              <a 
                href={imageUrl} 
                download="generated-image.jpg" 
                target="_blank"
                rel="noreferrer"
                className="inline-block"
              >
                <Button variant="outline" size="sm">
                  Скачать изображение
                </Button>
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}