"use client";

import { cn } from "@/lib/utils";
import { QuestionResult } from "@/lib/tests";

interface QuestionCardProps {
  q: QuestionResult;
  index: number;
  answerLabel?: string;
}

export function QuestionCard({ q, index, answerLabel = "Ваша:" }: QuestionCardProps) {
  let userLabel = "—";
  let correctLabel = "";

  if (q.type === "mcq") {
    const uOpt = q.options?.find((o) => o.id === q.userAnswer);
    const cOpt = q.options?.find((o) => o.id === q.correctOptionId);
    userLabel = uOpt ? `${uOpt.id}. ${uOpt.text}` : q.userAnswer || "—";
    correctLabel = cOpt ? `${cOpt.id}. ${cOpt.text}` : q.correctOptionId ?? "";
  } else if (q.type === "open") {
    userLabel = q.userAnswer || "—";
    correctLabel = q.correctAnswer ?? "";
  } else if (q.type === "matching") {
    try {
      const parsed = JSON.parse(q.userAnswer) as Record<string, string>;
      userLabel = Object.entries(parsed).map(([k, v]) => `${k}→${v}`).join(", ") || "—";
    } catch {
      userLabel = "—";
    }
    correctLabel = Object.entries(q.correctPairs ?? {}).map(([k, v]) => `${k}→${v}`).join(", ");
  }

  return (
    <div
      id={`q-${index}`}
      className={cn(
        "rounded-2xl border p-5 space-y-3",
        q.isCorrect ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5",
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn(
          "shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5",
          q.isCorrect ? "bg-green-500/20 text-green-600 dark:text-green-400" : "bg-red-500/20 text-red-500",
        )}>
          {q.isCorrect ? "✓" : "✗"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">Завдання {index + 1} · {q.points} б</p>
          <p className="text-sm text-foreground leading-relaxed">{q.text || "—"}</p>
        </div>
      </div>

      <div className="pl-9 space-y-1.5 text-sm">
        <div className="flex gap-2">
          <span className="text-muted-foreground shrink-0 whitespace-nowrap">{answerLabel}</span>
          <span className={q.isCorrect ? "text-green-600 dark:text-green-400" : "text-red-500"}>{userLabel}</span>
        </div>
        {!q.isCorrect && correctLabel && (
          <div className="flex gap-2">
            <span className="text-muted-foreground shrink-0 whitespace-nowrap">Правильна:</span>
            <span className="text-green-600 dark:text-green-400">{correctLabel}</span>
          </div>
        )}
      </div>

      {q.explanation && (
        <div className="pl-9">
          <details className="group">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-1 select-none">
              <span className="group-open:rotate-90 transition-transform inline-block">›</span>
              Пояснення
            </summary>
            <p className="mt-2 text-sm text-foreground/80 leading-relaxed border-l-2 border-border pl-3">
              {q.explanation}
            </p>
          </details>
        </div>
      )}
    </div>
  );
}
