"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useHeader } from "@/context/HeaderContext";
import { subscribeStudentLessons, Lesson } from "@/lib/lessons";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { CalendarClock, X, Video } from "lucide-react";

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

  // Tick so the "join" button activates 5 min before the lesson.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    return subscribeStudentLessons(user.uid, setLessons);
  }, [user]);

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

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl border border-border/60 bg-card shadow-xl p-5 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold">{selected.title}</p>
              <button
                onClick={() => setSelected(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted"
              >
                <X size={15} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
              <CalendarClock size={14} /> {formatDate(selected.start)} ·{" "}
              {selected.durationMin} хв
            </p>
            {selected.tutorName && (
              <p className="text-sm">Вчитель: {selected.tutorName}</p>
            )}
            {selected.note && (
              <p className="text-sm text-foreground/80 border-l-2 border-border pl-2">
                {selected.note}
              </p>
            )}

            {selected.meetingUrl && (() => {
              const s = selected.start.toMillis();
              const e = s + selected.durationMin * 60000;
              const canJoin = now >= s - 5 * 60000 && now <= e;
              return canJoin ? (
                <a
                  href={selected.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Video size={16} /> Увійти в урок
                </a>
              ) : (
                <div className="mt-1 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed">
                  <Video size={16} /> Кнопка зʼявиться за 5 хв до початку
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
