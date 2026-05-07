"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getResult, TestResult } from "@/lib/tests";
import { formatTimer, nmtEmoji } from "@/lib/format";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { SpinnerPage } from "@/components/ui/spinner";
import { useHeader } from "@/context/HeaderContext";
import { ArrowLeft } from "lucide-react";

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

  if (loading) return <SpinnerPage />;

  if (!result) return <p className="text-center text-muted-foreground py-16">Результат не знайдено</p>;

  const emoji = nmtEmoji(result.nmtScore);
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
          <span>Час: <b className="text-foreground">{formatTimer(result.timeSpent)}</b></span>
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
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
              q.isCorrect
                ? "bg-green-500/15 border-green-500/40 text-green-600 dark:text-green-400"
                : q.userAnswer
                ? "bg-red-500/15 border-red-500/40 text-red-500"
                : "bg-muted border-border/50 text-muted-foreground"
            }`}>
              {i + 1}
            </div>
          </a>
        ))}
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((q, i) => (
          <QuestionCard key={q.id ?? i} q={q} index={i} answerLabel="Відповідь:" />
        ))}
      </div>
    </div>
  );
}
