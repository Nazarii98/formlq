"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ClipboardPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePageHeader } from "@/context/HeaderContext";
import { queryKeys } from "@/lib/queryKeys";
import { subscribeTutorHomework, getTutorStudents, Homework } from "@/lib/tutor";
import { SpinnerPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { HomeworkListItem } from "@/components/homework/HomeworkListItem";

export default function TutorStudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [allHomework, setAllHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: students = [] } = useQuery({
    queryKey: queryKeys.tutorStudents(user?.uid),
    queryFn: () => getTutorStudents(user!.uid),
    enabled: !!user,
  });
  const student = students.find((s) => s.studentId === studentId);

  usePageHeader(student?.studentName ?? "Учень", student?.studentEmail ?? "");

  useEffect(() => {
    if (!user) return;
    return subscribeTutorHomework(user.uid, (list) => {
      setAllHomework(list);
      setLoading(false);
    });
  }, [user]);

  const homework = useMemo(
    () => allHomework.filter((h) => h.studentId === studentId),
    [allHomework, studentId],
  );

  const doneCount = homework.filter((h) => h.status === "completed").length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Завдань: <b className="text-foreground">{homework.length}</b> · виконано{" "}
          <b className="text-foreground">{doneCount}</b>
        </p>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => router.push(`/tutor/homework/new?student=${studentId}`)}
        >
          <ClipboardPlus size={14} /> Призначити
        </Button>
      </div>

      {loading ? (
        <SpinnerPage />
      ) : homework.length === 0 ? (
        <EmptyState
          emoji="📚"
          title="Немає завдань"
          description="Призначте цьому учневі перше домашнє завдання."
        />
      ) : (
        <div className="space-y-2">
          {homework.map((hw) => (
            <HomeworkListItem
              key={hw.id}
              hw={hw}
              href={`/tutor/homework/${hw.id}`}
              audience="tutor"
            />
          ))}
        </div>
      )}
    </div>
  );
}
