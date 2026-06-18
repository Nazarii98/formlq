"use client";

import { formatTimer } from "@/lib/format";
import { maxScaledScore, isExamFailed, type TestResult } from "@/lib/tests";

interface Props {
  result: TestResult;
}

export function ScoreHeader({ result }: Props) {
  const isNmt = (result.scaleType ?? "nmt") === "nmt";
  const maxScaled = isNmt ? 200 : maxScaledScore(result.scoreTable ?? []);
  const failed = isExamFailed(result.rawScore, result.scaleType ?? "nmt");
  const pct = isNmt
    ? Math.max(0, result.nmtScore - 100)
    : maxScaled
      ? (result.nmtScore / maxScaled) * 100
      : 0;
  const emoji = pct >= 80 ? "🏆" : pct >= 60 ? "🎉" : pct >= 40 ? "👍" : "💪";

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 text-center space-y-1">
      <div className="text-4xl mb-2">{failed ? "❌" : emoji}</div>
      {failed ? (
        <>
          <div className="text-3xl font-bold text-red-500">Не склав</div>
          <p className="text-muted-foreground text-sm">
            менше 5 балів — тест не зараховано
          </p>
        </>
      ) : (
        <>
          <div className="text-5xl font-bold tabular-nums">{result.nmtScore}</div>
          <p className="text-muted-foreground text-sm">
            {isNmt ? "балів НМТ (з 200)" : `балів (з ${maxScaled})`}
          </p>
        </>
      )}
      <div className="flex justify-center gap-4 pt-3 text-sm text-muted-foreground">
        <span>
          Сирий бал:{" "}
          <b className="text-foreground">
            {result.rawScore}/{result.maxRaw}
          </b>
        </span>
        <span>
          Час: <b className="text-foreground">{formatTimer(result.timeSpent)}</b>
        </span>
      </div>
    </div>
  );
}
