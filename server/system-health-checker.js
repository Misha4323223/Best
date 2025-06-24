/**
 * Проверка состояния всех компонентов системы
 * Включая векторизатор на порту 5006
 */

const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

class SystemHealthChecker {
  constructor() {
    this.components = {
      mainServer: { port: 5000, name: 'Main Server' },
      streamServer: { port: 5001, name: 'Stream Server' },
      g4fProvider: { port: 5004, name: 'G4F Provider' },
      vectorizer: { port: 5006, name: 'Vectorizer Server' }
    };
  }

  async checkComponentHealth(component) {
    const { port, name } = component;
    const baseUrl = `http://localhost:${port}`;
    
    try {
      // Проверяем основной endpoint
      const response = await fetch(baseUrl, {
        timeout: 3000
      });
      
      const status = response.ok ? 'healthy' : 'unhealthy';
      
      return {
        name,
        port,
        status,
        responseTime: Date.now(),
        accessible: true
      };
    } catch (error) {
      return {
        name,
        port,
        status: 'unreachable',
        error: error.message,
        accessible: false
      };
    }
  }

  async checkVectorizerEndpoints() {
    const vectorizerBase = 'http://localhost:5006/api/vectorizer';
    const endpoints = [
      '/health',
      '/formats'
    ];

    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${vectorizerBase}${endpoint}`, {
          timeout: 3000
        });
        
        results[endpoint] = {
          status: response.ok ? 'available' : 'error',
          statusCode: response.status,
          accessible: true
        };
      } catch (error) {
        results[endpoint] = {
          status: 'unreachable',
          error: error.message,
          accessible: false
        };
      }
    }
    
    return results;
  }

  async checkFileSystem() {
    const requiredDirs = ['output', 'temp', 'uploads'];
    const results = {};
    
    for (const dir of requiredDirs) {
      try {
        await fs.access(dir);
        results[dir] = { exists: true, accessible: true };
      } catch (error) {
        try {
          await fs.mkdir(dir, { recursive: true });
          results[dir] = { exists: true, created: true, accessible: true };
        } catch (createError) {
          results[dir] = { exists: false, error: createError.message, accessible: false };
        }
      }
    }
    
    return results;
  }

  async performFullHealthCheck() {
    console.log('🏥 Запуск полной проверки системы...\n');
    
    const results = {
      timestamp: new Date().toISOString(),
      components: {},
      vectorizerEndpoints: {},
      filesystem: {},
      summary: {
        total: 0,
        healthy: 0,
        unhealthy: 0,
        unreachable: 0
      }
    };

    // Проверяем компоненты
    console.log('🔍 Проверка компонентов:');
    for (const [key, component] of Object.entries(this.components)) {
      const health = await this.checkComponentHealth(component);
      results.components[key] = health;
      results.summary.total++;
      
      if (health.status === 'healthy') {
        results.summary.healthy++;
        console.log(`  ✅ ${health.name} (порт ${health.port}) - OK`);
      } else if (health.status === 'unhealthy') {
        results.summary.unhealthy++;
        console.log(`  ⚠️ ${health.name} (порт ${health.port}) - Проблемы`);
      } else {
        results.summary.unreachable++;
        console.log(`  ❌ ${health.name} (порт ${health.port}) - Недоступен`);
      }
    }

    // Проверяем векторизатор endpoints
    console.log('\n🎨 Проверка векторизатора:');
    if (results.components.vectorizer.accessible) {
      results.vectorizerEndpoints = await this.checkVectorizerEndpoints();
      
      for (const [endpoint, status] of Object.entries(results.vectorizerEndpoints)) {
        if (status.accessible) {
          console.log(`  ✅ ${endpoint} - доступен`);
        } else {
          console.log(`  ❌ ${endpoint} - недоступен`);
        }
      }
    } else {
      console.log('  ❌ Векторизатор недоступен - пропуск проверки endpoints');
    }

    // Проверяем файловую систему
    console.log('\n📁 Проверка файловой системы:');
    results.filesystem = await this.checkFileSystem();
    
    for (const [dir, status] of Object.entries(results.filesystem)) {
      if (status.accessible) {
        const created = status.created ? ' (создана)' : '';
        console.log(`  ✅ Директория ${dir}${created} - OK`);
      } else {
        console.log(`  ❌ Директория ${dir} - Ошибка: ${status.error}`);
      }
    }

    // Выводим сводку
    console.log('\n📊 Сводка:');
    console.log(`  Всего компонентов: ${results.summary.total}`);
    console.log(`  Работает: ${results.summary.healthy}`);
    console.log(`  Проблемы: ${results.summary.unhealthy}`);
    console.log(`  Недоступно: ${results.summary.unreachable}`);
    
    const allHealthy = results.summary.healthy === results.summary.total;
    console.log(`\n${allHealthy ? '✅' : '⚠️'} Система ${allHealthy ? 'полностью работоспособна' : 'требует внимания'}`);

    return results;
  }

  async saveHealthReport(results) {
    const reportPath = path.join(__dirname, '..', 'system-health-report.json');
    try {
      await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
      console.log(`\n📄 Отчет сохранен: ${reportPath}`);
    } catch (error) {
      console.log(`\n❌ Не удалось сохранить отчет: ${error.message}`);
    }
  }
}

// Запуск проверки при вызове скрипта напрямую
if (require.main === module) {
  const checker = new SystemHealthChecker();
  checker.performFullHealthCheck()
    .then(results => checker.saveHealthReport(results))
    .catch(error => {
      console.error('❌ Ошибка проверки системы:', error);
      process.exit(1);
    });
}

module.exports = { SystemHealthChecker };