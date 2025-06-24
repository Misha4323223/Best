#!/usr/bin/env node
/**
 * Минимальный тестовый сервер для диагностики падения
 * Без vectorizer routes - только базовый Express
 */

import express from 'express';
import fs from 'fs';

const PORT = 3001;
const logFile = '/tmp/minimal-server.log';
const logStream = fs.createWriteStream(logFile, { flags: 'w' });

function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${type}] ${message}\n`;
  logStream.write(logEntry);
  console.log(message);
}

log('🧪 MINIMAL SERVER TEST START');

const app = express();

// Базовые middleware
app.use(express.json({ limit: '50mb' }));

// Простой health endpoint
app.get('/health', (req, res) => {
  log('📥 Health check request received');
  res.json({ 
    status: 'ok', 
    service: 'minimal-test',
    port: PORT,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Отслеживание всех процессных событий
const criticalEvents = ['exit', 'beforeExit', 'uncaughtException', 'unhandledRejection'];

criticalEvents.forEach(eventName => {
  process.on(eventName, (...args) => {
    log(`🔔 CRITICAL EVENT: ${eventName}`, 'EVENT');
    log(`   Args: ${JSON.stringify(args)}`, 'EVENT');
    log(`   Stack: ${new Error().stack}`, 'EVENT');
    
    if (eventName === 'uncaughtException' || eventName === 'unhandledRejection') {
      process.exit(1);
    }
  });
});

// Запуск сервера
const server = app.listen(PORT, '0.0.0.0', () => {
  log(`✅ MINIMAL SERVER listening on port ${PORT}`);
  log(`📍 Test URL: http://localhost:${PORT}/health`);
});

// Простой heartbeat
let heartbeatCount = 0;
const heartbeat = setInterval(() => {
  heartbeatCount++;
  const mem = process.memoryUsage();
  const handles = process._getActiveHandles();
  
  log(`💓 MINIMAL HEARTBEAT #${heartbeatCount}: Memory=${Math.round(mem.heapUsed/1024/1024)}MB, Handles=${handles.length}`, 'HEARTBEAT');
  log(`   Server listening: ${server.listening}`, 'HEARTBEAT');
  log(`   Process PID: ${process.pid}`, 'HEARTBEAT');
  
  if (heartbeatCount >= 15) {
    log('🏁 Test completed successfully - 30 seconds passed');
    server.close(() => {
      log('✅ Server closed gracefully');
      process.exit(0);
    });
  }
}, 2000);

server.on('error', (error) => {
  log(`❌ SERVER ERROR: ${error.message}`, 'ERROR');
  log(`   Error code: ${error.code}`, 'ERROR');
  log(`   Stack: ${error.stack}`, 'ERROR');
});

server.on('close', () => {
  log('🛑 Server closed');
  clearInterval(heartbeat);
});

log('🚀 Minimal server setup complete');