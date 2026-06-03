import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import { getDb } from "./db";
import { barbers } from "../drizzle/schema";
import { eq } from "drizzle-orm";

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

describe("Barber Schedule Management", () => {
  let testBarberId: number;

  beforeAll(async () => {
    // Clean up test data before running tests
    const db = await getDb();
    if (db) {
      await db.delete(barbers).where(eq(barbers.name, "Schedule Test Barber"));
    }

    // Create a test barber for use in tests
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.barbers.create({
      name: "Schedule Test Barber",
      phone: "+40123456789",
      email: "schedule@test.com",
    });
    testBarberId = result.id;
  });

  afterAll(async () => {
    // Clean up test data after running tests
    if (testBarberId) {
      const db = await getDb();
      if (db) {
        await db.delete(barbers).where(eq(barbers.id, testBarberId));
      }
    }
  });

  it("admin can set barber availability for a specific day", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 1, // Monday
      startTime: "09:00",
      endTime: "18:00",
    });

    expect(result).toBeDefined();
    expect(result.barberId).toBe(testBarberId);
    expect(result.dayOfWeek).toBe(1);
    expect(result.startTime).toBe("09:00");
    expect(result.endTime).toBe("18:00");
  });

  it("public can retrieve barber availability for a specific day", async () => {
    const adminCtx = createMockContext(mockAdminUser);
    const adminCaller = appRouter.createCaller(adminCtx);

    // First set availability as admin
    await adminCaller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 2, // Tuesday
      startTime: "10:00",
      endTime: "17:00",
    });

    // Then get it as public
    const publicCtx = createMockContext(null);
    const publicCaller = appRouter.createCaller(publicCtx);
    const availability = await publicCaller.barbers.getAvailability({
      barberId: testBarberId,
      dayOfWeek: 2,
    });

    expect(Array.isArray(availability)).toBe(true);
    expect(availability.length).toBeGreaterThan(0);
    expect(availability[0].barberId).toBe(testBarberId);
    expect(availability[0].dayOfWeek).toBe(2);
    expect(availability[0].startTime).toBe("10:00");
    expect(availability[0].endTime).toBe("17:00");
  });

  it("should return empty array when no availability is set for a day", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    const availability = await caller.barbers.getAvailability({
      barberId: testBarberId,
      dayOfWeek: 5, // Friday (not set)
    });

    expect(Array.isArray(availability)).toBe(true);
    expect(availability.length).toBe(0);
  });

  it("should update availability for a day that already has a schedule", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    // Set initial availability
    await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 3, // Wednesday
      startTime: "09:00",
      endTime: "18:00",
    });

    // Update it
    const updated = await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 3,
      startTime: "08:00",
      endTime: "19:00",
    });

    expect(updated.startTime).toBe("08:00");
    expect(updated.endTime).toBe("19:00");

    // Verify the update
    const availability = await caller.barbers.getAvailability({
      barberId: testBarberId,
      dayOfWeek: 3,
    });

    expect(availability[0].startTime).toBe("08:00");
    expect(availability[0].endTime).toBe("19:00");
  });

  it("should handle all days of the week (0-6)", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    const daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
    const times = [
      { start: "08:00", end: "16:00" },
      { start: "09:00", end: "17:00" },
      { start: "10:00", end: "18:00" },
      { start: "09:00", end: "17:00" },
      { start: "09:00", end: "17:00" },
      { start: "08:00", end: "19:00" },
      { start: "10:00", end: "16:00" },
    ];

    for (let i = 0; i < daysOfWeek.length; i++) {
      const result = await caller.barbers.setAvailability({
        barberId: testBarberId,
        dayOfWeek: daysOfWeek[i],
        startTime: times[i].start,
        endTime: times[i].end,
      });

      expect(result.dayOfWeek).toBe(daysOfWeek[i]);
      expect(result.startTime).toBe(times[i].start);
      expect(result.endTime).toBe(times[i].end);
    }

    // Verify all were saved
    for (let i = 0; i < daysOfWeek.length; i++) {
      const availability = await caller.barbers.getAvailability({
        barberId: testBarberId,
        dayOfWeek: daysOfWeek[i],
      });

      expect(availability.length).toBeGreaterThan(0);
      expect(availability[0].startTime).toBe(times[i].start);
    }
  });

  it("should handle different time formats correctly", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    const testCases = [
      { start: "06:00", end: "22:00" },
      { start: "00:00", end: "23:59" },
      { start: "12:30", end: "13:30" },
    ];

    for (let i = 0; i < testCases.length; i++) {
      const result = await caller.barbers.setAvailability({
        barberId: testBarberId,
        dayOfWeek: i,
        startTime: testCases[i].start,
        endTime: testCases[i].end,
      });

      expect(result.startTime).toBe(testCases[i].start);
      expect(result.endTime).toBe(testCases[i].end);
    }
  });

  it("should reject non-admin access to setAvailability", async () => {
    const ctx = createMockContext(null); // Public context
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.barbers.setAvailability({
        barberId: testBarberId,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "18:00",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("permission");
    }
  });

  it("should mark a day as off", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 4,
      startTime: "09:00",
      endTime: "18:00",
      isDayOff: 1,
    });

    expect(result).toBeDefined();
    expect((result as any).isDayOff).toBe(1);
  });

  it("should retrieve day off status when fetching availability", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 6,
      startTime: "09:00",
      endTime: "18:00",
      isDayOff: 1,
    });

    const availability = await caller.barbers.getAvailability({
      barberId: testBarberId,
      dayOfWeek: 6,
    });

    expect(Array.isArray(availability)).toBe(true);
    expect(availability.length).toBeGreaterThan(0);
    expect((availability[0] as any).isDayOff).toBe(1);
  });

  it("should allow setting a day back to working day", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 0,
      startTime: "09:00",
      endTime: "18:00",
      isDayOff: 1,
    });

    const result = await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 0,
      startTime: "08:00",
      endTime: "17:00",
      isDayOff: 0,
    });

    expect((result as any).isDayOff).toBe(0);
    expect(result.startTime).toBe("08:00");
  });
});
