import { describe, expect, it, beforeEach, vi } from "vitest";
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

describe("bookings router", () => {
  describe("bookings.create", () => {
    it("allows public users to create a booking", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 1);

      const result = await caller.bookings.create({
        clientName: "John Doe",
        clientPhone: "0758900900",
        serviceType: "tuns",
        bookingDate,
        bookingTime: "10:00",
        notes: "Test booking",
      });

      expect(result).toBeDefined();
    });

    it("validates required fields", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 1);

      try {
        await caller.bookings.create({
          clientName: "",
          clientPhone: "0758900900",
          serviceType: "tuns",
          bookingDate,
          bookingTime: "10:00",
        });
        expect.fail("Should have thrown validation error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("sets correct price based on service type", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 1);

      // Test tuns (40 RON)
      const tunsBooking = await caller.bookings.create({
        clientName: "Test Client",
        clientPhone: "0758900900",
        serviceType: "tuns",
        bookingDate,
        bookingTime: "10:00",
      });

      expect(tunsBooking).toBeDefined();

      // Test barbierit (35 RON)
      const barbieritBooking = await caller.bookings.create({
        clientName: "Test Client 2",
        clientPhone: "0758900901",
        serviceType: "barbierit",
        bookingDate,
        bookingTime: "11:00",
      });

      expect(barbieritBooking).toBeDefined();

      // Test pachet_complet (65 RON)
      const pachetBooking = await caller.bookings.create({
        clientName: "Test Client 3",
        clientPhone: "0758900902",
        serviceType: "pachet_complet",
        bookingDate,
        bookingTime: "12:00",
      });

      expect(pachetBooking).toBeDefined();
    });
  });

  describe("bookings.getByDate", () => {
    it("requires admin role", async () => {
      const ctx = createMockContext(regularUser);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.bookings.getByDate({
          date: new Date(),
        });
        expect.fail("Should have thrown permission error");
      } catch (error: any) {
        expect(error.message).toContain("You do not have required permission");
      }
    });

    it("allows admin to fetch bookings by date", async () => {
      const ctx = createMockContext(adminUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bookings.getByDate({
        date: new Date(),
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("bookings.getAll", () => {
    it("requires admin role", async () => {
      const ctx = createMockContext(regularUser);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.bookings.getAll();
        expect.fail("Should have thrown permission error");
      } catch (error: any) {
        expect(error.message).toContain("You do not have required permission");
      }
    });

    it("allows admin to fetch all bookings", async () => {
      const ctx = createMockContext(adminUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bookings.getAll();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("bookings.updateStatus", () => {
    it("requires admin role", async () => {
      const ctx = createMockContext(regularUser);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.bookings.updateStatus({
          bookingId: 1,
          status: "confirmed",
        });
        expect.fail("Should have thrown permission error");
      } catch (error: any) {
        expect(error.message).toContain("You do not have required permission");
      }
    });

    it("allows admin to update booking status", async () => {
      const ctx = createMockContext(adminUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bookings.updateStatus({
        bookingId: 1,
        status: "confirmed",
      });

      expect(result).toBeDefined();
    });
  });

  describe("bookings.delete", () => {
    it("requires admin role", async () => {
      const ctx = createMockContext(regularUser);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.bookings.delete({
          bookingId: 1,
        });
        expect.fail("Should have thrown permission error");
      } catch (error: any) {
        expect(error.message).toContain("You do not have required permission");
      }
    });

    it("allows admin to delete booking", async () => {
      const ctx = createMockContext(adminUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bookings.delete({
        bookingId: 1,
      });

      expect(result).toBeDefined();
    });
  });
});
