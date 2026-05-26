
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, bookings, InsertBooking, settings, InsertSetting, services, InsertService, Service, barbers, InsertBarber, Barber, barberAvailability, InsertBarberAvailability } from "../drizzle/schema";
import { ENV } from './_core/env';
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { count, sum, avg } from "drizzle-orm";

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

  // Normalize booking date to UTC midnight to avoid timezone issues
  const date = new Date(booking.bookingDate);
  const normalizedDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
  
  const result = await db.insert(bookings).values({
    ...booking,
    bookingDate: normalizedDate,
  });
  return result;
}

export async function getBookingsByDate(date: Date) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  // Normalize to UTC midnight to avoid timezone issues
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startOfDay = new Date(Date.UTC(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate(), 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate(), 23, 59, 59, 999));

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

export async function isTimeSlotAvailable(bookingDate: Date, bookingTime: string, barberId: number | null = null) {
  const db = await getDb();
  if (!db) {
    return true;
  }

  // Normalize to UTC midnight to avoid timezone issues
  const dateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
  const startOfDay = new Date(Date.UTC(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate(), 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate(), 23, 59, 59, 999));

  const conditions = [
    gte(bookings.bookingDate, startOfDay),
    lte(bookings.bookingDate, endOfDay),
    eq(bookings.bookingTime, bookingTime)
  ];

  if (barberId !== null) {
    conditions.push(eq(bookings.barberId, barberId));
  }

  const existingBookings = await db
    .select()
    .from(bookings)
    .where(and(...conditions))
    .limit(1);

  return existingBookings.length === 0;
}

export async function getAvailableSlots(bookingDate: Date, barberId: number | null = null) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  // Normalize to UTC midnight to avoid timezone issues
  const dateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
  const startOfDay = new Date(Date.UTC(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate(), 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate(), 23, 59, 59, 999));

  const conditions = [
    gte(bookings.bookingDate, startOfDay),
    lte(bookings.bookingDate, endOfDay)
  ];

  if (barberId !== null) {
    conditions.push(eq(bookings.barberId, barberId));
  }

  const occupiedSlots = await db
    .select({ bookingTime: bookings.bookingTime })
    .from(bookings)
    .where(and(...conditions));

  return occupiedSlots.map(slot => slot.bookingTime);
}

// Settings queries
export async function getSettings() {
  const db = await getDb();
  if (!db) {
    return null;
  }

  const result = await db.select().from(settings).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateSettings(setting: Partial<InsertSetting>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const existing = await getSettings();
  if (existing) {
    return db.update(settings).set(setting).where(eq(settings.id, existing.id));
  } else {
    return db.insert(settings).values(setting as InsertSetting);
  }
}

// Services queries
export async function getAllServices() {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(services)
    .where(eq(services.isActive, 1))
    .orderBy(services.order);

  return result;
}

export async function createService(service: InsertService) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(services).values(service);
  return result;
}

export async function updateService(serviceId: number, service: Partial<InsertService>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .update(services)
    .set(service)
    .where(eq(services.id, serviceId));

  return result;
}

export async function deleteService(serviceId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Hard delete - remove from database
  const result = await db
    .delete(services)
    .where(eq(services.id, serviceId));

  return result;
}

export async function toggleServiceStatus(serviceId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get current service to toggle its status
  const service = await db
    .select()
    .from(services)
    .where(eq(services.id, serviceId))
    .limit(1);

  if (service.length === 0) {
    throw new Error("Service not found");
  }

  const newStatus = service[0].isActive === 1 ? 0 : 1;

  const result = await db
    .update(services)
    .set({ isActive: newStatus })
    .where(eq(services.id, serviceId));

  return result;
}

export async function getAllServicesAdmin() {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(services)
    .orderBy(services.order);

  return result;
}

export async function reorderServices(serviceIds: number[]) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Update order for each service based on its position in the array
  const updates = serviceIds.map((id, index) =>
    db
      .update(services)
      .set({ order: index })
      .where(eq(services.id, id))
  );

  return Promise.all(updates);
}

