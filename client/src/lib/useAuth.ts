import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { UserWithInitials } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AuthState {
  isAuthenticated: boolean;
  user: UserWithInitials | null;
  token: string | null;
  isLoading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: true,
  });
  
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Check if user is already authenticated
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const userStr = localStorage.getItem("user");
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as UserWithInitials;
        setState({
          isAuthenticated: true,
          user,
          token,
          isLoading: false,
        });
      } catch (error) {
        console.error("Error parsing user data:", error);
        logout();
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);
  
  // Login function
  const login = async (token: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await apiRequest("POST", "/api/auth", { token });
      const data = await response.json();
      
      // Store token and user data
      localStorage.setItem("access_token", token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      setState({
        isAuthenticated: true,
        user: data.user,
        token,
        isLoading: false,
      });
      
      toast({
        title: "Login successful",
        description: `Welcome, ${data.user.username}!`,
      });
      
      // Redirect to chat
      setLocation("/chat");
      
      return data.user;
    } catch (error) {
      console.error("Login error:", error);
      
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: error instanceof Error ? error.message : "Invalid access token",
      });
      
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };
  
  // Logout function
  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    
    setState({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
    });
    
    setLocation("/");
  };
  
  return {
    ...state,
    login,
    logout,
  };
}
