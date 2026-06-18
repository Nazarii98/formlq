"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useHeader } from "@/context/HeaderContext";
import { getResult, updateResult, TestResult } from "@/lib/tests";
import { getHomework, deleteHomework, Homework } from "@/lib/tutor";
import { formatDate } from "@/lib/format";
import { ResultsView } from "@/components/exam/ResultsView";
import { SpinnerPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useReferenceDrawer } from "@/context/ReferenceDrawerContext";
import { Trash2, CalendarClock, FileText } from "lucide-react";

export default function TutorHomeworkReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { user, userProfile } = useAuth();
  const { setHeader } = useHeader();
  const { openDrawer } = useReferenceDrawer();
  const router = useRouter();

  const [homework, setHomework] = useState<Homework | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setHeader("Перевірка завдання", "");
    return () => setHeader("", "");
  }, [setHeader]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const hw = await getHomework(id);
      // Owner tutor or any editor may review.
      if (!hw || (hw.tutorId !== user.uid && userProfile?.role !== "editor")) {
        router.replace("/tutor/homework");
        return;
      }
      setHomework(hw);
      if (hw.status === "completed" && hw.resultId) {
        const res = await getResult(hw.resultId);
        if (res) {
          setResult(res);
          setComments(res.tutorComments ?? {});
          setNote(res.tutorNote ?? "");
        }
      }
      setLoading(false);
    })();
  }, [id, user, userProfile, router]);

  async function saveComment(questionId: string, value: string) {
    if (!result) return;
    const next = { ...comments, [questionId]: value };
    setComments(next);
    await updateResult(result.id, { tutorComments: next });
  }

  async function saveNote(value: string) {
    if (!result) return;
    await updateResult(result.id, { tutorNote: value });
  }

  async function handleDelete() {
    await deleteHomework(id);
    router.replace("/tutor/homework");
  }

  if (loading) return <SpinnerPage />;
  if (!homework) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      {/* Header card */}
      <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">{homework.title}</h1>
            <p className="text-sm text-muted-foreground">
              {homework.studentName ?? "Учень"}
            </p>
          </div>
          <button
            onClick={() => setConfirmDelete(true)}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
            title="Видалити завдання"
          >
            <Trash2 size={15} />
          </button>
        </div>
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

      {homework.status !== "completed" || !result ? (
        <EmptyState
          emoji="⏳"
          title="Ще не виконано"
          description="Результати зʼявляться, коли учень завершить завдання."
        />
      ) : (
        <ResultsView
          result={result}
          answerLabel="Відповідь учня"
          answerImages={result.answerImages}
          flagged={result.flaggedQuestions ?? []}
          flaggedBanner
          editableNote={{ value: note, onSave: (v) => { setNote(v); saveNote(v); } }}
          editableComment={(qId) => ({
            value: comments[qId] ?? "",
            onSave: (v) => saveComment(qId, v),
          })}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Видалити завдання?"
        description="Завдання та його результат буде видалено для учня."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
