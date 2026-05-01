import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

const DAYS = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

interface BusinessHours {
  [key: string]: { start: string; end: string } | null;
}

interface ServicePrices {
  tuns: number;
  barbierit: number;
  pachet_complet: number;
}

export default function SettingsPage() {
  // All hooks MUST be called unconditionally at the top
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    mon: { start: "08:00", end: "18:00" },
    tue: { start: "08:00", end: "18:00" },
    wed: { start: "08:00", end: "18:00" },
    thu: { start: "08:00", end: "18:00" },
    fri: { start: "08:00", end: "18:00" },
    sat: { start: "08:00", end: "18:00" },
    sun: null,
  });

  const [servicePrices, setServicePrices] = useState<ServicePrices>({
    tuns: 40,
    barbierit: 35,
    pachet_complet: 65,
  });

  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Query hooks MUST be called unconditionally
  const { data: settings } = trpc.settings.get.useQuery();
  const updateSettingsMutation = trpc.settings.update.useMutation();

  // Load settings from database when available
  useEffect(() => {
    if (settings?.businessHours) {
      try {
        setBusinessHours(JSON.parse(settings.businessHours));
      } catch (e) {
        console.error("Failed to parse business hours:", e);
      }
    }
    if (settings?.servicePrices) {
      try {
        setServicePrices(JSON.parse(settings.servicePrices));
      } catch (e) {
        console.error("Failed to parse service prices:", e);
      }
    }
    if (settings?.closedDays) {
      try {
        setClosedDays(JSON.parse(settings.closedDays));
      } catch (e) {
        console.error("Failed to parse closed days:", e);
      }
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({
        businessHours: JSON.stringify(businessHours),
        servicePrices: JSON.stringify(servicePrices),
        closedDays: JSON.stringify(closedDays),
      });
      toast.success("Setări salvate cu succes!");
    } catch (error) {
      toast.error("Eroare la salvarea setărilor");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBusinessHourChange = (
    day: string,
    field: "start" | "end",
    value: string
  ) => {
    if (value === "") {
      // Disable this day
      setBusinessHours((prev) => ({
        ...prev,
        [day]: null,
      }));
    } else {
      setBusinessHours((prev) => ({
        ...prev,
        [day]: {
          ...(prev[day] || { start: "08:00", end: "18:00" }),
          [field]: value,
        },
      }));
    }
  };

  const handlePriceChange = (service: keyof ServicePrices, value: string) => {
    const numValue = parseFloat(value) || 0;
    setServicePrices((prev) => ({
      ...prev,
      [service]: numValue,
    }));
  };

  // Redirect if not admin - AFTER all hooks
  if (!authLoading && (!user || user.role !== "admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Acces Neautorizat</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Doar administratorii pot accesa setările.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Se încarcă...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/admin")}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Setări</h1>
            <p className="text-muted-foreground">Configurează orele de lucru și prețurile</p>
          </div>
        </div>

        {/* Business Hours Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Program de Lucru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {DAY_KEYS.map((dayKey, index) => (
              <div key={dayKey} className="grid grid-cols-3 gap-4 items-end">
                <Label className="text-sm font-medium">{DAYS[index]}</Label>
                <div>
                  <Label className="text-xs text-muted-foreground">De la</Label>
                  <Input
                    type="time"
                    value={businessHours[dayKey]?.start || "08:00"}
                    onChange={(e) =>
                      handleBusinessHourChange(dayKey, "start", e.target.value)
                    }
                    disabled={businessHours[dayKey] === null}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Până la</Label>
                  <Input
                    type="time"
                    value={businessHours[dayKey]?.end || "18:00"}
                    onChange={(e) =>
                      handleBusinessHourChange(dayKey, "end", e.target.value)
                    }
                    disabled={businessHours[dayKey] === null}
                    className="mt-1"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Service Prices Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Prețuri Servicii</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tuns" className="text-sm font-medium">
                  Tuns (RON)
                </Label>
                <Input
                  id="tuns"
                  type="number"
                  min="0"
                  step="0.01"
                  value={servicePrices.tuns}
                  onChange={(e) => handlePriceChange("tuns", e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="barbierit" className="text-sm font-medium">
                  Bărbierit (RON)
                </Label>
                <Input
                  id="barbierit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={servicePrices.barbierit}
                  onChange={(e) => handlePriceChange("barbierit", e.target.value)}
                  className="mt-2"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="pachet" className="text-sm font-medium">
                  Pachet Complet (RON)
                </Label>
                <Input
                  id="pachet"
                  type="number"
                  min="0"
                  step="0.01"
                  value={servicePrices.pachet_complet}
                  onChange={(e) => handlePriceChange("pachet_complet", e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Closed Days Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Zile Libere (Sărbători, Concediu)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="newClosedDay" className="text-sm font-medium">
                  Adaugă o zi liberă
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="newClosedDay"
                    type="date"
                    placeholder="Selectează data"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const input = e.currentTarget;
                        if (input.value && !closedDays.includes(input.value)) {
                          setClosedDays([...closedDays, input.value].sort());
                          input.value = "";
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                      if (input.value && !closedDays.includes(input.value)) {
                        setClosedDays([...closedDays, input.value].sort());
                        input.value = "";
                      }
                    }}
                    className="whitespace-nowrap"
                  >
                    Adaugă
                  </Button>
                </div>
              </div>

              {closedDays.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Zile libere marcate:</Label>
                  <div className="space-y-2">
                    {closedDays.map((day) => (
                      <div
                        key={day}
                        className="flex items-center justify-between bg-muted p-3 rounded border border-border"
                      >
                        <span className="text-sm">
                          {new Date(day + "T00:00:00").toLocaleDateString("ro-RO", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setClosedDays(closedDays.filter((d) => d !== day))}
                          className="text-destructive hover:text-destructive"
                        >
                          Șterge
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving || updateSettingsMutation.isPending}
            className="flex-1"
          >
            {isSaving || updateSettingsMutation.isPending ? "Se salvează..." : "Salvează Setări"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/admin")}
            className="flex-1"
          >
            Anulează
          </Button>
        </div>
      </div>
    </div>
  );
}
