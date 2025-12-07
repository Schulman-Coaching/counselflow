import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-upload-user",
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

describe("Client Document Upload", () => {
  it("should allow client to upload document to their own matter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create client and enable portal
    const client = await caller.clients.create({
      name: "Upload Test Client",
      email: "upload@example.com",
    });

    const { token } = await caller.clients.enablePortal({ clientId: client.id });

    // Create matter for client
    const matter = await caller.matters.create({
      clientId: client.id,
      title: "Upload Test Matter",
      caseType: "General",
      billingType: "hourly",
    });

    // Create a small test file (1KB)
    const testContent = "Test document content";
    const base64Content = Buffer.from(testContent).toString("base64");

    // Upload document
    const result = await caller.clientPortal.uploadDocument({
      token,
      matterId: matter.id,
      title: "Test Document",
      fileData: base64Content,
      fileName: "test.txt",
      fileType: "text/plain",
    });

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("url");
    expect(result.url).toBeTruthy();
  }, 15000);

  it("should reject upload with invalid token", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const testContent = "Test document content";
    const base64Content = Buffer.from(testContent).toString("base64");

    await expect(
      caller.clientPortal.uploadDocument({
        token: "invalid-token",
        matterId: 1,
        title: "Test Document",
        fileData: base64Content,
        fileName: "test.txt",
        fileType: "text/plain",
      })
    ).rejects.toThrow("Invalid or disabled portal access");
  });

  it("should reject upload to another client's matter", async () => {
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

    // Enable portal for client 1
    const { token } = await caller.clients.enablePortal({ clientId: client1.id });

    // Create matter for client 2
    const matter2 = await caller.matters.create({
      clientId: client2.id,
      title: "Client 2 Matter",
      caseType: "General",
      billingType: "hourly",
    });

    // Try to upload to client 2's matter with client 1's token
    const testContent = "Test document content";
    const base64Content = Buffer.from(testContent).toString("base64");

    await expect(
      caller.clientPortal.uploadDocument({
        token,
        matterId: matter2.id,
        title: "Test Document",
        fileData: base64Content,
        fileName: "test.txt",
        fileType: "text/plain",
      })
    ).rejects.toThrow("Access denied");
  }, 15000);

  it("should create document record with correct metadata", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create client and enable portal
    const client = await caller.clients.create({
      name: "Metadata Test Client",
      email: "metadata@example.com",
    });

    const { token } = await caller.clients.enablePortal({ clientId: client.id });

    // Create matter
    const matter = await caller.matters.create({
      clientId: client.id,
      title: "Metadata Test Matter",
      caseType: "General",
      billingType: "hourly",
    });

    // Upload document
    const testContent = "Test document content";
    const base64Content = Buffer.from(testContent).toString("base64");

    const uploadResult = await caller.clientPortal.uploadDocument({
      token,
      matterId: matter.id,
      title: "Important Contract",
      fileData: base64Content,
      fileName: "contract.pdf",
      fileType: "application/pdf",
    });

    // Verify document was created
    const documents = await caller.clientPortal.documents({ token, matterId: matter.id });
    
    expect(documents.length).toBeGreaterThan(0);
    const uploadedDoc = documents.find(d => d.id === uploadResult.id);
    expect(uploadedDoc).toBeDefined();
    expect(uploadedDoc?.title).toBe("Important Contract");
    expect(uploadedDoc?.matterId).toBe(matter.id);
  }, 15000);

  it("should successfully upload multiple documents", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create client and enable portal
    const client = await caller.clients.create({
      name: "Multi Upload Client",
      email: "multi@example.com",
    });

    const { token } = await caller.clients.enablePortal({ clientId: client.id });

    // Create matter
    const matter = await caller.matters.create({
      clientId: client.id,
      title: "Multi Upload Matter",
      caseType: "General",
      billingType: "hourly",
    });

    // Upload first document
    const testContent1 = "First document content";
    const base64Content1 = Buffer.from(testContent1).toString("base64");

    const result1 = await caller.clientPortal.uploadDocument({
      token,
      matterId: matter.id,
      title: "Document 1",
      fileData: base64Content1,
      fileName: "doc1.txt",
      fileType: "text/plain",
    });

    // Upload second document
    const testContent2 = "Second document content";
    const base64Content2 = Buffer.from(testContent2).toString("base64");

    const result2 = await caller.clientPortal.uploadDocument({
      token,
      matterId: matter.id,
      title: "Document 2",
      fileData: base64Content2,
      fileName: "doc2.txt",
      fileType: "text/plain",
    });

    // Verify both documents exist
    expect(result1.id).toBeTruthy();
    expect(result2.id).toBeTruthy();
    expect(result1.id).not.toBe(result2.id);

    // Verify both documents are accessible
    const documents = await caller.clientPortal.documents({ token, matterId: matter.id });
    expect(documents.length).toBeGreaterThanOrEqual(2);
  }, 15000);
});
