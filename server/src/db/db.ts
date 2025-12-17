import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  InsertUser,
  users,
  documentComments,
  InsertDocumentComment,
  clients,
  matters,
  intakeForms,
  documentTemplates,
  documents,
  clauses,
  timeEntries,
  invoices,
  deadlines,
  activityLog,
  tasks,
  calendarIntegrations,
  calendarEvents,
  emailIntegrations,
  emails,
  emailTemplates,
  payments,
  paymentReminders,
  InsertClient,
  InsertMatter,
  InsertIntakeForm,
  InsertDocumentTemplate,
  InsertDocument,
  InsertClause,
  InsertTimeEntry,
  InsertInvoice,
  InsertDeadline,
  InsertActivityLog,
  InsertTask,
  InsertCalendarIntegration,
  InsertCalendarEvent,
  InsertEmailIntegration,
  InsertEmail,
  InsertEmailTemplate,
  InsertPayment,
  InsertPaymentReminder
} from "./schema";
import { ENV } from '../_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = mysql.createPool(process.env.DATABASE_URL);
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ User Functions ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "firmName", "phoneNumber"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values(user) as any;
  return Number(result[0]?.insertId || result.insertId);
}

// ============ Client Functions ============

export async function createClient(client: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(client) as any;
  return Number(result[0]?.insertId || result.insertId);
}

export async function getClientsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clients).where(eq(clients.userId, userId));
}

export async function getClientByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.portalAccessToken, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function enableClientPortal(clientId: number, token: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(clients)
    .set({ portalEnabled: true, portalAccessToken: token })
    .where(eq(clients.id, clientId));
}

export async function updateClientPortalAccess(clientId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(clients)
    .set({ portalLastAccess: new Date() })
    .where(eq(clients.id, clientId));
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateClient(id: number, updates: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set(updates).where(eq(clients.id, id));
}

// ============ Matter Functions ============

export async function createMatter(matter: InsertMatter) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(matters).values(matter) as any;
  return Number(result[0]?.insertId || result.insertId);
}

export async function getMattersByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(matters).where(eq(matters.userId, userId)).orderBy(desc(matters.createdAt));
}

export async function getMatterById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(matters).where(eq(matters.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getMattersByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(matters).where(eq(matters.clientId, clientId)).orderBy(desc(matters.createdAt));
}

export async function updateMatter(id: number, updates: Partial<InsertMatter>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(matters).set(updates).where(eq(matters.id, id));
}

// ============ Intake Form Functions ============

export async function createIntakeForm(form: InsertIntakeForm) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(intakeForms).values(form) as any;
  return Number(result[0]?.insertId || result.insertId);
}

export async function getIntakeFormsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(intakeForms).where(eq(intakeForms.userId, userId)).orderBy(desc(intakeForms.createdAt));
}

export async function getIntakeFormById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(intakeForms).where(eq(intakeForms.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateIntakeForm(id: number, updates: Partial<InsertIntakeForm>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(intakeForms).set(updates).where(eq(intakeForms.id, id));
}

// ============ Document Template Functions ============

export async function createDocumentTemplate(template: InsertDocumentTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documentTemplates).values(template) as any;
  return Number(result[0]?.insertId || result.insertId);
}

export async function getDocumentTemplates(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (userId) {
    return await db.select().from(documentTemplates)
      .where(sql`${documentTemplates.isPublic} = true OR ${documentTemplates.userId} = ${userId}`)
      .orderBy(desc(documentTemplates.createdAt));
  }
  return await db.select().from(documentTemplates)
    .where(eq(documentTemplates.isPublic, true))
    .orderBy(desc(documentTemplates.createdAt));
}

export async function getDocumentTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documentTemplates).where(eq(documentTemplates.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateDocumentTemplate(id: number, updates: Partial<InsertDocumentTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(documentTemplates).set(updates).where(eq(documentTemplates.id, id));
}

export async function deleteDocumentTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(documentTemplates).where(eq(documentTemplates.id, id));
}

// ============ Document Functions ============

export async function createDocument(doc: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(doc) as any;
  return Number(result[0]?.insertId || result.insertId);
}

export async function getDocumentsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.createdAt));
}

