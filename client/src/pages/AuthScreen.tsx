import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

// Встроенный компонент логотипа BOOOMERANGS
const BooomerangsLogo = ({ size = 32, className = "" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <div 
        className="absolute inset-0 rounded-full bg-white border-4 border-blue-500"
        style={{ width: size, height: size }}
      ></div>
      <div className="text-blue-600 font-bold" style={{ fontSize: size/4 }}>B</div>
    </div>
  );
};

// Extend the auth schema for the form
const formSchema = authSchema.extend({});

export default function AuthScreen() {
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Form setup with validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      token: "",
    },
  });

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/auth", { token: values.token });
      const data = await response.json();
      
      // Store token and user info in local storage
      localStorage.setItem("access_token", values.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      // Show success toast
      toast({
        title: "Authentication successful",
        description: "Welcome to Proxy Chat!",
      });
      
      // Redirect to chat page
      setLocation("/chat");
    } catch (error) {
      console.error("Authentication error:", error);
      
      // Show error toast
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: error instanceof Error ? error.message : "Invalid access token. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', 
      inset: 0, 
      zIndex: 50, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(to bottom, #1e293b, #0f172a)'
    }}>
      <Card style={{
        width: '100%',
        maxWidth: '28rem',
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '1rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{textAlign: 'center', marginBottom: '1.5rem'}}>
          <div style={{display: 'flex', justifyContent: 'center', marginBottom: '1rem'}}>
            <div style={{
              width: '128px',
              height: '128px',
              borderRadius: '50%',
              background: 'white',
              border: '4px solid #3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#3b82f6'
            }}>B</div>
          </div>
          <h1 style={{
            fontSize: '1.875rem',
            fontWeight: 'bold',
            background: 'linear-gradient(to right, #3b82f6, #4f46e5)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
          }}>BOOOMERANGS</h1>
          <p style={{color: '#4b5563', marginTop: '0.5rem'}}>Бесплатный доступ к AI без платных API ключей</p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">ACCESS TOKEN</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Введите свой токен доступа"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs mt-1 text-red-500" />
                </FormItem>
              )}
            />
            
            {form.formState.errors.root && (
              <div className="bg-status-error bg-opacity-10 text-status-error p-3 rounded-md text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>{form.formState.errors.root.message}</span>
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg transform hover:scale-[1.02] active:scale-[0.98] duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </span>
                  Подключение...
                </>
              ) : (
                "Войти в чат"
              )}
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
}
