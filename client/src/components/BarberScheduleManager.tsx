import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Save } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Fetch current schedule for all days - memoize to prevent recreating on every render
  const queries = useMemo(
    () =>
      DAYS_OF_WEEK.map((day) =>
        trpc.barbers.getAvailability.useQuery({ barberId, dayOfWeek: day.value })
      ),
    [barberId]
  );

  useEffect(() => {
    if (initialized) return; // Only run once

    const newSchedule: Record<number, DaySchedule> = {};
    let allLoaded = true;

    queries.forEach((query, index) => {
      if (query.isLoading) {
        allLoaded = false;
      } else if (query.data && Array.isArray(query.data) && query.data.length > 0) {
        // query.data is an array, get the first element
        const availability = query.data[0];
        newSchedule[DAYS_OF_WEEK[index].value] = {
          startTime: availability.startTime || "09:00",
          endTime: availability.endTime || "18:00",
          isDayOff: Boolean(availability.isDayOff),
        };
      } else {
        // Default hours if no schedule set
        newSchedule[DAYS_OF_WEEK[index].value] = {
          startTime: "09:00",
          endTime: "18:00",
          isDayOff: false,
        };
      }
    });

    if (allLoaded) {
      setSchedule(newSchedule);
      setLoading(false);
      setInitialized(true);
    }
  }, [queries, initialized]);

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

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Se încarcă program...</p>
        </CardContent>
      </Card>
    );
  }

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
          {DAYS_OF_WEEK.map((day) => (
            <div key={day.value} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <div className="w-24">
                <Badge variant="outline" className="w-full text-center justify-center">
                  {day.label}
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
          ))}

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