export async function getDocumentsByMatterId(matterId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(documents).where(eq(documents.matterId, matterId)).orderBy(desc(documents.createdAt));
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateDocument(id: number, updates: Partial<InsertDocument>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(documents).set(updates).where(eq(documents.id, id));
}

// ============ Clause Functions ============

export async function createClause(clause: InsertClause) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clauses).values(clause) as any;
  return Number(result[0]?.insertId || result.insertId);
}

export async function getClausesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clauses).where(eq(clauses.userId, userId)).orderBy(desc(clauses.createdAt));
}

export async function getClauseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clauses).where(eq(clauses.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ Time Entry Functions ============

export async function createTimeEntry(entry: InsertTimeEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(timeEntries).values(entry) as any;
  return Number(result[0]?.insertId || result.insertId);
}

export async function getTimeEntriesByMatterId(matterId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(timeEntries).where(eq(timeEntries.matterId, matterId)).orderBy(desc(timeEntries.entryDate));
}

export async function getTimeEntriesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(timeEntries).where(eq(timeEntries.userId, userId)).orderBy(desc(timeEntries.entryDate));
}

export async function getUnbilledTimeEntries(matterId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(timeEntries)
    .where(and(
      eq(timeEntries.matterId, matterId),
      eq(timeEntries.isBillable, true),
      eq(timeEntries.isInvoiced, false)
    ))
    .orderBy(desc(timeEntries.entryDate));
}

export async function updateTimeEntry(id: number, updates: Partial<InsertTimeEntry>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(timeEntries).set(updates).where(eq(timeEntries.id, id));
}

// ============ Invoice Functions ============

export async function createInvoice(invoice: InsertInvoice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(invoices).values(invoice) as any;
  return Number(result[0]?.insertId || result.insertId);
}

export async function getInvoicesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.createdAt));
}

export async function getInvoicesByMatterId(matterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).where(eq(invoices.matterId, matterId));
}

export async function getInvoicesByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).where(eq(invoices.clientId, clientId));
}

export async function getInvoiceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateInvoice(id: number, updates: Partial<InsertInvoice>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(invoices).set(updates).where(eq(invoices.id, id));
}

// ============ Deadline Functions ============

export async function createDeadline(deadline: InsertDeadline) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(deadlines).values(deadline) as any;
  return Number(result[0]?.insertId || result.insertId);
}

export async function getDeadlinesByMatterId(matterId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(deadlines).where(eq(deadlines.matterId, matterId)).orderBy(deadlines.dueDate);
}

export async function getUpcomingDeadlines(userId: number, days: number = 7) {
  const db = await getDb();
  if (!db) return [];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return await db.select().from(deadlines)
    .where(and(
      eq(deadlines.userId, userId),
      eq(deadlines.isCompleted, false),
      sql`${deadlines.dueDate} <= ${futureDate}`
    ))
    .orderBy(deadlines.dueDate);
}

export async function updateDeadline(id: number, updates: Partial<InsertDeadline>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(deadlines).set(updates).where(eq(deadlines.id, id));
}

// ============ Activity Log Functions ============

export async function logActivity(activity: InsertActivityLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(activityLog).values(activity);
}

export async function getActivityLogByEntity(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(activityLog)
    .where(and(
      eq(activityLog.entityType, entityType),
      eq(activityLog.entityId, entityId)
    ))
    .orderBy(desc(activityLog.createdAt));
}

export async function getAllActivityLog(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(activityLog)
    .where(eq(activityLog.userId, userId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

export async function getActivityLogByType(userId: number, entityType: string, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(activityLog)
    .where(and(
      eq(activityLog.userId, userId),
      eq(activityLog.entityType, entityType)
    ))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

export async function getActivityLogByDateRange(userId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(activityLog)
    .where(and(
      eq(activityLog.userId, userId),
      sql`${activityLog.createdAt} >= ${startDate}`,
      sql`${activityLog.createdAt} <= ${endDate}`
    ))
    .orderBy(desc(activityLog.createdAt));
}

// ============ Document Comment Functions ============

export async function createDocumentComment(comment: InsertDocumentComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(documentComments).values(comment);
  return Number((result as any)[0]?.insertId || 0);
}

export async function getDocumentComments(documentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(documentComments)
    .where(eq(documentComments.documentId, documentId))
    .orderBy(documentComments.createdAt);
}

export async function deleteDocumentComment(commentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(documentComments).where(eq(documentComments.id, commentId));
}

// ============ Task Functions ============

export async function createTask(task: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tasks).values(task) as any;
  return Number(result[0]?.insertId || result.insertId);
}

export async function getTasksByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt));
}

