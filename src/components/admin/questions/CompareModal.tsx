"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { MathText } from "@/components/MathText";
import { TOPICS } from "@/lib/topics";
import { cn } from "@/lib/utils";
import type { BankQuestion } from "@/lib/tests";
import { STATUS_CFG, TYPE_LABELS, qStatus } from "./constants";

/** Side-by-side view of two bank questions with their answers. */
export function CompareModal({
  open,
  questions,
  onClose,
}: {
  open: boolean;
  questions: BankQuestion[];
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      className="shadow-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
        <span className="font-semibold text-sm">Порівняння завдань</span>
        <IconButton label="Закрити" onClick={onClose}>
          <X size={15} />
        </IconButton>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border/50 max-h-[70vh] overflow-y-auto">
        {questions.map((q, i) => {
          const topic = TOPICS.find((t) => t.id === q.topicId);
          const status = qStatus(q);
          return (
            <div key={q.id} className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-muted-foreground">
                  Завдання {i + 1}
                </span>
                {topic && (
                  <Badge variant="outline" className="text-[10px]">
                    {topic.icon} {topic.name}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px]">
                  {TYPE_LABELS[q.type]}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  Рівень {q.difficulty}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn("text-[10px]", STATUS_CFG[status].cls)}
                >
                  {STATUS_CFG[status].label}
                </Badge>
              </div>
              <div className="text-sm leading-relaxed font-medium">
                <MathText text={q.text} />
              </div>
              {q.type === "mcq" && (
                <div className="space-y-1.5">
                  {q.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={cn(
                        "px-3 py-2 rounded-xl border text-sm",
                        opt.id === q.correctOptionId
                          ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400 font-medium"
                          : "border-border/40 text-muted-foreground",
                      )}
                    >
                      <span className="font-semibold mr-2">{opt.id}.</span>
                      <MathText text={opt.text} />
                    </div>
                  ))}
                </div>
              )}
              {q.type === "open" && (
                <div className="px-3 py-2 rounded-xl border border-green-500/40 bg-green-500/10 text-sm text-green-700 dark:text-green-400">
                  Відповідь:{" "}
                  <span className="font-medium">{q.correctAnswer}</span>
                </div>
              )}
              {q.explanation && (
                <div className="text-xs text-muted-foreground border-l-2 border-border/50 pl-3 leading-relaxed">
                  <MathText text={q.explanation} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}
