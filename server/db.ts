
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, bookings, InsertBooking, settings, InsertSetting, services, InsertService, Service, barbers, InsertBarber, Barber, barberAvailability, InsertBarberAvailability, blockedHours, InsertBlockedHours, BlockedHours, tenants, InsertTenant, Tenant } from "../drizzle/schema";
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

// ---------------------------------------------------------------------------
// Tenant (firm) queries
// ---------------------------------------------------------------------------

export async function getAllTenants(): Promise<Tenant[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenants).orderBy(tenants.createdAt);
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getTenantById(id: number): Promise<Tenant | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createTenant(tenant: { name: string; slug: string; adminEmail?: string; basePricePerBarber?: string }): Promise<Tenant> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.insert(tenants).values({
    name: tenant.name,
    slug: tenant.slug,
    adminEmail: tenant.adminEmail ?? null,
    basePricePerBarber: tenant.basePricePerBarber ?? "50",
    currentMonthlyTotal: "0",
  });
  const created = await getTenantBySlug(tenant.slug);
  if (!created) {
    throw new Error("Failed to create tenant");
  }
  return created;
}

/** Count active barbers for a tenant. */
export async function countActiveBarbers(tenantId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ value: count() })
    .from(barbers)
    .where(and(eq(barbers.tenantId, tenantId), eq(barbers.isActive, 1)));
  return Number(result[0]?.value ?? 0);
}

/**
 * Recalculate and persist a tenant's monthly subscription total.
 * total = number of active barbers * basePricePerBarber.
 */
export async function recalcTenantPricing(tenantId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const tenant = await getTenantById(tenantId);
  if (!tenant) return 0;
  const activeBarbers = await countActiveBarbers(tenantId);
  const pricePerBarber = parseFloat(tenant.basePricePerBarber?.toString() ?? "50");
  const total = activeBarbers * pricePerBarber;
  await db
    .update(tenants)
    .set({ currentMonthlyTotal: total.toFixed(2) })
    .where(eq(tenants.id, tenantId));
  return total;
}

/** List all tenants with computed stats for the master-admin overview. */
export async function getAllTenantsWithStats() {
  const all = await getAllTenants();
  const result = [] as Array<{
    id: number;
    name: string;
    slug: string;
    adminEmail: string | null;
    basePricePerBarber: number;
    activeBarbers: number;
    monthlyTotal: number;
    isActive: number;
    createdAt: Date;
  }>;
  for (const t of all) {
    const activeBarbers = await countActiveBarbers(t.id);
    const pricePerBarber = parseFloat(t.basePricePerBarber?.toString() ?? "50");
    result.push({
      id: t.id,
      name: t.name,
      slug: t.slug,
      adminEmail: t.adminEmail ?? null,
      basePricePerBarber: pricePerBarber,
      activeBarbers,
      monthlyTotal: activeBarbers * pricePerBarber,
      isActive: t.isActive,
      createdAt: t.createdAt,
    });
  }
  return result;
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

export async function getBookingsByDate(tenantId: number, date: Date) {
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
        eq(bookings.tenantId, tenantId),
        gte(bookings.bookingDate, startOfDay),
        lte(bookings.bookingDate, endOfDay)
      )
    )
    .orderBy(bookings.bookingTime);

  return result;
}

export async function getAllBookings(tenantId: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(bookings)
    .where(eq(bookings.tenantId, tenantId))
    .orderBy(bookings.bookingDate);

  return result;
}

export async function updateBookingStatus(tenantId: number, bookingId: number, status: "pending" | "confirmed" | "completed" | "cancelled") {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .update(bookings)
    .set({ status })
    .where(and(eq(bookings.id, bookingId), eq(bookings.tenantId, tenantId)));

  return result;
}

export async function deleteBooking(tenantId: number, bookingId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .delete(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.tenantId, tenantId)));

  return result;
}

