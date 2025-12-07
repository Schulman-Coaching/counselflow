import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  firmName: text("firmName"),
  phoneNumber: varchar("phoneNumber", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const documentComments = mysqlTable("documentComments", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  userId: int("userId"),
  clientId: int("clientId"),
  authorName: text("authorName").notNull(),
  authorType: mysqlEnum("authorType", ["attorney", "client"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DocumentComment = typeof documentComments.$inferSelect;
export type InsertDocumentComment = typeof documentComments.$inferInsert;

// TODO: Add your tables here - stores potential and active clients
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // lawyer who owns this client
  name: text("name").notNull(),
  email: varchar("email", { length: 320 }),
  phoneNumber: varchar("phoneNumber", { length: 20 }),
  address: text("address"),
  status: mysqlEnum("status", ["lead", "active", "inactive", "archived"]).default("lead").notNull(),
  leadScore: int("leadScore"), // AI-generated lead score 0-100
  source: varchar("source", { length: 100 }), // where the lead came from
  notes: text("notes"),
  // Client portal access
  portalEnabled: boolean("portalEnabled").default(false).notNull(),
  portalAccessToken: varchar("portalAccessToken", { length: 64 }), // unique token for portal access
  portalLastAccess: timestamp("portalLastAccess"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Matters/Cases table - represents legal matters
 */
export const matters = mysqlTable("matters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // lawyer handling the matter
  clientId: int("clientId").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  caseType: varchar("caseType", { length: 100 }).notNull(), // e.g., "Estate Planning", "Personal Injury"
  status: mysqlEnum("status", ["open", "pending", "closed", "archived"]).default("open").notNull(),
  estimatedValue: int("estimatedValue"), // in cents
  billingType: mysqlEnum("billingType", ["hourly", "flat_fee", "contingency"]).default("hourly").notNull(),
  hourlyRate: int("hourlyRate"), // in cents
  flatFeeAmount: int("flatFeeAmount"), // in cents
  filingDate: timestamp("filingDate"),
  closingDate: timestamp("closingDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Matter = typeof matters.$inferSelect;
export type InsertMatter = typeof matters.$inferInsert;

/**
 * Intake forms - stores client intake submissions
 */
export const intakeForms = mysqlTable("intakeForms", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // lawyer who receives the intake
  clientId: int("clientId"), // linked after processing
  matterId: int("matterId"), // linked if matter is created
  formData: text("formData").notNull(), // JSON string of form responses
  aiAnalysis: text("aiAnalysis"), // AI-generated analysis of the intake
  urgencyFlag: boolean("urgencyFlag").default(false),
  conflictCheckResult: text("conflictCheckResult"),
  status: mysqlEnum("status", ["new", "reviewed", "converted", "rejected"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IntakeForm = typeof intakeForms.$inferSelect;
export type InsertIntakeForm = typeof intakeForms.$inferInsert;

/**
 * Document templates - stores reusable legal document templates
 */
export const documentTemplates = mysqlTable("documentTemplates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // null for system templates, set for user-created
  name: text("name").notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(), // e.g., "Wills", "Contracts"
  state: varchar("state", { length: 2 }), // US state code for state-specific templates
  templateContent: text("templateContent").notNull(), // template with placeholders
  questionnaireSchema: text("questionnaireSchema"), // JSON schema for questionnaire
  isPublic: boolean("isPublic").default(false), // system templates
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type InsertDocumentTemplate = typeof documentTemplates.$inferInsert;

/**
 * Generated documents - stores documents created from templates
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  matterId: int("matterId"),
  templateId: int("templateId"),
  title: text("title").notNull(),
  content: text("content").notNull(), // final document content
  fileUrl: text("fileUrl"), // S3 URL for PDF version
  fileKey: text("fileKey"), // S3 key for file management
  version: int("version").default(1).notNull(),
  status: mysqlEnum("status", ["draft", "final", "archived"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Clause library - stores reusable clauses
 */
export const clauses = mysqlTable("clauses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
  tags: text("tags"), // comma-separated tags
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Clause = typeof clauses.$inferSelect;
export type InsertClause = typeof clauses.$inferInsert;

/**
 * Time entries - tracks billable and non-billable time
 */
export const timeEntries = mysqlTable("timeEntries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  matterId: int("matterId").notNull(),
  description: text("description").notNull(),
  aiNarrative: text("aiNarrative"), // AI-enhanced billing narrative
  durationMinutes: int("durationMinutes").notNull(),
  hourlyRate: int("hourlyRate"), // in cents, captured at time of entry
  isBillable: boolean("isBillable").default(true).notNull(),
  isInvoiced: boolean("isInvoiced").default(false).notNull(),
  invoiceId: int("invoiceId"),
  entryDate: timestamp("entryDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = typeof timeEntries.$inferInsert;

/**
 * Invoices - stores generated invoices
 */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  matterId: int("matterId").notNull(),
  clientId: int("clientId").notNull(),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
  totalAmount: int("totalAmount").notNull(), // in cents
  status: mysqlEnum("status", ["draft", "sent", "paid", "overdue", "cancelled"]).default("draft").notNull(),
  dueDate: timestamp("dueDate"),
  paidDate: timestamp("paidDate"),
  pdfUrl: text("pdfUrl"), // S3 URL for PDF invoice
  pdfKey: text("pdfKey"), // S3 key
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/**
 * Payments - tracks individual payment records
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  invoiceId: int("invoiceId").notNull(),
  amount: int("amount").notNull(), // in cents
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "check", "credit_card", "bank_transfer", "other"]).default("other").notNull(),
  referenceNumber: varchar("referenceNumber", { length: 100 }),
  notes: text("notes"),
  paymentDate: timestamp("paymentDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Payment Reminders - stores scheduled payment reminder notifications
 */
export const paymentReminders = mysqlTable("paymentReminders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  invoiceId: int("invoiceId").notNull(),
  reminderDate: timestamp("reminderDate").notNull(),
  reminderType: mysqlEnum("reminderType", ["upcoming", "due", "overdue", "custom"]).default("upcoming").notNull(),
  message: text("message"),
  isSent: boolean("isSent").default(false).notNull(),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PaymentReminder = typeof paymentReminders.$inferSelect;
export type InsertPaymentReminder = typeof paymentReminders.$inferInsert;

/**
 * Deadlines - tracks important dates and deadlines
 */
export const deadlines = mysqlTable("deadlines", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  matterId: int("matterId").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("dueDate").notNull(),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  reminderSent: boolean("reminderSent").default(false).notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Deadline = typeof deadlines.$inferSelect;
export type InsertDeadline = typeof deadlines.$inferInsert;

/**
 * Activity log - audit trail for all actions
 */
export const activityLog = mysqlTable("activityLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(), // e.g., "matter", "document", "invoice"
  entityId: int("entityId").notNull(),
  action: varchar("action", { length: 100 }).notNull(), // e.g., "created", "updated", "deleted"
  details: text("details"), // JSON string with additional context
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = typeof activityLog.$inferInsert;

/**
 * Tasks - tracks work items for matters
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // attorney who owns this task
  matterId: int("matterId"), // optional - task can be general or matter-specific
  clientId: int("clientId"), // optional - for quick reference
  title: text("title").notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),
  assignedTo: int("assignedTo"), // for future multi-user support
  estimatedMinutes: int("estimatedMinutes"), // time estimate for the task
  actualMinutes: int("actualMinutes"), // actual time spent
  tags: text("tags"), // comma-separated tags for categorization
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Calendar integrations - stores OAuth tokens and sync settings
 */
export const calendarIntegrations = mysqlTable("calendarIntegrations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  provider: mysqlEnum("provider", ["google", "outlook"]).notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiry: timestamp("tokenExpiry"),
  calendarId: varchar("calendarId", { length: 255 }), // selected calendar to sync
  syncDeadlines: boolean("syncDeadlines").default(true).notNull(),
  syncTasks: boolean("syncTasks").default(false).notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  isConnected: boolean("isConnected").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CalendarIntegration = typeof calendarIntegrations.$inferSelect;
export type InsertCalendarIntegration = typeof calendarIntegrations.$inferInsert;

/**
 * Calendar events - tracks synced events for reference
 */
export const calendarEvents = mysqlTable("calendarEvents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: mysqlEnum("provider", ["google", "outlook"]).notNull(),
  externalEventId: varchar("externalEventId", { length: 255 }).notNull(), // Google/Outlook event ID
  entityType: varchar("entityType", { length: 50 }).notNull(), // "deadline" or "task"
  entityId: int("entityId").notNull(),
  title: text("title").notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  lastSyncAt: timestamp("lastSyncAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;

/**
 * Email integrations - stores OAuth tokens for email providers
 */
export const emailIntegrations = mysqlTable("emailIntegrations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  provider: mysqlEnum("provider", ["gmail", "outlook"]).notNull(),
  email: varchar("email", { length: 320 }).notNull(), // connected email address
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiry: timestamp("tokenExpiry"),
  isConnected: boolean("isConnected").default(false).notNull(),
  autoLinkToClients: boolean("autoLinkToClients").default(true).notNull(), // auto-link emails to clients by address
  syncEnabled: boolean("syncEnabled").default(true).notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailIntegration = typeof emailIntegrations.$inferSelect;
export type InsertEmailIntegration = typeof emailIntegrations.$inferInsert;

/**
 * Emails - stores email communications
 */
export const emails = mysqlTable("emails", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: int("clientId"), // linked client if matched
  matterId: int("matterId"), // linked matter if assigned
  externalId: varchar("externalId", { length: 255 }), // Gmail/Outlook message ID
  threadId: varchar("threadId", { length: 255 }), // for threading
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  fromAddress: varchar("fromAddress", { length: 320 }).notNull(),
  fromName: text("fromName"),
  toAddresses: text("toAddresses").notNull(), // JSON array of addresses
  ccAddresses: text("ccAddresses"), // JSON array
  bccAddresses: text("bccAddresses"), // JSON array
  subject: text("subject"),
  bodyText: text("bodyText"), // plain text version
  bodyHtml: text("bodyHtml"), // HTML version
  hasAttachments: boolean("hasAttachments").default(false).notNull(),
  attachments: text("attachments"), // JSON array of attachment metadata
  isRead: boolean("isRead").default(false).notNull(),
  isStarred: boolean("isStarred").default(false).notNull(),
  isArchived: boolean("isArchived").default(false).notNull(),
  sentAt: timestamp("sentAt"),
  receivedAt: timestamp("receivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Email = typeof emails.$inferSelect;
export type InsertEmail = typeof emails.$inferInsert;

/**
 * Email templates - reusable email templates
 */
export const emailTemplates = mysqlTable("emailTemplates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  bodyHtml: text("bodyHtml").notNull(),
  category: varchar("category", { length: 100 }), // e.g., "follow-up", "intake", "billing"
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;
