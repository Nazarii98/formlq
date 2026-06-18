"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  getTest,
  saveTestResult,
  getResult,
  updateResult,
  TestResult,
} from "@/lib/tests";
import { getHomework, updateHomework, Homework } from "@/lib/tutor";
import { uploadQuestionImage } from "@/lib/storage";
import { useReferenceDrawer } from "@/context/ReferenceDrawerContext";
import { formatDate } from "@/lib/format";
import { CalendarClock, FileText } from "lucide-react";
import {
  ExamRunner,
  RunnerConfig,
  SubmitPayload,
} from "@/components/exam/ExamRunner";

export default function HomeworkRunnerPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { openDrawer } = useReferenceDrawer();

  const [homework, setHomework] = useState<Homework | null>(null);
  const [config, setConfig] = useState<RunnerConfig | null>(null);
  const [completedResult, setCompletedResult] = useState<TestResult | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const hw = await getHomework(id);
      if (!hw || hw.studentId !== user.uid) {
        router.replace("/dashboard/homework");
        return;
      }
      setHomework(hw);

      // Build the runner config from a referenced test or the custom snapshot.
      let cfg: RunnerConfig;
      if (hw.source === "test" && hw.testId) {
        const test = await getTest(hw.testId);
        if (!test) {
          router.replace("/dashboard/homework");
          return;
        }
        cfg = {
          id: hw.id,
          title: hw.title,
          subtitle: test.subtitle,
          questions: test.questions ?? [],
          scoreTable: test.scoreTable ?? [],
          scaleType: test.scaleType ?? "nmt",
          durationMinutes: test.durationMinutes ?? 150,
        };
      } else {
        cfg = {
          id: hw.id,
          title: hw.title,
          questions: hw.questions ?? [],
          scoreTable: hw.scoreTable ?? [],
          scaleType: hw.scaleType ?? "custom",
          durationMinutes: hw.durationMinutes ?? 30,
        };
      }
      setConfig(cfg);

      // Completed → load result for review mode.
      if (hw.status === "completed" && hw.resultId) {
        const res = await getResult(hw.resultId);
        if (res) setCompletedResult(res);
      }
      setLoading(false);
    })();
  }, [id, user, router]);

  async function uploadImage(questionId: string, file: File): Promise<string> {
    return uploadQuestionImage(id, questionId, file);
  }

  async function handleSubmit(payload: SubmitPayload): Promise<string> {
    if (!homework || !user || !config) return "";
    const resultId = await saveTestResult({
      userId: user.uid,
      testId: homework.testId ?? homework.id,
      testTitle: homework.title,
      testSubtitle: config.subtitle ?? "",
      timeSpent: payload.timeSpent,
      rawScore: payload.rawScore,
      nmtScore: payload.nmtScore,
      maxRaw: payload.maxRaw,
      answers: payload.answers,
      questions: payload.questions,
      scoreTable: config.scoreTable,
      scaleType: config.scaleType ?? "custom",
      homeworkId: homework.id,
      answerImages: payload.answerImages,
      flaggedQuestions: payload.flaggedQuestions,
    });
    await updateHomework(homework.id, { status: "completed", resultId });
    queryClient.invalidateQueries({ queryKey: ["results", user.uid] });
    return resultId;
  }

  async function handleToggleFlag(
    resultId: string,
    flagged: string[],
  ): Promise<void> {
    await updateResult(resultId, { flaggedQuestions: flagged });
  }

  async function handleProgress(
    answers: Record<string, string>,
    answerImages: Record<string, string>,
  ): Promise<void> {
    if (!homework) return;
    await updateHomework(homework.id, {
      status: "in_progress",
      progress: { answers, answerImages },
    });
  }

  if (authLoading || loading || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const detailsCard = homework && (
    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-2">
      <h1 className="text-lg font-bold">{homework.title}</h1>
      {homework.tutorName && (
        <p className="text-sm text-muted-foreground">Вчитель: {homework.tutorName}</p>
      )}
      {homework.dueAt && (
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <CalendarClock size={12} /> Дедлайн: {formatDate(homework.dueAt)}
        </p>
      )}
      {homework.note && (
        <p className="text-xs text-muted-foreground border-l-2 border-border pl-2">
          {homework.note}
        </p>
      )}
      {homework.pdfUrl && (
        <button
          onClick={() => openDrawer({ url: homework.pdfUrl, title: "Конспект" })}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <FileText size={13} /> Переглянути конспект
        </button>
      )}
    </div>
  );

  return (
    <ExamRunner
      config={config}
      backHref="/dashboard/homework"
      introNote={homework?.note}
      headerSlot={detailsCard}
      untimed
      notesPdfUrl={homework?.pdfUrl}
      hideReference
      allowAnswerImages
      allowFlags
      uploadImage={uploadImage}
      onSubmit={handleSubmit}
      onToggleFlag={handleToggleFlag}
      onProgress={handleProgress}
      initialAnswers={homework?.progress?.answers}
      initialAnswerImages={homework?.progress?.answerImages}
      resultsHref="/dashboard/homework"
      resultsLabel="До завдань"
      introEmoji="📚"
      startLabel={
        homework?.progress && Object.keys(homework.progress.answers).length > 0
          ? "Продовжити →"
          : "Почати →"
      }
      initialResult={
        completedResult
          ? {
              resultId: completedResult.id,
              answers: completedResult.answers,
              answerImages: completedResult.answerImages,
              flaggedQuestions: completedResult.flaggedQuestions,
              timeSpent: completedResult.timeSpent,
              tutorComments: completedResult.tutorComments,
              tutorNote: completedResult.tutorNote,
            }
          : undefined
      }
    />
  );
}
