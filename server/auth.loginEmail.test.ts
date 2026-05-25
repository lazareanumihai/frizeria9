import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

function createMockContext(user: any = null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("auth router - loginEmail", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "TestPassword123";
  let testUserId: number | null = null;

  beforeAll(async () => {
    // Create a test user with email/password
    const db = await getDb();
    if (db) {
      const passwordHash = await bcrypt.hash(testPassword, 10);
      const result = await db.insert(users).values({
        openId: `email_${testEmail}_${Date.now()}`,
        email: testEmail,
        name: "Test User",
        passwordHash,
        loginMethod: "email",
        role: "user",
      });
      // Get the inserted user ID from the result
      testUserId = result.insertId as number;
    }
  });

  afterAll(async () => {
    // Clean up test user
    const db = await getDb();
    if (db && testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it("allows login with correct email and password", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.loginEmail({
      email: testEmail,
      password: testPassword,
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(testEmail);
  });

  it("rejects login with incorrect password", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.auth.loginEmail({
        email: testEmail,
        password: "WrongPassword123",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("Invalid email or password");
    }
  });

  it("rejects login with non-existent email", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.auth.loginEmail({
        email: "nonexistent@example.com",
        password: testPassword,
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("Invalid email or password");
    }
  });

  it("rejects login with invalid email format", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.auth.loginEmail({
        email: "not-an-email",
        password: testPassword,
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      // Zod validation error will contain validation details
      expect(error.message).toBeDefined();
    }
  });

  it("rejects login with password too short", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.auth.loginEmail({
        email: testEmail,
        password: "short",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      // Zod validation error will contain validation details
      expect(error.message).toBeDefined();
    }
  });
});
