"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useHeader } from "@/context/HeaderContext";
import { subscribeStudentLessons, Lesson } from "@/lib/lessons";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { LessonViewModal } from "@/components/calendar/LessonViewModal";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { CalendarClock } from "lucide-react";

export default function StudentCalendarPage() {
  const { user } = useAuth();
  const { setHeader } = useHeader();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selected, setSelected] = useState<Lesson | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setHeader("Календар занять", "Розклад уроків зі вчителем");
    return () => setHeader("", "");
  }, [setHeader]);

  useEffect(() => {
    if (!user) return;
    return subscribeStudentLessons(user.uid, setLessons);
  }, [user]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const upcoming = lessons
    .filter((l) => l.start.toMillis() + l.durationMin * 60000 >= now)
    .slice(0, 5);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <MonthCalendar lessons={lessons} onSelectLesson={setSelected} />

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Найближчі заняття
        </p>
        {upcoming.length === 0 ? (
          <EmptyState emoji="📅" title="Немає запланованих занять" />
        ) : (
          upcoming.map((l) => (
            <button
              key={l.id}
              onClick={() => setSelected(l)}
              className="w-full text-left rounded-2xl border border-border/50 bg-card px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CalendarClock size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{l.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(l.start)} · {l.durationMin} хв
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      <LessonViewModal lesson={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
