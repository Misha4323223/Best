import { useEffect, useRef, useState, useCallback } from "react";
import { WSMessage } from "@shared/schema";

interface UseWebSocketOptions {
  url: string;
  onOpen?: () => void;
  onMessage?: (data: string) => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  connectionStatus: "connecting" | "connected" | "disconnected";
  sendWSMessage: (message: WSMessage) => void;
}

export function useWebSocket({
  url,
  onOpen,
  onMessage,
  onClose,
  onError,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5
}: UseWebSocketOptions): UseWebSocketReturn {
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const socket = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create a function to connect to WebSocket
  const connect = useCallback(() => {
    // Clear any existing reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Close existing socket if any
    if (socket.current) {
      socket.current.close();
    }
    
    // Create new WebSocket connection
    setConnectionStatus("connecting");
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      setConnectionStatus("connected");
      reconnectCount.current = 0;
      if (onOpen) onOpen();
    };
    
    ws.onmessage = (event) => {
      if (onMessage) onMessage(event.data);
    };
    
    ws.onclose = () => {
      setConnectionStatus("disconnected");
      
      // Try to reconnect if we haven't exceeded max attempts
      if (reconnectCount.current < maxReconnectAttempts) {
        reconnectCount.current += 1;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
      
      if (onClose) onClose();
    };
    
    ws.onerror = (error) => {
      if (onError) onError(error);
    };
    
    socket.current = ws;
  }, [url, onOpen, onMessage, onClose, onError, reconnectInterval, maxReconnectAttempts]);
  
  // Connect when component mounts and clean up on unmount
  useEffect(() => {
    connect();
    
    return () => {
      if (socket.current) {
        socket.current.close();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);
  
  // Function to send messages through the WebSocket
  const sendWSMessage = useCallback((message: WSMessage) => {
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not connected, cannot send message");
    }
  }, []);
  
  return {
    connectionStatus,
    sendWSMessage
  };
}
