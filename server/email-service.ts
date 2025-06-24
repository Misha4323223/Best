import { MailService } from '@sendgrid/mail';
import { db } from './db.js';
import { emailNotifications, reportLogs } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

class EmailService {
  private mailService: MailService;
  private isConfigured: boolean = false;

  constructor() {
    this.mailService = new MailService();
    this.initialize();
  }

  private initialize() {
    if (process.env.SENDGRID_API_KEY) {
      this.mailService.setApiKey(process.env.SENDGRID_API_KEY);
      this.isConfigured = true;
      console.log('✅ SendGrid настроен и готов к отправке');
    } else {
      console.log('⚠️ SENDGRID_API_KEY не найден. Email уведомления отключены.');
    }
  }

  async sendEmail(params: {
    to: string;
    from: string;
    subject: string;
    text?: string;
    html?: string;
    type: string;
    reportLogId?: number;
  }): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('❌ SendGrid не настроен. Пропускаем отправку email.');
      return false;
    }

    try {
      // Сохраняем уведомление в БД
      const [notification] = await db.insert(emailNotifications).values({
        type: params.type,
        recipient: params.to,
        subject: params.subject,
        content: params.html || params.text || 'No content',
        status: 'pending',
        reportLogId: params.reportLogId,
      }).returning();

      // Отправляем email
      const mailData: any = {
        to: params.to,
        from: params.from,
        subject: params.subject,
      };
      
      if (params.text) mailData.text = params.text;
      if (params.html) mailData.html = params.html;
      
      await this.mailService.send(mailData);

      // Обновляем статус
      await db.update(emailNotifications)
        .set({ 
          status: 'sent', 
          sentAt: new Date() 
        })
        .where(eq(emailNotifications.id, notification.id));

      console.log(`✅ Email отправлен: ${params.to} - ${params.subject}`);
      return true;

    } catch (error) {
      console.error('❌ Ошибка отправки email:', error);
      
      // Обновляем статус с ошибкой
      try {
        await db.update(emailNotifications)
          .set({ 
            status: 'failed', 
            errorMessage: (error as Error).message || 'Unknown error'
          })
          .where(eq(emailNotifications.recipient, params.to));
      } catch (dbError) {
        console.error('Ошибка обновления статуса email:', dbError);
      }
      
      return false;
    }
  }

  async sendReportEmail(
    reportData: any, 
    recipients: string[], 
    reportType: string,
    reportLogId: number
  ): Promise<void> {
    const subject = `AI Chat Система - ${this.getReportTitle(reportType)} отчет`;
    const html = this.generateReportHTML(reportData, reportType);
    
    for (const recipient of recipients) {
      await this.sendEmail({
        to: recipient,
        from: 'noreply@aichat.ru', // Замените на ваш домен
        subject,
        html,
        type: 'report',
        reportLogId,
      });
    }
  }

  async sendErrorNotification(
    error: string, 
    context: string,
    recipients: string[]
  ): Promise<void> {
    const subject = 'AI Chat Система - Критическая ошибка';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #dc3545;">🚨 Критическая ошибка в системе</h2>
        <p><strong>Время:</strong> ${new Date().toLocaleString('ru-RU')}</p>
        <p><strong>Контекст:</strong> ${context}</p>
        <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 15px 0;">
          <pre style="margin: 0; white-space: pre-wrap;">${error}</pre>
        </div>
        <p>Проверьте систему и примите необходимые меры.</p>
      </div>
    `;

    for (const recipient of recipients) {
      await this.sendEmail({
        to: recipient,
        from: 'alerts@aichat.ru', // Замените на ваш домен
        subject,
        html,
        type: 'error',
      });
    }
  }

  private getReportTitle(reportType: string): string {
    const titles: Record<string, string> = {
      daily: 'Ежедневный',
      weekly: 'Еженедельный', 
      monthly: 'Ежемесячный',
      usage: 'Использование системы',
      errors: 'Отчет об ошибках'
    };
    return titles[reportType] || reportType;
  }

  private generateReportHTML(data: any, reportType: string): string {
    const title = this.getReportTitle(reportType);
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <header style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">${title} отчет</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${new Date().toLocaleDateString('ru-RU')}</p>
        </header>
        
        <div style="padding: 20px; background: #f8f9fa;">
          ${this.renderReportContent(data, reportType)}
        </div>
        
        <footer style="background: #343a40; color: white; padding: 15px; text-align: center; font-size: 12px;">
          Автоматически сгенерировано AI Chat системой
        </footer>
      </div>
    `;
  }

  private renderReportContent(data: any, reportType: string): string {
    switch (reportType) {
      case 'daily':
      case 'weekly':
      case 'monthly':
        return `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="color: #28a745; margin: 0 0 10px 0;">Сообщения</h3>
              <p style="font-size: 24px; font-weight: bold; margin: 0;">${data.totalMessages || 0}</p>
              <small style="color: #6c757d;">За период</small>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="color: #007bff; margin: 0 0 10px 0;">Изображения</h3>
              <p style="font-size: 24px; font-weight: bold; margin: 0;">${data.imagesGenerated || 0}</p>
              <small style="color: #6c757d;">Сгенерировано</small>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="color: #ffc107; margin: 0 0 10px 0;">Сессии</h3>
              <p style="font-size: 24px; font-weight: bold; margin: 0;">${data.activeSessions || 0}</p>
              <small style="color: #6c757d;">Активных</small>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="color: #dc3545; margin: 0 0 10px 0;">Ошибки</h3>
              <p style="font-size: 24px; font-weight: bold; margin: 0;">${data.errors || 0}</p>
              <small style="color: #6c757d;">Зафиксировано</small>
            </div>
          </div>
          
          ${data.topProviders ? `
            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 15px;">
              <h3>Популярные AI провайдеры</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f8f9fa;">
                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid #dee2e6;">Провайдер</th>
                    <th style="padding: 8px; text-align: right; border-bottom: 1px solid #dee2e6;">Использований</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.topProviders.map(provider => `
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${provider.name}</td>
                      <td style="padding: 8px; text-align: right; border-bottom: 1px solid #f0f0f0;">${provider.count}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
        `;
        
      case 'errors':
        return `
          <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #dc3545;">Отчет об ошибках</h3>
            <p>Всего ошибок за период: <strong>${data.totalErrors || 0}</strong></p>
            ${data.errorTypes ? `
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <thead>
                  <tr style="background: #f8f9fa;">
                    <th style="padding: 8px; text-align: left;">Тип ошибки</th>
                    <th style="padding: 8px; text-align: right;">Количество</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.errorTypes.map(error => `
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${error.type}</td>
                      <td style="padding: 8px; text-align: right; border-bottom: 1px solid #f0f0f0;">${error.count}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}
          </div>
        `;
        
      default:
        return `<pre style="background: white; padding: 15px; border-radius: 8px;">${JSON.stringify(data, null, 2)}</pre>`;
    }
  }

  isReady(): boolean {
    return this.isConfigured;
  }
}

export const emailService = new EmailService();