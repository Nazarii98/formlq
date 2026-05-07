"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getResult, getTest, TestResult } from "@/lib/tests";
import { ScoreHeader } from "@/components/exam/ScoreHeader";
import { QuestionMap } from "@/components/exam/QuestionMap";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { EmptyState } from "@/components/ui/empty-state";
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

  const questions = result.questions ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <ScoreHeader result={result} />

      <QuestionMap questions={questions} />

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
