"use client";

import { useEffect, useState } from "react";
import { X, CalendarClock, Video } from "lucide-react";
import { Lesson } from "@/lib/lessons";
import { formatDate } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";

/**
 * Single lesson-details popup used everywhere (dashboard, tutor, admin).
 * The "join" button is time-gated: active from 5 min before start until the lesson ends.
 */
export function LessonViewModal({
  lesson,
  onClose,
}: {
  lesson: Lesson | null;
  onClose: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  if (!lesson) return null;

  const start = lesson.start.toMillis();
  const end = start + lesson.durationMin * 60000;
  const canJoin = now >= start - 5 * 60000 && now <= end;

  return (
    <Dialog open onClose={onClose} size="sm" className="p-5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{lesson.title}</p>
        <IconButton label="Закрити" onClick={onClose}>
          <X size={15} />
        </IconButton>
      </div>
      <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
        <CalendarClock size={14} /> {formatDate(lesson.start)} · {lesson.durationMin} хв
      </p>
      {lesson.tutorName && <p className="text-sm">Вчитель: {lesson.tutorName}</p>}
      {lesson.studentName && <p className="text-sm">Учень: {lesson.studentName}</p>}
      {lesson.note && (
        <p className="text-sm text-foreground/80 border-l-2 border-border pl-2">{lesson.note}</p>
      )}
      {lesson.meetingUrl &&
        (canJoin ? (
          <a
            href={lesson.meetingUrl}
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
        ))}
    </Dialog>
  );
}
