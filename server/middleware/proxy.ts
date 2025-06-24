import { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Function to setup proxy middleware
export function setupProxyMiddleware(app: Express) {
  // Middleware to handle proxy requests
  app.use("/proxy/*", async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authentication required for proxy" });
      }
      
      const token = authHeader.split(" ")[1];
      const user = await storage.getUserByToken(token);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid token for proxy request" });
      }
      
      // Extract the target URL from the request path
      const targetPath = req.path.replace("/proxy/", "");
      
      if (!targetPath) {
        return res.status(400).json({ message: "No target URL specified" });
      }
      
      // Decode the URL if it's encoded
      const decodedPath = decodeURIComponent(targetPath);
      
      // Build the full target URL
      const targetUrl = decodedPath.startsWith("http") 
        ? decodedPath 
        : `https://${decodedPath}`;
      
      console.log(`Proxying request to: ${targetUrl}`);
      
      // Forward the request to the target URL
      try {
        const headers: Record<string, string> = {};
        
        // Copy relevant headers from the original request
        const headersToCopy = [
          "accept",
          "content-type",
          "user-agent"
        ];
        
        headersToCopy.forEach(header => {
          if (req.headers[header]) {
            headers[header] = req.headers[header] as string;
          }
        });
        
        // Add a custom header to identify proxy requests
        headers["x-proxy-user"] = user.username;
        
        // Make the request to the target
        const response = await fetch(targetUrl, {
          method: req.method,
          headers,
          body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
        });
        
        // Get the response data
        const contentType = response.headers.get("content-type") || "";
        let data;
        
        if (contentType.includes("application/json")) {
          data = await response.json();
        } else {
          data = await response.text();
        }
        
        // Forward the response
        res.status(response.status);
        
        // Copy relevant headers from the response
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        
        res.send(data);
      } catch (error) {
        console.error("Proxy request error:", error);
        return res.status(502).json({ 
          message: "Failed to proxy request to target", 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    } catch (error) {
      console.error("Proxy middleware error:", error);
      return res.status(500).json({ message: "Server error in proxy middleware" });
    }
  });
}