export async function isTimeSlotAvailable(tenantId: number, bookingDate: Date, bookingTime: string, barberId: number | null = null) {
  const db = await getDb();
  if (!db) {
    return true;
  }

  // Normalize to UTC midnight to avoid timezone issues
  const dateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
  const startOfDay = new Date(Date.UTC(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate(), 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate(), 23, 59, 59, 999));

  const conditions = [
    eq(bookings.tenantId, tenantId),
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

export async function getAvailableSlots(tenantId: number, bookingDate: Date, barberId: number | null = null) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  // Normalize to UTC midnight to avoid timezone issues
  const dateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
  const startOfDay = new Date(Date.UTC(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate(), 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate(), 23, 59, 59, 999));

  // Convert to Monday-first day of week (0 = Monday, 6 = Sunday) to match admin schedule storage
  const dayOfWeek = dateOnly.getDay() === 0 ? 6 : dateOnly.getDay() - 1;

  // If a specific barber is requested, check if they have a day off
  if (barberId !== null) {
    const availability = await db
      .select()
      .from(barberAvailability)
      .where(and(
        eq(barberAvailability.barberId, barberId),
        eq(barberAvailability.dayOfWeek, dayOfWeek)
      ));

    // If the barber has a day off on this day, return special marker
    if (availability.length > 0 && availability[0].isDayOff === 1) {
      return ["__DAY_OFF__"];
    }
  }

  const conditions = [
    eq(bookings.tenantId, tenantId),
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

  // Get blocked hours for this barber on this date
  const dateStr = dateOnly.toISOString().split('T')[0]; // YYYY-MM-DD format
  const blockedHoursList = barberId !== null 
    ? await getBlockedHours(tenantId, barberId, dateStr)
    : [];

  // Convert occupied slots and blocked hours to a set for quick lookup
  const unavailableSlots = new Set<string>();
  
  // Add occupied time slots
  occupiedSlots.forEach(slot => unavailableSlots.add(slot.bookingTime));
  
  // Add blocked hours (convert hour to HH:00 format)
  blockedHoursList.forEach(blocked => {
    const hour = String(blocked.hour).padStart(2, '0');
    unavailableSlots.add(`${hour}:00`);
  });

  return Array.from(unavailableSlots).sort();
}

// Settings queries
export async function getSettings(tenantId: number) {
  const db = await getDb();
  if (!db) {
    return null;
  }

  const result = await db.select().from(settings).where(eq(settings.tenantId, tenantId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateSettings(tenantId: number, setting: Partial<InsertSetting>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const existing = await getSettings(tenantId);
  if (existing) {
    return db.update(settings).set(setting).where(eq(settings.id, existing.id));
  } else {
    return db.insert(settings).values({ ...setting, tenantId } as InsertSetting);
  }
}

// Services queries
export async function getAllServices(tenantId: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(services)
    .where(and(eq(services.tenantId, tenantId), eq(services.isActive, 1)))
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

export async function updateService(tenantId: number, serviceId: number, service: Partial<InsertService>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .update(services)
    .set(service)
    .where(and(eq(services.id, serviceId), eq(services.tenantId, tenantId)));

  return result;
}

export async function deleteService(tenantId: number, serviceId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Hard delete - remove from database
  const result = await db
    .delete(services)
    .where(and(eq(services.id, serviceId), eq(services.tenantId, tenantId)));

  return result;
}

export async function toggleServiceStatus(tenantId: number, serviceId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get current service to toggle its status
  const service = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.tenantId, tenantId)))
    .limit(1);

  if (service.length === 0) {
    throw new Error("Service not found");
  }

  const newStatus = service[0].isActive === 1 ? 0 : 1;

  const result = await db
    .update(services)
    .set({ isActive: newStatus })
    .where(and(eq(services.id, serviceId), eq(services.tenantId, tenantId)));

  return result;
}

export async function getAllServicesAdmin(tenantId: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(services)
    .where(eq(services.tenantId, tenantId))
    .orderBy(services.order);

  return result;
}

export async function reorderServices(tenantId: number, serviceIds: number[]) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Update order for each service based on its position in the array
  const updates = serviceIds.map((id, index) =>
    db
      .update(services)
      .set({ order: index })
      .where(and(eq(services.id, id), eq(services.tenantId, tenantId)))
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

export async function createEmailUser(
  email: string,
  name: string,
  passwordHash: string,
  role: "user" | "admin" | "super_admin" = "admin",
  tenantId: number | null = null,
) {
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
    role,
    tenantId,
  });
}

// Barber management functions
export async function getAllBarbers(tenantId: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(barbers)
    .where(eq(barbers.tenantId, tenantId))
    .orderBy(barbers.order);

  return result;
}

export async function getActiveBarbers(tenantId: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(barbers)
    .where(and(eq(barbers.tenantId, tenantId), eq(barbers.isActive, 1)))
    .orderBy(barbers.order);

  return result;
}

/** Fetch a single barber scoped to a tenant (used to guard sub-resource access). */
export async function getBarberById(tenantId: number, barberId: number): Promise<Barber | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(barbers)
    .where(and(eq(barbers.id, barberId), eq(barbers.tenantId, tenantId)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createBarber(barber: InsertBarber) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(barbers).values(barber);

  // Recalculate the tenant's monthly subscription total after adding a barber.
  if (barber.tenantId) {
    await recalcTenantPricing(barber.tenantId);
  }

  // Get the newly created barber
  const created = await db
    .select()
    .from(barbers)
    .where(and(eq(barbers.name, barber.name), eq(barbers.tenantId, barber.tenantId as number)))
    .orderBy((t) => t.id);
  
  return created[created.length - 1];
}

export async function updateBarber(tenantId: number, barberId: number, barber: Partial<InsertBarber>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .update(barbers)
    .set(barber)
    .where(and(eq(barbers.id, barberId), eq(barbers.tenantId, tenantId)));
}

export async function deleteBarber(tenantId: number, barberId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .delete(barbers)
    .where(and(eq(barbers.id, barberId), eq(barbers.tenantId, tenantId)));

  // Recalculate the tenant's monthly subscription total after removing a barber.
  await recalcTenantPricing(tenantId);

  return result;
}

export async function toggleBarberStatus(tenantId: number, barberId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const barber = await db
    .select()
    .from(barbers)
    .where(and(eq(barbers.id, barberId), eq(barbers.tenantId, tenantId)))
    .limit(1);

  if (barber.length === 0) {
    throw new Error("Barber not found");
  }

  const newStatus = barber[0].isActive === 1 ? 0 : 1;

  const result = await db
    .update(barbers)
    .set({ isActive: newStatus })
    .where(and(eq(barbers.id, barberId), eq(barbers.tenantId, tenantId)));

  // Active barber count changed -> recalculate pricing.
  await recalcTenantPricing(tenantId);

  return result;
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

export async function setBarberAvailability(tenantId: number, barberId: number, dayOfWeek: number, startTime: string, endTime: string, isDayOff?: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Delete existing availability for this day
  await db
    .delete(barberAvailability)
    .where(and(eq(barberAvailability.barberId, barberId), eq(barberAvailability.dayOfWeek, dayOfWeek)));

  // Insert new availability using values with explicit field assignment
  const insertData: InsertBarberAvailability = {
    tenantId,
    barberId,
    dayOfWeek,
    startTime,
    endTime,
    isDayOff: isDayOff ?? 0,
  };
  await db.insert(barberAvailability).values(insertData);

  // Return the newly inserted availability
  const result = await db
    .select()
    .from(barberAvailability)
    .where(and(eq(barberAvailability.barberId, barberId), eq(barberAvailability.dayOfWeek, dayOfWeek)))
    .orderBy((t) => t.id);
  return result[result.length - 1];
}

export async function getBookingsByBarber(tenantId: number, barberId: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.tenantId, tenantId), eq(bookings.barberId, barberId)))
    .orderBy(bookings.bookingDate);

  return result;
}

export async function getBookingsByBarberAndDate(tenantId: number, barberId: number, date: Date) {
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
        eq(bookings.tenantId, tenantId),
        eq(bookings.barberId, barberId),
        gte(bookings.bookingDate, startOfDay),
        lte(bookings.bookingDate, endOfDay)
      )
    )
    .orderBy(bookings.bookingTime);

  return result;
}


