/**
 * Мониторинг состояния соединений для предотвращения дисконнектов
 */

class ConnectionMonitor {
  constructor() {
    this.connections = new Map();
    this.healthCheckInterval = null;
    this.isRunning = false;
  }

  // Запуск мониторинга
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔍 Запуск мониторинга соединений');
    
    // Проверяем состояние каждые 30 секунд
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);
  }

  // Остановка мониторинга
  stop() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Остановка мониторинга соединений');
  }

  // Регистрация нового соединения
  registerConnection(id, type, metadata = {}) {
    this.connections.set(id, {
      id,
      type,
      metadata,
      lastSeen: Date.now(),
      status: 'active',
      errorCount: 0
    });
    
    console.log(`📝 Зарегистрировано соединение: ${type}#${id}`);
  }

  // Обновление активности соединения
  updateConnection(id) {
    const connection = this.connections.get(id);
    if (connection) {
      connection.lastSeen = Date.now();
      connection.status = 'active';
      connection.errorCount = 0;
    }
  }

  // Отметка ошибки соединения
  markError(id, error = null) {
    const connection = this.connections.get(id);
    if (connection) {
      connection.errorCount += 1;
      connection.lastError = error;
      connection.lastErrorTime = Date.now();
      
      if (connection.errorCount >= 3) {
        connection.status = 'problematic';
        console.log(`⚠️ Соединение ${connection.type}#${id} помечено как проблемное`);
      }
    }
  }

  // Удаление соединения
  removeConnection(id) {
    const connection = this.connections.get(id);
    if (connection) {
      console.log(`🗑️ Удаление соединения: ${connection.type}#${id}`);
      this.connections.delete(id);
    }
  }

  // Проверка состояния всех соединений
  performHealthCheck() {
    const now = Date.now();
    const staleThreshold = 120000; // 2 минуты
    let activeCount = 0;
    let staleCount = 0;
    let problematicCount = 0;

    this.connections.forEach((connection, id) => {
      const timeSinceLastSeen = now - connection.lastSeen;
      
      if (timeSinceLastSeen > staleThreshold) {
        connection.status = 'stale';
        staleCount++;
      } else if (connection.status === 'problematic') {
        problematicCount++;
      } else {
        activeCount++;
      }
    });

    if (staleCount > 0 || problematicCount > 0) {
      console.log(`🏥 Состояние соединений: активных=${activeCount}, устаревших=${staleCount}, проблемных=${problematicCount}`);
    }

    // Очистка очень старых соединений (более 10 минут)
    const cleanupThreshold = 600000; // 10 минут
    this.connections.forEach((connection, id) => {
      if (now - connection.lastSeen > cleanupThreshold) {
        console.log(`🧹 Очистка устаревшего соединения: ${connection.type}#${id}`);
        this.connections.delete(id);
      }
    });
  }

  // Получение статистики
  getStats() {
    const stats = {
      total: this.connections.size,
      active: 0,
      stale: 0,
      problematic: 0,
      byType: {}
    };

    this.connections.forEach((connection) => {
      stats[connection.status]++;
      
      if (!stats.byType[connection.type]) {
        stats.byType[connection.type] = 0;
      }
      stats.byType[connection.type]++;
    });

    return stats;
  }

  // Получение детальной информации о соединениях
  getDetailedInfo() {
    const connections = [];
    
    this.connections.forEach((connection) => {
      connections.push({
        id: connection.id,
        type: connection.type,
        status: connection.status,
        lastSeen: new Date(connection.lastSeen).toISOString(),
        errorCount: connection.errorCount,
        metadata: connection.metadata
      });
    });
    
    return connections.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
  }
}

// Экспортируем singleton экземпляр
const connectionMonitor = new ConnectionMonitor();

module.exports = connectionMonitor;