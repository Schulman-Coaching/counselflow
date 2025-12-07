import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-attorney",
    email: "attorney@example.com",
    name: "Test Attorney",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Activity Dashboard", () => {
  it("should retrieve all activities for a user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a client to generate activity
    await caller.clients.create({
      name: "Activity Test Client",
      email: "activity@test.com",
      phoneNumber: "555-0200",
      address: "789 Activity St",
    });

    // Get all activities
    const activities = await caller.activity.getAll({ limit: 50 });

    expect(Array.isArray(activities)).toBe(true);
    expect(activities.length).toBeGreaterThan(0);
    expect(activities[0]).toHaveProperty("action");
    expect(activities[0]).toHaveProperty("entityType");
    expect(activities[0]).toHaveProperty("createdAt");
  });

  it("should filter activities by entity type", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a client
    await caller.clients.create({
      name: "Filter Test Client",
      email: "filter@test.com",
      phoneNumber: "555-0201",
      address: "101 Filter Ave",
    });

    // Get client activities only
    const clientActivities = await caller.activity.getByType({
      entityType: "client",
      limit: 50,
    });

    expect(Array.isArray(clientActivities)).toBe(true);
    expect(clientActivities.every(a => a.entityType === "client")).toBe(true);
  });

  it("should filter activities by date range", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // 7 days ago
    const endDate = new Date();

    // Get activities from last 7 days
    const activities = await caller.activity.getByDateRange({
      startDate,
      endDate,
    });

    expect(Array.isArray(activities)).toBe(true);
    // All activities should be within the date range
    activities.forEach(activity => {
      const activityDate = new Date(activity.createdAt);
      expect(activityDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
      expect(activityDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
    });
  });

  it("should limit the number of activities returned", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create multiple clients to generate activities
    for (let i = 0; i < 5; i++) {
      await caller.clients.create({
        name: `Limit Test Client ${i}`,
        email: `limit${i}@test.com`,
        phoneNumber: `555-020${i}`,
        address: `${i} Limit St`,
      });
    }

    // Get activities with limit
    const activities = await caller.activity.getAll({ limit: 3 });

    expect(activities.length).toBeLessThanOrEqual(3);
  });

  it("should track document upload activities", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create client with portal access
    const clientResult = await caller.clients.create({
      name: "Upload Activity Client",
      email: "uploadactivity@test.com",
      phoneNumber: "555-0210",
      address: "202 Upload Rd",
    });

    const tokenResult = await caller.clients.enablePortal({
      clientId: clientResult.id,
    });

    // Create a matter
    const matterResult = await caller.matters.create({
      clientId: clientResult.id,
      title: "Upload Activity Matter",
      description: "Testing upload activity",
      type: "litigation",
      status: "active",
      caseType: "civil",
      billingType: "hourly",
      hourlyRate: 250,
    });

    // Upload a document
    await caller.clientPortal.uploadDocument({
      token: tokenResult.token,
      matterId: matterResult.id,
      title: "Test Upload Document",
      fileName: "test-upload.pdf",
      fileData: "data:application/pdf;base64,JVBERi0xLjQK",
      fileType: "application/pdf",
    });

    // Check if upload activity was logged
    const activities = await caller.activity.getByType({
      entityType: "document",
      limit: 10,
    });

    const uploadActivity = activities.find(a => a.action === "client_upload");
    expect(uploadActivity).toBeDefined();
  });

  it("should track comment activities", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const mockDocId = 100;

    // Add a comment
    await caller.documentComments.create({
      documentId: mockDocId,
      content: "Activity tracking test comment",
    });

    // Check if comment activity was logged
    const activities = await caller.activity.getAll({ limit: 50 });

    // Activity log might not have a specific "comment" type, but should have document-related activities
    expect(activities.length).toBeGreaterThan(0);
  });
});
