import { format, isToday, isBefore, startOfDay } from "date-fns";
import { ro } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { CalendarOff } from "lucide-react";

const HOURS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00",
];

interface DayColumnProps {
  date: Date;
  schedule?: {
    isDayOff?: boolean;
    blockedHours?: string[];
  };
  onToggleHour: (date: Date, hour: string) => void;
  onToggleDayOff: (date: Date) => void;
}

export default function DayColumn({
  date,
  schedule,
  onToggleHour,
  onToggleDayOff,
}: DayColumnProps) {
  const today = isToday(date);
  const past = isBefore(startOfDay(date), startOfDay(new Date()));
  const isDayOff = schedule?.isDayOff || false;
  const blockedHours = schedule?.blockedHours || [];

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border min-w-[120px]",
        today ? "border-yellow-400/50 bg-yellow-50/30" : "border-border/50 bg-card",
        past && "opacity-60"
      )}
    >
      {/* Header with day name, date, and day-off toggle */}
      <div className="px-3 py-3 border-b text-center">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {format(date, "EEE", { locale: ro })}
        </p>
        <p className={cn("text-lg font-semibold", today && "text-yellow-500")}>
          {format(date, "d")}
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-[10px] text-muted-foreground">Zi liberă</span>
          <Switch
            checked={isDayOff}
            onCheckedChange={() => onToggleDayOff(date)}
            className="scale-75"
            disabled={past}
          />
        </div>
      </div>

      {/* Hours grid */}
      <div className="flex-1 p-1.5 space-y-1">
        {isDayOff ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CalendarOff className="w-6 h-6 mb-2 opacity-50" />
            <span className="text-xs">Liber</span>
          </div>
        ) : (
          HOURS.map((hour) => {
            const isBlocked = blockedHours.includes(hour);
            return (
              <button
                key={hour}
                disabled={past}
                onClick={() => onToggleHour(date, hour)}
                className={cn(
                  "w-full px-2 py-1.5 rounded-lg text-xs font-medium transition-all",
                  isBlocked
                    ? "bg-red-100 text-red-600 line-through hover:bg-red-200"
                    : "bg-green-100 text-green-700 hover:bg-green-200",
                  past && "cursor-not-allowed"
                )}
              >
                {hour}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
