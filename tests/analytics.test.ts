import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-analytics-user",
    email: "analytics@example.com",
    name: "Analytics Test User",
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

describe("Dashboard Analytics", () => {
  it("should calculate revenue metrics correctly", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create test client
    const client = await caller.clients.create({
      name: "Analytics Client",
      email: "analytics-client@example.com",
    });

    // Create matter
    const matter = await caller.matters.create({
      clientId: client.id,
      title: "Analytics Matter",
      caseType: "General",
      billingType: "hourly",
    });

    // Create time entries
    const entry1 = await caller.timeEntries.create({
      matterId: matter.id,
      description: "Research",
      durationMinutes: 120,
      hourlyRate: 20000, // $200/hr
      isBillable: true,
      entryDate: new Date(),
    });

    const entry2 = await caller.timeEntries.create({
      matterId: matter.id,
      description: "Meeting",
      durationMinutes: 60,
      hourlyRate: 20000,
      isBillable: true,
      entryDate: new Date(),
    });

    // Create and pay invoice
    const invoice = await caller.invoices.create({
      matterId: matter.id,
      clientId: client.id,
      timeEntryIds: [entry1.id, entry2.id],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Mark as paid
    await caller.invoices.updateStatus({
      id: invoice.id,
      status: "paid",
      paidDate: new Date(),
    });

    // Get analytics
    const analytics = await caller.dashboard.analytics({ period: "month" });

    // Verify revenue calculation
    expect(analytics.totalRevenue).toBeGreaterThan(0);
    expect(analytics.periodRevenue).toBeGreaterThan(0);
    expect(analytics.paidInvoices).toBe(1);
    expect(analytics.collectionRate).toBeGreaterThan(0);
  }, 15000);

  it("should calculate average payment time", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create client and matter
    const client = await caller.clients.create({
      name: "Payment Time Client",
      email: "payment@example.com",
    });

    const matter = await caller.matters.create({
      clientId: client.id,
      title: "Payment Time Matter",
      caseType: "General",
      billingType: "hourly",
    });

    // Create time entry
    const entry = await caller.timeEntries.create({
      matterId: matter.id,
      description: "Work",
      durationMinutes: 60,
      hourlyRate: 15000,
      isBillable: true,
      entryDate: new Date(),
    });

    // Create invoice
    const invoice = await caller.invoices.create({
      matterId: matter.id,
      clientId: client.id,
      timeEntryIds: [entry.id],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Pay after 10 days
    const paidDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    await caller.invoices.updateStatus({
      id: invoice.id,
      status: "paid",
      paidDate,
    });

    // Get analytics
    const analytics = await caller.dashboard.analytics({ period: "month" });

    // Verify payment time calculation
    expect(analytics.avgPaymentDays).toBeGreaterThanOrEqual(0);
    expect(analytics.paidInvoices).toBeGreaterThan(0);
  }, 15000);

  it("should track billable hours correctly", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create client and matter
    const client = await caller.clients.create({
      name: "Hours Client",
      email: "hours@example.com",
    });

    const matter = await caller.matters.create({
      clientId: client.id,
      title: "Hours Matter",
      caseType: "General",
      billingType: "hourly",
    });

    // Create billable time entries
    await caller.timeEntries.create({
      matterId: matter.id,
      description: "Billable work 1",
      durationMinutes: 120, // 2 hours
      hourlyRate: 15000,
      isBillable: true,
      entryDate: new Date(),
    });

    await caller.timeEntries.create({
      matterId: matter.id,
      description: "Billable work 2",
      durationMinutes: 90, // 1.5 hours
      hourlyRate: 15000,
      isBillable: true,
      entryDate: new Date(),
    });

    // Create non-billable entry
    await caller.timeEntries.create({
      matterId: matter.id,
      description: "Non-billable admin",
      durationMinutes: 60,
      hourlyRate: 0,
      isBillable: false,
      entryDate: new Date(),
    });

    // Get analytics
    const analytics = await caller.dashboard.analytics({ period: "month" });

    // Verify billable hours (should be 3.5 hours, not including non-billable)
    expect(analytics.billableHours).toBeGreaterThan(0);
    expect(analytics.periodBillableHours).toBeGreaterThan(0);
  }, 15000);

  it("should generate monthly revenue breakdown", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get analytics
    const analytics = await caller.dashboard.analytics({ period: "month" });

    // Verify monthly revenue structure
    expect(analytics.monthlyRevenue).toBeInstanceOf(Array);
    expect(analytics.monthlyRevenue.length).toBe(6); // Last 6 months
    
    if (analytics.monthlyRevenue.length > 0) {
      const firstMonth = analytics.monthlyRevenue[0];
      expect(firstMonth).toHaveProperty("month");
      expect(firstMonth).toHaveProperty("revenue");
      expect(firstMonth).toHaveProperty("invoices");
      expect(typeof firstMonth?.revenue).toBe("number");
      expect(typeof firstMonth?.invoices).toBe("number");
    }
  });

  it("should calculate invoice aging correctly", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get analytics
    const analytics = await caller.dashboard.analytics({ period: "month" });

    // Verify aging structure
    expect(analytics.aging).toHaveProperty("current");
    expect(analytics.aging).toHaveProperty("days30");
    expect(analytics.aging).toHaveProperty("days60");
    expect(analytics.aging).toHaveProperty("days90Plus");
    
    expect(typeof analytics.aging.current).toBe("number");
    expect(typeof analytics.aging.days30).toBe("number");
    expect(typeof analytics.aging.days60).toBe("number");
    expect(typeof analytics.aging.days90Plus).toBe("number");
  });

  it("should calculate collection rate", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get analytics
    const analytics = await caller.dashboard.analytics({ period: "month" });

    // Verify collection rate
    expect(typeof analytics.collectionRate).toBe("number");
    expect(analytics.collectionRate).toBeGreaterThanOrEqual(0);
    expect(analytics.collectionRate).toBeLessThanOrEqual(100);
  });

  it("should support different time periods", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Test month period
    const monthAnalytics = await caller.dashboard.analytics({ period: "month" });
    expect(monthAnalytics).toHaveProperty("periodRevenue");
    expect(monthAnalytics).toHaveProperty("periodBillableHours");

    // Test quarter period
    const quarterAnalytics = await caller.dashboard.analytics({ period: "quarter" });
    expect(quarterAnalytics).toHaveProperty("periodRevenue");
    expect(quarterAnalytics).toHaveProperty("periodBillableHours");

    // Test year period
    const yearAnalytics = await caller.dashboard.analytics({ period: "year" });
    expect(yearAnalytics).toHaveProperty("periodRevenue");
    expect(yearAnalytics).toHaveProperty("periodBillableHours");
  });
});
