"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserResults, TestResult } from "@/lib/tests";
import { cn } from "@/lib/utils";
import { ChevronRight, Clock, Target } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import Link from "next/link";

function formatDate(ts: Timestamp | null): string {
  if (!ts) return "—";
  const d = ts.toDate();
  return d.toLocaleString("uk", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}с`;
  return `${m}хв ${s}с`;
}

function nmtColor(score: number): string {
  if (score >= 180) return "text-green-600 dark:text-green-400";
  if (score >= 160) return "text-blue-600 dark:text-blue-400";
  if (score >= 140) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

function ResultCard({ result }: { result: TestResult }) {
  const emoji =
    result.nmtScore >= 180
      ? "🏆"
      : result.nmtScore >= 160
        ? "🎉"
        : result.nmtScore >= 140
          ? "👍"
          : "💪";

  return (
    <Link href={`/dashboard/results/${result.id}`} className="block">
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden hover:bg-muted/30 transition-colors">
        <div className="w-full flex items-center gap-4 px-5 py-4">
          <span className="text-2xl">{emoji}</span>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{result.testTitle}</p>
            {result.testSubtitle && (
              <p className="text-xs text-muted-foreground truncate">
                {result.testSubtitle}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(result.completedAt)}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  nmtColor(result.nmtScore),
                )}
              >
                {result.nmtScore}
              </p>
              <p className="text-[10px] text-muted-foreground">з 200</p>
            </div>

            <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Target size={11} />
                {result.rawScore}/{result.maxRaw}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {formatTime(result.timeSpent)}
              </span>
            </div>

            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserResults(user.uid).then((r) => {
      setResults(r);
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Історія тестів</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Всі ваші спроби з деталями
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 py-20 text-center space-y-2">
          <p className="text-3xl">📋</p>
          <p className="font-medium">Ще немає результатів</p>
          <p className="text-sm text-muted-foreground">
            Пройдіть перший тест і він з`явиться тут
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <ResultCard key={r.id} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}
