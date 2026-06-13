import { createContext, useContext } from "react";

/**
 * Provides the current firm's URL slug to the public site pages, so tRPC
 * queries can scope data to the correct tenant (firm). The slug comes from the
 * /:slug route segment.
 */
const TenantSlugContext = createContext<string | null>(null);

export function TenantSlugProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  return <TenantSlugContext.Provider value={slug}>{children}</TenantSlugContext.Provider>;
}

/** Returns the current tenant slug. Throws if used outside a public site route. */
export function useTenantSlug(): string {
  const slug = useContext(TenantSlugContext);
  if (!slug) {
    throw new Error("useTenantSlug must be used within a TenantSlugProvider");
  }
  return slug;
}
