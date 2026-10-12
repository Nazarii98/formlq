"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { isAnswered } from "@/lib/exam-scoring";
import type { TestQuestion } from "@/lib/tests";

interface QuestionNavProps {
  questions: TestQuestion[];
  answers: Record<string, string>;
  currentIdx: number;
  onSelect: (index: number) => void;
}

/** Numbered question bubbles: current / answered / untouched. */
export const QuestionNav = memo(function QuestionNav({
  questions,
  answers,
  currentIdx,
  onSelect,
}: QuestionNavProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {questions.map((q, i) => {
        const answered = isAnswered(q, answers[q.id]);
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onSelect(i)}
            className={cn(
              "w-8 h-8 rounded-full text-xs font-bold transition-all border",
              i === currentIdx
                ? "bg-primary text-primary-foreground border-primary"
                : answered
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-muted border-border/50 text-muted-foreground hover:border-primary/30",
            )}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
});
