import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Save } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";

const DAYS_OF_WEEK = [
  { value: 0, label: "Duminică" },
  { value: 1, label: "Luni" },
  { value: 2, label: "Marți" },
  { value: 3, label: "Miercuri" },
  { value: 4, label: "Joi" },
  { value: 5, label: "Vineri" },
  { value: 6, label: "Sâmbătă" },
];

interface BarberScheduleManagerProps {
  barberId: number;
  barberName: string;
}

interface DaySchedule {
  startTime: string;
  endTime: string;
  isDayOff: boolean;
}

export function BarberScheduleManager({ barberId, barberName }: BarberScheduleManagerProps) {
  const [schedule, setSchedule] = useState<Record<number, DaySchedule>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Calculate dates for the current week
  const getWeekDates = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Start on Sunday
    return DAYS_OF_WEEK.map((day) => addDays(weekStart, day.value));
  };

  const weekDates = getWeekDates();

  // Initialize schedule with default values
  useEffect(() => {
    const initSchedule: Record<number, DaySchedule> = {};
    for (const day of DAYS_OF_WEEK) {
      initSchedule[day.value] = {
        startTime: "09:00",
        endTime: "18:00",
        isDayOff: false,
      };
    }
    setSchedule(initSchedule);
  }, [barberId]);

  const setAvailabilityMutation = trpc.barbers.setAvailability.useMutation();

  const handleTimeChange = (dayOfWeek: number, field: "startTime" | "endTime", value: string) => {
    setSchedule((prev) => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        [field]: value,
      },
    }));
  };

  const handleDayOffChange = (dayOfWeek: number, isDayOff: boolean) => {
    setSchedule((prev) => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        isDayOff,
      },
    }));
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(schedule).map(([dayStr, times]) => {
        const dayOfWeek = parseInt(dayStr);
        return setAvailabilityMutation.mutateAsync({
          barberId,
          dayOfWeek,
          startTime: times.startTime,
          endTime: times.endTime,
          isDayOff: times.isDayOff ? 1 : 0,
        });
      });

      await Promise.all(promises);
      setSaving(false);
    } catch (error) {
      console.error("Error saving schedule:", error);
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Program de Lucru - {barberName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day, index) => {
            const dayDate = weekDates[index];
            const formattedDate = format(dayDate, "dd.MM.yyyy");
            return (
              <div key={day.value} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                <div className="w-32">
                  <Badge variant="outline" className="w-full text-center justify-center flex flex-col gap-1 h-auto py-2">
                    <span className="text-sm font-medium">{day.label}</span>
                    <span className="text-xs font-normal text-muted-foreground">{formattedDate}</span>
                  </Badge>
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-muted-foreground">De la:</span>
                  <Input
                    type="time"
                    value={schedule[day.value]?.startTime || "09:00"}
                    onChange={(e) => handleTimeChange(day.value, "startTime", e.target.value)}
                    disabled={schedule[day.value]?.isDayOff}
                    className="w-24"
                  />

                  <span className="text-sm text-muted-foreground">Până la:</span>
                  <Input
                    type="time"
                    value={schedule[day.value]?.endTime || "18:00"}
                    onChange={(e) => handleTimeChange(day.value, "endTime", e.target.value)}
                    disabled={schedule[day.value]?.isDayOff}
                    className="w-24"
                  />
                </div>

                <Checkbox
                  checked={schedule[day.value]?.isDayOff || false}
                  onCheckedChange={(checked) => handleDayOffChange(day.value, checked as boolean)}
                  id={`dayoff-${day.value}`}
                />
                <label htmlFor={`dayoff-${day.value}`} className="text-sm text-muted-foreground cursor-pointer whitespace-nowrap">
                  Zi Liberă
                </label>
              </div>
            );
          })}

          <Button
            onClick={handleSaveSchedule}
            disabled={saving}
            className="w-full mt-6"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Se salvează..." : "Salvează Program"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
