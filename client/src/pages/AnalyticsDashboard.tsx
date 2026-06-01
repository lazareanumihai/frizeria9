import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, Users, DollarSign, AlertCircle, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#D4AF37", "#F5F0E8", "#8B7355", "#C19A6B", "#A0826D"];

export default function AnalyticsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [selectedBarberId, setSelectedBarberId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  // Fetch all barbers
  const { data: barbers = [] } = trpc.barbers.getAllAdmin.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  // Fetch analytics data
  const { data: barberPerformance, isLoading: performanceLoading } = trpc.analytics.barberPerformance.useQuery({
    barberId: selectedBarberId || undefined,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const { data: bookingTrends, isLoading: trendsLoading } = trpc.analytics.bookingTrends.useQuery({
    period,
    startDate: dateRange.start,
    endDate: dateRange.end,
    barberId: selectedBarberId || undefined,
  });

  const { data: serviceDistribution, isLoading: servicesLoading } = trpc.analytics.serviceDistribution.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
    barberId: selectedBarberId || undefined,
  });

  const { data: heatmapData, isLoading: heatmapLoading } = trpc.analytics.bookingHeatmap.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
    barberId: selectedBarberId || undefined,
  });

  const { data: cancellationRates, isLoading: cancellationLoading } = trpc.analytics.cancellationRate.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
    barberId: selectedBarberId || undefined,
  });

  // Redirect if not admin
  if (!authLoading && (!user || user.role !== "admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Acces Neautorizat</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Doar administratorii pot accesa acest panou. Contactează proprietarul frizeiei.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!barberPerformance || barberPerformance.length === 0) {
      return {
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        totalRevenue: 0,
        completionRate: 0,
      };
    }

    const totals = barberPerformance.reduce(
      (acc, metric) => ({
        totalBookings: acc.totalBookings + metric.totalBookings,
        completedBookings: acc.completedBookings + metric.completedBookings,
        cancelledBookings: acc.cancelledBookings + metric.cancelledBookings,
        totalRevenue: acc.totalRevenue + metric.totalRevenue,
      }),
      { totalBookings: 0, completedBookings: 0, cancelledBookings: 0, totalRevenue: 0 }
    );

    return {
      ...totals,
      completionRate: totals.totalBookings > 0 ? (totals.completedBookings / totals.totalBookings) * 100 : 0,
    };
  }, [barberPerformance]);

  // Format heatmap data for visualization
  const heatmapChartData = useMemo(() => {
    if (!heatmapData) return [];

    const dayNames = ["Dum", "Lun", "Mar", "Mie", "Joi", "Vin", "Sâm"];
    const grouped: Record<string, any> = {};

    for (let hour = 8; hour <= 18; hour++) {
      const hourData: any = { hour: `${hour}:00` };
      for (let day = 0; day < 7; day++) {
        const found = heatmapData.find((h) => h.dayOfWeek === day && h.hour === hour);
        hourData[dayNames[day]] = found?.bookingCount || 0;
      }
      grouped[hour] = hourData;
    }

    return Object.values(grouped);
  }, [heatmapData]);

  const handleDateChange = (days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    setDateRange({ start, end });
  };

  const selectedBarberName = selectedBarberId 
    ? barbers.find(b => b.id === selectedBarberId)?.name 
    : "Toți friezerii";

  const isLoading = performanceLoading || trendsLoading || servicesLoading || heatmapLoading || cancellationLoading;

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/admin")}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Înapoi
            </Button>
          </div>
          <h1 className="text-4xl font-bold mb-2">Analitica și Performanță</h1>
          <p className="text-muted-foreground">Urmărește performanța frierilor și tendințele de programare</p>
        </div>

        {/* Barber Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Selectează Frierul</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant={selectedBarberId === null ? "default" : "outline"}
                onClick={() => setSelectedBarberId(null)}
                className="gap-2"
              >
                Toți friezerii
              </Button>
              {barbers.map((barber) => (
                <Button
                  key={barber.id}
                  variant={selectedBarberId === barber.id ? "default" : "outline"}
                  onClick={() => setSelectedBarberId(barber.id)}
                  className="gap-2 h-auto py-2"
                >
                  {barber.photoUrl && (
                    <img
                      src={barber.photoUrl}
                      alt={barber.name}
                      className="w-8 h-8 object-cover rounded"
                    />
                  )}
                  {barber.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Perioada de Timp</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={period === "daily" ? "default" : "outline"}
                  onClick={() => setPeriod("daily")}
                >
                  Zilnic
                </Button>
                <Button
                  size="sm"
                  variant={period === "weekly" ? "default" : "outline"}
                  onClick={() => setPeriod("weekly")}
                >
                  Săptămânal
                </Button>
                <Button
                  size="sm"
                  variant={period === "monthly" ? "default" : "outline"}
                  onClick={() => setPeriod("monthly")}
                >
                  Lunar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Interval de Date</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleDateChange(7)}>
                  7 zile
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDateChange(30)}>
                  30 zile
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDateChange(90)}>
                  90 zile
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Perioada Selectată</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {dateRange.start.toLocaleDateString("ro-RO")} - {dateRange.end.toLocaleDateString("ro-RO")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Total Programări
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryMetrics.totalBookings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Finalizate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summaryMetrics.completedBookings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Anulate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summaryMetrics.cancelledBookings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Venituri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summaryMetrics.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Rata Finalizare
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryMetrics.completionRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="h-80 animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                </CardHeader>
                <CardContent className="h-64 bg-muted rounded"></CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Booking Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Tendințe de Programare</CardTitle>
                <CardDescription>Programări în timp</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={bookingTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="totalBookings" stroke="#D4AF37" name="Total" />
                    <Line type="monotone" dataKey="completedBookings" stroke="#4CAF50" name="Finalizate" />
                    <Line type="monotone" dataKey="cancelledBookings" stroke="#FF6B6B" name="Anulate" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Tendințe de Venituri</CardTitle>
                <CardDescription>Venituri în timp</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={bookingTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#D4AF37" name="Venituri" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Service Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuția Serviciilor</CardTitle>
                <CardDescription>Programări după tip de serviciu</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={serviceDistribution || []}
                      dataKey="bookingCount"
                      nameKey="serviceName"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {(serviceDistribution || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Barber Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Performanța Frierilor</CardTitle>
                <CardDescription>Programări după frizer</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barberPerformance || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="barberId" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalBookings" fill="#D4AF37" name="Total" />
                    <Bar dataKey="completedBookings" fill="#4CAF50" name="Finalizate" />
                    <Bar dataKey="cancelledBookings" fill="#FF6B6B" name="Anulate" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cancellation Rates */}
            <Card>
              <CardHeader>
                <CardTitle>Rate de Anulare</CardTitle>
                <CardDescription>Rata de anulare după frizer</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={cancellationRates || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="barberId" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="cancellationRate" fill="#FF6B6B" name="Rata Anulare %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Booking Heatmap */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Hartă de Ocupare</CardTitle>
                <CardDescription>Orele cu cea mai mare ocupare după zi și oră</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Ora</th>
                        <th className="text-center p-2">Dum</th>
                        <th className="text-center p-2">Lun</th>
                        <th className="text-center p-2">Mar</th>
                        <th className="text-center p-2">Mie</th>
                        <th className="text-center p-2">Joi</th>
                        <th className="text-center p-2">Vin</th>
                        <th className="text-center p-2">Sâm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapChartData.map((row: any, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted">
                          <td className="p-2 font-medium">{row.hour}</td>
                          {["Dum", "Lun", "Mar", "Mie", "Joi", "Vin", "Sâm"].map((day) => (
                            <td
                              key={day}
                              className="text-center p-2"
                              style={{
                                backgroundColor: `rgba(212, 175, 55, ${(row[day] || 0) / 10})`,
                              }}
                            >
                              {row[day] || 0}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
