import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "lawyer@example.com",
    name: "Test Lawyer",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("tasks router", () => {
  it("should create a new task without matter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tasks.create({
      title: "Review documents",
      description: "Review the contract documents for client",
      priority: "high",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("should create a task linked to a matter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a client first
    const client = await caller.clients.create({
      name: "Task Test Client",
      email: "taskclient@example.com",
    });

    // Create a matter
    const matter = await caller.matters.create({
      clientId: client.id,
      title: "Task Test Matter",
      caseType: "Business Law",
      billingType: "hourly",
    });

    // Create a task for this matter
    const result = await caller.tasks.create({
      title: "Prepare filing documents",
      description: "Prepare documents for court filing",
      matterId: matter.id,
      priority: "critical",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      estimatedMinutes: 120,
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("should list tasks for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const tasks = await caller.tasks.list();
    expect(Array.isArray(tasks)).toBe(true);
  });

  it("should filter tasks by status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create tasks with different statuses
    await caller.tasks.create({
      title: "Pending task",
      priority: "medium",
    });

    // Get pending tasks only
    const pendingTasks = await caller.tasks.list({ status: "pending" });
    expect(Array.isArray(pendingTasks)).toBe(true);
    pendingTasks.forEach((task) => {
      expect(task.status).toBe("pending");
    });
  });

  it("should update task status to completed", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const task = await caller.tasks.create({
      title: "Task to complete",
      priority: "low",
    });

    const result = await caller.tasks.update({
      id: task.id,
      status: "completed",
    });

    expect(result.success).toBe(true);

    // Verify task was updated
    const updatedTask = await caller.tasks.get({ id: task.id });
    expect(updatedTask?.status).toBe("completed");
    expect(updatedTask?.completedAt).toBeTruthy();
  });

  it("should update task priority and due date", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const task = await caller.tasks.create({
      title: "Task to update",
      priority: "low",
    });

    const newDueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const result = await caller.tasks.update({
      id: task.id,
      priority: "critical",
      dueDate: newDueDate,
    });

    expect(result.success).toBe(true);

    const updatedTask = await caller.tasks.get({ id: task.id });
    expect(updatedTask?.priority).toBe("critical");
  });

  it("should delete a task", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const task = await caller.tasks.create({
      title: "Task to delete",
      priority: "low",
    });

    const result = await caller.tasks.delete({ id: task.id });
    expect(result.success).toBe(true);
  });

  it("should bulk update task status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create multiple tasks
    const task1 = await caller.tasks.create({
      title: "Bulk task 1",
      priority: "medium",
    });
    const task2 = await caller.tasks.create({
      title: "Bulk task 2",
      priority: "medium",
    });

    // Bulk complete them
    const result = await caller.tasks.bulkUpdateStatus({
      ids: [task1.id, task2.id],
      status: "completed",
    });

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
  });

  it("should get pending tasks", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.tasks.create({
      title: "Another pending task",
      priority: "high",
    });

    const pendingTasks = await caller.tasks.getPending();
    expect(Array.isArray(pendingTasks)).toBe(true);
  });

  it("should get tasks by matter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const client = await caller.clients.create({
      name: "Matter Task Client",
      email: "mattertask@example.com",
    });

    const matter = await caller.matters.create({
      clientId: client.id,
      title: "Matter for Tasks",
      caseType: "Family Law",
      billingType: "flat_fee",
      flatFeeAmount: 500000,
    });

    await caller.tasks.create({
      title: "Matter-specific task",
      matterId: matter.id,
      priority: "high",
    });

    const matterTasks = await caller.tasks.getByMatter({ matterId: matter.id });
    expect(Array.isArray(matterTasks)).toBe(true);
    expect(matterTasks.length).toBeGreaterThan(0);
    matterTasks.forEach((task) => {
      expect(task.matterId).toBe(matter.id);
    });
  });

  it("should create task with tags", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tasks.create({
      title: "Tagged task",
      priority: "medium",
      tags: "urgent,client-call,follow-up",
    });

    expect(result).toHaveProperty("id");

    const task = await caller.tasks.get({ id: result.id });
    expect(task?.tags).toBe("urgent,client-call,follow-up");
  });
});
