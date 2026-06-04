import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { User } from "@db/schema";
import type { TrpcContext } from "./routers";

function createMockContext(user: User | null): TrpcContext {
  const cookieCalls: Array<{ name: string; value: string; options: any }> = [];

  return {
    user,
    req: {
      headers: {
        "x-forwarded-proto": "https",
      },
    } as any,
    res: {
      cookie: (name: string, value: string, options: any) => {
        cookieCalls.push({ name, value, options });
      },
      getHeader: () => undefined,
      _cookieCalls: cookieCalls,
    } as any,
  };
}

describe("Email Login - JWT Cookie", () => {
  const mockAdminUser: User = {
    id: 1,
    openId: "test-admin",
    name: "Test Admin",
    email: "admin@test.com",
    loginMethod: "email",
    passwordHash: "$2b$10$test",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  it("should set JWT cookie on successful login", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    // Login with existing test user
    const loginResult = await caller.auth.loginEmail({
      email: "mycomputergh@yahoo.com",
      password: "Qgz10nkl9634wQ",
    });

    // Verify login was successful
    expect(loginResult.success).toBe(true);
    expect(loginResult.user).toBeDefined();
    expect(loginResult.user.email).toBe("mycomputergh@yahoo.com");

    // Verify cookie was set
    const cookieCalls = (ctx.res as any)._cookieCalls;
    expect(cookieCalls.length).toBeGreaterThan(0);

    // Find the session cookie (app_session_id is the actual name used)
    const sessionCookie = cookieCalls.find((call) => call.name === "app_session_id");
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie!.value).toBeTruthy();
  });

  it("should not set cookie on failed login", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    // Try to login with wrong password
    try {
      await caller.auth.loginEmail({
        email: "mycomputergh@yahoo.com",
        password: "WrongPassword123!",
      });
      expect.fail("Should have thrown error");
    } catch (error: any) {
      // Expected to fail
      expect(error.message).toContain("Invalid email or password");

      // Verify no cookie was set
      const cookieCalls = (ctx.res as any)._cookieCalls;
      const sessionCookie = cookieCalls.find((call) => call.name === "app_session_id");
      expect(sessionCookie).toBeUndefined();
    }
  });

  it("should have valid JWT token in cookie", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    // Login with existing test user
    const loginResult = await caller.auth.loginEmail({
      email: "mycomputergh@yahoo.com",
      password: "Qgz10nkl9634wQ",
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.user.email).toBe("mycomputergh@yahoo.com");

    // Get the cookie
    const cookieCalls = (ctx.res as any)._cookieCalls;
    const sessionCookie = cookieCalls.find((call) => call.name === "app_session_id");
    expect(sessionCookie).toBeDefined();

    const token = sessionCookie!.value;
    expect(token).toBeTruthy();

    // Token should be a valid JWT (has 3 parts separated by dots)
    const parts = token.split(".");
    expect(parts.length).toBe(3);
  });
});
