import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, adminProcedure, superAdminProcedure } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createBooking, getBookingsByDate, getAllBookings, updateBookingStatus, deleteBooking, isTimeSlotAvailable, getAvailableSlots, getSettings, updateSettings, getAllServices, createService, updateService, deleteService, toggleServiceStatus, getAllServicesAdmin, reorderServices, getUserByEmail, updateUserPassword, createEmailUser, getAllBarbers, getActiveBarbers, createBarber, updateBarber, deleteBarber, toggleBarberStatus, getBarberAvailability, setBarberAvailability, getBookingsByBarber, getBookingsByBarberAndDate, getBarberPerformanceMetrics, getBookingTrendsByPeriod, getServiceDistribution, getBookingHeatmapData, getCancellationRateByBarber, reorderBarbers, blockHours, unblockHours, getBlockedHours, getBlockedHoursByRange, getTenantBySlug, getTenantById, getAllTenantsWithStats, createTenant, recalcTenantPricing, getBarberById } from "./db";
import bcrypt from "bcrypt";
import { storagePut } from "./storage";

/** Resolve a tenant id from a public URL slug, or throw if it doesn't exist. */
async function tenantIdFromSlug(slug: string): Promise<number> {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Firma (slug) nu există." });
  }
  return tenant.id;
}

/** Ensure a barber belongs to the given tenant before touching its sub-resources. */
async function assertBarberInTenant(tenantId: number, barberId: number): Promise<void> {
  const barber = await getBarberById(tenantId, barberId);
  if (!barber) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Frizerul nu aparține acestei firme." });
  }
}

// Slugs reserved by the application routes; cannot be used as firm slugs.
const RESERVED_SLUGS = new Set(["login", "admin", "super-admin", "api", "uploads", "404", "contact"]);

