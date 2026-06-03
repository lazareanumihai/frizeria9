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

describe("Modify Barber Work Hours", () => {
  let testBarberId: number;

  beforeAll(async () => {
    // Clean up test data before running tests
    const db = await getDb();
    if (db) {
      await db.delete(barbers).where(eq(barbers.name, "Modify Hours Test Barber"));
    }

    // Create a test barber for use in tests
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.barbers.create({
      name: "Modify Hours Test Barber",
      phone: "+40123456789",
      email: "modify@test.com",
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

  it("admin can modify work hours for a specific day", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    // Set initial hours
    await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 1, // Monday
      startTime: "09:00",
      endTime: "18:00",
    });

    // Modify the hours
    const result = await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "19:00",
    });

    expect(result.startTime).toBe("08:00");
    expect(result.endTime).toBe("19:00");
  });

  it("admin can modify multiple days work hours", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    const modifications = [
      { day: 2, start: "10:00", end: "17:00" },
      { day: 3, start: "09:30", end: "18:30" },
      { day: 4, start: "08:00", end: "16:00" },
    ];

    for (const mod of modifications) {
      const result = await caller.barbers.setAvailability({
        barberId: testBarberId,
        dayOfWeek: mod.day,
        startTime: mod.start,
        endTime: mod.end,
      });

      expect(result.startTime).toBe(mod.start);
      expect(result.endTime).toBe(mod.end);
    }

    // Verify all modifications were saved
    for (const mod of modifications) {
      const availability = await caller.barbers.getAvailability({
        barberId: testBarberId,
        dayOfWeek: mod.day,
      });

      expect(availability.length).toBeGreaterThan(0);
      expect(availability[0].startTime).toBe(mod.start);
      expect(availability[0].endTime).toBe(mod.end);
    }
  });

  it("admin can change day off to working day with new hours", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    // First mark as day off
    await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 5, // Friday
      startTime: "09:00",
      endTime: "18:00",
      isDayOff: 1,
    });

    // Then change to working day with new hours
    const result = await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 5,
      startTime: "10:00",
      endTime: "20:00",
      isDayOff: 0,
    });

    expect((result as any).isDayOff).toBe(0);
    expect(result.startTime).toBe("10:00");
    expect(result.endTime).toBe("20:00");
  });

  it("admin can change working day to day off", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    // First set working hours
    await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 6, // Saturday
      startTime: "08:00",
      endTime: "16:00",
      isDayOff: 0,
    });

    // Then mark as day off
    const result = await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 6,
      startTime: "08:00",
      endTime: "16:00",
      isDayOff: 1,
    });

    expect((result as any).isDayOff).toBe(1);
  });

  it("admin can modify hours without affecting day off status", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    // Set initial hours
    await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 0, // Sunday
      startTime: "09:00",
      endTime: "18:00",
      isDayOff: 0,
    });

    // Modify hours
    const result = await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 0,
      startTime: "10:00",
      endTime: "19:00",
      isDayOff: 0,
    });

    expect(result.startTime).toBe("10:00");
    expect(result.endTime).toBe("19:00");
    expect((result as any).isDayOff).toBe(0);
  });

  it("admin can set early morning hours", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 1,
      startTime: "06:00",
      endTime: "14:00",
    });

    expect(result.startTime).toBe("06:00");
    expect(result.endTime).toBe("14:00");
  });

  it("admin can set late evening hours", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 2,
      startTime: "14:00",
      endTime: "22:00",
    });

    expect(result.startTime).toBe("14:00");
    expect(result.endTime).toBe("22:00");
  });

  it("admin can set extended hours (full day)", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 3,
      startTime: "00:00",
      endTime: "23:59",
    });

    expect(result.startTime).toBe("00:00");
    expect(result.endTime).toBe("23:59");
  });

  it("admin can set short shift hours", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 4,
      startTime: "12:00",
      endTime: "13:00",
    });

    expect(result.startTime).toBe("12:00");
    expect(result.endTime).toBe("13:00");
  });
});
