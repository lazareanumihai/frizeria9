import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import { getDb } from "./db";
import { services } from "../drizzle/schema";
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

describe("services router - reordering", () => {
  let testServiceIds: number[] = [];

  beforeAll(async () => {
    // Create test services for reordering
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    for (let i = 1; i <= 3; i++) {
      const result = await caller.services.create({
        name: `Reorder Test Service ${i}`,
        price: `${30 + i * 10}`,
        duration: 30,
        description: `Test service ${i} for reordering`,
      });
      // Note: result is a Drizzle insert result, not a full service object
      // We'll fetch the services to get their IDs
    }

    // Fetch the created services to get their IDs
    const allServices = await caller.services.getAllAdmin();
    const createdServices = allServices.filter((s) =>
      s.name.includes("Reorder Test Service")
    );
    testServiceIds = createdServices.map((s) => s.id);
  });

  afterAll(async () => {
    // Clean up test services
    const db = await getDb();
    if (db) {
      for (const id of testServiceIds) {
        await db.delete(services).where(eq(services.id, id));
      }
    }
  });

  it("admin can reorder services", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    if (testServiceIds.length < 3) {
      expect.fail("Not enough test services created");
    }

    // Reorder the services (reverse order)
    const reorderedIds = [testServiceIds[2], testServiceIds[1], testServiceIds[0]];
    await caller.services.reorder({ serviceIds: reorderedIds });

    // Verify the order by fetching all services
    const allServices = await caller.services.getAllAdmin();
    const reorderedServices = allServices.filter((s) =>
      s.name.includes("Reorder Test Service")
    );

    // Check that the order is preserved
    expect(reorderedServices[0]?.id).toBe(reorderedIds[0]);
    expect(reorderedServices[1]?.id).toBe(reorderedIds[1]);
    expect(reorderedServices[2]?.id).toBe(reorderedIds[2]);
  });

  it("admin can update service order field", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    if (testServiceIds.length === 0) {
      expect.fail("No test services created");
    }

    // Update the order field of a service
    await caller.services.update({
      serviceId: testServiceIds[0],
      order: 100,
    });

    // Verify the order was updated
    const allServices = await caller.services.getAllAdmin();
    const updatedService = allServices.find((s) => s.id === testServiceIds[0]);
    expect(updatedService?.order).toBe(100);
  });

  it("services are sorted by order field", async () => {
    const ctx = createMockContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    // Get all services - they should be sorted by order
    const allServices = await caller.services.getAllAdmin();

    // Verify that services are sorted by order (ascending)
    for (let i = 1; i < allServices.length; i++) {
      expect(allServices[i].order).toBeGreaterThanOrEqual(allServices[i - 1].order);
    }
  });

  it("public services are sorted by order field", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    // Get all public services - they should be sorted by order
    const allServices = await caller.services.getAll();

    // Verify that services are sorted by order (ascending)
    for (let i = 1; i < allServices.length; i++) {
      expect(allServices[i].order).toBeGreaterThanOrEqual(allServices[i - 1].order);
    }
  });
});
