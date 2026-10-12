"use client";

import { useState } from "react";
import type { Lesson } from "@/lib/lessons";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { LessonViewModal } from "@/components/calendar/LessonViewModal";
import { SectionLabel } from "@/components/ui/section-label";

/** "Календар занять" caption + month grid + lesson details popup. */
export function LessonsCalendarBlock({ lessons }: { lessons: Lesson[] }) {
  const [selected, setSelected] = useState<Lesson | null>(null);
  return (
    <>
      <div className="space-y-1.5">
        <SectionLabel size="2xs">Календар занять</SectionLabel>
        <MonthCalendar lessons={lessons} onSelectLesson={setSelected} />
      </div>
      <LessonViewModal lesson={selected} onClose={() => setSelected(null)} />
    </>
  );
}
