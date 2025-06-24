/**
 * Фоновая система чекпоинтов для агента
 * Работает незаметно в фоне, не влияя на пользовательский интерфейс
 */

import fs from 'fs';
import path from 'path';

interface AgentCheckpoint {
  id: string;
  timestamp: string;
  action: string;
  files?: string[];
  code?: string;
  metadata?: any;
}

class BackgroundCheckpointSystem {
  private checkpointsDir: string;
  private sessionId: string;
  private stepCount: number = 0;

  constructor() {
    this.sessionId = `agent_${Date.now()}`;
    this.checkpointsDir = path.join(process.cwd(), '.agent_checkpoints');
    this.init();
  }

  private init(): void {
    // Создаем скрытую папку для чекпоинтов агента
    if (!fs.existsSync(this.checkpointsDir)) {
      fs.mkdirSync(this.checkpointsDir, { recursive: true });
    }
    
    // Добавляем в .gitignore
    this.updateGitignore();
    
    // Сохраняем начальный чекпоинт
    this.saveCheckpoint('Agent session started');
  }

  private updateGitignore(): void {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    const entry = '.agent_checkpoints/';
    
    try {
      let gitignoreContent = '';
      if (fs.existsSync(gitignorePath)) {
        gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
      }
      
      if (!gitignoreContent.includes(entry)) {
        fs.writeFileSync(gitignorePath, gitignoreContent + '\n' + entry + '\n');
      }
    } catch (error) {
      // Игнорируем ошибки с .gitignore
    }
  }

  saveCheckpoint(action: string, options: {
    files?: string[];
    code?: string;
    metadata?: any;
  } = {}): void {
    try {
      this.stepCount++;
      
      const checkpoint: AgentCheckpoint = {
        id: `${this.sessionId}_${this.stepCount}`,
        timestamp: new Date().toISOString(),
        action,
        files: options.files,
        code: options.code,
        metadata: options.metadata
      };

      const filename = `checkpoint_${this.stepCount.toString().padStart(4, '0')}.json`;
      const filepath = path.join(this.checkpointsDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(checkpoint, null, 2));
      
      // Тихо логируем (только в консоль разработчика)
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 Agent checkpoint ${this.stepCount}: ${action}`);
      }
    } catch (error) {
      // Молча игнорируем ошибки, чтобы не мешать основной работе
    }
  }

  getStats(): { total: number; sessionId: string; lastAction?: string } {
    try {
      const files = fs.readdirSync(this.checkpointsDir)
        .filter(f => f.startsWith('checkpoint_') && f.endsWith('.json'));
      
      let lastAction = undefined;
      if (files.length > 0) {
        const lastFile = files[files.length - 1];
        const lastCheckpoint = JSON.parse(
          fs.readFileSync(path.join(this.checkpointsDir, lastFile), 'utf-8')
        );
        lastAction = lastCheckpoint.action;
      }
      
      return {
        total: files.length,
        sessionId: this.sessionId,
        lastAction
      };
    } catch (error) {
      return { total: 0, sessionId: this.sessionId };
    }
  }
}

// Глобальный экземпляр для использования агентом
export const backgroundCheckpoints = new BackgroundCheckpointSystem();