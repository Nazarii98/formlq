"use client";

import { useEffect, useState } from "react";
import { subscribeStudentLessons, Lesson } from "@/lib/lessons";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { LessonViewModal } from "@/components/calendar/LessonViewModal";

/** Student's lessons calendar with a details popup. */
export function CalendarWidget({ userId }: { userId: string }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selected, setSelected] = useState<Lesson | null>(null);

  useEffect(() => subscribeStudentLessons(userId, setLessons), [userId]);

  return (
    <>
      <MonthCalendar lessons={lessons} onSelectLesson={setSelected} />
      <LessonViewModal lesson={selected} onClose={() => setSelected(null)} />
    </>
  );
}