// Email/Password authentication
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, userId));
}

export async function createEmailUser(email: string, name: string, passwordHash: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Generate a unique openId for email users
  const openId = `email_${email}_${Date.now()}`;

  return db.insert(users).values({
    openId,
    email,
    name,
    passwordHash,
    loginMethod: "email",
    role: "admin",
  });
}

// Barber management functions
export async function getAllBarbers() {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(barbers)
    .orderBy(barbers.order);

  return result;
}

export async function getActiveBarbers() {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(barbers)
    .where(eq(barbers.isActive, 1))
    .orderBy(barbers.order);

  return result;
}

export async function createBarber(barber: InsertBarber) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db.insert(barbers).values(barber);
}

export async function updateBarber(barberId: number, barber: Partial<InsertBarber>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .update(barbers)
    .set(barber)
    .where(eq(barbers.id, barberId));
}

export async function deleteBarber(barberId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .delete(barbers)
    .where(eq(barbers.id, barberId));
}

export async function toggleBarberStatus(barberId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const barber = await db
    .select()
    .from(barbers)
    .where(eq(barbers.id, barberId))
    .limit(1);

  if (barber.length === 0) {
    throw new Error("Barber not found");
  }

  const newStatus = barber[0].isActive === 1 ? 0 : 1;

  return db
    .update(barbers)
    .set({ isActive: newStatus })
    .where(eq(barbers.id, barberId));
}

export async function getBarberAvailability(barberId: number, dayOfWeek: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(barberAvailability)
    .where(and(eq(barberAvailability.barberId, barberId), eq(barberAvailability.dayOfWeek, dayOfWeek)));

  return result;
}

export async function setBarberAvailability(barberId: number, dayOfWeek: number, startTime: string, endTime: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Delete existing availability for this day
  await db
    .delete(barberAvailability)
    .where(and(eq(barberAvailability.barberId, barberId), eq(barberAvailability.dayOfWeek, dayOfWeek)));

  // Insert new availability
  return db.insert(barberAvailability).values({
    barberId,
    dayOfWeek,
    startTime,
    endTime,
  });
}

export async function getBookingsByBarber(barberId: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(bookings)
    .where(eq(bookings.barberId, barberId))
    .orderBy(bookings.bookingDate);

  return result;
}

export async function getBookingsByBarberAndDate(barberId: number, date: Date) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  // Normalize to UTC midnight to avoid timezone issues
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startOfDay = new Date(Date.UTC(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate(), 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate(), 23, 59, 59, 999));

  const result = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.barberId, barberId),
        gte(bookings.bookingDate, startOfDay),
        lte(bookings.bookingDate, endOfDay)
      )
    )
    .orderBy(bookings.bookingTime);

  return result;
}


