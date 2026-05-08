"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { QuestionResult } from "@/lib/tests";
import { MathText } from "@/components/MathText";

interface QuestionCardProps {
  q: QuestionResult;
  index: number;
  answerLabel?: string;
}

export function QuestionCard({ q, index, answerLabel = "Ваша відповідь" }: QuestionCardProps) {
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

  const skipped = !q.userAnswer || q.userAnswer === "";

  return (
    <div
      id={`q-${index}`}
      className={cn(
        "rounded-2xl border bg-card p-5 space-y-4 border-l-[3px]",
        q.isCorrect
          ? "border-border/50 border-l-green-500/60"
          : skipped
          ? "border-border/50 border-l-border"
          : "border-border/50 border-l-red-400/70",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1.5">
            Завдання {index + 1}
            <span className="mx-1.5 opacity-40">·</span>
            {q.points} {q.points === 1 ? "бал" : "бали"}
          </p>
          <MathText text={q.text || "—"} className="text-sm leading-relaxed" />
          {q.imageUrl && (
            <div className="mt-3 rounded-xl overflow-hidden border border-border/50">
              <Image src={q.imageUrl} alt="" width={800} height={400} className="w-full object-contain max-h-64" />
            </div>
          )}
        </div>
        <span className={cn(
          "shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5",
          q.isCorrect
            ? "bg-green-500/12 text-green-600 dark:text-green-400"
            : skipped
            ? "bg-muted text-muted-foreground"
            : "bg-red-500/12 text-red-500",
        )}>
          {q.isCorrect ? "Вірно" : skipped ? "Пропущено" : "Невірно"}
        </span>
      </div>

      {/* Answers */}
      <div className="space-y-2 text-sm">
        <div className="flex items-baseline gap-2">
          <span className="text-muted-foreground text-xs shrink-0 w-32">{answerLabel}</span>
          <span className={cn(
            "font-medium",
            q.isCorrect ? "text-green-600 dark:text-green-400" : skipped ? "text-muted-foreground" : "text-red-500",
          )}>
            {userLabel}
          </span>
        </div>
        {!q.isCorrect && correctLabel && (
          <div className="flex items-baseline gap-2">
            <span className="text-muted-foreground text-xs shrink-0 w-32">Правильна відповідь</span>
            <span className="font-medium text-green-600 dark:text-green-400">{correctLabel}</span>
          </div>
        )}
      </div>

      {/* Explanation */}
      {q.explanation && (
        <details className="group">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-1.5 select-none w-fit">
            <span className="group-open:rotate-90 transition-transform inline-block leading-none">›</span>
            Пояснення
          </summary>
          <MathText text={q.explanation} className="block mt-2.5 text-sm text-foreground/80 leading-relaxed border-l-2 border-border/60 pl-3" />
          {q.explanationImageUrl && (
            <div className="mt-3 rounded-xl overflow-hidden border border-border/50">
              <Image src={q.explanationImageUrl} alt="" width={800} height={400} className="w-full object-contain max-h-64" />
            </div>
          )}
        </details>
      )}
    </div>
  );
}
