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
  tenantId: 1,
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

describe("barbers router", () => {
  let testBarberId: number;

  beforeAll(async () => {
    // Clean up test data before running tests
    const db = await getDb();
    if (db) {
      await db.delete(barbers).where(eq(barbers.name, "Test Barber"));
    }

    // Create a test barber for use in tests
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.barbers.create({
      name: "Test Barber",
      phone: "+40123456789",
      email: "barber@test.com",
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

  it("admin can create a barber", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    const createResult = await caller.barbers.create({
      name: "New Test Barber",
      phone: "+40987654321",
      email: "newbarber@test.com",
    });

    expect(createResult).toBeDefined();

    // Get all barbers to verify the created barber
    const allBarbers = await caller.barbers.getAllAdmin();
    const createdBarber = allBarbers.find((b) => b.name === "New Test Barber");
    expect(createdBarber).toBeDefined();
    expect(createdBarber?.phone).toBe("+40987654321");
    expect(createdBarber?.email).toBe("newbarber@test.com");
    expect(createdBarber?.isActive).toBe(1);

    // Clean up
    const db = await getDb();
    if (db && createdBarber) {
      await db.delete(barbers).where(eq(barbers.id, createdBarber.id));
    }
  });

  it("public can fetch all barbers", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.barbers.getAll({ slug: "frizeria9" });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("public can fetch only active barbers", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.barbers.getActive({ slug: "frizeria9" });

    expect(Array.isArray(result)).toBe(true);
    // All returned barbers should be active
    result.forEach((barber) => {
      expect(barber.isActive).toBe(1);
    });
  });

  it("admin can fetch all barbers", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.barbers.getAllAdmin();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("admin can update a barber", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    await caller.barbers.update({
      barberId: testBarberId,
      name: "Updated Test Barber",
      phone: "+40987654321",
    });

    // Verify the update by fetching the barber
    const allBarbers = await caller.barbers.getAllAdmin();
    const updatedBarber = allBarbers.find((b) => b.id === testBarberId);
    expect(updatedBarber).toBeDefined();
    expect(updatedBarber?.name).toBe("Updated Test Barber");
    expect(updatedBarber?.phone).toBe("+40987654321");
  });

  it("admin can toggle barber status from active to inactive", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    await caller.barbers.toggle({ barberId: testBarberId });

    // Verify the toggle by fetching the barber
    const allBarbers = await caller.barbers.getAllAdmin();
    const toggledBarber = allBarbers.find((b) => b.id === testBarberId);
    expect(toggledBarber).toBeDefined();
    expect(toggledBarber?.isActive).toBe(0);
  });

  it("admin can toggle barber status from inactive to active", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    await caller.barbers.toggle({ barberId: testBarberId });

    // Verify the toggle by fetching the barber
    const allBarbers = await caller.barbers.getAllAdmin();
    const toggledBarber = allBarbers.find((b) => b.id === testBarberId);
    expect(toggledBarber).toBeDefined();
    expect(toggledBarber?.isActive).toBe(1);
  });

  it("inactive barbers are not visible to public in getActive", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    // First deactivate the barber
    await caller.barbers.toggle({ barberId: testBarberId });

    // Then check that it's not in the active list
    const publicCtx = createMockContext(null);
    const publicCaller = appRouter.createCaller(publicCtx);
    const activeBarbers = await publicCaller.barbers.getActive({ slug: "frizeria9" });

    const found = activeBarbers.find((b) => b.id === testBarberId);
    expect(found).toBeUndefined();

    // Reactivate for other tests
    await caller.barbers.toggle({ barberId: testBarberId });
  });

  it("admin can delete a barber", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    // Create a barber to delete
    await caller.barbers.create({
      name: "Barber to Delete",
      phone: "+40111111111",
      email: "delete@test.com",
    });

    // Get the barber we just created
    let allBarbers = await caller.barbers.getAllAdmin();
    const barberToDelete = allBarbers.find((b) => b.name === "Barber to Delete");
    expect(barberToDelete).toBeDefined();

    // Delete it
    await caller.barbers.delete({ barberId: barberToDelete!.id });

    // Verify it's deleted by checking it's not in the list
    allBarbers = await caller.barbers.getAllAdmin();
    const found = allBarbers.find((b) => b.id === barberToDelete!.id);
    expect(found).toBeUndefined();
  });

  it("admin can set barber availability", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    await caller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 1, // Monday
      startTime: "09:00",
      endTime: "17:00",
    });

    // Verify the availability was set
    const availability = await caller.barbers.getAvailability({
      barberId: testBarberId,
      dayOfWeek: 1,
    });

    expect(availability).toBeDefined();
  });

  it("public can get barber availability", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    // First set availability as admin
    const adminCtx = createMockContext(mockAdminUser);
    const adminCaller = appRouter.createCaller(adminCtx);
    await adminCaller.barbers.setAvailability({
      barberId: testBarberId,
      dayOfWeek: 2, // Tuesday
      startTime: "10:00",
      endTime: "18:00",
    });

    // Then get it as public
    const result = await caller.barbers.getAvailability({
      barberId: testBarberId,
      dayOfWeek: 2,
    });

    expect(result).toBeDefined();
  });
});
