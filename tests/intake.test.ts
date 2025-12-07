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

describe("intake router", () => {
  it("should submit intake form with AI analysis", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.intake.submit({
      lawyerId: 1,
      formData: {
        name: "Sarah Williams",
        email: "sarah@example.com",
        phone: "555-0123",
        caseType: "Personal Injury",
        description: "Car accident on Highway 101, suffered back injuries, medical bills mounting, need help with insurance claim",
        accidentDate: "2024-01-15",
      },
    });

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("aiAnalysis");
    expect(result).toHaveProperty("hasConflict");
    expect(typeof result.aiAnalysis).toBe("string");
    expect(result.aiAnalysis.length).toBeGreaterThan(0);
  });

  it("should detect conflict when client name exists", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create existing client
    await caller.clients.create({
      name: "John Conflict",
      email: "conflict@example.com",
    });

    // Submit intake with same name
    const result = await caller.intake.submit({
      lawyerId: 1,
      formData: {
        name: "John Conflict",
        email: "different@example.com",
        description: "Need legal help",
      },
    });

    expect(result.hasConflict).toBe(true);
  });

  it("should list intake forms for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const intakes = await caller.intake.list();
    expect(Array.isArray(intakes)).toBe(true);
  });

  it("should update intake status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const intake = await caller.intake.submit({
      lawyerId: 1,
      formData: {
        name: "Status Test",
        email: "test@example.com",
        description: "Test inquiry",
      },
    });

    const result = await caller.intake.updateStatus({
      id: intake.id,
      status: "reviewed",
    });

    expect(result.success).toBe(true);
  });
});
