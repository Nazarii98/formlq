"use client";

import { memo, useMemo } from "react";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MathText } from "@/components/MathText";
import { useDragReorder } from "@/hooks/useDragReorder";
import { getDayIndex } from "@/lib/format";
import { TOPICS } from "@/lib/topics";
import { cn } from "@/lib/utils";
import type { BankQuestion } from "@/lib/tests";
import { TYPE_LABELS } from "./constants";

interface DailyOrderTabProps {
  questions: BankQuestion[];
  onReorder: (next: BankQuestion[]) => void;
}

/** "Порядок дня": approved questions sorted by dailyOrder, drag to reorder. */
export const DailyOrderTab = memo(function DailyOrderTab({
  questions,
  onReorder,
}: DailyOrderTabProps) {
  const orderedList = useMemo(() => {
    const approved = questions.filter((q) => q.status === "approved");
    return approved.sort((a, b) => {
      if (a.dailyOrder != null && b.dailyOrder != null)
        return a.dailyOrder - b.dailyOrder;
      if (a.dailyOrder != null) return -1;
      if (b.dailyOrder != null) return 1;
      return a.id.localeCompare(b.id);
    });
  }, [questions]);

  const todayIdx = useMemo(
    () => (orderedList.length > 0 ? getDayIndex() % orderedList.length : -1),
    [orderedList.length],
  );

  const {
    isSrc,
    isOver,
    handleDragStart,
    handleDragEnter,
    handleDrop,
    handleDragEnd,
  } = useDragReorder((src, dst) => {
    const next = [...orderedList];
    const [moved] = next.splice(src, 1);
    next.splice(dst, 0, moved);
    onReorder(next);
  });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Тільки схвалені завдання. Перетягніть для зміни порядку — завдання
        дня обирається за циклом.
      </p>
      {orderedList.length === 0 && (
        <EmptyState
          title="Немає схвалених завдань"
          className="py-12 text-sm text-muted-foreground"
        />
      )}
      {orderedList.map((q, i) => {
        const topic = TOPICS.find((t) => t.id === q.topicId);
        const isToday = i === todayIdx;
        return (
          <div
            key={q.id}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragEnter={(e) => handleDragEnter(i, e)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(i)}
            onDragEnd={handleDragEnd}
            className={cn(
              "rounded-2xl border bg-card p-4 flex items-center gap-3 transition-all cursor-grab active:cursor-grabbing",
              isSrc(i) ? "opacity-40" : "",
              isOver(i)
                ? "border-primary/60 bg-primary/5 scale-[1.01]"
                : isToday
                  ? "border-orange-400/60 bg-orange-500/5"
                  : "border-border/50",
            )}
          >
            <GripVertical
              size={16}
              className="text-muted-foreground/50 shrink-0"
            />
            <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">
              {i + 1}
            </span>
            <p className="text-sm flex-1 min-w-0 line-clamp-1">
              <MathText text={q.text} />
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {isToday && (
                <span className="text-[11px] font-medium text-orange-500 flex items-center gap-1">
                  🔥 Сьогодні
                </span>
              )}
              <Badge variant="outline" className="text-[10px]">
                {TYPE_LABELS[q.type]}
              </Badge>
              {topic && (
                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                  {topic.icon} {topic.name}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">
                Рівень {q.difficulty}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
});
