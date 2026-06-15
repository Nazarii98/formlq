"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useHeader } from "@/context/HeaderContext";
import { getResult, updateResult, TestResult } from "@/lib/tests";
import { getHomework, deleteHomework, Homework } from "@/lib/tutor";
import { formatDate } from "@/lib/format";
import { ScoreHeader } from "@/components/exam/ScoreHeader";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { SpinnerPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TutorHomeworkReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { setHeader } = useHeader();
  const router = useRouter();

  const [homework, setHomework] = useState<Homework | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setHeader("Перевірка завдання", "");
    return () => setHeader("", "");
  }, [setHeader]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const hw = await getHomework(id);
      if (!hw || hw.tutorId !== user.uid) {
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
  }, [id, user, router]);

  async function saveComment(questionId: string, value: string) {
    if (!result) return;
    const next = { ...comments, [questionId]: value };
    setComments(next);
    await updateResult(result.id, { tutorComments: next });
  }

  async function saveNote() {
    if (!result) return;
    setSavingNote(true);
    try {
      await updateResult(result.id, { tutorNote: note });
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDelete() {
    await deleteHomework(id);
    router.replace("/tutor/homework");
  }

  if (loading) return <SpinnerPage />;
  if (!homework) return null;

  const flagged = new Set(result?.flaggedQuestions ?? []);

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
      </div>

      {homework.status !== "completed" || !result ? (
        <EmptyState
          emoji="⏳"
          title="Ще не виконано"
          description="Результати зʼявляться, коли учень завершить завдання."
        />
      ) : (
        <>
          <ScoreHeader result={result} />

          {flagged.size > 0 && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                🦆 Учень позначив {flagged.size}{" "}
                {flagged.size === 1 ? "питання" : "питань"} для обговорення
              </p>
            </div>
          )}

          {/* Overall note */}
          <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Загальний коментар учневі
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={saveNote}
              rows={2}
              placeholder="Напишіть відгук для учня..."
              className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
            {savingNote && (
              <p className="text-[11px] text-muted-foreground">Збереження...</p>
            )}
          </div>

          {/* Per-question review */}
          <div className="space-y-3">
            {result.questions.map((q, i) => {
              const photo = result.answerImages?.[q.id];
              const isFlagged = flagged.has(q.id);
              return (
                <div
                  key={q.id ?? i}
                  className={cn(
                    "relative",
                    isFlagged && "rounded-2xl ring-2 ring-amber-400/40",
                  )}
                >
                  {isFlagged && (
                    <span
                      className="absolute -top-2 -right-2 z-10 text-lg"
                      title="Позначено учнем"
                    >
                      🦆
                    </span>
                  )}
                  <QuestionCard q={q} index={i} answerLabel="Відповідь учня" />
                  {photo && (
                    <div className="mt-2 px-1">
                      <p className="text-xs text-muted-foreground mb-1">
                        Фото розвʼязку:
                      </p>
                      <a
                        href={photo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-xl overflow-hidden border border-border/50 max-w-xs"
                      >
                        <Image
                          src={photo}
                          alt="Фото відповіді учня"
                          width={400}
                          height={300}
                          className="w-full object-contain max-h-72"
                        />
                      </a>
                    </div>
                  )}
                  <textarea
                    value={comments[q.id] ?? ""}
                    onChange={(e) =>
                      setComments({ ...comments, [q.id]: e.target.value })
                    }
                    onBlur={(e) => saveComment(q.id, e.target.value)}
                    rows={1}
                    placeholder="Коментар до питання..."
                    className="mt-2 w-full px-3 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  />
                </div>
              );
            })}
          </div>
        </>
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
