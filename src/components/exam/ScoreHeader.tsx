"use client";

import { nmtEmoji, formatTimer } from "@/lib/format";
import type { TestResult } from "@/lib/tests";

interface Props {
  result: TestResult;
}

export function ScoreHeader({ result }: Props) {
  const questions = result.questions ?? [];
  const correct = questions.filter((q) => q.isCorrect).length;
  const wrong = questions.filter((q) => !q.isCorrect && q.userAnswer != null && q.userAnswer !== "").length;
  const skipped = questions.length - correct - wrong;
  const pct = questions.length ? Math.round((correct / questions.length) * 100) : 0;
  const failed = result.rawScore < 5;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 text-center">
      <div className="text-4xl mb-2">{failed ? "❌" : nmtEmoji(result.nmtScore)}</div>
      {failed ? (
        <>
          <div className="text-3xl font-bold text-red-500">Не склав</div>
          <p className="text-muted-foreground text-sm mt-1">менше 5 балів — тест не зараховано</p>
        </>
      ) : (
        <>
          <div className="text-5xl font-bold tabular-nums">{result.nmtScore}</div>
          <p className="text-muted-foreground text-sm mt-1">балів НМТ (з 200)</p>
        </>
      )}

      <div className="grid grid-cols-3 gap-3 mt-5">
        <div className="rounded-xl bg-green-500/10 border border-green-500/20 py-3 px-2">
          <div className="text-xl font-bold text-green-600 dark:text-green-400 tabular-nums">{correct}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Правильно</div>
        </div>
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 py-3 px-2">
          <div className="text-xl font-bold text-red-500 tabular-nums">{wrong}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Неправильно</div>
        </div>
        <div className="rounded-xl bg-muted border border-border/50 py-3 px-2">
          <div className="text-xl font-bold tabular-nums">{skipped}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Пропущено</div>
        </div>
      </div>

      <div className="flex justify-center gap-4 mt-4 text-sm text-muted-foreground">
        <span>Точність: <b className="text-foreground">{pct}%</b></span>
        <span>Час: <b className="text-foreground">{formatTimer(result.timeSpent)}</b></span>
      </div>

      {result.completedAt && (
        <p className="text-xs text-muted-foreground mt-2">
          {result.completedAt.toDate().toLocaleString("uk", {
            day: "numeric", month: "long", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
