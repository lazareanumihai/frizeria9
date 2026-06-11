import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TenantSlugProvider } from "./contexts/TenantContext";
import { trpc } from "@/lib/trpc";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import SettingsPage from "./pages/SettingsPage";
import ServicesPage from "./pages/ServicesPage";
import BarberManagementPage from "./pages/BarberManagementPage";
import LoginPage from "./pages/LoginPage";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import Contact from "./pages/Contact";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";

// Default firm shown at the bare root URL, preserving the original single-tenant
// entry point (http://host:3003 -> the original salon).
const DEFAULT_SLUG = "frizeria9";

/**
 * Validates that a firm slug exists before rendering its public site, and makes
 * the slug available to child pages via context. Shows a 404 for unknown firms.
 */
function PublicSite({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { data: tenant, isLoading } = trpc.tenants.getBySlug.useQuery({ slug });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!tenant) {
    return <NotFound />;
  }

  return <TenantSlugProvider slug={slug}>{children}</TenantSlugProvider>;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        {() => {
          window.location.replace(`/${DEFAULT_SLUG}`);
          return null;
        }}
      </Route>
      <Route path="/login" component={LoginPage} />
      <Route path="/super-admin" component={SuperAdminDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/settings" component={SettingsPage} />
      <Route path="/admin/services" component={ServicesPage} />
      <Route path="/admin/barbers" component={BarberManagementPage} />
      <Route path="/admin/analytics" component={AnalyticsDashboard} />
      <Route path="/404" component={NotFound} />
      <Route path="/:slug/contact">
        {(params) => (
          <PublicSite slug={params.slug}>
            <Contact />
          </PublicSite>
        )}
      </Route>
      <Route path="/:slug">
        {(params) => (
          <PublicSite slug={params.slug}>
            <Home />
          </PublicSite>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "oklch(0.14 0.006 285)",
                border: "1px solid oklch(1 0 0 / 10%)",
                color: "oklch(0.96 0.015 80)",
                fontFamily: "'Raleway', sans-serif",
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
