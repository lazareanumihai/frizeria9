import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock } from "lucide-react";

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30",
];

interface VisualScheduleWithBlockedHoursProps {
  selectedDate: Date;
  selectedBarberId: number | null;
  getServiceName: (serviceType: string) => string;
}

export function VisualScheduleWithBlockedHours({
  selectedDate,
  selectedBarberId,
  getServiceName,
}: VisualScheduleWithBlockedHoursProps) {
  const [selectedHours, setSelectedHours] = useState<Set<string>>(new Set());
  const [blockingMode, setBlockingMode] = useState(false);

  const { data: bookings, isLoading } = selectedBarberId
    ? trpc.bookings.getByBarberAndDate.useQuery({
        barberId: selectedBarberId,
        date: selectedDate,
      })
    : trpc.bookings.getByDate.useQuery({
        date: selectedDate,
      });

  const blockMutation = trpc.barbers.blockHours.useMutation();
  const unblockMutation = trpc.barbers.unblockHours.useMutation();

  const dateStr = selectedDate.toISOString().split("T")[0];
  const { data: blockedHours = [] } = selectedBarberId
    ? trpc.barbers.getBlockedHours.useQuery({
        barberId: selectedBarberId,
        date: dateStr,
      })
    : { data: [] };

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
    bookings.forEach((booking: any) => {
      occupiedMap.set(booking.bookingTime, booking);
    });
  }

  const blockedHoursSet = new Set(
    blockedHours.map((bh: any) => `${String(bh.hour).padStart(2, "0")}:00`)
  );

  const handleHourClick = (slot: string) => {
    if (!blockingMode || !selectedBarberId) return;

    const newSelected = new Set(selectedHours);
    if (newSelected.has(slot)) {
      newSelected.delete(slot);
    } else {
      newSelected.add(slot);
    }
    setSelectedHours(newSelected);
  };

  const handleBlockHours = async () => {
    if (!selectedBarberId || selectedHours.size === 0) return;

    const hours = Array.from(selectedHours).map((slot) =>
      parseInt(slot.split(":")[0])
    );

    try {
      await blockMutation.mutateAsync({
        barberId: selectedBarberId,
        date: dateStr,
        hours,
      });
      setSelectedHours(new Set());
      setBlockingMode(false);
    } catch (error) {
      console.error("Failed to block hours:", error);
    }
  };

  const handleUnblockHour = async (slot: string) => {
    if (!selectedBarberId) return;

    const hour = parseInt(slot.split(":")[0]);

    try {
      await unblockMutation.mutateAsync({
        barberId: selectedBarberId,
        date: dateStr,
        hours: [hour],
      });
    } catch (error) {
      console.error("Failed to unblock hour:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Orar Zilei</CardTitle>
          {selectedBarberId && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={blockingMode ? "default" : "outline"}
                onClick={() => {
                  setBlockingMode(!blockingMode);
                  setSelectedHours(new Set());
                }}
                className="gap-2"
              >
                <Lock className="w-4 h-4" />
                {blockingMode ? "Anulează" : "Blochează ore"}
              </Button>
              {blockingMode && selectedHours.size > 0 && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleBlockHours}
                  disabled={blockMutation.isPending}
                  className="gap-2"
                >
                  Confirmă ({selectedHours.size})
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {TIME_SLOTS.map((slot) => {
            const booking = occupiedMap.get(slot);
            const isOccupied = !!booking;
            const isBlocked = blockedHoursSet.has(slot);
            const isSelected = selectedHours.has(slot);

            return (
              <div
                key={slot}
                onClick={() => handleHourClick(slot)}
                className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                  isBlocked
                    ? "border-purple-500 bg-purple-500/10"
                    : isOccupied
                    ? "border-red-500 bg-red-500/10"
                    : isSelected
                    ? "border-yellow-500 bg-yellow-500/20"
                    : "border-green-500 bg-green-500/10"
                } ${blockingMode && !isOccupied ? "hover:opacity-80" : ""}`}
              >
                <p className="text-sm font-semibold text-foreground text-center mb-1">
                  {slot}
                </p>
                {isBlocked ? (
                  <div className="text-xs text-center">
                    <Lock className="w-3 h-3 mx-auto mb-1 text-purple-600" />
                    <p className="text-purple-600 font-medium">Blocat</p>
                    {!blockingMode && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 text-xs px-1 mt-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnblockHour(slot);
                        }}
                        disabled={unblockMutation.isPending}
                      >
                        <Unlock className="w-2 h-2" />
                      </Button>
                    )}
                  </div>
                ) : isOccupied ? (
                  <div className="text-xs text-center">
                    <p className="font-medium text-red-700 truncate">
                      {booking.clientName.split(" ")[0]}
                    </p>
                    <p className="text-red-600 text-xs">
                      {getServiceName(booking.serviceType)}
                    </p>
                    <StatusBadgeSmall status={booking.status} />
                  </div>
                ) : (
                  <p className="text-xs text-center text-green-600 font-medium">
                    {blockingMode && isSelected ? "Selectat" : "Liber"}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-border flex gap-6 justify-center flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-500/10" />
            <span className="text-xs text-muted-foreground">Liber</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-red-500 bg-red-500/10" />
            <span className="text-xs text-muted-foreground">Ocupat</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-purple-500 bg-purple-500/10" />
            <span className="text-xs text-muted-foreground">Blocat</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-yellow-500 bg-yellow-500/20" />
            <span className="text-xs text-muted-foreground">Selectat</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadgeSmall({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-yellow-600 text-yellow-100",
    confirmed: "bg-blue-600 text-blue-100",
    completed: "bg-green-600 text-green-100",
    cancelled: "bg-red-600 text-red-100",
  };

  return (
    <Badge className={`${variants[status] || variants.pending} text-xs mt-1`}>
      {status === "pending"
        ? "În așteptare"
        : status === "confirmed"
        ? "Confirmată"
        : status === "completed"
        ? "Finalizată"
        : "Anulată"}
    </Badge>
  );
}
