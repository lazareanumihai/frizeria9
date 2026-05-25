import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import { createBooking, getBookingsByDate, getAllBookings, updateBookingStatus, deleteBooking, isTimeSlotAvailable, getAvailableSlots, getSettings, updateSettings, getAllServices, createService, updateService, deleteService, toggleServiceStatus, getAllServicesAdmin, reorderServices, getUserByEmail, updateUserPassword, createEmailUser, getAllBarbers, getActiveBarbers, createBarber, updateBarber, deleteBarber, toggleBarberStatus, getBarberAvailability, setBarberAvailability, getBookingsByBarber, getBookingsByBarberAndDate } from "./db";
import bcrypt from "bcrypt";
import { storagePut } from "./storage";

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

        return { success: true, user };
      }),
  }),

  bookings: router({
    create: publicProcedure
      .input(
        z.object({
          clientName: z.string().min(1),
          clientPhone: z.string().min(1),
          serviceType: z.string(),
          bookingDate: z.date(),
          bookingTime: z.string(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Check if time slot is available
        const available = await isTimeSlotAvailable(input.bookingDate, input.bookingTime);
        if (!available) {
          throw new Error("Ora selectata este deja ocupata. Te rugam sa alegi o alta ora.");
        }
        
        return createBooking({
          clientName: input.clientName,
          clientPhone: input.clientPhone,
          serviceType: input.serviceType,
          bookingDate: input.bookingDate,
          bookingTime: input.bookingTime,
          price: "0",
          status: "pending",
          notes: input.notes,
        });
      }),
    getByDate: adminProcedure
      .input(z.object({ date: z.date() }))
      .query(async ({ input }) => {
        return getBookingsByDate(input.date);
      }),
    getAll: adminProcedure.query(async () => {
      return getAllBookings();
    }),
    updateStatus: adminProcedure
      .input(
        z.object({
          bookingId: z.number(),
          status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
        })
      )
      .mutation(async ({ input }) => {
        return updateBookingStatus(input.bookingId, input.status);
      }),
    delete: adminProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ input }) => {
        return deleteBooking(input.bookingId);
      }),
    getOccupiedSlots: publicProcedure
      .input(z.object({ bookingDate: z.date() }))
      .query(async ({ input }) => {
        return getAvailableSlots(input.bookingDate);
      }),
    getByBarber: adminProcedure
      .input(z.object({ barberId: z.number() }))
      .query(async ({ input }) => {
        return getBookingsByBarber(input.barberId);
      }),
    getByBarberAndDate: adminProcedure
      .input(z.object({ barberId: z.number(), date: z.date() }))
      .query(async ({ input }) => {
        return getBookingsByBarberAndDate(input.barberId, input.date);
      }),
  }),

  settings: router({
    get: publicProcedure.query(async () => {
      return getSettings();
    }),
    update: adminProcedure
      .input(
        z.object({
          businessHours: z.string().optional(),
          servicePrices: z.string().optional(),
          closedDays: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return updateSettings(input);
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
      .mutation(async ({ input }) => {
        try {
          const buffer = Buffer.from(input.fileData, 'base64');
          const fileKey = `services/${Date.now()}-${input.fileName}`;
          const result = await storagePut(fileKey, buffer, input.mimeType);
          return { url: result.url };
        } catch (error) {
          throw new Error(`Image upload failed: ${error}`);
        }
      }),
    getAll: publicProcedure.query(async () => {
      return getAllServices();
    }),
    getAllAdmin: adminProcedure.query(async () => {
      return getAllServicesAdmin();
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
      .mutation(async ({ input }) => {
        return createService({
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
      .mutation(async ({ input }) => {
        const { serviceId, ...data } = input;
        return updateService(serviceId, data);
      }),
    toggle: adminProcedure
      .input(z.object({ serviceId: z.number() }))
      .mutation(async ({ input }) => {
        return toggleServiceStatus(input.serviceId);
      }),
    reorder: adminProcedure
      .input(z.object({ serviceIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        return reorderServices(input.serviceIds);
      }),
    delete: adminProcedure
      .input(z.object({ serviceId: z.number() }))
      .mutation(async ({ input }) => {
        return deleteService(input.serviceId);
      }),
  }),

  barbers: router({
    getAll: publicProcedure.query(async () => getAllBarbers()),
    getActive: publicProcedure.query(async () => getActiveBarbers()),
    getAllAdmin: adminProcedure.query(async () => getAllBarbers()),
    create: adminProcedure
      .input(z.object({ name: z.string().min(1), phone: z.string().optional(), email: z.string().email().optional() }))
      .mutation(async ({ input }) => createBarber(input)),
    update: adminProcedure
      .input(z.object({ barberId: z.number(), name: z.string().optional(), phone: z.string().optional(), email: z.string().email().optional(), order: z.number().optional() }))
      .mutation(async ({ input }) => updateBarber(input.barberId, { name: input.name, phone: input.phone, email: input.email, order: input.order })),
    delete: adminProcedure
      .input(z.object({ barberId: z.number() }))
      .mutation(async ({ input }) => deleteBarber(input.barberId)),
    toggle: adminProcedure
      .input(z.object({ barberId: z.number() }))
      .mutation(async ({ input }) => toggleBarberStatus(input.barberId)),
    getAvailability: publicProcedure
      .input(z.object({ barberId: z.number(), dayOfWeek: z.number() }))
      .query(async ({ input }) => getBarberAvailability(input.barberId, input.dayOfWeek)),
    setAvailability: adminProcedure
      .input(z.object({ barberId: z.number(), dayOfWeek: z.number(), startTime: z.string(), endTime: z.string() }))
      .mutation(async ({ input }) => setBarberAvailability(input.barberId, input.dayOfWeek, input.startTime, input.endTime)),
  }),
});

export type AppRouter = typeof appRouter;
