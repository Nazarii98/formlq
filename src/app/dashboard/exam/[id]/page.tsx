"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  getTest,
  TestDoc,
  saveTestResult,
  getUserResults,
} from "@/lib/tests";
import { ExamRunner, SubmitPayload } from "@/components/exam/ExamRunner";

export default function ExamPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: allResults = [] } = useQuery({
    queryKey: ["results", user?.uid],
    queryFn: () => getUserResults(user!.uid),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
  const testHistory = allResults.filter((r) => r.testId === id);

  const [test, setTest] = useState<TestDoc | null>(null);
  const [loadingTest, setLoadingTest] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    getTest(id).then((t) => {
      if (!t) {
        router.replace("/dashboard");
        return;
      }
      setTest(t);
      setLoadingTest(false);
    });
  }, [id, user, router]);

  async function handleSubmit(payload: SubmitPayload): Promise<string> {
    if (!test || !user) return "";
    const resultId = await saveTestResult({
      userId: user.uid,
      testId: test.id,
      testTitle: test.title,
      testSubtitle: test.subtitle ?? "",
      timeSpent: payload.timeSpent,
      rawScore: payload.rawScore,
      nmtScore: payload.nmtScore,
      maxRaw: payload.maxRaw,
      answers: payload.answers,
      questions: payload.questions,
      scoreTable: test.scoreTable ?? [],
      scaleType: test.scaleType ?? "nmt",
    });
    queryClient.invalidateQueries({ queryKey: ["results", user.uid] });
    return resultId;
  }

  if (authLoading || loadingTest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!test || !user) return null;

  return (
    <ExamRunner
      config={{
        id: test.id,
        title: test.title,
        subtitle: test.subtitle,
        questions: test.questions ?? [],
        scoreTable: test.scoreTable ?? [],
        scaleType: test.scaleType ?? "nmt",
        durationMinutes: test.durationMinutes ?? 150,
      }}
      history={testHistory}
      backHref="/dashboard"
      onSubmit={handleSubmit}
      allowRestart
      resultsHref="/dashboard"
      resultsLabel="На головну"
      startLabel="Почати іспит →"
    />
  );
}
