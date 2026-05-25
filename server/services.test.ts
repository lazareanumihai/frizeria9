import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// Mock admin user
const adminUser: User = {
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

// Mock regular user
const regularUser: User = {
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

describe("services router", () => {
  it("admin can create a service", async () => {
    const ctx = createMockContext(adminUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.services.create({
      name: "Test Service",
      price: "50",
      duration: 30,
      description: "Test description",
    });

    expect(result).toBeDefined();
  });

  it("public can fetch only active services", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    const allServices = await caller.services.getAll();

    // All services should be active
    allServices.forEach((service) => {
      expect(service.isActive).toBe(1);
    });
  });

  it("admin can fetch all services including inactive", async () => {
    const ctx = createMockContext(adminUser);
    const caller = appRouter.createCaller(ctx);

    const allServices = await caller.services.getAllAdmin();

    // Should include both active and inactive services
    expect(Array.isArray(allServices)).toBe(true);
  });

  it("admin can toggle service status from active to inactive", async () => {
    const ctx = createMockContext(adminUser);
    const caller = appRouter.createCaller(ctx);

    // Create a service
    const createResult = await caller.services.create({
      name: "Toggle Test Service",
      price: "40",
      duration: 30,
      description: "Test toggle",
    });

    expect(createResult).toBeDefined();

    // Get all services to find the one we just created
    const allServices = await caller.services.getAllAdmin();
    const createdService = allServices.find((s) => s.name === "Toggle Test Service");
    expect(createdService).toBeDefined();

    // Toggle to inactive
    await caller.services.toggle({ serviceId: createdService!.id });

    // Verify it's inactive
    const updatedServices = await caller.services.getAllAdmin();
    const toggledService = updatedServices.find((s) => s.id === createdService!.id);
    expect(toggledService).toBeDefined();
    expect(toggledService!.isActive).toBe(0);
  });

  it("admin can toggle service status from inactive to active", async () => {
    const ctx = createMockContext(adminUser);
    const caller = appRouter.createCaller(ctx);

    // Create a service
    const createResult = await caller.services.create({
      name: "Toggle Back Test Service",
      price: "45",
      duration: 30,
      description: "Test toggle back",
    });

    expect(createResult).toBeDefined();

    // Get all services to find the one we just created
    let allServices = await caller.services.getAllAdmin();
    const createdService = allServices.find((s) => s.name === "Toggle Back Test Service");
    expect(createdService).toBeDefined();

    // Toggle to inactive
    await caller.services.toggle({ serviceId: createdService!.id });

    // Toggle back to active
    await caller.services.toggle({ serviceId: createdService!.id });

    // Verify it's active again
    allServices = await caller.services.getAllAdmin();
    const finalService = allServices.find((s) => s.id === createdService!.id);
    expect(finalService?.isActive).toBe(1);
  });

  it("inactive services are not visible to public", async () => {
    const adminCtx = createMockContext(adminUser);
    const publicCtx = createMockContext(null);

    const adminCaller = appRouter.createCaller(adminCtx);
    const publicCaller = appRouter.createCaller(publicCtx);

    // Create a service
    const createResult = await adminCaller.services.create({
      name: "Hidden Service",
      price: "35",
      duration: 30,
      description: "Should be hidden",
    });

    expect(createResult).toBeDefined();

    // Get all services to find the one we just created
    let adminServices = await adminCaller.services.getAllAdmin();
    const createdService = adminServices.find((s) => s.name === "Hidden Service");
    expect(createdService).toBeDefined();

    // Deactivate it
    await adminCaller.services.toggle({ serviceId: createdService!.id });

    // Public should not see it
    const publicServices = await publicCaller.services.getAll();
    const hiddenService = publicServices.find((s) => s.id === createdService!.id);
    expect(hiddenService).toBeUndefined();

    // Admin should see it as inactive
    adminServices = await adminCaller.services.getAllAdmin();
    const adminViewService = adminServices.find((s) => s.id === createdService!.id);
    expect(adminViewService?.isActive).toBe(0);
  });
});
