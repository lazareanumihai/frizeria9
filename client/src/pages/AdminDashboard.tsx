import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Trash2, CheckCircle2, Clock, X } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { ro } from "date-fns/locale";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Panou Admin - Frizeria 9</h1>
          <p className="text-muted-foreground">Gestionează programările clienților în timp real</p>
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

        {/* Bookings List */}
        <BookingsList selectedDate={selectedDate} onDeleteConfirm={setDeleteConfirm} />

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
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
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
    <div className="space-y-4">
      {bookings.map((booking) => (
        <Card key={booking.id} className="hover:border-primary/50 transition-colors">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left side - Client info */}
              <div>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-1">Nume client</p>
                  <p className="text-lg font-semibold text-foreground">{booking.clientName}</p>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-1">Telefon</p>
                  <a
                    href={`tel:${booking.clientPhone}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {booking.clientPhone}
                  </a>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Serviciu</p>
                  <p className="font-medium text-foreground">
                    {booking.serviceType === "tuns"
                      ? "Tuns"
                      : booking.serviceType === "barbierit"
                      ? "Bărbierit"
                      : "Pachet Complet"}
                    {booking.price && ` - ${booking.price} RON`}
                  </p>
                </div>
              </div>

              {/* Right side - Time and actions */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-1">Ora</p>
                    <p className="text-2xl font-bold text-primary">{booking.bookingTime}</p>
                  </div>
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2">Status</p>
                    <StatusBadge status={booking.status} />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  {booking.status !== "confirmed" && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() =>
                        updateStatusMutation.mutate({
                          bookingId: booking.id,
                          status: "confirmed",
                        })
                      }
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Confirma
                    </Button>
                  )}
                  {booking.status !== "completed" && booking.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateStatusMutation.mutate({
                          bookingId: booking.id,
                          status: "completed",
                        })
                      }
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Finalizează
                    </Button>
                  )}
                  {booking.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        updateStatusMutation.mutate({
                          bookingId: booking.id,
                          status: "cancelled",
                        })
                      }
                      disabled={updateStatusMutation.isPending}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Anulează
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      deleteMutation.mutate({ bookingId: booking.id });
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {booking.notes && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-1">Note</p>
                <p className="text-sm text-foreground">{booking.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
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
    <Badge className={`${variant.className} border`}>
      {variant.icon}
      <span className="ml-1">{variant.label}</span>
    </Badge>
  );
}
