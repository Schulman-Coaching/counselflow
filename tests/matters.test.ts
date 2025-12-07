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

describe("matters router", () => {
  it("should create a new matter with hourly billing", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a client first
    const client = await caller.clients.create({
      name: "Test Client",
      email: "client@example.com",
    });

    const result = await caller.matters.create({
      clientId: client.id,
      title: "Estate Planning Matter",
      description: "Comprehensive estate planning",
      caseType: "Estate Planning",
      billingType: "hourly",
      hourlyRate: 25000, // $250.00
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("should create a matter with flat fee billing", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const client = await caller.clients.create({
      name: "Another Client",
      email: "another@example.com",
    });

    const result = await caller.matters.create({
      clientId: client.id,
      title: "Simple Will",
      caseType: "Estate Planning",
      billingType: "flat_fee",
      flatFeeAmount: 150000, // $1,500.00
    });

    expect(result).toHaveProperty("id");
  });

  it("should list matters for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const matters = await caller.matters.list();
    expect(Array.isArray(matters)).toBe(true);
  });

  it("should update matter status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const client = await caller.clients.create({
      name: "Status Test Client",
      email: "status@example.com",
    });

    const matter = await caller.matters.create({
      clientId: client.id,
      title: "Test Matter",
      caseType: "Business Law",
      billingType: "hourly",
    });

    const result = await caller.matters.update({
      id: matter.id,
      status: "closed",
      closingDate: new Date(),
    });

    expect(result.success).toBe(true);
  });
});
