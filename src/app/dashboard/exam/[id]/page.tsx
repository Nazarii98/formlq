"use client";

import { queryKeys, STALE } from "@/lib/queryKeys";
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
import { isEditor } from "@/lib/roles";
import { ExamRunner, SubmitPayload } from "@/components/exam/ExamRunner";
import { SpinnerScreen } from "@/components/ui/spinner";

export default function ExamPage() {
  const { id } = useParams<{ id: string }>();
  const { user, userProfile, loading: authLoading } = useAuth();
  const canSeeDrafts = isEditor(userProfile?.role);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: allResults = [] } = useQuery({
    queryKey: queryKeys.results(user?.uid),
    queryFn: () => getUserResults(user!.uid),
    enabled: !!user,
    staleTime: STALE.short,
  });
  const testHistory = allResults.filter((r) => r.testId === id);

  const [test, setTest] = useState<TestDoc | null>(null);
  const [loadingTest, setLoadingTest] = useState(true);

  useEffect(() => {
    // Wait for the profile (role) too, so drafts are gated correctly.
    if (authLoading || !user) return;
    getTest(id).then((t) => {
      // Drafts are only reachable by editors (homework uses its own route).
      if (!t || (!t.published && !canSeeDrafts)) {
        router.replace("/dashboard");
        return;
      }
      setTest(t);
      setLoadingTest(false);
    });
  }, [id, user, authLoading, canSeeDrafts, router]);

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
    queryClient.invalidateQueries({ queryKey: queryKeys.results(user.uid) });
    return resultId;
  }

  if (authLoading || loadingTest) return <SpinnerScreen />;

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
