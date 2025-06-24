import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Extend Request type to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

// Middleware to check if user is authenticated
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const token = authHeader.split(" ")[1];
    
    // Check if token is valid
    const user = await storage.getUserByToken(token);
    
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }
    
    // Add user ID to request object
    req.userId = user.id;
    
    // Continue to next middleware
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ message: "Server error during authentication" });
  }
}
