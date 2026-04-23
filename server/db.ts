import { eq, gte, lte, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, bookings, InsertBooking } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Booking queries
export async function createBooking(booking: InsertBooking) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(bookings).values(booking);
  return result;
}

export async function getBookingsByDate(date: Date) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const result = await db
    .select()
    .from(bookings)
    .where(
      and(
        gte(bookings.bookingDate, startOfDay),
        lte(bookings.bookingDate, endOfDay)
      )
    )
    .orderBy(bookings.bookingTime);

  return result;
}

export async function getAllBookings() {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(bookings)
    .orderBy(bookings.bookingDate);

  return result;
}

export async function updateBookingStatus(bookingId: number, status: "pending" | "confirmed" | "completed" | "cancelled") {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .update(bookings)
    .set({ status })
    .where(eq(bookings.id, bookingId));

  return result;
}

export async function deleteBooking(bookingId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .delete(bookings)
    .where(eq(bookings.id, bookingId));

  return result;
}

export async function isTimeSlotAvailable(bookingDate: Date, bookingTime: string) {
  const db = await getDb();
  if (!db) {
    return true;
  }

  const startOfDay = new Date(bookingDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(bookingDate);
  endOfDay.setHours(23, 59, 59, 999);

  const existingBookings = await db
    .select()
    .from(bookings)
    .where(
      and(
        gte(bookings.bookingDate, startOfDay),
        lte(bookings.bookingDate, endOfDay),
        eq(bookings.bookingTime, bookingTime)
      )
    )
    .limit(1);

  return existingBookings.length === 0;
}

export async function getAvailableSlots(bookingDate: Date) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const startOfDay = new Date(bookingDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(bookingDate);
  endOfDay.setHours(23, 59, 59, 999);

  const occupiedSlots = await db
    .select({ bookingTime: bookings.bookingTime })
    .from(bookings)
    .where(
      and(
        gte(bookings.bookingDate, startOfDay),
        lte(bookings.bookingDate, endOfDay)
      )
    );

  return occupiedSlots.map(slot => slot.bookingTime);
}
