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

describe("dashboard router", () => {
  it("should return dashboard statistics", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.dashboard.stats();

    expect(stats).toHaveProperty("activeClients");
    expect(stats).toHaveProperty("openMatters");
    expect(stats).toHaveProperty("newIntakes");
    expect(stats).toHaveProperty("unpaidInvoicesCount");
    expect(stats).toHaveProperty("totalUnpaidAmount");
    expect(stats).toHaveProperty("upcomingDeadlinesCount");

    expect(typeof stats.activeClients).toBe("number");
    expect(typeof stats.openMatters).toBe("number");
    expect(typeof stats.newIntakes).toBe("number");
    expect(typeof stats.unpaidInvoicesCount).toBe("number");
    expect(typeof stats.totalUnpaidAmount).toBe("number");
    expect(typeof stats.upcomingDeadlinesCount).toBe("number");
  });

  it("should reflect created data in statistics", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get initial stats
    const initialStats = await caller.dashboard.stats();

    // Create a client and matter
    const client = await caller.clients.create({
      name: "Stats Test Client",
      email: "stats@example.com",
    });

    await caller.matters.create({
      clientId: client.id,
      title: "Stats Test Matter",
      caseType: "Test",
      billingType: "hourly",
    });

    // Get updated stats
    const updatedStats = await caller.dashboard.stats();

    // Stats should have increased
    expect(updatedStats.activeClients).toBeGreaterThanOrEqual(initialStats.activeClients);
    expect(updatedStats.openMatters).toBeGreaterThan(initialStats.openMatters);
  });
});
