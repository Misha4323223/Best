/**
 * Система автоматического сохранения чекпоинтов
 * Позволяет сохранять состояние работы агента вне лимитов Replit
 */

import fs from 'fs';
import path from 'path';

export interface Checkpoint {
  step: number;
  description: string;
  code?: string;
  files?: string[];
  timestamp: string;
  sessionId: string;
  action: 'create' | 'modify' | 'delete' | 'execute';
  metadata?: Record<string, any>;
}

export class CheckpointManager {
  private checkpointDir: string;
  private sessionId: string;
  private currentStep: number = 0;

  constructor(sessionId: string = this.generateSessionId()) {
    this.sessionId = sessionId;
    this.checkpointDir = path.join(process.cwd(), 'checkpoints');
    this.ensureCheckpointDir();
    this.loadCurrentStep();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private ensureCheckpointDir(): void {
    if (!fs.existsSync(this.checkpointDir)) {
      fs.mkdirSync(this.checkpointDir, { recursive: true });
    }
  }

  private loadCurrentStep(): void {
    try {
      const files = fs.readdirSync(this.checkpointDir);
      const sessionFiles = files.filter(f => f.includes(this.sessionId));
      this.currentStep = sessionFiles.length;
    } catch (error) {
      this.currentStep = 0;
    }
  }

  /**
   * Автоматическое сохранение чекпоинта
   */
  async saveCheckpoint(
    description: string,
    action: 'create' | 'modify' | 'delete' | 'execute',
    options: {
      code?: string;
      files?: string[];
      metadata?: Record<string, any>;
    } = {}
  ): Promise<Checkpoint> {
    this.currentStep++;

    const checkpoint: Checkpoint = {
      step: this.currentStep,
      description,
      code: options.code,
      files: options.files,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      action,
      metadata: options.metadata
    };

    const filename = `step_${this.currentStep.toString().padStart(3, '0')}_${this.sessionId}.json`;
    const filepath = path.join(this.checkpointDir, filename);

    try {
      fs.writeFileSync(filepath, JSON.stringify(checkpoint, null, 2), 'utf-8');
      console.log(`✅ Чекпоинт сохранён: ${description} (шаг ${this.currentStep})`);
      return checkpoint;
    } catch (error) {
      console.error(`❌ Ошибка сохранения чекпоинта:`, error);
      throw error;
    }
  }

  /**
   * Получить все чекпоинты текущей сессии
   */
  getAllCheckpoints(): Checkpoint[] {
    try {
      const files = fs.readdirSync(this.checkpointDir);
      const sessionFiles = files
        .filter(f => f.includes(this.sessionId) && f.endsWith('.json'))
        .sort();

      return sessionFiles.map(file => {
        const content = fs.readFileSync(path.join(this.checkpointDir, file), 'utf-8');
        return JSON.parse(content);
      });
    } catch (error) {
      console.error('Ошибка загрузки чекпоинтов:', error);
      return [];
    }
  }

  /**
   * Получить конкретный чекпоинт
   */
  getCheckpoint(step: number): Checkpoint | null {
    const checkpoints = this.getAllCheckpoints();
    return checkpoints.find(cp => cp.step === step) || null;
  }

  /**
   * Откат к определённому шагу
   */
  rollbackToStep(step: number): boolean {
    try {
      const checkpoint = this.getCheckpoint(step);
      if (!checkpoint) {
        console.error(`Шаг ${step} не найден`);
        return false;
      }

      // Удаляем чекпоинты после указанного шага
      const files = fs.readdirSync(this.checkpointDir);
      const laterFiles = files.filter(f => {
        if (!f.includes(this.sessionId)) return false;
        const match = f.match(/step_(\d+)_/);
        if (!match) return false;
        return parseInt(match[1]) > step;
      });

      laterFiles.forEach(file => {
        fs.unlinkSync(path.join(this.checkpointDir, file));
      });

      this.currentStep = step;
      console.log(`↩️ Откат к шагу ${step}: ${checkpoint.description}`);
      return true;
    } catch (error) {
      console.error('Ошибка отката:', error);
      return false;
    }
  }

  /**
   * Экспорт всех чекпоинтов в один файл
   */
  exportSession(filename?: string): string {
    const checkpoints = this.getAllCheckpoints();
    const exportData = {
      sessionId: this.sessionId,
      totalSteps: checkpoints.length,
      exportedAt: new Date().toISOString(),
      checkpoints
    };

    const exportFilename = filename || `session_export_${this.sessionId}.json`;
    const exportPath = path.join(this.checkpointDir, exportFilename);
    
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`📦 Сессия экспортирована: ${exportFilename}`);
    return exportPath;
  }

  /**
   * Получить статистику сессии
   */
  getSessionStats(): {
    sessionId: string;
    totalSteps: number;
    actions: Record<string, number>;
    duration: string;
    firstStep?: string;
    lastStep?: string;
  } {
    const checkpoints = this.getAllCheckpoints();
    const actions: Record<string, number> = {};
    
    checkpoints.forEach(cp => {
      actions[cp.action] = (actions[cp.action] || 0) + 1;
    });

    let duration = '';
    if (checkpoints.length > 0) {
      const first = new Date(checkpoints[0].timestamp);
      const last = new Date(checkpoints[checkpoints.length - 1].timestamp);
      const diffMs = last.getTime() - first.getTime();
      const diffMins = Math.round(diffMs / 60000);
      duration = `${diffMins} минут`;
    }

    return {
      sessionId: this.sessionId,
      totalSteps: checkpoints.length,
      actions,
      duration,
      firstStep: checkpoints[0]?.timestamp,
      lastStep: checkpoints[checkpoints.length - 1]?.timestamp
    };
  }

  /**
   * Автоматическое отслеживание изменений файлов
   */
  watchFiles(watchPaths: string[] = ['server', 'client', 'shared']): void {
    watchPaths.forEach(watchPath => {
      if (fs.existsSync(watchPath)) {
        fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
          if (filename && (filename.endsWith('.ts') || filename.endsWith('.js') || filename.endsWith('.tsx'))) {
            this.saveCheckpoint(
              `Файл ${eventType}: ${filename}`,
              eventType === 'rename' ? 'create' : 'modify',
              {
                files: [filename],
                metadata: { eventType, watchPath }
              }
            );
          }
        });
      }
    });
    console.log('🔍 Автоматическое отслеживание файлов активировано');
  }
}

// Глобальный экземпляр для использования во всём приложении
export const checkpointManager = new CheckpointManager();