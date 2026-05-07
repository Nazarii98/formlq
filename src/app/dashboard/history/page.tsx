"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserResults, TestResult, QuestionResult } from "@/lib/tests";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Clock, Target } from "lucide-react";
import { Timestamp } from "firebase/firestore";

function formatDate(ts: Timestamp | null): string {
  if (!ts) return "—";
  const d = ts.toDate();
  return d.toLocaleString("uk", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
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

function QuestionBreakdown({ q }: { q: QuestionResult }) {
  let userAnswerLabel = q.userAnswer || "—";
  let correctLabel = "";

  if (q.type === "mcq") {
    const opt = q.options?.find((o) => o.id === q.userAnswer);
    userAnswerLabel = opt ? `${opt.id}. ${opt.text}` : q.userAnswer || "—";
    const cor = q.options?.find((o) => o.id === q.correctOptionId);
    correctLabel = cor ? `${cor.id}. ${cor.text}` : q.correctOptionId ?? "";
  }

  if (q.type === "open") {
    correctLabel = q.correctAnswer ?? "";
  }

  if (q.type === "matching") {
    try {
      const parsed = JSON.parse(q.userAnswer) as Record<string, string>;
      userAnswerLabel = Object.entries(parsed).map(([k, v]) => `${k}→${v}`).join(", ") || "—";
    } catch { userAnswerLabel = "—"; }
    correctLabel = Object.entries(q.correctPairs ?? {}).map(([k, v]) => `${k}→${v}`).join(", ");
  }

  return (
    <div className={cn(
      "rounded-xl border px-4 py-3 space-y-1 text-sm",
      q.isCorrect ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
    )}>
      <div className="flex items-start gap-2">
        <span className={cn("text-xs font-bold shrink-0 mt-0.5", q.isCorrect ? "text-green-600" : "text-red-500")}>
          {q.isCorrect ? "✓" : "✗"}
        </span>
        <p className="text-foreground/80 leading-snug">{q.text || "—"}</p>
        <span className="ml-auto shrink-0 text-xs font-semibold text-muted-foreground">{q.points}б</span>
      </div>
      {!q.isCorrect && (
        <div className="pl-4 space-y-0.5 text-xs">
          <p><span className="text-muted-foreground">Ваша: </span><span className="text-red-500">{userAnswerLabel}</span></p>
          {correctLabel && <p><span className="text-muted-foreground">Правильна: </span><span className="text-green-600">{correctLabel}</span></p>}
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: TestResult }) {
  const [expanded, setExpanded] = useState(false);

  const emoji = result.nmtScore >= 180 ? "🏆" : result.nmtScore >= 160 ? "🎉" : result.nmtScore >= 140 ? "👍" : "💪";

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
      >
        <span className="text-2xl">{emoji}</span>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{result.testTitle}</p>
          {result.testSubtitle && <p className="text-xs text-muted-foreground truncate">{result.testSubtitle}</p>}
          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(result.completedAt)}</p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className={cn("text-2xl font-bold tabular-nums", nmtColor(result.nmtScore))}>
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

          {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="border-t border-border/50 px-5 py-4 space-y-3">
          {/* Score pills */}
          <div className="flex gap-2 flex-wrap">
            {(["mcq", "matching", "open"] as const).map((type) => {
              const qs = result.questions.filter((q) => q.type === type);
              if (!qs.length) return null;
              const earned = qs.filter((q) => q.isCorrect).reduce((s, q) => s + q.points, 0);
              const total = qs.reduce((s, q) => s + q.points, 0);
              const label = type === "mcq" ? "Вибір" : type === "matching" ? "Відповідність" : "Відповідь";
              return (
                <div key={type} className="px-3 py-1 rounded-full bg-muted/50 text-xs font-medium">
                  {label}: <span className="text-primary">{earned}/{total}</span>
                </div>
              );
            })}
          </div>

          {/* Questions */}
          <div className="space-y-2">
            {result.questions.map((q, i) => (
              <QuestionBreakdown key={q.id ?? i} q={q} />
            ))}
          </div>
        </div>
      )}
    </div>
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
        <p className="text-sm text-muted-foreground mt-0.5">Всі ваші спроби з деталями</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 py-20 text-center space-y-2">
          <p className="text-3xl">📋</p>
          <p className="font-medium">Ще немає результатів</p>
          <p className="text-sm text-muted-foreground">Пройдіть перший тест і він з'явиться тут</p>
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
