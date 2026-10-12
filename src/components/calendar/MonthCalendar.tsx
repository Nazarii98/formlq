"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Lesson } from "@/lib/lessons";
import { IconButton } from "@/components/ui/icon-button";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
const MONTHS = [
  "Січень",
  "Лютий",
  "Березень",
  "Квітень",
  "Травень",
  "Червень",
  "Липень",
  "Серпень",
  "Вересень",
  "Жовтень",
  "Листопад",
  "Грудень",
];

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** "16:00" — lesson start time. */
export function formatLessonTime(ts: Lesson["start"]) {
  return ts.toDate().toLocaleTimeString("uk", { hour: "2-digit", minute: "2-digit" });
}

interface MonthCalendarProps {
  lessons: Lesson[];
  onSelectDay?: (date: Date) => void;
  onSelectLesson?: (lesson: Lesson) => void;
}

export function MonthCalendar({
  lessons,
  onSelectDay,
  onSelectLesson,
}: MonthCalendarProps) {
  const today = new Date();
  const [view, setView] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = new Date(year, month, 1);
  // JS getDay(): 0=Sun..6=Sat → convert to Monday-first offset
  const leading = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  // Group once per lessons change instead of filtering all lessons for every cell.
  const byDay = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    for (const l of lessons) {
      const key = dayKey(l.start.toDate());
      const list = map.get(key);
      if (list) list.push(l);
      else map.set(key, [l]);
    }
    return map;
  }, [lessons]);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <IconButton size="md" label="Попередній місяць" onClick={() => setView(new Date(year, month - 1, 1))}>
          <ChevronLeft size={18} />
        </IconButton>
        <p className="text-sm font-semibold">
          {MONTHS[month]} {year}
        </p>
        <IconButton size="md" label="Наступний місяць" onClick={() => setView(new Date(year, month + 1, 1))}>
          <ChevronRight size={18} />
        </IconButton>
      </div>

      {/* Weekday row */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-center text-[10px] font-semibold uppercase text-muted-foreground py-1"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="aspect-square" />;
          const dayLessons = byDay.get(dayKey(date)) ?? [];
          const isToday = sameDay(date, today);
          return (
            <button
              key={i}
              onClick={() => onSelectDay?.(date)}
              className={cn(
                "aspect-square rounded-xl border p-1 flex flex-col gap-0.5 text-left transition-all overflow-hidden",
                isToday
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/40 hover:border-border/80 hover:bg-muted/30",
                onSelectDay && "cursor-pointer",
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-medium px-0.5",
                  isToday ? "text-primary" : "text-muted-foreground",
                )}
              >
                {date.getDate()}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayLessons.slice(0, 2).map((l) => (
                  <span
                    key={l.id}
                    onClick={(e) => {
                      if (onSelectLesson) {
                        e.stopPropagation();
                        onSelectLesson(l);
                      }
                    }}
                    className={cn(
                      "text-[9px] leading-tight bg-primary/15 text-primary rounded px-1 py-0.5 truncate",
                      onSelectLesson &&
                        "cursor-pointer hover:bg-primary/30 transition-colors",
                    )}
                    title={`${formatLessonTime(l.start)} ${l.title}`}
                  >
                    {formatLessonTime(l.start)} {l.title}
                  </span>
                ))}
                {dayLessons.length > 2 && (
                  <span className="text-[9px] text-muted-foreground px-1">
                    +{dayLessons.length - 2}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
