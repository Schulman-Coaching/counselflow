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

describe("PDF export functionality", () => {
  it("should export invoice as PDF and return URL", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test client
    const client = await caller.clients.create({
      name: "PDF Test Client",
      email: "pdftest@example.com",
    });

    // Create a matter
    const matter = await caller.matters.create({
      clientId: client.id,
      title: "PDF Test Matter",
      caseType: "General",
      billingType: "hourly",
    });

    // Create billable time entries
    const entry1 = await caller.timeEntries.create({
      matterId: matter.id,
      description: "Legal research for case",
      durationMinutes: 120,
      hourlyRate: 25000, // $250/hr
      isBillable: true,
      entryDate: new Date(),
    });

    const entry2 = await caller.timeEntries.create({
      matterId: matter.id,
      description: "Client meeting",
      durationMinutes: 60,
      hourlyRate: 25000,
      isBillable: true,
      entryDate: new Date(),
    });

    // Create invoice
    const invoice = await caller.invoices.create({
      matterId: matter.id,
      clientId: client.id,
      timeEntryIds: [entry1.id, entry2.id],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: "Test invoice for PDF export",
    });

    // Export invoice as PDF
    const result = await caller.invoices.exportPDF({
      id: invoice.id,
    });

    // Verify PDF was generated and uploaded
    expect(result).toHaveProperty("url");
    expect(result).toHaveProperty("fileName");
    expect(result.url).toContain("https://");
    expect(result.fileName).toMatch(/^invoice-INV-.*\.pdf$/);
    expect(result.fileName).toContain(invoice.invoiceNumber);
  }, 30000); // 30 second timeout for PDF generation

  it("should throw error when exporting non-existent invoice", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.invoices.exportPDF({ id: 999999 })
    ).rejects.toThrow("Invoice not found");
  });
});
