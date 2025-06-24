import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Define User schema для простой авторизации
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  token: text("token").unique(),
  isOnline: boolean("is_online").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
});

// Define Message schema
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  text: text("text").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  status: text("status").notNull().default("sent"),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  senderId: true,
  receiverId: true,
  text: true,
});

// Chat Sessions для сохранения истории чатов с AI
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").default(1), // Убираем внешний ключ для простоты
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI Messages для сохранения сообщений с AI
export const aiMessages = pgTable("ai_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => chatSessions.id).notNull(),
  content: text("content").notNull(),
  sender: text("sender").notNull(), // 'user' or 'ai'
  provider: text("provider"), // AI provider used
  model: text("model"), // AI model used
  category: text("category"), // message category
  confidence: text("confidence"), // AI confidence score
  imageUrl: text("image_url"), // attached image if any
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiMessageSchema = createInsertSchema(aiMessages).omit({
  id: true,
  createdAt: true,
});

// Define WebSocket event types
export enum WSEventType {
  AUTH = "auth",
  MESSAGE = "message",
  USER_CONNECTED = "user_connected",
  USER_DISCONNECTED = "user_disconnected",
  ERROR = "error",
}

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  chatSessions: many(chatSessions),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  aiMessages: many(aiMessages),
}));

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [aiMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// База поставщиков уличной одежды
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // streetwear, accessories, shoes, etc.
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  country: text("country").default("Россия"),
  website: text("website"),
  telegram: text("telegram"),
  whatsapp: text("whatsapp"),
  specialization: text("specialization"), // худи, кроссовки, кепки, etc.
  brands: text("brands").array(), // какие бренды поставляет
  minOrder: text("min_order"), // минимальный заказ
  paymentTerms: text("payment_terms"), // условия оплаты
  deliveryTime: text("delivery_time"), // время доставки
  notes: text("notes"),
  rating: text("rating").default("⭐⭐⭐"), // рейтинг поставщика
  status: text("status").default("active"), // active, inactive
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertAiMessage = z.infer<typeof insertAiMessageSchema>;
export type AiMessage = typeof aiMessages.$inferSelect;

// Система автоматических отчетов
export const reportTemplates = pgTable("report_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  reportType: text("report_type").notNull(), // "daily", "weekly", "monthly", "usage", "errors"
  schedule: text("schedule").notNull(), // cron format
  isActive: boolean("is_active").default(true).notNull(),
  emailRecipients: text("email_recipients").array(), // список email для отправки
  lastRun: timestamp("last_run"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reportLogs = pgTable("report_logs", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => reportTemplates.id).notNull(),
  reportData: text("report_data").notNull(), // JSON с данными отчета
  status: text("status").notNull(), // "success", "failed", "sending"
  emailsSent: integer("emails_sent").default(0),
  errorMessage: text("error_message"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const emailNotifications = pgTable("email_notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "report", "error", "system"
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("pending"), // "pending", "sent", "failed"
  reportLogId: integer("report_log_id").references(() => reportLogs.id),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReportLogSchema = createInsertSchema(reportLogs).omit({
  id: true,
  generatedAt: true,
});

export const insertEmailNotificationSchema = createInsertSchema(emailNotifications).omit({
  id: true,
  createdAt: true,
});

export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;
export type ReportLog = typeof reportLogs.$inferSelect;
export type InsertReportLog = z.infer<typeof insertReportLogSchema>;
export type EmailNotification = typeof emailNotifications.$inferSelect;
export type InsertEmailNotification = z.infer<typeof insertEmailNotificationSchema>;

// Define schemas for API validation
export const authSchema = z.object({
  token: z.string().min(1, "Access token is required"),
});

export const messageSchema = z.object({
  text: z.string().min(1, "Message cannot be empty"),
  receiverId: z.number(),
});

// Define WebSocket message interfaces
export interface WSMessage {
  type: WSEventType;
  payload: any;
}

export interface WSAuthPayload {
  token: string;
}

export interface WSMessagePayload {
  text: string;
  receiverId: number;
}

export interface WSErrorPayload {
  message: string;
}

// Define frontend user interface with additional fields
export interface UserWithInitials extends User {
  initials: string;
}

// For frontend message display
export interface MessageWithSender extends Message {
  sender: UserWithInitials;
  time: string;
}
