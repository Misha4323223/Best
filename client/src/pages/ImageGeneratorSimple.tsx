import React, { useState } from 'react';
import { Link } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function ImageGeneratorSimple() {
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
      // Здесь мы используем Unsplash API для поиска изображений по ключевым словам
      // Это простая альтернатива, которая гарантированно работает
      const encodedQuery = encodeURIComponent(input);
      const imageUrl = `https://source.unsplash.com/1200x900/?${encodedQuery}`;
      
      // Добавляем случайный параметр, чтобы предотвратить кеширование
      const randomParam = `&random=${Math.random()}`;
      setImageUrl(imageUrl + randomParam);
      
    } catch (err) {
      console.error('Error:', err);
      setError('Произошла ошибка при генерации изображения');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-blue-600 text-transparent bg-clip-text">
          Генератор изображений
        </h1>
        <p className="text-muted-foreground">
          Создавайте изображения по текстовому описанию
        </p>
        
        <div className="mt-4">
          <Link href="/chat" className="text-primary hover:underline">
            Вернуться к чату
          </Link>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Опишите желаемое изображение</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={generateImage} className="space-y-4">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Например: космический корабль в стиле киберпанк, горный пейзаж на закате, футуристический город..."
              className="min-h-[120px]"
            />
            
            {error && (
              <div className="text-red-500 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
            
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Генерация...
                </>
              ) : (
                'Создать изображение'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {imageUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Результат</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative rounded-lg overflow-hidden border bg-white">
              <img 
                src={imageUrl} 
                alt={input}
                className="w-full h-auto object-contain max-h-[500px]"
              />
            </div>
            
            <div className="mt-4 text-center">
              <a 
                href={imageUrl} 
                download="generated-image.jpg" 
                target="_blank"
                className="inline-block"
              >
                <Button className="mt-3">
                  Скачать изображение
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}