import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2, Plus, ExternalLink, LogOut } from "lucide-react";
import { toast } from "sonner";

/** Turn a free-text company name into a URL-safe slug suggestion. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function SuperAdminDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const utils = trpc.useUtils();

  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const tenantsQuery = trpc.tenants.list.useQuery(undefined, {
    enabled: !!user && user.role === "super_admin",
  });

  const createMutation = trpc.tenants.create.useMutation({
    onSuccess: () => {
      toast.success("Firmă creată cu succes!");
      setCompanyName("");
      setSlug("");
      setSlugTouched(false);
      setAdminEmail("");
      setAdminPassword("");
      utils.tenants.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Eroare la crearea firmei"),
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "super_admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Acces Neautorizat</CardTitle>
            <CardDescription>Doar Master Admin poate accesa acest panou.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ companyName, slug, adminEmail, adminPassword });
  };

  const manageTenant = (tenantId: number) => {
    window.localStorage.setItem("selectedTenantId", String(tenantId));
    window.location.href = "/admin";
  };

  const tenants = tenantsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1 flex items-center gap-2">
              <Building2 className="w-7 h-7" /> Master Admin
            </h1>
            <p className="text-muted-foreground">Gestionează firmele (saloanele) din platformă</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => logout()}>
            <LogOut className="w-4 h-4" /> Deconectare
          </Button>
        </div>

        <div className="grid gap-8 md:grid-cols-[380px_1fr]">
          {/* Create firm form */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Plus className="w-5 h-5" /> Adaugă firmă nouă
              </CardTitle>
              <CardDescription>Creează un salon și contul de administrator asociat.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nume firmă</label>
                  <Input
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      if (!slugTouched) setSlug(slugify(e.target.value));
                    }}
                    placeholder="Frizeria Centrală"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Slug URL</label>
                  <Input
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(slugify(e.target.value));
                    }}
                    placeholder="frizeria-centrala"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Site public: /{slug || "slug"}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email admin</label>
                  <Input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@firma.ro"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Parolă admin</label>
                  <Input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Creează firmă
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Firms overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Firme înregistrate ({tenants.length})</CardTitle>
              <CardDescription>Număr de frizeri activi și abonamentul lunar.</CardDescription>
            </CardHeader>
            <CardContent>
              {tenantsQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : tenants.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nicio firmă încă. Adaugă prima firmă din formular.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Firmă</th>
                        <th className="py-2 pr-4 font-medium">Email admin</th>
                        <th className="py-2 pr-4 font-medium">Frizeri</th>
                        <th className="py-2 pr-4 font-medium">Abonament</th>
                        <th className="py-2 pr-4 font-medium">Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenants.map((t) => (
                        <tr key={t.id} className="border-b border-border/50">
                          <td className="py-3 pr-4">
                            <div className="font-medium text-foreground">{t.name}</div>
                            <div className="text-xs text-muted-foreground">/{t.slug}</div>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{t.adminEmail || "—"}</td>
                          <td className="py-3 pr-4">{t.activeBarbers}</td>
                          <td className="py-3 pr-4 font-medium">
                            {t.activeBarbers} {t.activeBarbers === 1 ? "frizer" : "frizeri"} - {t.monthlyTotal} RON/lună
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => manageTenant(t.id)}>
                                Administrează
                              </Button>
                              <a
                                href={`/${t.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" /> Site
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
