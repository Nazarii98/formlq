"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MathText } from "@/components/MathText";
import type { MatchingQuestion } from "@/lib/tests";

interface MatchingInputProps {
  question: MatchingQuestion;
  value: Record<string, string>;
  onChange: (pairs: Record<string, string>) => void;
}

/** Tap a left item, then a right option, to pair them. */
export function MatchingInput({ question, value, onChange }: MatchingInputProps) {
  const [activeLeft, setActiveLeft] = useState<string | null>(null);

  function selectOption(optId: string) {
    if (!activeLeft) return;
    onChange({ ...value, [activeLeft]: optId });
    setActiveLeft(null);
  }
  function toggleLeft(itemId: string) {
    setActiveLeft((prev) => (prev === itemId ? null : itemId));
  }

  return (
    <div className="flex gap-3 items-start">
      <div className="flex-2 min-w-0 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 p-3 space-y-2">
        <p className="text-[11px] font-medium text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wide px-1">
          Вираз
        </p>
        {question.leftItems.map((item) => {
          const chosen = value[item.id];
          const isActive = activeLeft === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleLeft(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left",
                isActive
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-transparent bg-white/70 dark:bg-white/5 hover:border-primary/30",
              )}
            >
              <span className="text-sm font-semibold text-muted-foreground w-5 shrink-0">
                {item.id}.
              </span>
              <MathText
                text={item.text}
                className="text-sm flex-1 leading-snug"
              />
              <span className="text-muted-foreground shrink-0">→</span>
              <span
                className={cn(
                  "w-9 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-all",
                  chosen
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-dashed border-border/50 text-muted-foreground/40",
                )}
              >
                {chosen || "?"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-w-0 rounded-2xl bg-green-50/60 dark:bg-green-950/20 border border-green-200/50 dark:border-green-800/30 p-2 space-y-1">
        <p className="text-[11px] font-medium text-green-600/70 dark:text-green-400/70 uppercase tracking-wide px-1">
          Відповідь
        </p>
        {question.rightOptions.map((opt) => {
          const isUsed = Object.values(value).includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => selectOption(opt.id)}
              disabled={!activeLeft}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-xl border-2 text-sm font-semibold transition-all text-left",
                isUsed
                  ? "border-green-400/60 bg-green-100/60 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  : activeLeft
                    ? "border-primary/40 bg-white/70 dark:bg-white/5 hover:border-primary hover:bg-primary/10 cursor-pointer"
                    : "border-transparent bg-white/70 dark:bg-white/5 text-foreground/80",
              )}
            >
              <span className="shrink-0">{opt.id}.</span>
              {opt.text && <MathText text={opt.text} className="font-normal" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
