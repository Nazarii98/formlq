import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { scoreColor, formatDuration, formatDate } from "@/lib/format";
import type { TestResult } from "@/lib/tests";

interface ResultListItemProps {
  result: TestResult;
  href: string;
}

export function ResultListItem({ result, href }: ResultListItemProps) {
  const { text, bg } = scoreColor(result.nmtScore);
  const questions = result.questions ?? [];
  const correct = questions.filter((q) => q.isCorrect).length;
  const pct = questions.length ? Math.round((correct / questions.length) * 100) : 0;

  return (
    <Link href={href} className="block">
      <div className="rounded-2xl border border-border/50 bg-card px-5 py-4 flex items-center gap-4 hover:bg-muted/30 hover:border-border/80 transition-all group">
        <div className={cn("w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0", bg)}>
          <span className={cn("text-lg font-bold leading-none tabular-nums", text)}>{result.nmtScore}</span>
          <span className={cn("text-[9px] font-medium leading-none mt-0.5", text)}>НМТ</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{result.testTitle || "Без назви"}</p>
          {result.testSubtitle && (
            <p className="text-xs text-muted-foreground truncate">{result.testSubtitle}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(result.completedAt)}</p>
        </div>

        <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-muted-foreground shrink-0">
          <span>Правильно: <b className="text-foreground">{correct}/{questions.length}</b> ({pct}%)</span>
          {result.timeSpent ? (
            <span className="flex items-center gap-1"><Clock size={11} />{formatDuration(result.timeSpent)}</span>
          ) : null}
        </div>

        <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </Link>
  );
}
