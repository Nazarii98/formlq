"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getResult, TestResult } from "@/lib/tests";
import { ScoreHeader } from "@/components/exam/ScoreHeader";
import { QuestionMap } from "@/components/exam/QuestionMap";
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

  if (!result)
    return (
      <p className="text-center text-muted-foreground py-16">
        Результат не знайдено
      </p>
    );

  const questions = result.questions ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <button
        onClick={() => router.push(`/admin/users/${uid}`)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Назад до історії
      </button>

      <ScoreHeader result={result} />

      <QuestionMap questions={questions} />

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id ?? i}
            q={q}
            index={i}
            answerLabel="Відповідь:"
          />
        ))}
      </div>
    </div>
  );
}