// Analytics functions
export async function getBarberPerformanceMetrics(tenantId: number, barberId?: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const conditions: any[] = [eq(bookings.tenantId, tenantId)];
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

export async function getBookingTrendsByPeriod(tenantId: number, period: 'daily' | 'weekly' | 'monthly', startDate: Date, endDate: Date, barberId?: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const conditions: any[] = [eq(bookings.tenantId, tenantId), gte(bookings.bookingDate, startDate), lte(bookings.bookingDate, endDate)];
  if (barberId) {
    conditions.push(eq(bookings.barberId, barberId));
  }

  const allBookings: any = await db
    .select()
    .from(bookings)
    .where(and(...conditions));

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

export async function getServiceDistribution(tenantId: number, startDate?: Date, endDate?: Date, barberId?: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const conditions: any[] = [eq(bookings.tenantId, tenantId)];
  if (startDate) {
    conditions.push(gte(bookings.bookingDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(bookings.bookingDate, endDate));
  }
  if (barberId) {
    conditions.push(eq(bookings.barberId, barberId));
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

export async function getBookingHeatmapData(tenantId: number, startDate: Date, endDate: Date, barberId?: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const conditions: any[] = [eq(bookings.tenantId, tenantId), gte(bookings.bookingDate, startDate), lte(bookings.bookingDate, endDate)];
  if (barberId) {
    conditions.push(eq(bookings.barberId, barberId));
  }

  const allBookings = await db
    .select()
    .from(bookings)
    .where(and(...conditions));

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

export async function getCancellationRateByBarber(tenantId: number, startDate?: Date, endDate?: Date, barberId?: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const conditions: any[] = [eq(bookings.tenantId, tenantId)];
  if (startDate) {
    conditions.push(gte(bookings.bookingDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(bookings.bookingDate, endDate));
  }
  if (barberId) {
    conditions.push(eq(bookings.barberId, barberId));
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


export async function reorderBarbers(tenantId: number, barberIds: number[]) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Update order for each barber based on its position in the array
  const updates = barberIds.map((id, index) =>
    db
      .update(barbers)
      .set({ order: index })
      .where(and(eq(barbers.id, id), eq(barbers.tenantId, tenantId)))
  );

  return Promise.all(updates);
}


/**
 * Block specific hours for a barber on a given date
 * @param barberId - ID of the barber
 * @param date - Date in YYYY-MM-DD format
 * @param hours - Array of hours (0-23) to block
 * @param reason - Optional reason for blocking
 */
export async function blockHours(
  tenantId: number,
  barberId: number,
  date: string,
  hours: number[],
  reason?: string
): Promise<BlockedHours[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Insert blocked hours (ignore duplicates)
  const insertPromises = hours.map(hour =>
    db.insert(blockedHours).values({
      tenantId,
      barberId,
      date: date as any, // Date string in YYYY-MM-DD format
      hour,
      reason: reason || null,
    }).onDuplicateKeyUpdate({
      set: { reason: reason || null }
    })
  );

  await Promise.all(insertPromises);

  // Return the blocked hours that were created
  return db
    .select()
    .from(blockedHours)
    .where(
      and(
        eq(blockedHours.tenantId, tenantId),
        eq(blockedHours.barberId, barberId),
        eq(blockedHours.date, date as any)
      )
    )
    .orderBy(blockedHours.hour);
}

/**
 * Unblock specific hours for a barber on a given date
 * @param barberId - ID of the barber
 * @param date - Date in YYYY-MM-DD format
 * @param hours - Array of hours (0-23) to unblock
 */
export async function unblockHours(
  tenantId: number,
  barberId: number,
  date: string,
  hours: number[]
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Delete blocked hours
  const deletePromises = hours.map(hour =>
    db
      .delete(blockedHours)
      .where(
        and(
          eq(blockedHours.tenantId, tenantId),
          eq(blockedHours.barberId, barberId),
          eq(blockedHours.date, date as any),
          eq(blockedHours.hour, hour)
        )
      )
  );

  await Promise.all(deletePromises);
}

/**
 * Get blocked hours for a barber on a specific date
 * @param barberId - ID of the barber
 * @param date - Date in YYYY-MM-DD format
 */
export async function getBlockedHours(
  tenantId: number,
  barberId: number,
  date: string
): Promise<BlockedHours[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .select()
    .from(blockedHours)
    .where(
      and(
        eq(blockedHours.tenantId, tenantId),
        eq(blockedHours.barberId, barberId),
        eq(blockedHours.date, date as any)
      )
    )
    .orderBy(blockedHours.hour);
}

/**
 * Get blocked hours for a barber within a date range
 * @param barberId - ID of the barber
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 */
export async function getBlockedHoursByRange(
  tenantId: number,
  barberId: number,
  startDate: string,
  endDate: string
): Promise<BlockedHours[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .select()
    .from(blockedHours)
    .where(
      and(
        eq(blockedHours.tenantId, tenantId),
        eq(blockedHours.barberId, barberId),
        gte(blockedHours.date, startDate as any),
        lte(blockedHours.date, endDate as any)
      )
    )
    .orderBy(blockedHours.date, blockedHours.hour);
}

/**
 * Check if a specific hour is blocked for a barber on a date
 * @param barberId - ID of the barber
 * @param date - Date in YYYY-MM-DD format
 * @param hour - Hour (0-23)
 */
export async function isHourBlocked(
  barberId: number,
  date: string,
  hour: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(blockedHours)
    .where(
      and(
        eq(blockedHours.barberId, barberId),
        eq(blockedHours.date, date as any),
        eq(blockedHours.hour, hour)
      )
    )
    .limit(1);

  return result.length > 0;
}
