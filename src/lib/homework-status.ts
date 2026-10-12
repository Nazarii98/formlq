import { CheckCircle2, Hourglass, Play, type LucideIcon } from "lucide-react";
import type { HomeworkStatus } from "@/lib/tutor";

/** Who is looking at the homework — wording/icons differ for students vs tutors. */
export type HomeworkAudience = "student" | "tutor";

interface StatusMeta {
  label: string;
  cls: string;
  Icon: LucideIcon;
}

const TONE: Record<HomeworkStatus, string> = {
  assigned: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
  in_progress: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  completed: "text-green-600 dark:text-green-400 bg-green-500/10",
};

const COPY: Record<HomeworkAudience, Record<HomeworkStatus, { label: string; Icon: LucideIcon }>> = {
  // Student: a call to action ("start / continue").
  student: {
    assigned: { label: "До виконання", Icon: Play },
    in_progress: { label: "Розпочато", Icon: Play },
    completed: { label: "Завершено", Icon: CheckCircle2 },
  },
  // Tutor / editor: waiting on the student.
  tutor: {
    assigned: { label: "Призначено", Icon: Hourglass },
    in_progress: { label: "Виконується", Icon: Hourglass },
    completed: { label: "Завершено", Icon: CheckCircle2 },
  },
};

export function getHomeworkStatusMeta(
  status: HomeworkStatus,
  audience: HomeworkAudience,
): StatusMeta {
  const copy = COPY[audience][status] ?? COPY[audience].assigned;
  return { ...copy, cls: TONE[status] ?? TONE.assigned };
}

/** Not completed and past its deadline. */
export function isHomeworkOverdue(
  hw: { status: HomeworkStatus; dueAt?: { toMillis(): number } | null },
  now: number,
): boolean {
  return hw.status !== "completed" && !!hw.dueAt && hw.dueAt.toMillis() < now;
}
