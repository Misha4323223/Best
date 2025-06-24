/**
 * Менеджер векторизатора - управляет запуском и интеграцией
 * Обеспечивает доступность API векторизации в основном приложении
 */

const { spawn } = require('child_process');
const path = require('path');
const fetch = require('node-fetch');

class VectorizerManager {
  constructor() {
    this.vectorizerProcess = null;
    this.isRunning = false;
    this.port = process.env.VECTORIZER_PORT || 5006;
    this.maxRestartAttempts = 3;
    this.restartAttempts = 0;
  }

  /**
   * Запуск векторизатора как отдельного процесса
   */
  async startVectorizer() {
    if (this.isRunning) {
      console.log(`🎨 Векторизатор уже запущен на порту ${this.port}`);
      return true;
    }

    try {
      console.log(`🚀 Запуск векторизатора на порту ${this.port}...`);
      
      const vectorizerPath = path.join(__dirname, 'imagetracer-vectorizer.js');
      
      this.vectorizerProcess = spawn('node', [vectorizerPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          VECTORIZER_PORT: this.port
        }
      });

      // Обработка вывода
      this.vectorizerProcess.stdout.on('data', (data) => {
        console.log(`🎨 [Vectorizer]: ${data.toString().trim()}`);
      });

      this.vectorizerProcess.stderr.on('data', (data) => {
        console.error(`❌ [Vectorizer Error]: ${data.toString().trim()}`);
      });

      // Обработка завершения процесса
      this.vectorizerProcess.on('close', (code) => {
        console.log(`🛑 Векторизатор завершен с кодом ${code}`);
        this.isRunning = false;
        this.vectorizerProcess = null;
        
        // Автоматический перезапуск при ошибке
        if (code !== 0 && this.restartAttempts < this.maxRestartAttempts) {
          console.log(`🔄 Перезапуск векторизатора (попытка ${this.restartAttempts + 1}/${this.maxRestartAttempts})...`);
          this.restartAttempts++;
          setTimeout(() => this.startVectorizer(), 2000);
        } else if (this.restartAttempts >= this.maxRestartAttempts) {
          console.error(`❌ Достигнуто максимальное количество попыток перезапуска векторизатора`);
        }
      });

      this.vectorizerProcess.on('error', (error) => {
        console.error(`❌ Ошибка запуска векторизатора:`, error);
        this.isRunning = false;
      });

      // Ждем запуска и проверяем доступность
      await this.waitForStart();
      this.isRunning = true;
      this.restartAttempts = 0;
      
      console.log(`✅ Векторизатор успешно запущен на http://localhost:${this.port}`);
      return true;

    } catch (error) {
      console.error(`❌ Не удалось запустить векторизатор:`, error);
      return false;
    }
  }

  /**
   * Ожидание запуска векторизатора
   */
  async waitForStart(maxAttempts = 10, interval = 1000) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`http://localhost:${this.port}/health`, {
          timeout: 2000
        });
        
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Векторизатор еще не запустился
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error('Векторизатор не запустился в течение ожидаемого времени');
  }

  /**
   * Остановка векторизатора
   */
  stopVectorizer() {
    if (this.vectorizerProcess && this.isRunning) {
      console.log(`🛑 Остановка векторизатора...`);
      this.vectorizerProcess.kill('SIGTERM');
      this.isRunning = false;
    }
  }

  /**
   * Проверка состояния векторизатора
   */
  async checkHealth() {
    if (!this.isRunning) {
      return { status: 'stopped', available: false };
    }

    try {
      const response = await fetch(`http://localhost:${this.port}/health`, {
        timeout: 3000
      });
      
      if (response.ok) {
        const data = await response.json();
        return { status: 'running', available: true, data };
      } else {
        return { status: 'unhealthy', available: false };
      }
    } catch (error) {
      return { status: 'unreachable', available: false, error: error.message };
    }
  }

  /**
   * Получение URL API векторизатора
   */
  getApiUrl() {
    return `http://localhost:${this.port}/api/vectorizer`;
  }

  /**
   * Прокси для векторизации через внутренний API
   */
  async vectorizeImage(imageBuffer, filename, options = {}) {
    if (!this.isRunning) {
      throw new Error('Векторизатор не запущен');
    }

    try {
      const FormData = require('form-data');
      const form = new FormData();
      
      form.append('image', imageBuffer, { filename });
      form.append('quality', options.quality || 'standard');
      form.append('format', options.format || 'svg');
      form.append('optimizeFor', options.optimizeFor || 'web');

      const response = await fetch(`${this.getApiUrl()}/convert`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
      });

      return await response.json();
    } catch (error) {
      console.error('Ошибка векторизации через прокси:', error);
      throw error;
    }
  }

  /**
   * Профессиональная векторизация через внутренний API
   */
  async professionalVectorize(imageBuffer, filename, options = {}) {
    if (!this.isRunning) {
      throw new Error('Векторизатор не запущен');
    }

    try {
      const FormData = require('form-data');
      const form = new FormData();
      
      form.append('image', imageBuffer, { filename });
      form.append('quality', options.quality || 'premium');
      if (options.formats) {
        form.append('formats', options.formats.join(','));
      }
      form.append('generatePreviews', options.generatePreviews || 'false');
      form.append('optimizeFor', options.optimizeFor || 'web');
      form.append('includeMetadata', options.includeMetadata !== false ? 'true' : 'false');

      const response = await fetch(`${this.getApiUrl()}/professional`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
      });

      return await response.json();
    } catch (error) {
      console.error('Ошибка профессиональной векторизации:', error);
      throw error;
    }
  }
}

// Создаем единый экземпляр менеджера
const vectorizerManager = new VectorizerManager();

// Автоматический запуск при импорте модуля
vectorizerManager.startVectorizer().catch(error => {
  console.error('Не удалось автоматически запустить векторизатор:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  vectorizerManager.stopVectorizer();
});

process.on('SIGINT', () => {
  vectorizerManager.stopVectorizer();
});

module.exports = vectorizerManager;