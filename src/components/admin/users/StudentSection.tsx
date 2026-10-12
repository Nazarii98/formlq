"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Users } from "lucide-react";
import { queryKeys, STALE } from "@/lib/queryKeys";
import { getAllUsers, getUserById } from "@/lib/users";
import { assignTutorById, getStudentHomework, getStudentTutorLinks, removeStudent } from "@/lib/tutor";
import { subscribeStudentLessons, Lesson } from "@/lib/lessons";
import { canTutor } from "@/lib/roles";
import { Select, SelectItem } from "@/components/ui/select";
import { IconButton } from "@/components/ui/icon-button";
import { SectionLabel } from "@/components/ui/section-label";
import { HomeworkListItem } from "@/components/homework/HomeworkListItem";
import { LessonsCalendarBlock } from "./LessonsCalendarBlock";

/** Editor view of a user's tutors, homework and calendar as a student. */
export function StudentSection({ studentId }: { studentId: string }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assigning, setAssigning] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => subscribeStudentLessons(studentId, setLessons), [studentId]);

  const { data: tutors = [] } = useQuery({
    queryKey: queryKeys.studentTutors(studentId),
    queryFn: async () => {
      const links = await getStudentTutorLinks(studentId);
      const profiles = await Promise.all(links.map((l) => getUserById(l.tutorId)));
      return profiles.filter((p): p is NonNullable<typeof p> => !!p);
    },
  });

  // Everyone who can teach (tutor/editor).
  const { data: allTutors = [] } = useQuery({
    queryKey: queryKeys.allTutors,
    queryFn: getAllUsers,
    staleTime: STALE.long,
    select: (us) => us.filter((u) => canTutor(u.role)),
  });

  // Excluding the student and already-assigned tutors.
  const availableTutors = useMemo(() => {
    const assignedIds = new Set(tutors.map((t) => t.uid));
    return allTutors.filter((t) => t.uid !== studentId && !assignedIds.has(t.uid));
  }, [allTutors, tutors, studentId]);

  const { data: homework = [] } = useQuery({
    queryKey: queryKeys.studentHomework(studentId),
    queryFn: () => getStudentHomework(studentId),
  });

  async function handleAssignTutor(tutorId: string) {
    if (!tutorId) return;
    setAssigning(true);
    try {
      await assignTutorById(studentId, tutorId);
      queryClient.invalidateQueries({ queryKey: queryKeys.studentTutors(studentId) });
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemoveTutor(tutorUid: string) {
    await removeStudent(`${tutorUid}_${studentId}`);
    queryClient.invalidateQueries({ queryKey: queryKeys.studentTutors(studentId) });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/50 bg-card p-4">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <Users size={16} className="text-primary" /> Як учень
      </p>

      {/* Tutors — editor assigns/removes */}
      <div className="space-y-1.5">
        <SectionLabel size="2xs" className="flex items-center gap-1.5">
          <Users size={12} /> Вчителі ({tutors.length})
        </SectionLabel>

        <Select
          value=""
          onValueChange={handleAssignTutor}
          disabled={assigning || availableTutors.length === 0}
        >
          <SelectItem value="">
            {availableTutors.length === 0 ? "Немає доступних вчителів" : "Призначити вчителя…"}
          </SelectItem>
          {availableTutors.map((t) => (
            <SelectItem key={t.uid} value={t.uid}>
              {t.displayName} ({t.email})
            </SelectItem>
          ))}
        </Select>

        {tutors.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">Немає призначених вчителів</p>
        ) : (
          tutors.map((t) => (
            <div
              key={t.uid}
              className="rounded-xl border border-border/50 bg-background px-3 py-2 flex items-center gap-2.5"
            >
              <Link
                href={`/admin/users/${t.uid}`}
                className="flex items-center gap-2.5 flex-1 min-w-0"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-400/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
                  {t.displayName?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate hover:underline">{t.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.email}</p>
                </div>
              </Link>
              <IconButton
                label="Прибрати вчителя"
                tone="danger"
                onClick={() => handleRemoveTutor(t.uid)}
              >
                <Trash2 size={14} />
              </IconButton>
            </div>
          ))
        )}
      </div>

      {/* Homework */}
      <div className="space-y-1.5">
        <SectionLabel size="2xs">Домашні завдання ({homework.length})</SectionLabel>
        {homework.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">Немає завдань</p>
        ) : (
          homework.map((hw) => (
            <HomeworkListItem
              key={hw.id}
              hw={hw}
              href={`/tutor/homework/${hw.id}`}
              audience="tutor"
              compact
            />
          ))
        )}
      </div>

      <LessonsCalendarBlock lessons={lessons} />
    </div>
  );
}
