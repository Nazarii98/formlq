"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useHeader } from "@/context/HeaderContext";
import {
  subscribeStudentHomework,
  Homework,
  HomeworkStatus,
} from "@/lib/tutor";
import { formatDate } from "@/lib/format";
import { SpinnerPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarClock, CheckCircle2, Play, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  HomeworkStatus,
  { label: string; cls: string; Icon: React.ElementType }
> = {
  assigned: {
    label: "До виконання",
    cls: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
    Icon: Play,
  },
  in_progress: {
    label: "Розпочато",
    cls: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    Icon: Play,
  },
  completed: {
    label: "Завершено",
    cls: "text-green-600 dark:text-green-400 bg-green-500/10",
    Icon: CheckCircle2,
  },
};

export default function StudentHomeworkPage() {
  const { user } = useAuth();
  const { setHeader } = useHeader();
  const router = useRouter();
  const [list, setList] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    setHeader("Домашні завдання", "Завдання від вашого вчителя");
    return () => setHeader("", "");
  }, [setHeader]);

  useEffect(() => {
    if (!user) return;
    return subscribeStudentHomework(user.uid, (l) => {
      setList(l);
      setLoading(false);
    });
  }, [user]);

  const overdue = (hw: Homework) =>
    hw.status !== "completed" && hw.dueAt && hw.dueAt.toMillis() < now;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {loading ? (
        <SpinnerPage />
      ) : list.length === 0 ? (
        <EmptyState
          emoji="📭"
          title="Немає домашніх завдань"
          description="Коли вчитель призначить завдання, воно зʼявиться тут."
        />
      ) : (
        <div className="space-y-2">
          {list.map((hw) => {
            const meta = STATUS_META[hw.status];
            return (
              <button
                key={hw.id}
                onClick={() => router.push(`/dashboard/homework/${hw.id}`)}
                className={cn(
                  "w-full text-left rounded-2xl border bg-card px-4 py-3 flex items-center gap-3 group transition-all",
                  overdue(hw)
                    ? "border-red-500/30 hover:border-red-500/50"
                    : "border-border/50 hover:bg-muted/30 hover:border-border/80",
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{hw.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {hw.dueAt ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1",
                          overdue(hw) && "text-red-500",
                        )}
                      >
                        <CalendarClock size={11} /> до{" "}
                        {formatDate(hw.dueAt, {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    ) : (
                      "Без дедлайну"
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