export async function getTasksByMatterId(matterId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tasks).where(eq(tasks.matterId, matterId)).orderBy(desc(tasks.createdAt));
}

export async function getTaskById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateTask(id: number, updates: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tasks).set(updates).where(eq(tasks.id, id));
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tasks).where(eq(tasks.id, id));
}

export async function getPendingTasks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      sql`${tasks.status} IN ('pending', 'in_progress')`
    ))
    .orderBy(tasks.dueDate);
}

export async function getOverdueTasks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return await db.select().from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      sql`${tasks.status} IN ('pending', 'in_progress')`,
      sql`${tasks.dueDate} < ${now}`
    ))
    .orderBy(tasks.dueDate);
}

export async function getTasksDueToday(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await db.select().from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      sql`${tasks.status} IN ('pending', 'in_progress')`,
      sql`${tasks.dueDate} >= ${today}`,
      sql`${tasks.dueDate} < ${tomorrow}`
    ))
    .orderBy(tasks.priority);
}

// ============ Calendar Integration Functions ============

export async function getCalendarIntegration(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(calendarIntegrations).where(eq(calendarIntegrations.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertCalendarIntegration(integration: InsertCalendarIntegration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getCalendarIntegration(integration.userId);
  if (existing) {
    await db.update(calendarIntegrations)
      .set(integration)
      .where(eq(calendarIntegrations.userId, integration.userId));
    return existing.id;
  } else {
    const result = await db.insert(calendarIntegrations).values(integration) as any;
    return Number(result[0]?.insertId || result.insertId);
  }
}

export async function updateCalendarIntegration(userId: number, updates: Partial<InsertCalendarIntegration>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(calendarIntegrations).set(updates).where(eq(calendarIntegrations.userId, userId));
}

export async function deleteCalendarIntegration(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(calendarIntegrations).where(eq(calendarIntegrations.userId, userId));
}

// ============ Calendar Event Functions ============

export async function createCalendarEvent(event: InsertCalendarEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(calendarEvents).values(event) as any;
  return Number(result[0]?.insertId || result.insertId);
}

export async function getCalendarEventByEntity(userId: number, entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(calendarEvents)
    .where(and(
      eq(calendarEvents.userId, userId),
      eq(calendarEvents.entityType, entityType),
      eq(calendarEvents.entityId, entityId)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCalendarEventsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(calendarEvents)
    .where(eq(calendarEvents.userId, userId))
    .orderBy(desc(calendarEvents.createdAt));
}

export async function updateCalendarEvent(id: number, updates: Partial<InsertCalendarEvent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(calendarEvents).set(updates).where(eq(calendarEvents.id, id));
}

export async function deleteCalendarEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
}

export async function deleteCalendarEventByEntity(userId: number, entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(calendarEvents)
    .where(and(
      eq(calendarEvents.userId, userId),
      eq(calendarEvents.entityType, entityType),
      eq(calendarEvents.entityId, entityId)
    ));
}

// ============ Email Integration Functions ============

export async function getEmailIntegration(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(emailIntegrations).where(eq(emailIntegrations.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertEmailIntegration(integration: InsertEmailIntegration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getEmailIntegration(integration.userId);
  if (existing) {
    await db.update(emailIntegrations)
      .set(integration)
      .where(eq(emailIntegrations.userId, integration.userId));
    return existing.id;
  } else {
    const result = await db.insert(emailIntegrations).values(integration) as any;
    return Number(result[0]?.insertId || result.insertId);
  }
}

export async function updateEmailIntegration(userId: number, updates: Partial<InsertEmailIntegration>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(emailIntegrations).set(updates).where(eq(emailIntegrations.userId, userId));
}

export async function deleteEmailIntegration(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(emailIntegrations).where(eq(emailIntegrations.userId, userId));
}

// ============ Email Functions ============

export async function createEmail(email: InsertEmail) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(emails).values(email) as any;
  return Number(result[0]?.insertId || result.insertId);
}

export async function getEmailsByUserId(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(emails)
    .where(eq(emails.userId, userId))
    .orderBy(desc(emails.receivedAt))
    .limit(limit);
}

export async function getEmailsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(emails)
    .where(eq(emails.clientId, clientId))
    .orderBy(desc(emails.receivedAt));
}

export async function getEmailsByMatterId(matterId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(emails)
    .where(eq(emails.matterId, matterId))
    .orderBy(desc(emails.receivedAt));
}

export async function getEmailById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(emails).where(eq(emails.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getEmailByExternalId(userId: number, externalId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(emails)
    .where(and(eq(emails.userId, userId), eq(emails.externalId, externalId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateEmail(id: number, updates: Partial<InsertEmail>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(emails).set(updates).where(eq(emails.id, id));
}

export async function deleteEmail(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(emails).where(eq(emails.id, id));
}

export async function getUnreadEmailCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(emails)
    .where(and(
      eq(emails.userId, userId),
      eq(emails.isRead, false),
      eq(emails.isArchived, false)
    ));
  return result[0]?.count || 0;
}

export async function searchEmails(userId: number, query: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(emails)
    .where(and(
      eq(emails.userId, userId),
      sql`(${emails.subject} LIKE ${'%' + query + '%'} OR ${emails.bodyText} LIKE ${'%' + query + '%'} OR ${emails.fromAddress} LIKE ${'%' + query + '%'})`
    ))
    .orderBy(desc(emails.receivedAt))
    .limit(limit);
}

// ============ Email Template Functions ============

export async function createEmailTemplate(template: InsertEmailTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(emailTemplates).values(template) as any;
  return Number(result[0]?.insertId || result.insertId);
}

export async function getEmailTemplatesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(emailTemplates)
    .where(eq(emailTemplates.userId, userId))
    .orderBy(emailTemplates.name);
}

export async function getEmailTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateEmailTemplate(id: number, updates: Partial<InsertEmailTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(emailTemplates).set(updates).where(eq(emailTemplates.id, id));
}

export async function deleteEmailTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
}

// ============ Payments ============

export async function createPayment(data: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(payments).values(data);
  return result[0].insertId;
}

export async function getPaymentsByInvoiceId(invoiceId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(payments).where(eq(payments.invoiceId, invoiceId)).orderBy(desc(payments.paymentDate));
}

export async function getPaymentsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.paymentDate));
}

export async function getPaymentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePayment(id: number, updates: Partial<InsertPayment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(payments).set(updates).where(eq(payments.id, id));
}

export async function deletePayment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(payments).where(eq(payments.id, id));
}

export async function getTotalPaymentsByInvoiceId(invoiceId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(${payments.amount}), 0)` })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));
  return result[0]?.total || 0;
}

// ============ Payment Reminders ============

export async function createPaymentReminder(data: InsertPaymentReminder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(paymentReminders).values(data);
  return result[0].insertId;
}

export async function getPaymentRemindersByInvoiceId(invoiceId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(paymentReminders).where(eq(paymentReminders.invoiceId, invoiceId)).orderBy(paymentReminders.reminderDate);
}

export async function getPendingPaymentReminders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(paymentReminders)
    .where(
      and(
        eq(paymentReminders.userId, userId),
        eq(paymentReminders.isSent, false)
      )
    )
    .orderBy(paymentReminders.reminderDate);
}

export async function getDuePaymentReminders() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(paymentReminders)
    .where(
      and(
        eq(paymentReminders.isSent, false),
        sql`${paymentReminders.reminderDate} <= NOW()`
      )
    )
    .orderBy(paymentReminders.reminderDate);
}

export async function markReminderAsSent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(paymentReminders).set({ isSent: true, sentAt: new Date() }).where(eq(paymentReminders.id, id));
}

export async function deletePaymentReminder(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(paymentReminders).where(eq(paymentReminders.id, id));
}

export async function getOverdueInvoices(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, userId),
        eq(invoices.status, "sent"),
        sql`${invoices.dueDate} < NOW()`
      )
    )
    .orderBy(invoices.dueDate);
}
