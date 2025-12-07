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

describe("invoices router", () => {
  it("should list all invoices for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const invoices = await caller.invoices.list();
    expect(Array.isArray(invoices)).toBe(true);
  });

  it("should filter invoices by status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get all invoices first
    const allInvoices = await caller.invoices.list();
    
    // Filter by paid status
    const paidInvoices = await caller.invoices.list({ status: "paid" });
    expect(Array.isArray(paidInvoices)).toBe(true);
    
    // All returned invoices should have paid status
    paidInvoices.forEach(invoice => {
      expect(invoice.status).toBe("paid");
    });
  });

  it("should filter invoices by client", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test client
    const client = await caller.clients.create({
      name: "Invoice Test Client",
      email: "invoicetest@example.com",
    });

    // Filter by this client
    const clientInvoices = await caller.invoices.list({ clientId: client.id });
    expect(Array.isArray(clientInvoices)).toBe(true);
    
    // All returned invoices should be for this client
    clientInvoices.forEach(invoice => {
      expect(invoice.clientId).toBe(client.id);
    });
  });

  it("should create invoice from time entries", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create client and matter
    const client = await caller.clients.create({
      name: "Invoice Client",
      email: "invoice@example.com",
    });

    const matter = await caller.matters.create({
      clientId: client.id,
      title: "Invoice Test Matter",
      caseType: "General",
      billingType: "hourly",
    });

    // Create billable time entries
    const entry1 = await caller.timeEntries.create({
      matterId: matter.id,
      description: "Legal research",
      durationMinutes: 120,
      hourlyRate: 30000, // $300/hr in cents
      isBillable: true,
      entryDate: new Date(),
    });

    const entry2 = await caller.timeEntries.create({
      matterId: matter.id,
      description: "Client consultation",
      durationMinutes: 60,
      hourlyRate: 30000,
      isBillable: true,
      entryDate: new Date(),
    });

    // Create invoice from time entries
    const invoice = await caller.invoices.create({
      matterId: matter.id,
      clientId: client.id,
      timeEntryIds: [entry1.id, entry2.id],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      notes: "Test invoice",
    });

    expect(invoice).toHaveProperty("id");
    expect(invoice).toHaveProperty("invoiceNumber");
    expect(invoice.invoiceNumber).toMatch(/^INV-/);

    // Verify invoice was created
    const createdInvoice = await caller.invoices.get({ id: invoice.id });
    expect(createdInvoice.matterId).toBe(matter.id);
    expect(createdInvoice.clientId).toBe(client.id);
    expect(createdInvoice.status).toBe("draft");
    
    // Total should be 3 hours * $300/hr = $900
    expect(createdInvoice.totalAmount).toBe(90000); // in cents
  });

  it("should update invoice status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const invoices = await caller.invoices.list();
    
    if (invoices.length > 0) {
      const invoice = invoices[0];
      
      // Update to sent
      const result = await caller.invoices.updateStatus({
        id: invoice.id,
        status: "sent",
      });
      
      expect(result.success).toBe(true);
      
      // Verify status was updated
      const updated = await caller.invoices.get({ id: invoice.id });
      expect(updated.status).toBe("sent");
    }
  });

  it("should mark invoice as paid with paid date", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const invoices = await caller.invoices.list({ status: "sent" });
    
    if (invoices.length > 0) {
      const invoice = invoices[0];
      const paidDate = new Date();
      
      // Mark as paid
      const result = await caller.invoices.updateStatus({
        id: invoice.id,
        status: "paid",
        paidDate,
      });
      
      expect(result.success).toBe(true);
      
      // Verify status and paid date
      const updated = await caller.invoices.get({ id: invoice.id });
      expect(updated.status).toBe("paid");
      expect(updated.paidDate).toBeTruthy();
    }
  });

  it("should get invoices by matter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const matters = await caller.matters.list();
    
    if (matters.length > 0) {
      const matter = matters[0];
      const invoices = await caller.invoices.getByMatter({ matterId: matter.id });
      
      expect(Array.isArray(invoices)).toBe(true);
      
      // All invoices should belong to this matter
      invoices.forEach(invoice => {
        expect(invoice.matterId).toBe(matter.id);
      });
    }
  });
});
