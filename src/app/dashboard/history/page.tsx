"use client";

import { useAuth } from "@/context/AuthContext";
import { getUserResults } from "@/lib/tests";
import { formatDate, formatDuration, scoreColor } from "@/lib/format";
import { SpinnerPage } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ChevronRight, Clock, Target } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { TestResult } from "@/lib/tests";

function ResultCard({ result }: { result: TestResult }) {
  const { text, bg } = scoreColor(result.nmtScore);

  return (
    <Link href={`/dashboard/results/${result.id}`} className="block">
      <div className="rounded-2xl border border-border/50 bg-card px-5 py-4 flex items-center gap-4 hover:bg-muted/30 hover:border-border/80 transition-all group">
        <div className={cn("w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0", bg)}>
          <span className={cn("text-lg font-bold tabular-nums leading-none", text)}>{result.nmtScore}</span>
          <span className="text-[9px] text-muted-foreground leading-none mt-0.5">з 200</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{result.testTitle}</p>
          {result.testSubtitle && (
            <p className="text-xs text-muted-foreground truncate">{result.testSubtitle}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(result.completedAt)}</p>
        </div>

        <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-muted-foreground shrink-0">
          <span className="flex items-center gap-1"><Target size={11} />{result.rawScore}/{result.maxRaw}</span>
          <span className="flex items-center gap-1"><Clock size={11} />{formatDuration(result.timeSpent)}</span>
        </div>

        <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </Link>
  );
}

export default function HistoryPage() {
  const { user } = useAuth();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["results", user?.uid],
    queryFn: () => getUserResults(user!.uid),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {isLoading ? (
        <SpinnerPage />
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 py-20 text-center space-y-2">
          <p className="text-3xl">📋</p>
          <p className="font-medium">Ще немає результатів</p>
          <p className="text-sm text-muted-foreground">Пройдіть перший тест і він з&apos;явиться тут</p>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((r) => <ResultCard key={r.id} result={r} />)}
        </div>
      )}
    </div>
  );
}
