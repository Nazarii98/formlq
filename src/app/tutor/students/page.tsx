"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useHeader } from "@/context/HeaderContext";
import { subscribeTutorStudents, TutorStudent } from "@/lib/tutor";
import { SpinnerPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ClipboardPlus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TutorStudentsPage() {
  const { user } = useAuth();
  const { setHeader } = useHeader();
  const router = useRouter();

  const [students, setStudents] = useState<TutorStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setHeader("Мої учні", "Домашні завдання та результати");
    return () => setHeader("", "");
  }, [setHeader]);

  useEffect(() => {
    if (!user) return;
    return subscribeTutorStudents(user.uid, (list) => {
      setStudents(list);
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {loading ? (
        <SpinnerPage />
      ) : students.length === 0 ? (
        <EmptyState
          emoji="🧑‍🎓"
          title="Поки немає учнів"
          description="Учнів призначає адміністратор. Зверніться до нього, щоб додати учня."
        />
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Учні ({students.length})
          </p>
          {students.map((s) => (
            <div
              key={s.id}
              onClick={() => router.push(`/tutor/students/${s.studentId}`)}
              className={cn(
                "rounded-2xl border border-border/50 bg-card px-4 py-3 flex items-center gap-3 group transition-all cursor-pointer",
                "hover:bg-muted/30 hover:border-border/80",
              )}
            >
              <div className="w-9 h-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold shrink-0">
                {s.studentName?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{s.studentName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {s.studentEmail}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/tutor/homework/new?student=${s.studentId}`);
                }}
              >
                <ClipboardPlus size={14} />
                <span className="hidden sm:inline">Призначити</span>
              </Button>
              <ChevronRight
                size={14}
                className="text-muted-foreground/30 group-hover:text-muted-foreground shrink-0"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
