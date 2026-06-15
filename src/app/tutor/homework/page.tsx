"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useHeader } from "@/context/HeaderContext";
import { subscribeTutorHomework, Homework, HomeworkStatus } from "@/lib/tutor";
import { formatDate } from "@/lib/format";
import { SpinnerPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Plus,
  CalendarClock,
  CheckCircle2,
  Hourglass,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  HomeworkStatus,
  { label: string; cls: string; Icon: React.ElementType }
> = {
  assigned: {
    label: "Призначено",
    cls: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
    Icon: Hourglass,
  },
  in_progress: {
    label: "Виконується",
    cls: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    Icon: Hourglass,
  },
  completed: {
    label: "Завершено",
    cls: "text-green-600 dark:text-green-400 bg-green-500/10",
    Icon: CheckCircle2,
  },
};

export default function TutorHomeworkPage() {
  const { user } = useAuth();
  const { setHeader } = useHeader();
  const router = useRouter();
  const [list, setList] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setHeader("Домашні завдання", "Призначені учням");
    return () => setHeader("", "");
  }, [setHeader]);

  useEffect(() => {
    if (!user) return;
    return subscribeTutorHomework(user.uid, (l) => {
      setList(l);
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex justify-end">
        <Button
          size="lg"
          className="gap-1.5"
          onClick={() => router.push("/tutor/homework/new")}
        >
          <Plus size={16} />
          Нове завдання
        </Button>
      </div>

      {loading ? (
        <SpinnerPage />
      ) : list.length === 0 ? (
        <EmptyState
          emoji="📚"
          title="Немає завдань"
          description="Призначте перше домашнє завдання своєму учневі."
        />
      ) : (
        <div className="space-y-2">
          {list.map((hw) => {
            const meta = STATUS_META[hw.status];
            return (
              <button
                key={hw.id}
                onClick={() => router.push(`/tutor/homework/${hw.id}`)}
                className={cn(
                  "w-full text-left rounded-2xl border border-border/50 bg-card px-4 py-3 flex items-center gap-3 group transition-all",
                  "hover:bg-muted/30 hover:border-border/80",
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{hw.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {hw.studentName ?? "Учень"}
                    {hw.dueAt && (
                      <span className="inline-flex items-center gap-1 ml-2">
                        <CalendarClock size={11} /> до{" "}
                        {formatDate(hw.dueAt, {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full",
                    meta.cls,
                  )}
                >
                  <meta.Icon size={12} />
                  <span className="hidden sm:inline">{meta.label}</span>
                </span>
                <ChevronRight
                  size={14}
                  className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
