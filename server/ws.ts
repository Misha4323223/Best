import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { IStorage } from "./storage";
import { WSEventType, WSMessage, WSMessagePayload, WSErrorPayload } from "@shared/schema";

interface ExtendedWebSocket extends WebSocket {
  userId?: number;
  isAlive?: boolean;
}

export function setupWebSocket(httpServer: HttpServer, storage: IStorage) {
  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: "/api/ws" });
  
  // Store connected clients by user ID
  const connectedClients = new Map<number, ExtendedWebSocket>();
  
  // Handle WebSocket connection
  wss.on("connection", (ws: ExtendedWebSocket) => {
    console.log("WebSocket client connected");
    
    // Set initial state
    ws.isAlive = true;
    
    // Handle messages from client
    ws.on("message", async (data: WebSocket.Data) => {
      try {
        // Parse message
        const message: WSMessage = JSON.parse(data.toString());
        
        // Process message based on type
        switch (message.type) {
          case WSEventType.AUTH:
            await handleAuthentication(ws, message.payload, storage, connectedClients);
            break;
            
          case WSEventType.MESSAGE:
            await handleMessage(ws, message.payload, storage, connectedClients);
            break;
            
          default:
            sendError(ws, `Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
        sendError(ws, "Failed to process message");
      }
    });
    
    // Handle ping/pong for connection health check
    ws.on("pong", () => {
      ws.isAlive = true;
    });
    
    // Handle client disconnect
    ws.on("close", async () => {
      if (ws.userId) {
        // Remove from connected clients
        connectedClients.delete(ws.userId);
        
        // Update user online status
        await storage.setUserOnlineStatus(ws.userId, false);
        
        // Notify other clients
        broadcastUserStatus(ws.userId, false, connectedClients);
        
        console.log(`User ${ws.userId} disconnected`);
      }
    });
  });
  
  // Set up interval to check for stale connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws: ExtendedWebSocket) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  // Clean up interval when server closes
  wss.on("close", () => {
    clearInterval(interval);
  });
  
  // Log when server is ready
  console.log("WebSocket server initialized");
}

// Handler for authentication messages
async function handleAuthentication(
  ws: ExtendedWebSocket,
  payload: any,
  storage: IStorage,
  connectedClients: Map<number, ExtendedWebSocket>
) {
  try {
    // Validate token
    const { token } = payload;
    
    if (!token) {
      return sendError(ws, "No token provided");
    }
    
    // Get user from token
    const user = await storage.getUserByToken(token);
    
    if (!user) {
      return sendError(ws, "Invalid token");
    }
    
    // Set WebSocket user ID
    ws.userId = user.id;
    
    // Store connection
    connectedClients.set(user.id, ws);
    
    // Update user online status
    await storage.setUserOnlineStatus(user.id, true);
    
    // Notify other clients that user is online
    broadcastUserStatus(user.id, true, connectedClients);
    
    // Send confirmation to client
    ws.send(JSON.stringify({
      type: WSEventType.AUTH,
      payload: {
        success: true,
        userId: user.id,
        username: user.username
      }
    }));
    
    console.log(`User ${user.id} (${user.username}) authenticated via WebSocket`);
  } catch (error) {
    console.error("Authentication error:", error);
    sendError(ws, "Authentication failed");
  }
}

// Handler for message messages
async function handleMessage(
  ws: ExtendedWebSocket,
  payload: WSMessagePayload,
  storage: IStorage,
  connectedClients: Map<number, ExtendedWebSocket>
) {
  try {
    if (!ws.userId) {
      return sendError(ws, "Not authenticated");
    }
    
    const { text, receiverId } = payload;
    
    if (!text || !receiverId) {
      return sendError(ws, "Invalid message data");
    }
    
    // Create message in storage
    const message = await storage.createMessage({
      senderId: ws.userId,
      receiverId,
      text
    });
    
    // Get sender details
    const sender = await storage.getUser(ws.userId);
    
    if (!sender) {
      return sendError(ws, "Sender not found");
    }
    
    // Format message for client
    const formattedMessage = {
      ...message,
      sender: {
        ...sender,
        initials: sender.username
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2)
      },
      time: new Date(message.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
    
    // Send message to recipient if they're connected
    const recipientWs = connectedClients.get(receiverId);
    
    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
      recipientWs.send(JSON.stringify({
        type: WSEventType.MESSAGE,
        payload: formattedMessage
      }));
      
      // Update message status to delivered
      // In a real app, we'd update the message status in storage too
    }
  } catch (error) {
    console.error("Message handling error:", error);
    sendError(ws, "Failed to send message");
  }
}

// Helper to send error messages
function sendError(ws: WebSocket, message: string) {
  const payload: WSErrorPayload = { message };
  
  ws.send(JSON.stringify({
    type: WSEventType.ERROR,
    payload
  }));
}

// Helper to broadcast user status changes
function broadcastUserStatus(
  userId: number,
  isOnline: boolean,
  connectedClients: Map<number, ExtendedWebSocket>
) {
  // Broadcast to all connected clients except the user
  connectedClients.forEach((clientWs, clientId) => {
    if (clientId !== userId && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: isOnline ? WSEventType.USER_CONNECTED : WSEventType.USER_DISCONNECTED,
        payload: { userId }
      }));
    }
  });
}
