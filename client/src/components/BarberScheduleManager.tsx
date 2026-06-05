import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { ro } from "date-fns/locale";
import { toast } from "sonner";

const HOURS = Array.from({ length: 13 }, (_, i) => `${String(8 + i).padStart(2, "0")}:00`); // 08:00 to 20:00
const DAY_LABELS = ["LUN", "MAR", "MIE", "JOI", "VIN", "SÂM", "DUM"];

interface BarberScheduleManagerProps {
  barberId: number;
  barberName: string;
  onClose: () => void;
}

interface DaySchedule {
  startTime: string;
  endTime: string;
  isDayOff: boolean;
}

export function BarberScheduleManager({
  barberId,
  barberName,
  onClose,
}: BarberScheduleManagerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState<Record<number, DaySchedule>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  // Get week start (Monday)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const setAvailabilityMutation = trpc.barbers.setAvailability.useMutation();

  // Load existing schedule from database
  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const loadedSchedule: Record<number, DaySchedule> = {};

        // Initialize with default values for all 7 days
        for (let i = 0; i < 7; i++) {
          loadedSchedule[i] = {
            startTime: "09:00",
            endTime: "18:00",
            isDayOff: false,
          };
        }

        // Load data for each day of the week
        const promises = weekDays.map(async (date, index) => {
          const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1; // Convert to 0-6 (Mon-Sun)
          try {
            const response = await fetch(
              `/api/trpc/barbers.getAvailability?input=${JSON.stringify({
                barberId,
                dayOfWeek,
              })}`
            );
            const data = await response.json();

            if (data.result?.data && Array.isArray(data.result.data) && data.result.data.length > 0) {
              const availability = data.result.data[0];
              loadedSchedule[index] = {
                startTime: availability.startTime || "09:00",
                endTime: availability.endTime || "18:00",
                isDayOff: availability.isDayOff === 1,
              };
            }
          } catch (err) {
            console.error(`Error loading day ${dayOfWeek}:`, err);
          }
        });

        await Promise.all(promises);
        setSchedule(loadedSchedule);
        setLoading(false);
      } catch (error) {
        console.error("Error loading schedule:", error);
        setLoading(false);
      }
    };

    loadSchedule();
  }, [barberId, weekDays.map(d => d.toDateString()).join(',')]);

  const handleDayOffChange = (dayIndex: number, isDayOff: boolean) => {
    setSchedule((prev) => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        isDayOff,
      },
    }));
    setSaveStatus("idle");
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    setSaveStatus("saving");

    try {
      const promises = weekDays.map(async (date, dayIndex) => {
        const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1;
        const daySchedule = schedule[dayIndex];

        return setAvailabilityMutation.mutateAsync({
          barberId,
          dayOfWeek,
          startTime: daySchedule.isDayOff ? "00:00" : daySchedule.startTime,
          endTime: daySchedule.isDayOff ? "00:00" : daySchedule.endTime,
          isDayOff: daySchedule.isDayOff ? 1 : 0,
        });
      });

      await Promise.all(promises);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      console.error("Error saving schedule:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setSaving(false);
    }
  };

  const weekLabel = `${format(weekStart, "d MMM", { locale: ro })} — ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: ro })}`;

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6 bg-background rounded-lg border border-border">
        <div className="text-center text-muted-foreground py-8">Se încarcă program...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-background rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Program
          </h2>
          <p className="text-sm text-muted-foreground">Programul lui {barberName}</p>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6 bg-muted p-4 rounded-lg">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="text-center">
          <div className="text-sm font-semibold text-foreground">{weekLabel}</div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex gap-6 mb-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span className="text-foreground">Disponibil</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-pink-100 border border-pink-300 rounded"></div>
          <span className="text-foreground">Blocat</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
          <span className="text-foreground">Zi liberă</span>
        </div>
      </div>

      {/* Status Messages */}
      {saveStatus === "success" && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded text-sm text-green-700 flex items-center gap-2">
          ✓ Programul a fost salvat cu succes!
        </div>
      )}
      {saveStatus === "error" && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-sm text-red-700 flex items-center gap-2">
          ✗ Eroare la salvare. Încercați din nou.
        </div>
      )}

      {/* Calendar Grid */}
      <div className="overflow-x-auto mb-6 border border-border rounded-lg">
        <div className="grid grid-cols-7 gap-0 min-w-max">
          {weekDays.map((date, dayIndex) => {
            const daySchedule = schedule[dayIndex];
            const isDayOff = daySchedule?.isDayOff || false;
            const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

            return (
              <div
                key={dayIndex}
                className={`border-r border-b border-border p-3 min-w-[180px] ${
                  isToday ? "bg-amber-50" : "bg-background"
                } ${isDayOff ? "bg-gray-100" : ""} ${dayIndex === 6 ? "border-r-0" : ""}`}
              >
                {/* Day Header */}
                <div className="mb-3 pb-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {DAY_LABELS[dayIndex]} {format(date, "d")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(date, "dd.MM.yyyy")}
                      </div>
                    </div>
                  </div>

                  {/* Day Off Toggle */}
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDayOff}
                      onChange={(e) => handleDayOffChange(dayIndex, e.target.checked)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-xs text-foreground font-medium">Zi liberă</span>
                  </label>
                </div>

                {/* Time Slots */}
                <div className="space-y-0.5 max-h-96 overflow-y-auto">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className={`text-xs py-1 px-2 rounded text-center font-medium ${
                        isDayOff
                          ? "bg-gray-200 text-gray-500"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {hour}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Înapoi
        </Button>
        <Button
          onClick={handleSaveSchedule}
          disabled={saving || saveStatus === "saving"}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {saving || saveStatus === "saving" ? "Se salvează..." : "Salvează Program"}
        </Button>
      </div>
    </div>
  );
}
