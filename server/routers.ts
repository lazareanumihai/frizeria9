import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import { createBooking, getBookingsByDate, getAllBookings, updateBookingStatus, deleteBooking } from "./db";

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
  }),

  bookings: router({
    create: publicProcedure
      .input(
        z.object({
          clientName: z.string().min(1),
          clientPhone: z.string().min(1),
          serviceType: z.enum(["tuns", "barbierit", "pachet_complet"]),
          bookingDate: z.date(),
          bookingTime: z.string(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const price = input.serviceType === "tuns" ? 40 : input.serviceType === "barbierit" ? 35 : 65;
        return createBooking({
          clientName: input.clientName,
          clientPhone: input.clientPhone,
          serviceType: input.serviceType,
          bookingDate: input.bookingDate,
          bookingTime: input.bookingTime,
          price: price.toString(),
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
  }),
});

export type AppRouter = typeof appRouter;
