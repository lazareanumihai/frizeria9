import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: text("passwordHash"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Bookings table for storing client appointments
 */
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientPhone: varchar("clientPhone", { length: 20 }).notNull(),
  serviceType: varchar("serviceType", { length: 255 }).notNull(),
  barberId: int("barberId"), // Optional: specific barber or null for any available
  bookingDate: timestamp("bookingDate").notNull(),
  bookingTime: varchar("bookingTime", { length: 5 }).notNull(), // HH:MM format
  status: mysqlEnum("status", ["pending", "confirmed", "completed", "cancelled"]).default("pending").notNull(),
  notes: text("notes"),
  price: decimal("price", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

/**
 * Settings table for storing business configuration
 */
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  // Business hours (JSON format: {mon: {start: "08:00", end: "18:00"}, ...})
  businessHours: text("businessHours"),
  // Service prices (JSON format: {tuns: 40, barbierit: 35, pachet_complet: 65})
  servicePrices: text("servicePrices"),
  // Closed days (JSON format: ["2026-01-01", "2026-12-25", ...])
  closedDays: text("closedDays"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

/**
 * Services table for storing custom services
 */
export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: int("duration").notNull(), // Duration in minutes
  description: text("description"),
  imageUrl: text("imageUrl"), // URL to service image
  order: int("order").default(0).notNull(), // Display order on homepage
  isActive: int("isActive").default(1).notNull(), // 1 = active, 0 = inactive
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;
/**
 * Barbers table for storing barber information
 */
export const barbers = mysqlTable("barbers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  photoUrl: text("photoUrl"), // URL to barber's photo stored on S3
  description: text("description"), // Short description of the barber
  isActive: int("isActive").default(1).notNull(), // 1 = active, 0 = inactive
  order: int("order").default(0).notNull(), // Display order
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Barber = typeof barbers.$inferSelect;
export type InsertBarber = typeof barbers.$inferInsert;

/**
 * Barber availability table for storing custom availability per barber
 */
export const barberAvailability = mysqlTable("barberAvailability", {
  id: int("id").autoincrement().primaryKey(),
  barberId: int("barberId").notNull(),
  dayOfWeek: int("dayOfWeek").notNull(), // 0-6 (Sunday-Saturday)
  startTime: varchar("startTime", { length: 5 }).notNull(), // HH:MM format
  endTime: varchar("endTime", { length: 5 }).notNull(), // HH:MM format
  isDayOff: int("isDayOff").default(0).notNull(), // 1 = day off, 0 = working day
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BarberAvailability = typeof barberAvailability.$inferSelect;
export type InsertBarberAvailability = typeof barberAvailability.$inferInsert;

/**
 * Blocked hours table for storing specific hours when a barber cannot accept bookings
 */
export const blockedHours = mysqlTable("blockedHours", {
  id: int("id").autoincrement().primaryKey(),
  barberId: int("barberId").notNull(),
  date: date("date").notNull(), // YYYY-MM-DD format
  hour: int("hour").notNull(), // 0-23 (hour of the day)
  reason: varchar("reason", { length: 255 }), // Optional reason for blocking (e.g., "Meeting", "Lunch break")
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BlockedHours = typeof blockedHours.$inferSelect;
export type InsertBlockedHours = typeof blockedHours.$inferInsert;