const slugSchema = z
  .string()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalid: folosește litere mici, cifre și cratime.");

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    loginEmail: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(6) }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        // Create JWT token and set as session cookie
        const appId = (process.env.VITE_APP_ID ?? "") as string;
        const token = await sdk.signSession({
          openId: user.openId,
          appId,
          name: user.name || "",
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        return { success: true, user };
      }),
  }),

  // ----------------------------------------------------------------------
  // Tenants (firms) — Master Admin only, plus a public lookup by slug.
  // ----------------------------------------------------------------------
  tenants: router({
    // Public: resolve basic firm info for a slug (used by public sites).
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const tenant = await getTenantBySlug(input.slug);
        if (!tenant || tenant.isActive !== 1) return null;
        return { id: tenant.id, name: tenant.name, slug: tenant.slug };
      }),
    // Master Admin: list all firms with computed stats for the overview.
    list: superAdminProcedure.query(async () => {
      return getAllTenantsWithStats();
    }),
    // Master Admin: create a new firm + its Tenant Admin user.
    create: superAdminProcedure
      .input(
        z.object({
          companyName: z.string().min(1),
          slug: slugSchema,
          adminEmail: z.string().email(),
          adminPassword: z.string().min(6),
          basePricePerBarber: z.number().positive().optional(),
        })
      )
      .mutation(async ({ input }) => {
        if (RESERVED_SLUGS.has(input.slug)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Acest slug este rezervat." });
        }
        const existingTenant = await getTenantBySlug(input.slug);
        if (existingTenant) {
          throw new TRPCError({ code: "CONFLICT", message: "Există deja o firmă cu acest slug." });
        }
        const existingUser = await getUserByEmail(input.adminEmail);
        if (existingUser) {
          throw new TRPCError({ code: "CONFLICT", message: "Există deja un utilizator cu acest email." });
        }

        const tenant = await createTenant({
          name: input.companyName,
          slug: input.slug,
          adminEmail: input.adminEmail,
          basePricePerBarber: input.basePricePerBarber?.toString(),
        });

        const passwordHash = await bcrypt.hash(input.adminPassword, 10);
        await createEmailUser(input.adminEmail, input.companyName, passwordHash, "admin", tenant.id);

        await recalcTenantPricing(tenant.id);

        return { success: true, tenant };
      }),
  }),

  bookings: router({
    create: publicProcedure
      .input(
        z.object({
          slug: z.string(),
          clientName: z.string().min(1),
          clientPhone: z.string().min(1),
          serviceType: z.string(),
          bookingDate: z.date(),
          bookingTime: z.string(),
          notes: z.string().optional(),
          barberId: z.number().nullable().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const tenantId = await tenantIdFromSlug(input.slug);
        // Check if time slot is available
        const available = await isTimeSlotAvailable(tenantId, input.bookingDate, input.bookingTime, input.barberId || null);
        if (!available) {
          throw new Error("Ora selectata este deja ocupata. Te rugam sa alegi o alta ora.");
        }

        return createBooking({
          tenantId,
          clientName: input.clientName,
          clientPhone: input.clientPhone,
          serviceType: input.serviceType,
          bookingDate: input.bookingDate,
          bookingTime: input.bookingTime,
          price: "0",
          status: "pending",
          notes: input.notes,
          barberId: input.barberId || null,
        });
      }),
    getByDate: adminProcedure
      .input(z.object({ date: z.date() }))
      .query(async ({ input, ctx }) => {
        return getBookingsByDate(ctx.tenantId, input.date);
      }),
    getAll: adminProcedure.query(async ({ ctx }) => {
      return getAllBookings(ctx.tenantId);
    }),
    updateStatus: adminProcedure
      .input(
        z.object({
          bookingId: z.number(),
          status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return updateBookingStatus(ctx.tenantId, input.bookingId, input.status);
      }),
    delete: adminProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return deleteBooking(ctx.tenantId, input.bookingId);
      }),
    getOccupiedSlots: publicProcedure
      .input(z.object({ slug: z.string(), bookingDate: z.date(), barberId: z.number().nullable().optional() }))
      .query(async ({ input }) => {
        const tenantId = await tenantIdFromSlug(input.slug);
        return getAvailableSlots(tenantId, input.bookingDate, input.barberId || null);
      }),
    getByBarber: adminProcedure
      .input(z.object({ barberId: z.number() }))
      .query(async ({ input, ctx }) => {
        return getBookingsByBarber(ctx.tenantId, input.barberId);
      }),
    getByBarberAndDate: adminProcedure
      .input(z.object({ barberId: z.number(), date: z.date() }))
      .query(async ({ input, ctx }) => {
        return getBookingsByBarberAndDate(ctx.tenantId, input.barberId, input.date);
      }),
  }),

  settings: router({
    get: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const tenantId = await tenantIdFromSlug(input.slug);
        return getSettings(tenantId);
      }),
    getAdmin: adminProcedure.query(async ({ ctx }) => {
      return getSettings(ctx.tenantId);
    }),
    update: adminProcedure
      .input(
        z.object({
          businessHours: z.string().optional(),
          servicePrices: z.string().optional(),
          closedDays: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return updateSettings(ctx.tenantId, input);
      }),
  }),

  services: router({
    uploadImage: adminProcedure
      .input(
        z.object({
          fileName: z.string(),
          fileData: z.string(),
          mimeType: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const buffer = Buffer.from(input.fileData, 'base64');
          const fileKey = `tenants/${ctx.tenantId}/services/${Date.now()}-${input.fileName}`;
          const result = await storagePut(fileKey, buffer, input.mimeType);
          return { url: result.url };
        } catch (error) {
          throw new Error(`Image upload failed: ${error}`);
        }
      }),
    getAll: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const tenantId = await tenantIdFromSlug(input.slug);
        return getAllServices(tenantId);
      }),
    getAllAdmin: adminProcedure.query(async ({ ctx }) => {
      return getAllServicesAdmin(ctx.tenantId);
    }),
    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          price: z.string(),
          duration: z.number().min(15),
          description: z.string().optional(),
          imageUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return createService({
          tenantId: ctx.tenantId,
          name: input.name,
          price: input.price,
          duration: input.duration,
          description: input.description,
          imageUrl: input.imageUrl,
          isActive: 1,
        });
      }),
    update: adminProcedure
      .input(
        z.object({
          serviceId: z.number(),
          name: z.string().optional(),
          price: z.string().optional(),
          duration: z.number().optional(),
          description: z.string().optional(),
          imageUrl: z.string().optional(),
          order: z.number().optional(),
          isActive: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { serviceId, ...data } = input;
        return updateService(ctx.tenantId, serviceId, data);
      }),
    toggle: adminProcedure
      .input(z.object({ serviceId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return toggleServiceStatus(ctx.tenantId, input.serviceId);
      }),
    reorder: adminProcedure
      .input(z.object({ serviceIds: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        return reorderServices(ctx.tenantId, input.serviceIds);
      }),
    delete: adminProcedure
      .input(z.object({ serviceId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return deleteService(ctx.tenantId, input.serviceId);
      }),
  }),

  barbers: router({
    getAll: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => getAllBarbers(await tenantIdFromSlug(input.slug))),
    getActive: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => getActiveBarbers(await tenantIdFromSlug(input.slug))),
    getAllAdmin: adminProcedure.query(async ({ ctx }) => getAllBarbers(ctx.tenantId)),
    create: adminProcedure
      .input(z.object({ name: z.string().min(1), phone: z.string().optional(), email: z.string().email().optional(), description: z.string().optional() }))
      .mutation(async ({ input, ctx }) => createBarber({ ...input, tenantId: ctx.tenantId })),
    update: adminProcedure
      .input(z.object({ barberId: z.number(), name: z.string().optional(), phone: z.string().optional(), email: z.string().email().optional(), description: z.string().optional(), order: z.number().optional() }))
      .mutation(async ({ input, ctx }) => updateBarber(ctx.tenantId, input.barberId, { name: input.name, phone: input.phone, email: input.email, description: input.description, order: input.order })),
    delete: adminProcedure
      .input(z.object({ barberId: z.number() }))
      .mutation(async ({ input, ctx }) => deleteBarber(ctx.tenantId, input.barberId)),
    toggle: adminProcedure
      .input(z.object({ barberId: z.number() }))
      .mutation(async ({ input, ctx }) => toggleBarberStatus(ctx.tenantId, input.barberId)),
    // Public: a barber's weekly hours are shown on the public booking page.
    // Availability rows are keyed by the globally-unique barberId, so this is
    // inherently scoped to a single firm's barber.
    getAvailability: publicProcedure
      .input(z.object({ barberId: z.number(), dayOfWeek: z.number() }))
      .query(async ({ input }) => {
        return getBarberAvailability(input.barberId, input.dayOfWeek);
      }),
    setAvailability: adminProcedure
      .input(z.object({ barberId: z.number(), dayOfWeek: z.number(), startTime: z.string(), endTime: z.string(), isDayOff: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        await assertBarberInTenant(ctx.tenantId, input.barberId);
        return setBarberAvailability(ctx.tenantId, input.barberId, input.dayOfWeek, input.startTime, input.endTime, input.isDayOff);
      }),
    uploadPhoto: adminProcedure
      .input(z.object({ barberId: z.number(), fileData: z.string(), fileName: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await assertBarberInTenant(ctx.tenantId, input.barberId);
        const buffer = Buffer.from(input.fileData, 'base64');
        const fileKey = `tenants/${ctx.tenantId}/barbers/${input.barberId}/${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, 'image/jpeg');
        await updateBarber(ctx.tenantId, input.barberId, { photoUrl: url });
        return { success: true, photoUrl: url };
      }),
    deletePhoto: adminProcedure
      .input(z.object({ barberId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await assertBarberInTenant(ctx.tenantId, input.barberId);
        await updateBarber(ctx.tenantId, input.barberId, { photoUrl: null });
        return { success: true };
      }),
    reorder: adminProcedure
      .input(z.object({ barberIds: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        return reorderBarbers(ctx.tenantId, input.barberIds);
      }),
    blockHours: adminProcedure
      .input(z.object({ barberId: z.number(), date: z.string(), hours: z.array(z.number()), reason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await assertBarberInTenant(ctx.tenantId, input.barberId);
        return blockHours(ctx.tenantId, input.barberId, input.date, input.hours, input.reason);
      }),
    unblockHours: adminProcedure
      .input(z.object({ barberId: z.number(), date: z.string(), hours: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        await assertBarberInTenant(ctx.tenantId, input.barberId);
        return unblockHours(ctx.tenantId, input.barberId, input.date, input.hours);
      }),
    getBlockedHours: adminProcedure
      .input(z.object({ barberId: z.number(), date: z.string() }))
      .query(async ({ input, ctx }) => {
        await assertBarberInTenant(ctx.tenantId, input.barberId);
        return getBlockedHours(ctx.tenantId, input.barberId, input.date);
      }),
    getBlockedHoursByRange: adminProcedure
      .input(z.object({ barberId: z.number(), startDate: z.string(), endDate: z.string() }))
      .query(async ({ input, ctx }) => {
        await assertBarberInTenant(ctx.tenantId, input.barberId);
        return getBlockedHoursByRange(ctx.tenantId, input.barberId, input.startDate, input.endDate);
      }),
  }),
  analytics: router({
    barberPerformance: adminProcedure
      .input(z.object({ barberId: z.number().optional(), startDate: z.date().optional(), endDate: z.date().optional() }))
      .query(async ({ input, ctx }) => getBarberPerformanceMetrics(ctx.tenantId, input.barberId, input.startDate, input.endDate)),
    bookingTrends: adminProcedure
      .input(z.object({ period: z.enum(['daily', 'weekly', 'monthly']), startDate: z.date(), endDate: z.date(), barberId: z.number().optional() }))
      .query(async ({ input, ctx }) => getBookingTrendsByPeriod(ctx.tenantId, input.period, input.startDate, input.endDate, input.barberId)),
    serviceDistribution: adminProcedure
      .input(z.object({ startDate: z.date().optional(), endDate: z.date().optional(), barberId: z.number().optional() }))
      .query(async ({ input, ctx }) => getServiceDistribution(ctx.tenantId, input.startDate, input.endDate, input.barberId)),
    bookingHeatmap: adminProcedure
      .input(z.object({ startDate: z.date(), endDate: z.date(), barberId: z.number().optional() }))
      .query(async ({ input, ctx }) => getBookingHeatmapData(ctx.tenantId, input.startDate, input.endDate, input.barberId)),
    cancellationRate: adminProcedure
      .input(z.object({ startDate: z.date().optional(), endDate: z.date().optional(), barberId: z.number().optional() }))
      .query(async ({ input, ctx }) => getCancellationRateByBarber(ctx.tenantId, input.startDate, input.endDate, input.barberId)),
  }),
  contact: router({
    submit: publicProcedure
      .input(z.object({
        slug: z.string().optional(),
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        message: z.string().min(10),
      }))
      .mutation(async ({ input }) => {
        try {
          const { notifyOwner } = await import("./_core/notification");
          await notifyOwner({
            title: `New Contact Form Submission from ${input.name}`,
            content: `Email: ${input.email}\nPhone: ${input.phone || "N/A"}\n\nMessage:\n${input.message}`,
          });

          return {
            success: true,
            message: "Contact form submitted successfully",
          };
        } catch (error) {
          console.error("Error submitting contact form:", error);
          throw new Error("Failed to submit contact form");
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