// Analytics functions
export async function getBarberPerformanceMetrics(barberId?: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const conditions: any[] = [];
  if (barberId) {
    conditions.push(eq(bookings.barberId, barberId));
  }
  if (startDate) {
    conditions.push(gte(bookings.bookingDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(bookings.bookingDate, endDate));
  }

  let query: any = db.select().from(bookings);
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const allBookings = await query;

  // Group bookings by barber and calculate metrics
  const metricsMap = new Map<number | null, any>();

  for (const booking of allBookings) {
    const bid = booking.barberId;
    if (!metricsMap.has(bid)) {
      metricsMap.set(bid, {
        barberId: bid,
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        totalRevenue: 0,
      });
    }

    const metrics = metricsMap.get(bid)!;
    metrics.totalBookings += 1;
    if (booking.status === 'completed') metrics.completedBookings += 1;
    if (booking.status === 'cancelled') metrics.cancelledBookings += 1;
    if (booking.price) metrics.totalRevenue += parseFloat(booking.price.toString());
  }

  return Array.from(metricsMap.values());
}

export async function getBookingTrendsByPeriod(period: 'daily' | 'weekly' | 'monthly', startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const allBookings = await db
    .select()
    .from(bookings)
    .where(and(gte(bookings.bookingDate, startDate), lte(bookings.bookingDate, endDate)));

  // Group bookings by period
  const trendsMap = new Map<string, any>();

  for (const booking of allBookings) {
    let periodKey: string;
    const date = new Date(booking.bookingDate);

    if (period === 'daily') {
      periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (period === 'weekly') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      periodKey = weekStart.toISOString().split('T')[0]; // Week starting date
    } else {
      periodKey = date.toISOString().substring(0, 7); // YYYY-MM
    }

    if (!trendsMap.has(periodKey)) {
      trendsMap.set(periodKey, {
        period: periodKey,
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        revenue: 0,
      });
    }

    const trend = trendsMap.get(periodKey)!;
    trend.totalBookings += 1;
    if (booking.status === 'completed') trend.completedBookings += 1;
    if (booking.status === 'cancelled') trend.cancelledBookings += 1;
    if (booking.price) trend.revenue += parseFloat(booking.price.toString());
  }

  return Array.from(trendsMap.values()).sort((a, b) => a.period.localeCompare(b.period));
}

export async function getServiceDistribution(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const conditions: any[] = [];
  if (startDate) {
    conditions.push(gte(bookings.bookingDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(bookings.bookingDate, endDate));
  }

  let query: any = db.select().from(bookings);
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const allBookings = await query;

  // Group bookings by service type
  const distributionMap = new Map<string, any>();

  for (const booking of allBookings) {
    const serviceName = booking.serviceType;
    if (!distributionMap.has(serviceName)) {
      distributionMap.set(serviceName, {
        serviceName,
        bookingCount: 0,
        revenue: 0,
      });
    }

    const dist = distributionMap.get(serviceName)!;
    dist.bookingCount += 1;
    if (booking.price) dist.revenue += parseFloat(booking.price.toString());
  }

  return Array.from(distributionMap.values()).sort((a, b) => b.bookingCount - a.bookingCount);
}

export async function getBookingHeatmapData(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const allBookings = await db
    .select()
    .from(bookings)
    .where(and(gte(bookings.bookingDate, startDate), lte(bookings.bookingDate, endDate)));

  // Group bookings by day of week and hour
  const heatmapMap = new Map<string, any>();

  for (const booking of allBookings) {
    const date = new Date(booking.bookingDate);
    const dayOfWeek = date.getDay(); // 0-6 (Sunday-Saturday)
    const hour = parseInt(booking.bookingTime.split(':')[0], 10);
    const key = `${dayOfWeek}-${hour}`;

    if (!heatmapMap.has(key)) {
      heatmapMap.set(key, {
        dayOfWeek,
        hour,
        bookingCount: 0,
      });
    }

    const heatmap = heatmapMap.get(key)!;
    heatmap.bookingCount += 1;
  }

  return Array.from(heatmapMap.values()).sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.hour - b.hour;
  });
}

export async function getCancellationRateByBarber(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const conditions: any[] = [];
  if (startDate) {
    conditions.push(gte(bookings.bookingDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(bookings.bookingDate, endDate));
  }

  let query: any = db.select().from(bookings);
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const allBookings = await query;

  // Group bookings by barber and calculate cancellation rate
  const cancellationMap = new Map<number | null, any>();

  for (const booking of allBookings) {
    const bid = booking.barberId;
    if (!cancellationMap.has(bid)) {
      cancellationMap.set(bid, {
        barberId: bid,
        totalBookings: 0,
        cancelledBookings: 0,
        cancellationRate: 0,
      });
    }

    const cancellation = cancellationMap.get(bid)!;
    cancellation.totalBookings += 1;
    if (booking.status === 'cancelled') cancellation.cancelledBookings += 1;
    cancellation.cancellationRate = (cancellation.cancelledBookings / cancellation.totalBookings) * 100;
  }

  return Array.from(cancellationMap.values()).sort((a, b) => b.cancellationRate - a.cancellationRate);
}
