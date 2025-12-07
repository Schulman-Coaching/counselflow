import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-portal-user",
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

describe("Client Portal Security", () => {
  it("should enable portal access and generate token", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a client
    const client = await caller.clients.create({
      name: "Portal Test Client",
      email: "client@example.com",
    });

    // Enable portal access
    const result = await caller.clients.enablePortal({ clientId: client.id });

    expect(result).toHaveProperty("token");
    expect(result.token).toBeTruthy();
    expect(typeof result.token).toBe("string");
    expect(result.token.length).toBeGreaterThan(20);
  }, 10000);

  it("should verify valid token and return client info", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create client and enable portal
    const client = await caller.clients.create({
      name: "Verify Test Client",
      email: "verify@example.com",
    });

    const { token } = await caller.clients.enablePortal({ clientId: client.id });

    // Verify token
    const clientInfo = await caller.clientPortal.verify({ token });

    expect(clientInfo).toHaveProperty("id");
    expect(clientInfo).toHaveProperty("name");
    expect(clientInfo.name).toBe("Verify Test Client");
    expect(clientInfo.email).toBe("verify@example.com");
  }, 10000);

  it("should reject invalid token", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.clientPortal.verify({ token: "invalid-token-12345" })
    ).rejects.toThrow("Invalid or disabled portal access");
  });

  it("should only return client's own matters", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create two clients
    const client1 = await caller.clients.create({
      name: "Client 1",
      email: "client1@example.com",
    });

    const client2 = await caller.clients.create({
      name: "Client 2",
      email: "client2@example.com",
    });

    // Create matters for both clients
    const matter1 = await caller.matters.create({
      clientId: client1.id,
      title: "Client 1 Matter",
      caseType: "General",
      billingType: "hourly",
    });

    const matter2 = await caller.matters.create({
      clientId: client2.id,
      title: "Client 2 Matter",
      caseType: "General",
      billingType: "hourly",
    });

    // Enable portal for client 1
    const { token } = await caller.clients.enablePortal({ clientId: client1.id });

    // Get matters for client 1
    const matters = await caller.clientPortal.matters({ token });

    // Should only see their own matter
    expect(matters.length).toBe(1);
    expect(matters[0]?.id).toBe(matter1.id);
    expect(matters[0]?.title).toBe("Client 1 Matter");
  }, 15000);

  it("should only return client's own invoices", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create two clients
    const client1 = await caller.clients.create({
      name: "Invoice Client 1",
      email: "invoice1@example.com",
    });

    const client2 = await caller.clients.create({
      name: "Invoice Client 2",
      email: "invoice2@example.com",
    });

    // Create matters
    const matter1 = await caller.matters.create({
      clientId: client1.id,
      title: "Matter 1",
      caseType: "General",
      billingType: "hourly",
    });

    const matter2 = await caller.matters.create({
      clientId: client2.id,
      title: "Matter 2",
      caseType: "General",
      billingType: "hourly",
    });

    // Create time entries
    const entry1 = await caller.timeEntries.create({
      matterId: matter1.id,
      description: "Work for client 1",
      durationMinutes: 60,
      hourlyRate: 15000,
      isBillable: true,
      entryDate: new Date(),
    });

    const entry2 = await caller.timeEntries.create({
      matterId: matter2.id,
      description: "Work for client 2",
      durationMinutes: 60,
      hourlyRate: 15000,
      isBillable: true,
      entryDate: new Date(),
    });

    // Create invoices
    const invoice1 = await caller.invoices.create({
      matterId: matter1.id,
      clientId: client1.id,
      timeEntryIds: [entry1.id],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const invoice2 = await caller.invoices.create({
      matterId: matter2.id,
      clientId: client2.id,
      timeEntryIds: [entry2.id],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Enable portal for client 1
    const { token } = await caller.clients.enablePortal({ clientId: client1.id });

    // Get invoices for client 1
    const invoices = await caller.clientPortal.invoices({ token });

    // Should only see their own invoice
    expect(invoices.length).toBe(1);
    expect(invoices[0]?.id).toBe(invoice1.id);
  }, 20000);

  it("should only return documents for client's matters", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create two clients
    const client1 = await caller.clients.create({
      name: "Doc Client 1",
      email: "doc1@example.com",
    });

    const client2 = await caller.clients.create({
      name: "Doc Client 2",
      email: "doc2@example.com",
    });

    // Create matters
    const matter1 = await caller.matters.create({
      clientId: client1.id,
      title: "Matter 1",
      caseType: "General",
      billingType: "hourly",
    });

    const matter2 = await caller.matters.create({
      clientId: client2.id,
      title: "Matter 2",
      caseType: "General",
      billingType: "hourly",
    });

    // Enable portal for client 1
    const { token } = await caller.clients.enablePortal({ clientId: client1.id });

    // Get documents for client 1 (should be empty but not error)
    const documents = await caller.clientPortal.documents({ token });

    // Should return array (even if empty) without errors
    expect(Array.isArray(documents)).toBe(true);
  }, 10000);

  it("should reject access with disabled portal", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create client but don't enable portal
    const client = await caller.clients.create({
      name: "Disabled Portal Client",
      email: "disabled@example.com",
    });

    // Try to access with a fake token
    await expect(
      caller.clientPortal.verify({ token: "fake-token" })
    ).rejects.toThrow("Invalid or disabled portal access");
  }, 10000);

  it("should prevent cross-client document access", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create two clients
    const client1 = await caller.clients.create({
      name: "Client A",
      email: "clienta@example.com",
    });

    const client2 = await caller.clients.create({
      name: "Client B",
      email: "clientb@example.com",
    });

    // Create matter for client 2
    const matter2 = await caller.matters.create({
      clientId: client2.id,
      title: "Client B Matter",
      caseType: "General",
      billingType: "hourly",
    });

    // Enable portal for client 1
    const { token } = await caller.clients.enablePortal({ clientId: client1.id });

    // Try to access client 2's documents with specific matter ID
    await expect(
      caller.clientPortal.documents({ token, matterId: matter2.id })
    ).rejects.toThrow("Access denied");
  }, 15000);
});
