import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Trash2, CheckCircle2, Clock, X, Settings } from "lucide-react";
import { format, addDays } from "date-fns";
import { ro } from "date-fns/locale";
import { useLocation } from "wouter";

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30",
];

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Initialize with today's date at midnight (local time)
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [selectedDate, setSelectedDate] = useState(todayMidnight);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Panou Admin - Frizeria 9</h1>
            <p className="text-muted-foreground">Gestionează programările clienților în timp real</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/admin/settings")}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Setări
          </Button>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-6 bg-card p-4 rounded-lg border border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">
              {format(selectedDate, "EEEE, d MMMM yyyy", { locale: ro })}
            </h2>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Split Layout: List + Visual Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Bookings List */}
          <div className="lg:col-span-1">
            <BookingsList selectedDate={selectedDate} onDeleteConfirm={setDeleteConfirm} />
          </div>

          {/* Right: Visual Schedule Grid */}
          <div className="lg:col-span-2">
            <VisualSchedule selectedDate={selectedDate} />
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Șterge programarea?</AlertDialogTitle>
              <AlertDialogDescription>
                Această acțiune nu poate fi anulată. Programarea va fi ștearsă permanent.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Anulează</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteConfirm !== null) {
                    // Delete logic will be handled in the component
                  }
                }}
              >
                Șterge
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function BookingsList({
  selectedDate,
  onDeleteConfirm,
}: {
  selectedDate: Date;
  onDeleteConfirm: (id: number) => void;
}) {
  const { data: bookings, isLoading, refetch } = trpc.bookings.getByDate.useQuery({
    date: selectedDate,
  });

  const updateStatusMutation = trpc.bookings.updateStatus.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteMutation = trpc.bookings.delete.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Nu sunt programări pentru această dată</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg">Programări ({bookings.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
        {bookings.map((booking) => (
          <div key={booking.id} className="p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-semibold text-sm text-foreground">{booking.clientName}</p>
                <p className="text-xs text-muted-foreground">{booking.bookingTime}</p>
              </div>
              <StatusBadge status={booking.status} />
            </div>

            <p className="text-xs text-muted-foreground mb-2">
              {booking.serviceType === "tuns"
                ? "Tuns"
                : booking.serviceType === "barbierit"
                ? "Bărbierit"
                : "Pachet Complet"}
            </p>

            <div className="flex gap-1 flex-wrap">
              {booking.status === "pending" && (
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs px-2"
                  onClick={() =>
                    updateStatusMutation.mutate({
                      bookingId: booking.id,
                      status: "confirmed",
                    })
                  }
                  disabled={updateStatusMutation.isPending}
                >
                  Confirma
                </Button>
              )}
              {booking.status === "confirmed" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2"
                  onClick={() =>
                    updateStatusMutation.mutate({
                      bookingId: booking.id,
                      status: "completed",
                    })
                  }
                  disabled={updateStatusMutation.isPending}
                >
                  Finalizează
                </Button>
              )}
              {booking.status !== "cancelled" && booking.status !== "completed" && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs px-2"
                  onClick={() =>
                    updateStatusMutation.mutate({
                      bookingId: booking.id,
                      status: "cancelled",
                    })
                  }
                  disabled={updateStatusMutation.isPending}
                >
                  Anulează
                </Button>
              )}
              {booking.status !== "completed" && booking.status !== "cancelled" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-1"
                  onClick={() => {
                    deleteMutation.mutate({ bookingId: booking.id });
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function VisualSchedule({ selectedDate }: { selectedDate: Date }) {
  const { data: bookings, isLoading } = trpc.bookings.getByDate.useQuery({
    date: selectedDate,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  // Create a map of occupied slots
  const occupiedMap = new Map<string, any>();
  if (bookings) {
    bookings.forEach((booking) => {
      occupiedMap.set(booking.bookingTime, booking);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Orar Zilei</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {TIME_SLOTS.map((slot) => {
            const booking = occupiedMap.get(slot);
            const isOccupied = !!booking;

            return (
              <div
                key={slot}
                className={`p-3 rounded-lg border-2 transition-all ${
                  isOccupied
                    ? "border-red-500 bg-red-500/10"
                    : "border-green-500 bg-green-500/10"
                }`}
              >
                <p className="text-sm font-semibold text-foreground text-center mb-1">
                  {slot}
                </p>
                {isOccupied ? (
                  <div className="text-xs text-center">
                    <p className="font-medium text-red-700 truncate">
                      {booking.clientName.split(" ")[0]}
                    </p>
                    <p className="text-red-600 text-xs">
                      {booking.serviceType === "tuns"
                        ? "Tuns"
                        : booking.serviceType === "barbierit"
                        ? "Bărbierit"
                        : "Pachet"}
                    </p>
                    <StatusBadgeSmall status={booking.status} />
                  </div>
                ) : (
                  <p className="text-xs text-center text-green-600 font-medium">Liber</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-border flex gap-6 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-500/10" />
            <span className="text-xs text-muted-foreground">Liber</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-red-500 bg-red-500/10" />
            <span className="text-xs text-muted-foreground">Ocupat</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pending: {
      label: "În așteptare",
      className: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
      icon: <Clock className="w-3 h-3" />,
    },
    confirmed: {
      label: "Confirmată",
      className: "bg-blue-500/10 text-blue-700 border-blue-200",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    completed: {
      label: "Finalizată",
      className: "bg-green-500/10 text-green-700 border-green-200",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    cancelled: {
      label: "Anulată",
      className: "bg-red-500/10 text-red-700 border-red-200",
      icon: <X className="w-3 h-3" />,
    },
  };

  const variant = variants[status] || variants.pending;

  return (
    <Badge className={`${variant.className} border text-xs`}>
      {variant.icon}
      <span className="ml-1">{variant.label}</span>
    </Badge>
  );
}

function StatusBadgeSmall({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-yellow-600 text-yellow-100",
    confirmed: "bg-blue-600 text-blue-100",
    completed: "bg-green-600 text-green-100",
    cancelled: "bg-red-600 text-red-100",
  };

  const labels: Record<string, string> = {
    pending: "Aștept",
    confirmed: "Conf.",
    completed: "Finalizat",
    cancelled: "Anulat",
  };

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${variants[status] || variants.pending}`}>
      {labels[status] || "Aștept"}
    </span>
  );
}
