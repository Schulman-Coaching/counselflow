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

describe("timeEntries router", () => {
  it("should create time entry with AI-enhanced narrative", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Setup: Create client and matter
    const client = await caller.clients.create({
      name: "Time Test Client",
      email: "time@example.com",
    });

    const matter = await caller.matters.create({
      clientId: client.id,
      title: "Time Test Matter",
      caseType: "Litigation",
      billingType: "hourly",
      hourlyRate: 30000, // $300/hr
    });

    const result = await caller.timeEntries.create({
      matterId: matter.id,
      description: "Drafted response to motion",
      durationMinutes: 120,
      hourlyRate: 30000,
      isBillable: true,
      entryDate: new Date(),
    });

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("aiNarrative");
    expect(typeof result.aiNarrative).toBe("string");
    expect(result.aiNarrative.length).toBeGreaterThan(0);
    // AI narrative should be more detailed than original
    expect(result.aiNarrative.length).toBeGreaterThan("Drafted response to motion".length);
  });

  it("should list time entries for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const entries = await caller.timeEntries.list();
    expect(Array.isArray(entries)).toBe(true);
  });

  it("should get unbilled time entries for a matter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const client = await caller.clients.create({
      name: "Unbilled Test Client",
      email: "unbilled@example.com",
    });

    const matter = await caller.matters.create({
      clientId: client.id,
      title: "Unbilled Test Matter",
      caseType: "Corporate",
      billingType: "hourly",
      hourlyRate: 25000,
    });

    await caller.timeEntries.create({
      matterId: matter.id,
      description: "Contract review",
      durationMinutes: 60,
      hourlyRate: 25000,
      isBillable: true,
      entryDate: new Date(),
    });

    const unbilled = await caller.timeEntries.getUnbilled({ matterId: matter.id });
    expect(Array.isArray(unbilled)).toBe(true);
    expect(unbilled.length).toBeGreaterThan(0);
    expect(unbilled[0].isInvoiced).toBe(false);
  });
});
