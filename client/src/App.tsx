import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthScreen from "@/pages/AuthScreen";
import BooomerangsAuth from "@/pages/BooomerangsAuth";
import Chat from "@/pages/Chat";
import AIChat from "@/pages/AIChat";
import AIProviderChat from "@/pages/AIProviderChat";
import ImageGeneratorSimple from "@/pages/ImageGeneratorSimple";
import SmartChatPage from "@/pages/SmartChatPage";
import { useEffect } from "react";

// Импортируем компонент навигации
import MainNavigation from "@/components/MainNavigation";

function Router() {
  const [location, setLocation] = useLocation();
  
  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    
    // Страницы, доступные без аутентификации
    const publicPages = ["/", "/image-generator", "/provider", "/ai-chat", "/smart-chat"];
    const isPublicPage = publicPages.includes(location);
    
    // If no token and not on public page, redirect to auth
    if (!token && !isPublicPage) {
      setLocation("/");
    }
    
    // If token and on auth page, redirect to chat
    if (token && location === "/") {
      setLocation("/chat");
    }
  }, [location, setLocation]);

  // Перенаправляем на рабочий чат со старых страниц
  useEffect(() => {
    if (location === "/chat" || location === "/ai-chat") {
      setLocation("/");
    }
  }, [location, setLocation]);

  // Определяем, нужно ли показывать навигацию
  const showNavigation = location !== "/" && location !== "/new-auth";

  return (
    <>
      {showNavigation && <MainNavigation />}
      <main className={showNavigation ? "pt-2" : ""}>
        <Switch>
          <Route path="/" component={SmartChatPage} />
          <Route path="/new-auth" component={BooomerangsAuth} />
          <Route path="/chat" component={Chat} />
          <Route path="/ai-chat" component={AIChat} />
          <Route path="/provider" component={AIProviderChat} />
          <Route path="/image-generator" component={ImageGeneratorSimple} />
          <Route path="/smart-chat" component={SmartChatPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
