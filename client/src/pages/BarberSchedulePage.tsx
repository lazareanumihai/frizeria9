import { useState, useEffect, useCallback, useMemo } from "react";
import { format, addDays, startOfWeek, subWeeks, addWeeks } from "date-fns";
import { ro } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Scissors, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import DayColumn from "@/components/schedule/DayColumn";
import { trpc } from "@/lib/trpc";

interface ScheduleData {
  date: string;
  isDayOff: boolean;
  blockedHours: string[];
}

export default function BarberSchedulePage() {
  const [selectedBarberId, setSelectedBarberId] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate.getTime()]
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart.getTime()]
  );

  const startStr = useMemo(() => format(weekStart, "yyyy-MM-dd"), [weekStart]);
  const endStr = useMemo(() => format(addDays(weekStart, 6), "yyyy-MM-dd"), [weekStart]);

  // Fetch barbers
  const { data: barbers = [] } = trpc.barbers.getAll.useQuery();

  // Initialize selected barber
  useEffect(() => {
    if (!selectedBarberId && barbers.length > 0) {
      setSelectedBarberId(barbers[0].id);
    }
  }, [barbers.length, selectedBarberId]);

  // Memoize query input to prevent unnecessary refetches
  const blockedHoursQueryInput = useMemo(
    () =>
      selectedBarberId
        ? {
            barberId: selectedBarberId,
            startDate: startStr,
            endDate: endStr,
          }
        : null,
    [selectedBarberId, startStr, endStr]
  );

  // Fetch blocked hours for the week
  const { data: blockedHoursData = [] } = trpc.barbers.getBlockedHoursByRange.useQuery(
    blockedHoursQueryInput || { barberId: 0, startDate: "", endDate: "" },
    {
      enabled: !!blockedHoursQueryInput,
    }
  );

  // Derive schedules from blocked hours data using useMemo
  const schedules = useMemo(() => {
    const newSchedules: Record<string, ScheduleData> = {};

    // Initialize all days of the week
    weekDays.forEach((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      newSchedules[dateStr] = {
        date: dateStr,
        isDayOff: false,
        blockedHours: [],
      };
    });

    // Add blocked hours from the API
    blockedHoursData.forEach((bh: any) => {
      const dateStr = bh.date;
      if (!newSchedules[dateStr]) {
        newSchedules[dateStr] = {
          date: dateStr,
          isDayOff: false,
          blockedHours: [],
        };
      }
      const hour = String(bh.hour).padStart(2, "0") + ":00";
      if (!newSchedules[dateStr].blockedHours.includes(hour)) {
        newSchedules[dateStr].blockedHours.push(hour);
      }
    });

    return newSchedules;
  }, [blockedHoursData, weekDays]);

  const getScheduleForDate = useCallback(
    (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      return schedules[dateStr];
    },
    [schedules]
  );

  // Mutations for blocking/unblocking hours
  const blockHoursMutation = trpc.barbers.blockHours.useMutation();
  const unblockHoursMutation = trpc.barbers.unblockHours.useMutation();

  const handleToggleDayOff = useCallback(
    async (date: Date) => {
      if (!selectedBarberId) return;

      const dateStr = format(date, "yyyy-MM-dd");
      const schedule = getScheduleForDate(date);
      const newIsDayOff = !schedule?.isDayOff;

      // TODO: Save to backend (requires new endpoint for day-off by date)
      console.log("Day off toggled for:", dateStr, newIsDayOff);
    },
    [selectedBarberId, getScheduleForDate]
  );

  const handleToggleHour = useCallback(
    async (date: Date, hour: string) => {
      if (!selectedBarberId) return;

      const dateStr = format(date, "yyyy-MM-dd");
      const schedule = getScheduleForDate(date);
      const currentBlocked = schedule?.blockedHours || [];

      // Save to backend
      try {
        const hourNum = parseInt(hour.split(":")[0]);
        if (currentBlocked.includes(hour)) {
          // Unblock the hour
          await unblockHoursMutation.mutateAsync({
            barberId: selectedBarberId,
            date: dateStr,
            hours: [hourNum],
          });
        } else {
          // Block the hour
          await blockHoursMutation.mutateAsync({
            barberId: selectedBarberId,
            date: dateStr,
            hours: [hourNum],
          });
        }
      } catch (error) {
        console.error("Failed to save blocked hours:", error);
      }
    },
    [selectedBarberId, getScheduleForDate, blockHoursMutation, unblockHoursMutation]
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with title and barber selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Program de Lucru</h1>
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-muted-foreground" />
          <Select
            value={selectedBarberId?.toString() || ""}
            onValueChange={(val) => setSelectedBarberId(parseInt(val))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selectează frizer" />
            </SelectTrigger>
            <SelectContent>
              {barbers.map((b: any) => (
                <SelectItem key={b.id} value={b.id.toString()}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentDate(new Date())}
        >
          Azi
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium min-w-[220px] text-center">
          {format(weekStart, "d MMM", { locale: ro })} —{" "}
          {format(addDays(weekStart, 6), "d MMM yyyy", { locale: ro })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex gap-6 justify-center text-xs text-muted-foreground mb-6 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-200" />
          Disponibil
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-200" />
          Blocat
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-muted border" />
          Zi liberă
        </div>
      </div>

      {/* Calendar grid */}
      {!selectedBarberId ? (
        <div className="text-center py-20 text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Selectează un frizer pentru a vedea programul</p>
        </div>
      ) : (
        <ScrollArea className="w-full border rounded-lg">
          <div className="grid grid-cols-7 gap-2 p-4 min-w-[900px]">
            {weekDays.map((day) => (
              <DayColumn
                key={day.toISOString()}
                date={day}
                schedule={getScheduleForDate(day)}
                onToggleHour={handleToggleHour}
                onToggleDayOff={handleToggleDayOff}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}
