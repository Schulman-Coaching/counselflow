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

describe("documents router", () => {
  it("should list available document templates", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const templates = await caller.templates.list();
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
    
    // Check that templates have required fields
    const template = templates[0];
    expect(template).toHaveProperty("id");
    expect(template).toHaveProperty("name");
    expect(template).toHaveProperty("templateContent");
    expect(template).toHaveProperty("category");
  });

  it("should generate document from template with variables", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get a template first
    const templates = await caller.templates.list();
    expect(templates.length).toBeGreaterThan(0);
    
    const template = templates[0];

    // Create a matter to associate with
    const client = await caller.clients.create({
      name: "Document Test Client",
      email: "doctest@example.com",
    });

    const matter = await caller.matters.create({
      clientId: client.id,
      title: "Document Test Matter",
      caseType: "Estate Planning",
      billingType: "flat_fee",
      flatFeeAmount: 200000,
    });

    // Generate document with sample variables
    const result = await caller.documents.generate({
      templateId: template.id,
      matterId: matter.id,
      title: "Test Generated Document",
      answers: {
        testator_name: "John Doe",
        testator_address: "123 Main St",
        testator_city: "Springfield",
        testator_state: "IL",
        marital_status: "married",
      },
    });

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("content");
    expect(typeof result.content).toBe("string");
    expect(result.content.length).toBeGreaterThan(0);
  }, 10000); // Increase timeout for AI generation

  it("should list generated documents for user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const documents = await caller.documents.list();
    expect(Array.isArray(documents)).toBe(true);
  });

  it("should get document by id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const documents = await caller.documents.list();
    
    if (documents.length > 0) {
      const doc = await caller.documents.get({ id: documents[0].id });
      expect(doc).toHaveProperty("id");
      expect(doc).toHaveProperty("content");
      expect(doc).toHaveProperty("title");
    }
  });

  it("should update document status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const documents = await caller.documents.list();
    
    if (documents.length > 0) {
      const result = await caller.documents.update({
        id: documents[0].id,
        status: "final",
      });
      
      expect(result.success).toBe(true);
    }
  });
});
