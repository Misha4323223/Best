import { db } from './db.js';
import { aiMessages, chatSessions, reportTemplates, reportLogs } from '../shared/schema.js';
import { emailService } from './email-service.js';
import { eq, gte, lte, desc, count, sql } from 'drizzle-orm';

interface ReportData {
  totalMessages: number;
  imagesGenerated: number;
  activeSessions: number;
  errors: number;
  topProviders?: { name: string; count: number; }[];
  errorTypes?: { type: string; count: number; }[];
  period: { start: Date; end: Date; };
}

class ReportGenerator {
  
  /**
   * Генерирует ежедневный отчет
   */
  async generateDailyReport(): Promise<ReportData> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    return this.generateReportForPeriod(yesterday, todayEnd, 'daily');
  }

  /**
   * Генерирует еженедельный отчет
   */
  async generateWeeklyReport(): Promise<ReportData> {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    return this.generateReportForPeriod(weekAgo, today, 'weekly');
  }

  /**
   * Генерирует месячный отчет
   */
  async generateMonthlyReport(): Promise<ReportData> {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    monthAgo.setHours(0, 0, 0, 0);

    return this.generateReportForPeriod(monthAgo, today, 'monthly');
  }

  /**
   * Генерирует отчет за указанный период
   */
  private async generateReportForPeriod(
    startDate: Date, 
    endDate: Date, 
    reportType: string
  ): Promise<ReportData> {
    console.log(`📊 Генерируем ${reportType} отчет за период ${startDate.toISOString()} - ${endDate.toISOString()}`);

    try {
      // Общее количество сообщений
      const totalMessages = await db
        .select({ count: count() })
        .from(aiMessages)
        .where(
          sql`${aiMessages.createdAt} >= ${startDate} AND ${aiMessages.createdAt} <= ${endDate}`
        );

      // Количество сгенерированных изображений
      const imagesGenerated = await db
        .select({ count: count() })
        .from(aiMessages)
        .where(
          sql`${aiMessages.createdAt} >= ${startDate} AND ${aiMessages.createdAt} <= ${endDate} AND ${aiMessages.imageUrl} IS NOT NULL`
        );

      // Активные сессии
      const activeSessions = await db
        .select({ count: count() })
        .from(chatSessions)
        .where(
          sql`${chatSessions.updatedAt} >= ${startDate} AND ${chatSessions.updatedAt} <= ${endDate}`
        );

      // Топ провайдеров
      const topProviders = await db
        .select({
          provider: aiMessages.provider,
          count: count()
        })
        .from(aiMessages)
        .where(
          sql`${aiMessages.createdAt} >= ${startDate} AND ${aiMessages.createdAt} <= ${endDate} AND ${aiMessages.provider} IS NOT NULL`
        )
        .groupBy(aiMessages.provider)
        .orderBy(desc(count()))
        .limit(5);

      const reportData: ReportData = {
        totalMessages: totalMessages[0]?.count || 0,
        imagesGenerated: imagesGenerated[0]?.count || 0,
        activeSessions: activeSessions[0]?.count || 0,
        errors: 0, // Пока без учета ошибок
        topProviders: topProviders.map(p => ({
          name: p.provider || 'Unknown',
          count: p.count
        })),
        period: { start: startDate, end: endDate }
      };

      console.log(`✅ Отчет сгенерирован:`, reportData);
      return reportData;

    } catch (error) {
      console.error('❌ Ошибка генерации отчета:', error);
      throw error;
    }
  }

  /**
   * Генерирует отчет об использовании системы
   */
  async generateUsageReport(): Promise<ReportData> {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const data = await this.generateReportForPeriod(weekAgo, now, 'usage');
    
    // Добавляем дополнительную статистику для отчета об использовании
    try {
      const hourlyStats = await db
        .select({
          hour: sql`EXTRACT(hour FROM ${aiMessages.createdAt})`,
          count: count()
        })
        .from(aiMessages)
        .where(
          sql`${aiMessages.createdAt} >= ${weekAgo} AND ${aiMessages.createdAt} <= ${now}`
        )
        .groupBy(sql`EXTRACT(hour FROM ${aiMessages.createdAt})`)
        .orderBy(desc(count()));

      console.log('📈 Статистика по часам:', hourlyStats);
    } catch (error) {
      console.log('⚠️ Ошибка получения почасовой статистики:', error);
    }

    return data;
  }

  /**
   * Сохраняет отчет в базу данных
   */
  async saveReport(templateId: number, reportData: ReportData, status: string = 'success'): Promise<number> {
    try {
      const [reportLog] = await db.insert(reportLogs).values({
        templateId,
        reportData: JSON.stringify(reportData),
        status,
        emailsSent: 0
      }).returning();

      console.log(`💾 Отчет сохранен с ID: ${reportLog.id}`);
      return reportLog.id;
    } catch (error) {
      console.error('❌ Ошибка сохранения отчета:', error);
      throw error;
    }
  }

  /**
   * Отправляет отчет по email
   */
  async sendReportByEmail(reportLogId: number, recipients: string[], reportType: string): Promise<void> {
    try {
      // Получаем данные отчета
      const reportLog = await db
        .select()
        .from(reportLogs)
        .where(eq(reportLogs.id, reportLogId))
        .limit(1);

      if (!reportLog.length) {
        throw new Error(`Отчет с ID ${reportLogId} не найден`);
      }

      const reportData = JSON.parse(reportLog[0].reportData);
      
      // Отправляем email
      await emailService.sendReportEmail(reportData, recipients, reportType, reportLogId);
      
      // Обновляем количество отправленных email
      await db.update(reportLogs)
        .set({ emailsSent: recipients.length })
        .where(eq(reportLogs.id, reportLogId));

      console.log(`📧 Отчет отправлен на ${recipients.length} email адресов`);
    } catch (error) {
      console.error('❌ Ошибка отправки отчета:', error);
      throw error;
    }
  }

  /**
   * Запускает генерацию и отправку всех активных отчетов
   */
  async processScheduledReports(): Promise<void> {
    try {
      const activeTemplates = await db
        .select()
        .from(reportTemplates)
        .where(eq(reportTemplates.isActive, true));

      console.log(`📋 Найдено ${activeTemplates.length} активных шаблонов отчетов`);

      for (const template of activeTemplates) {
        try {
          console.log(`🔄 Обрабатываем шаблон: ${template.name} (${template.reportType})`);
          
          let reportData: ReportData;
          
          // Генерируем отчет в зависимости от типа
          switch (template.reportType) {
            case 'daily':
              reportData = await this.generateDailyReport();
              break;
            case 'weekly':
              reportData = await this.generateWeeklyReport();
              break;
            case 'monthly':
              reportData = await this.generateMonthlyReport();
              break;
            case 'usage':
              reportData = await this.generateUsageReport();
              break;
            default:
              console.log(`⚠️ Неизвестный тип отчета: ${template.reportType}`);
              continue;
          }

          // Сохраняем отчет
          const reportLogId = await this.saveReport(template.id, reportData);
          
          // Отправляем по email, если указаны получатели
          if (template.emailRecipients && template.emailRecipients.length > 0) {
            await this.sendReportByEmail(reportLogId, template.emailRecipients, template.reportType);
          }
          
          // Обновляем время последнего запуска
          await db.update(reportTemplates)
            .set({ lastRun: new Date() })
            .where(eq(reportTemplates.id, template.id));

          console.log(`✅ Шаблон ${template.name} обработан успешно`);

        } catch (error) {
          console.error(`❌ Ошибка обработки шаблона ${template.name}:`, error);
          
          // Сохраняем отчет с ошибкой
          await this.saveReport(template.id, {} as ReportData, 'failed');
        }
      }

    } catch (error) {
      console.error('❌ Ошибка обработки запланированных отчетов:', error);
    }
  }

  /**
   * Создает шаблон отчета по умолчанию
   */
  async createDefaultTemplates(): Promise<void> {
    try {
      const defaultTemplates = [
        {
          name: 'Ежедневный отчет активности',
          description: 'Ежедневная сводка активности пользователей и использования AI',
          reportType: 'daily',
          schedule: '0 9 * * *', // Каждый день в 9:00
          emailRecipients: ['admin@example.com'] // Замените на реальные email
        },
        {
          name: 'Еженедельный отчет использования',
          description: 'Еженедельная статистика использования системы',
          reportType: 'weekly', 
          schedule: '0 10 * * 1', // Каждый понедельник в 10:00
          emailRecipients: ['admin@example.com']
        }
      ];

      for (const template of defaultTemplates) {
        await db.insert(reportTemplates).values(template).onConflictDoNothing();
      }

      console.log('✅ Шаблоны отчетов по умолчанию созданы');
    } catch (error) {
      console.error('❌ Ошибка создания шаблонов по умолчанию:', error);
    }
  }
}

export const reportGenerator = new ReportGenerator();