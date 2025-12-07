import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-attorney",
    email: "attorney@example.com",
    name: "Test Attorney",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Document Comments", () => {
  it("should allow attorney to add comment to document", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a client
    const clientResult = await caller.clients.create({
      name: "Comment Test Client",
      email: "comment@test.com",
      phoneNumber: "555-0100",
      address: "123 Test St",
    });

    // Create a matter
    const matterResult = await caller.matters.create({
      clientId: clientResult.id,
      title: "Comment Test Matter",
      description: "Testing comments",
      type: "litigation",
      status: "active",
      caseType: "civil",
      billingType: "hourly",
      hourlyRate: 250,
    });

    // Use the matter ID as mock document ID for simplicity
    const mockDocId = matterResult.id;

    // Add comment
    const commentResult = await caller.documentComments.create({
      documentId: mockDocId,
      content: "This is a test comment from attorney",
    });

    expect(commentResult.id).toBeGreaterThan(0);
  });

  it("should list comments for a document", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const mockDocId = 1;

    // Add a comment first
    await caller.documentComments.create({
      documentId: mockDocId,
      content: "First comment",
    });

    // List comments
    const comments = await caller.documentComments.list({
      documentId: mockDocId,
    });

    expect(Array.isArray(comments)).toBe(true);
    expect(comments.length).toBeGreaterThan(0);
    expect(comments[0]?.content).toBeDefined();
    expect(comments[0]?.authorName).toBeDefined();
    expect(comments[0]?.authorType).toBe("attorney");
  });

  it("should allow attorney to delete their own comment", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const mockDocId = 2;

    // Add a comment
    const commentResult = await caller.documentComments.create({
      documentId: mockDocId,
      content: "Comment to be deleted",
    });

    // Delete the comment
    const deleteResult = await caller.documentComments.delete({
      commentId: commentResult.id,
    });

    expect(deleteResult.success).toBe(true);
  });

  it("should allow client to add comment via portal", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a client with portal access
    const clientResult = await caller.clients.create({
      name: "Portal Comment Client",
      email: "portalcomment@test.com",
      phoneNumber: "555-0101",
      address: "456 Test Ave",
    });

    // Enable portal access
    const tokenResult = await caller.clients.enablePortal({
      clientId: clientResult.id,
    });

    const mockDocId = 3;

    // Add comment as client
    const commentResult = await caller.clientPortal.addComment({
      token: tokenResult.token,
      documentId: mockDocId,
      content: "This is a comment from the client",
    });

    expect(commentResult.id).toBeGreaterThan(0);
  });

  it("should show both attorney and client comments", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create client with portal
    const clientResult = await caller.clients.create({
      name: "Mixed Comments Client",
      email: "mixed@test.com",
      phoneNumber: "555-0102",
      address: "789 Test Blvd",
    });

    const tokenResult = await caller.clients.enablePortal({
      clientId: clientResult.id,
    });

    const mockDocId = 4;

    // Add attorney comment
    await caller.documentComments.create({
      documentId: mockDocId,
      content: "Attorney comment",
    });

    // Add client comment
    await caller.clientPortal.addComment({
      token: tokenResult.token,
      documentId: mockDocId,
      content: "Client comment",
    });

    // Get all comments
    const comments = await caller.documentComments.list({
      documentId: mockDocId,
    });

    expect(comments.length).toBeGreaterThanOrEqual(2);
    
    const attorneyComments = comments.filter(c => c.authorType === "attorney");
    const clientComments = comments.filter(c => c.authorType === "client");
    
    expect(attorneyComments.length).toBeGreaterThan(0);
    expect(clientComments.length).toBeGreaterThan(0);
  });

  it("should reject comment from invalid client token", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.clientPortal.addComment({
        token: "invalid-token-12345",
        documentId: 1,
        content: "This should fail",
      })
    ).rejects.toThrow();
  });
});
