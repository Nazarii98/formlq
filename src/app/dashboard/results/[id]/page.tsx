"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getResult, getTest, TestResult } from "@/lib/tests";
import { formatTimer, nmtEmoji } from "@/lib/format";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { SpinnerPage } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [result, setResult] = useState<TestResult | null>(null);
  const [testAvailable, setTestAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    getResult(id).then(async (r) => {
      if (!r || r.userId !== user.uid) { router.replace("/dashboard/history"); return; }
      setResult(r);
      const test = await getTest(r.testId);
      setTestAvailable(!!test && test.published === true);
      setLoading(false);
    });
  }, [id, user, router]);

  if (authLoading || loading) return <SpinnerPage size="lg" />;
  if (!result) return null;

  const emoji = nmtEmoji(result.nmtScore);
  const questions = result.questions ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Score header */}
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
            {result.completedAt.toDate().toLocaleString("uk", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      {/* Quick map */}
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, i) => (
          <a key={q.id ?? i} href={`#q-${i}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
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

      {/* Question breakdown */}
      <div className="space-y-3">
        {questions.map((q, i) => (
          <QuestionCard key={q.id ?? i} q={q} index={i} />
        ))}
      </div>

      <div className="flex gap-3">
        {testAvailable ? (
          <Link href={`/dashboard/exam/${result.testId}`} className="flex-1">
            <Button variant="outline" className="w-full">Ще раз</Button>
          </Link>
        ) : (
          <Button variant="outline" className="flex-1" disabled title="Тест більше недоступний">
            Ще раз
          </Button>
        )}
        <Link href="/dashboard/history" className="flex-1">
          <Button className="w-full">Історія</Button>
        </Link>
      </div>
    </div>
  );
}
