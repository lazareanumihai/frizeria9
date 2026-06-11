import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/**
 * Resolve the effective tenant for a tenant-admin request.
 * - Regular tenant admins (`role === 'admin'`) operate on their own `tenantId`.
 * - The Master Admin (`role === 'super_admin'`) may operate on any tenant by
 *   selecting one in the dashboard, which sends an `x-tenant-id` header.
 */
function resolveTenantId(opts: { user: { role: string; tenantId: number | null }; req: { headers: Record<string, unknown> } }): number {
  const { user, req } = opts;

  if (user.role === "super_admin") {
    const header = req.headers["x-tenant-id"];
    const raw = Array.isArray(header) ? header[0] : header;
    const tenantId = Number(raw);
    if (!raw || Number.isNaN(tenantId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Selectează o firmă pentru a o administra (x-tenant-id lipsește).",
      });
    }
    return tenantId;
  }

  if (user.role === "admin") {
    if (user.tenantId == null) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Contul de admin nu este asociat niciunei firme.",
      });
    }
    return user.tenantId;
  }

  throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
}

/**
 * Tenant-scoped admin procedure. Grants access to tenant admins and the Master
 * Admin, and injects the resolved `tenantId` into the context so handlers always
 * operate within a single firm's data.
 */
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || (ctx.user.role !== "admin" && ctx.user.role !== "super_admin")) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    const tenantId = resolveTenantId({ user: ctx.user, req: ctx.req });

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        tenantId,
      },
    });
  }),
);

/** Master Admin only. Used for tenant (firm) management endpoints. */
export const superAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
