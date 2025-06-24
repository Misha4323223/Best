import React from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Brain } from 'lucide-react';

const MainNavigation: React.FC = () => {
  const [location] = useLocation();

  // Определение активной страницы
  const isActive = (path: string) => location === path;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur border-b sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src="/logo.png" alt="BOOOMERANGS" />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
        <span className="font-bold text-lg">BOOOMERANGS AI</span>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/provider">
          <Button 
            variant={isActive('/provider') ? 'default' : 'outline'} 
            size="sm"
            className="gap-2"
          >
            <span className="hidden md:inline">AI Провайдеры</span>
            <span className="md:hidden">🧠</span>
          </Button>
        </Link>
        
        <Link href="/ai-chat">
          <Button 
            variant={isActive('/ai-chat') ? 'default' : 'outline'} 
            size="sm"
            className="gap-2"
          >
            <span className="hidden md:inline">AI Чат</span>
            <span className="md:hidden">💬</span>
          </Button>
        </Link>

        <Link href="/chat">
          <Button 
            variant={isActive('/chat') ? 'default' : 'outline'} 
            size="sm"
            className="gap-2"
          >
            <span className="hidden md:inline">Чат</span>
            <span className="md:hidden">📱</span>
          </Button>
        </Link>
        
        <Link href="/smart-chat">
          <Button 
            variant={isActive('/smart-chat') ? 'default' : 'outline'} 
            size="sm"
            className="gap-2"
          >
            <span className="hidden md:inline">Умный чат</span>
            <span className="md:hidden"><Brain className="h-4 w-4" /></span>
          </Button>
        </Link>

        <Link href="/image-generator">
          <Button 
            variant={isActive('/image-generator') ? 'default' : 'outline'} 
            size="sm"
            className="gap-2"
          >
            <span className="hidden md:inline">Генератор изображений</span>
            <span className="md:hidden">🖼️</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default MainNavigation;