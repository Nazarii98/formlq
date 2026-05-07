"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getResult, TestResult, QuestionResult } from "@/lib/tests";
import { useHeader } from "@/context/HeaderContext";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function QuestionCard({ q, index }: { q: QuestionResult; index: number }) {
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
    } catch { userLabel = "—"; }
    correctLabel = Object.entries(q.correctPairs ?? {}).map(([k, v]) => `${k}→${v}`).join(", ");
  }

  return (
    <div
      id={`q-${index}`}
      className={cn(
        "rounded-2xl border p-5 space-y-3",
        q.isCorrect ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn(
          "shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5",
          q.isCorrect ? "bg-green-500/20 text-green-600 dark:text-green-400" : "bg-red-500/20 text-red-500"
        )}>
          {q.isCorrect ? "✓" : "✗"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">Завдання {index + 1} · {q.points} б</p>
          <p className="text-sm leading-relaxed">{q.text || "—"}</p>
        </div>
      </div>

      <div className="pl-9 space-y-1.5 text-sm">
        <div className="flex gap-2">
          <span className="text-muted-foreground shrink-0 whitespace-nowrap">Відповідь:</span>
          <span className={q.isCorrect ? "text-green-600 dark:text-green-400" : "text-red-500"}>{userLabel}</span>
        </div>
        {!q.isCorrect && correctLabel && (
          <div className="flex gap-2">
            <span className="text-muted-foreground shrink-0 whitespace-nowrap">Правильна:</span>
            <span className="text-green-600 dark:text-green-400">{correctLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminResultPage() {
  const { uid, resultId } = useParams<{ uid: string; resultId: string }>();
  const router = useRouter();
  const { setHeader } = useHeader();
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResult(resultId).then((r) => {
      setResult(r);
      setLoading(false);
    });
  }, [resultId]);

  useEffect(() => {
    if (result) setHeader(result.testTitle || "Результат", "Перегляд адміном");
    return () => setHeader("", "");
  }, [result, setHeader]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!result) return <p className="text-center text-muted-foreground py-16">Результат не знайдено</p>;

  const emoji = result.nmtScore >= 180 ? "🏆" : result.nmtScore >= 160 ? "🎉" : result.nmtScore >= 140 ? "👍" : "💪";
  const questions = result.questions ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <button
        onClick={() => router.push(`/admin/users/${uid}`)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Назад до історії
      </button>

      {/* Score */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 text-center space-y-1">
        <div className="text-4xl mb-2">{emoji}</div>
        <div className="text-5xl font-bold tabular-nums">{result.nmtScore}</div>
        <p className="text-muted-foreground text-sm">балів НМТ (з 200)</p>
        <div className="flex justify-center gap-4 pt-3 text-sm text-muted-foreground">
          <span>Сирий бал: <b className="text-foreground">{result.rawScore}/{result.maxRaw}</b></span>
          <span>Час: <b className="text-foreground">{formatTime(result.timeSpent)}</b></span>
        </div>
        {result.completedAt && (
          <p className="text-xs text-muted-foreground pt-1">
            {result.completedAt.toDate().toLocaleString("uk", {
              day: "numeric", month: "long", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        )}
      </div>

      {/* Quick map */}
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, i) => (
          <a key={q.id ?? i} href={`#q-${i}`}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border",
              q.isCorrect
                ? "bg-green-500/15 border-green-500/40 text-green-600 dark:text-green-400"
                : q.userAnswer
                ? "bg-red-500/15 border-red-500/40 text-red-500"
                : "bg-muted border-border/50 text-muted-foreground"
            )}>
              {i + 1}
            </div>
          </a>
        ))}
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((q, i) => <QuestionCard key={q.id ?? i} q={q} index={i} />)}
      </div>
    </div>
  );
}
