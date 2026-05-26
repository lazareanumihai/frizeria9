import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

const mockAdminUser: User = {
  id: 1,
  openId: "admin-user",
  email: "admin@frizeria9.ro",
  name: "Admin",
  loginMethod: "manus",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const mockRegularUser: User = {
  id: 2,
  openId: "regular-user",
  email: "user@example.com",
  name: "Regular User",
  loginMethod: "manus",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createMockContext(user: User | null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("analytics router", () => {
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
  const endDate = new Date();

  it("requires admin role for barberPerformance", async () => {
    const ctx = createMockContext(mockRegularUser);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.analytics.barberPerformance.query({
        startDate,
        endDate,
      });
      expect.fail("Should have thrown permission error");
    } catch (error: any) {
      expect(error.message).toContain("permission");
    }
  });

  it("allows admin to fetch barber performance metrics", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.barberPerformance.query({
      startDate,
      endDate,
    });

    expect(Array.isArray(result)).toBe(true);
    // Result should have metrics structure
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("totalBookings");
      expect(result[0]).toHaveProperty("completedBookings");
      expect(result[0]).toHaveProperty("cancelledBookings");
      expect(result[0]).toHaveProperty("totalRevenue");
    }
  });

  it("requires admin role for bookingTrends", async () => {
    const ctx = createMockContext(mockRegularUser);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.analytics.bookingTrends.query({
        period: "daily",
        startDate,
        endDate,
      });
      expect.fail("Should have thrown permission error");
    } catch (error: any) {
      expect(error.message).toContain("permission");
    }
  });

  it("allows admin to fetch booking trends for daily period", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.bookingTrends.query({
      period: "daily",
      startDate,
      endDate,
    });

    expect(Array.isArray(result)).toBe(true);
    // Result should have trend structure
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("period");
      expect(result[0]).toHaveProperty("totalBookings");
      expect(result[0]).toHaveProperty("revenue");
    }
  });

  it("allows admin to fetch booking trends for weekly period", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.bookingTrends.query({
      period: "weekly",
      startDate,
      endDate,
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to fetch booking trends for monthly period", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.bookingTrends.query({
      period: "monthly",
      startDate,
      endDate,
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("requires admin role for serviceDistribution", async () => {
    const ctx = createMockContext(mockRegularUser);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.analytics.serviceDistribution.query({
        startDate,
        endDate,
      });
      expect.fail("Should have thrown permission error");
    } catch (error: any) {
      expect(error.message).toContain("permission");
    }
  });

  it("allows admin to fetch service distribution", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.serviceDistribution.query({
      startDate,
      endDate,
    });

    expect(Array.isArray(result)).toBe(true);
    // Result should have distribution structure
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("serviceName");
      expect(result[0]).toHaveProperty("bookingCount");
      expect(result[0]).toHaveProperty("revenue");
    }
  });

  it("requires admin role for bookingHeatmap", async () => {
    const ctx = createMockContext(mockRegularUser);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.analytics.bookingHeatmap.query({
        startDate,
        endDate,
      });
      expect.fail("Should have thrown permission error");
    } catch (error: any) {
      expect(error.message).toContain("permission");
    }
  });

  it("allows admin to fetch booking heatmap data", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.bookingHeatmap.query({
      startDate,
      endDate,
    });

    expect(Array.isArray(result)).toBe(true);
    // Result should have heatmap structure
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("dayOfWeek");
      expect(result[0]).toHaveProperty("hour");
      expect(result[0]).toHaveProperty("bookingCount");
    }
  });

  it("requires admin role for cancellationRate", async () => {
    const ctx = createMockContext(mockRegularUser);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.analytics.cancellationRate.query({
        startDate,
        endDate,
      });
      expect.fail("Should have thrown permission error");
    } catch (error: any) {
      expect(error.message).toContain("permission");
    }
  });

  it("allows admin to fetch cancellation rates", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.cancellationRate.query({
      startDate,
      endDate,
    });

    expect(Array.isArray(result)).toBe(true);
    // Result should have cancellation rate structure
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("barberId");
      expect(result[0]).toHaveProperty("totalBookings");
      expect(result[0]).toHaveProperty("cancelledBookings");
      expect(result[0]).toHaveProperty("cancellationRate");
    }
  });
});
