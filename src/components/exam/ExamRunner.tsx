"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { BookOpen, Loader2 } from "lucide-react";
import { formatTimer } from "@/lib/format";
import { MathText } from "@/components/MathText";
import { ResultListItem } from "@/components/exam/ResultListItem";
import { ResultsView } from "@/components/exam/ResultsView";
import { Button } from "@/components/ui/button";
import { useReferenceDrawer } from "@/context/ReferenceDrawerContext";
import { useExamGuard } from "@/context/ExamGuardContext";
import confetti from "canvas-confetti";
import {
  TestQuestion,
  MCQQuestion,
  MatchingQuestion,
  ScoreRow,
  ScaleType,
  TestResult,
  QuestionResult,
  calcRawScore,
  rawToNMT,
  maxRawScore,
  maxScaledScore,
} from "@/lib/tests";

export interface RunnerConfig {
  id: string;
  title: string;
  subtitle?: string;
  questions: TestQuestion[];
  scoreTable: ScoreRow[];
  scaleType?: ScaleType;
  durationMinutes?: number;
}

export interface SubmitPayload {
  answers: Record<string, string>;
  answerImages: Record<string, string>;
  flaggedQuestions: string[];
  rawScore: number;
  nmtScore: number;
  maxRaw: number;
  timeSpent: number;
  questions: QuestionResult[];
}

interface InitialResult {
  resultId: string;
  answers: Record<string, string>;
  answerImages?: Record<string, string>;
  flaggedQuestions?: string[];
  timeSpent: number;
  tutorComments?: Record<string, string>;
  tutorNote?: string;
}

interface ExamRunnerProps {
  config: RunnerConfig;
  history?: TestResult[];
  backHref?: string;
  introNote?: string;
  /** Show photo-upload on open-answer questions (homework). */
  allowAnswerImages?: boolean;
  /** Show duck 🦆 flag toggles on the results screen (homework). */
  allowFlags?: boolean;
  /** Upload a photo, returns its URL. Required when allowAnswerImages. */
  uploadImage?: (questionId: string, file: File) => Promise<string>;
  /** Persist the attempt. Returns the saved result id. */
  onSubmit: (payload: SubmitPayload) => Promise<string>;
  /** Persist a change to flagged questions after submit (homework). */
  onToggleFlag?: (resultId: string, flagged: string[]) => Promise<void>;
  /** Allow the "retake" button on the results screen. */
  allowRestart?: boolean;
  /** No countdown timer — untimed attempt (homework). Elapsed time is still recorded. */
  untimed?: boolean;
  /** Per-task конспект (PDF). When set, the reference button opens this instead of the global довідка. */
  notesPdfUrl?: string;
  /** Hide the reference button entirely (homework with no конспект). */
  hideReference?: boolean;
  /** Resume an in-progress attempt: prefill answers without entering review mode. */
  initialAnswers?: Record<string, string>;
  initialAnswerImages?: Record<string, string>;
  /** Autosave callback for in-progress answers (homework resume). */
  onProgress?: (
    answers: Record<string, string>,
    answerImages: Record<string, string>,
  ) => void;
  /** Pre-completed attempt → open straight into review mode. */
  initialResult?: InitialResult;
  /** Optional content rendered at the top of the results screen (e.g. homework details). */
  headerSlot?: ReactNode;
  /** CTA shown on the results screen. */
  resultsHref?: string;
  resultsLabel?: string;
  introEmoji?: string;
  startLabel?: string;
}

function isAnswered(q: TestQuestion, answer: string | undefined): boolean {
  if (!answer) return false;
  if (q.type === "matching") {
    try {
      const p = JSON.parse(answer) as Record<string, string>;
      return q.leftItems.every((item) => !!p[item.id]);
    } catch {
      return false;
    }
  }
  return answer.trim().length > 0;
}

function normalizeOpenAnswer(s: string) {
  return s.trim().replace(/\./g, ",");
}

function buildQuestionResults(
  qs: TestQuestion[],
  ans: Record<string, string>,
): QuestionResult[] {
  return qs.map((q) => {
    const userAnswer = ans[q.id] ?? "";
    let correct = false;
    if (q.type === "mcq") correct = userAnswer === q.correctOptionId;
    if (q.type === "open")
      correct =
        normalizeOpenAnswer(userAnswer) ===
        normalizeOpenAnswer(q.correctAnswer);
    let partialScore: number | undefined;
    if (q.type === "matching") {
      try {
        const p = JSON.parse(userAnswer) as Record<string, string>;
        const totalPairs = Object.keys(q.correctPairs).length;
        const correctCount = Object.entries(q.correctPairs).filter(
          ([k, v]) => p[k] === v,
        ).length;
        correct = correctCount === totalPairs;
        partialScore =
          totalPairs > 0
            ? Math.round(correctCount * (q.points / totalPairs))
            : 0;
      } catch {
        correct = false;
        partialScore = 0;
      }
    }
    const base = {
      id: q.id,
      type: q.type,
      text: q.text,
      imageUrl: q.imageUrl ?? null,
      points: q.points,
      userAnswer,
      isCorrect: correct,
      explanation: q.explanation ?? "",
      explanationImageUrl: q.explanationImageUrl ?? null,
    };
    if (q.type === "mcq")
      return {
        ...base,
        options: q.options,
        correctOptionId: q.correctOptionId,
      };
    if (q.type === "open") return { ...base, correctAnswer: q.correctAnswer };
    return {
      ...base,
      leftItems: q.leftItems,
      rightOptions: q.rightOptions,
      correctPairs: q.correctPairs,
      partialScore,
    };
  });
}

export function ExamRunner({
  config,
  history = [],
  backHref = "/dashboard",
  introNote,
  allowAnswerImages = false,
  allowFlags = false,
  uploadImage,
  onSubmit,
  onToggleFlag,
  allowRestart = false,
  untimed = false,
  notesPdfUrl,
  hideReference = false,
  initialAnswers,
  initialAnswerImages,
  onProgress,
  initialResult,
  headerSlot,
  resultsHref = "/dashboard",
  resultsLabel = "На головну",
  introEmoji = "📝",
  startLabel = "Почати →",
}: ExamRunnerProps) {
  const { setGuarded } = useExamGuard();
  const { open: drawerOpen, openDrawer } = useReferenceDrawer();
  const router = useRouter();

  function saveAndExit() {
    onProgress?.(answers, answerImages);
    setGuarded(false);
    router.push(backHref);
  }

  const showReference = notesPdfUrl ? true : !hideReference;
  const referenceLabel = notesPdfUrl ? "Конспект" : "Довідка";
  const openReference = () =>
    openDrawer(
      notesPdfUrl ? { url: notesPdfUrl, title: "Конспект" } : undefined,
    );

  const questions = config.questions ?? [];
  const maxRaw = maxRawScore(questions);
  const examDuration = (config.durationMinutes ?? 150) * 60;
  const isNmt = (config.scaleType ?? "nmt") === "nmt";

  const reviewing = !!initialResult;
  const tutorComments = initialResult?.tutorComments ?? {};
  const tutorNote = initialResult?.tutorNote ?? "";

  const [phase, setPhase] = useState<"intro" | "exam" | "results">(
    reviewing ? "results" : "intro",
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(
    initialResult?.answers ?? initialAnswers ?? {},
  );
  const [answerImages, setAnswerImages] = useState<Record<string, string>>(
    initialResult?.answerImages ?? initialAnswerImages ?? {},
  );
  const [flagged, setFlagged] = useState<string[]>(
    initialResult?.flaggedQuestions ?? [],
  );
  const [resultId, setResultId] = useState<string | null>(
    initialResult?.resultId ?? null,
  );
  const [timeLeft, setTimeLeft] = useState(
    (config.durationMinutes ?? 150) * 60,
  );
  const [finalTimeSpent, setFinalTimeSpent] = useState(
    initialResult?.timeSpent ?? 0,
  );
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    setGuarded(
      phase === "exam",
      untimed
        ? {
            title: "Вийти із завдання?",
            message: "Прогрес збережено — зможеш продовжити пізніше.",
            confirmLabel: "Вийти",
          }
        : undefined,
    );
    return () => setGuarded(false);
  }, [phase, untimed, setGuarded]);

  useEffect(() => {
    if (phase !== "exam") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  // confetti on results
  useEffect(() => {
    if (phase !== "results") return;
    const rawScore = calcRawScore(questions, answers);
    const nmtScore = rawToNMT(rawScore, config.scoreTable ?? []);
    const maxScaled = isNmt ? 200 : maxScaledScore(config.scoreTable ?? []);
    const pct = isNmt
      ? Math.max(0, nmtScore - 100)
      : maxScaled
        ? (nmtScore / maxScaled) * 100
        : 0;
    const duration = pct >= 80 ? 4000 : pct >= 50 ? 2500 : 1500;
    const end = Date.now() + duration;
    const colors =
      pct >= 80
        ? ["#f59e0b", "#fbbf24", "#fde68a", "#ffffff"]
        : pct >= 50
          ? ["#6366f1", "#818cf8", "#a5b4fc", "#ffffff"]
          : ["#64748b", "#94a3b8", "#cbd5e1", "#ffffff"];
    function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    }
    if (!reviewing) frame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== "exam") return;
    startTimeRef.current = Date.now();
    if (untimed) return; // record elapsed time, but no countdown / auto-submit
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          void doSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Autosave in-progress answers (debounced) so the student can resume later.
  useEffect(() => {
    if (phase !== "exam" || !onProgress) return;
    if (progressTimer.current) clearTimeout(progressTimer.current);
    progressTimer.current = setTimeout(
      () => onProgress(answers, answerImages),
      800,
    );
    return () => {
      if (progressTimer.current) clearTimeout(progressTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, answerImages, phase]);

  function setAnswer(questionId: string, answer: string) {
    setAnswers((a) => ({ ...a, [questionId]: answer }));
  }

  async function handleUpload(questionId: string, file: File) {
    if (!uploadImage) return;
    setUploadingId(questionId);
    try {
      const url = await uploadImage(questionId, file);
      setAnswerImages((m) => ({ ...m, [questionId]: url }));
    } finally {
      setUploadingId(null);
    }
  }

  function handleSubmitClick() {
    const unanswered = questions.filter(
      (q) => !isAnswered(q, answers[q.id]),
    ).length;
    if (unanswered > 0) {
      setShowSubmitConfirm(true);
      return;
    }
    void doSubmit();
  }

  async function doSubmit() {
    if (submitting) return;
    setShowSubmitConfirm(false);
    if (timerRef.current) clearInterval(timerRef.current);
    const elapsed = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : 0;
    setFinalTimeSpent(elapsed);
    setSubmitting(true);
    try {
      const raw = calcRawScore(questions, answers);
      const id = await onSubmit({
        answers,
        answerImages,
        flaggedQuestions: flagged,
        rawScore: raw,
        nmtScore: rawToNMT(raw, config.scoreTable ?? []),
        maxRaw,
        timeSpent: elapsed,
        questions: buildQuestionResults(questions, answers),
      });
      setResultId(id);
      setPhase("results");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRestart() {
    setAnswers({});
    setAnswerImages({});
    setFlagged([]);
    setResultId(null);
    setCurrentIdx(0);
    setTimeLeft(examDuration);
    setPhase("intro");
  }

  async function toggleFlag(questionId: string) {
    const next = flagged.includes(questionId)
      ? flagged.filter((id) => id !== questionId)
      : [...flagged, questionId];
    setFlagged(next);
    if (resultId && onToggleFlag) await onToggleFlag(resultId, next);
  }

  // ── INTRO ──────────────────────────────────────────────────────
  if (phase === "intro") {
    const mcqCount = questions.filter((q) => q.type === "mcq").length;
    const openCount = questions.filter((q) => q.type === "open").length;
    const maxScaled = maxScaledScore(config.scoreTable ?? []);
    return (
      <div className="-m-6 min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6">
        <div className="w-full max-w-lg space-y-6 py-8">
          <div className="text-center space-y-2">
            <div className="text-5xl">{introEmoji}</div>
            <h1 className="text-2xl font-bold">{config.title}</h1>
            {config.subtitle && (
              <p className="text-muted-foreground">{config.subtitle}</p>
            )}
          </div>

          {introNote && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">
                Від вчителя
              </p>
              <MathText text={introNote} className="text-foreground/90" />
            </div>
          )}

          <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                [String(questions.length), "Завдань"],
                [String(maxRaw), "Макс. балів"],
                ...(untimed
                  ? []
                  : [[`${config.durationMinutes ?? 150} хв`, "Часу"]]),
                [
                  `${mcqCount} × ${questions.find((q) => q.type === "mcq")?.points ?? 1}б`,
                  "Вибір",
                ],
                [
                  `${openCount} × ${questions.find((q) => q.type === "open")?.points ?? 2}б`,
                  "Відповідь",
                ],
                isNmt
                  ? ["100–200", "Шкала НМТ"]
                  : [`до ${maxScaled}`, "Шкала балів"],
              ].map(([val, label]) => (
                <div
                  key={label}
                  className="rounded-xl bg-muted/50 px-3 py-3 text-center"
                >
                  <div className="font-bold tabular-nums">{val}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {label}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border/50 pt-4 space-y-1.5 text-sm text-muted-foreground">
              <p>• Відповідь можна змінити до завершення</p>
              {!untimed && <p>• Таймер запускається після «Почати»</p>}
              {allowAnswerImages && (
                <p>• До відкритих питань можна прикріпити фото розвʼязку</p>
              )}
              {isNmt ? (
                <p>• Результат конвертується у бали НМТ (100–200)</p>
              ) : (
                <p>
                  • Результат конвертується у бали за шкалою (до {maxScaled})
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <Button
              size="lg"
              className="w-full h-12 text-base"
              onClick={() => setPhase("exam")}
            >
              {startLabel}
            </Button>
            <Link href={backHref}>
              <Button variant="ghost" className="w-full text-muted-foreground">
                Назад
              </Button>
            </Link>
          </div>

          {history.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Мої спроби
              </p>
              {history.map((r) => (
                <ResultListItem
                  key={r.id}
                  result={r}
                  href={`/dashboard/results/${r.id}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RESULTS ────────────────────────────────────────────────────
  if (phase === "results") {
    const rawScore = calcRawScore(questions, answers);
    const nmtScore = rawToNMT(rawScore, config.scoreTable ?? []);
    const resultData: TestResult = {
      id: initialResult?.resultId ?? "",
      userId: "",
      testId: config.id,
      testTitle: config.title,
      testSubtitle: config.subtitle ?? "",
      completedAt: null,
      timeSpent: finalTimeSpent,
      rawScore,
      nmtScore,
      maxRaw,
      answers,
      questions: buildQuestionResults(questions, answers),
      scoreTable: config.scoreTable ?? [],
      scaleType: config.scaleType ?? "nmt",
    };

    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {headerSlot}
          <ResultsView
            result={resultData}
            answerImages={answerImages}
            flagged={flagged}
            onToggleFlag={allowFlags ? (id) => toggleFlag(id) : undefined}
            tutorNote={tutorNote}
            tutorComments={tutorComments}
          />

          <div className="flex gap-3 pb-4">
            {allowRestart && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleRestart}
              >
                Ще раз
              </Button>
            )}
            <Link href={resultsHref} className="flex-1">
              <Button className="w-full">{resultsLabel}</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ── EXAM ───────────────────────────────────────────────────────
  const question = questions[currentIdx];
  if (!question) return null;
  const answeredCount = questions.filter((q) =>
    isAnswered(q, answers[q.id]),
  ).length;
  const isLast = currentIdx + 1 >= questions.length;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground tabular-nums">
            {answeredCount} / {questions.length}
          </span>
          {untimed ? (
            <span />
          ) : (
            <span
              className={cn(
                "tabular-nums font-bold text-lg font-mono",
                timeLeft < 600
                  ? "text-red-500"
                  : timeLeft < 1800
                    ? "text-amber-500"
                    : "",
              )}
            >
              ⏱ {formatTimer(timeLeft)}
            </span>
          )}
          <div className="flex items-center gap-2">
            {showReference && (
              <button
                onClick={openReference}
                className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <BookOpen size={17} />
              </button>
            )}
            {untimed && onProgress && (
              <Button
                size="sm"
                variant="ghost"
                onClick={saveAndExit}
                disabled={submitting}
              >
                Зберегти й вийти
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleSubmitClick}
              disabled={submitting}
            >
              Завершити
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {questions.map((q, i) => {
            const answered = isAnswered(q, answers[q.id]);
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(i)}
                className={cn(
                  "w-8 h-8 rounded-full text-xs font-bold transition-all border",
                  i === currentIdx
                    ? "bg-primary text-primary-foreground border-primary"
                    : answered
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-muted border-border/50 text-muted-foreground hover:border-primary/30",
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Завдання {currentIdx + 1}
              {question.type === "mcq" && " · Вибір відповіді"}
              {question.type === "matching" && " · Відповідність"}
              {question.type === "open" && " · Коротка відповідь"}
              {" · "}
              {question.points} {question.points === 1 ? "бал" : "бали"}
            </div>
            <MathText
              text={question.text}
              className="text-base font-medium leading-relaxed"
            />
            {question.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-border/50">
                <Image
                  src={question.imageUrl}
                  alt=""
                  width={800}
                  height={400}
                  className="w-full object-contain max-h-64"
                />
              </div>
            )}
          </div>

          {question.type === "mcq" && (
            <div className="space-y-2">
              {(question as MCQQuestion).options.map((opt) => {
                const selected = answers[question.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setAnswer(question.id, opt.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl border transition-all text-sm",
                      selected
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border/50 hover:border-primary/40 hover:bg-muted/40",
                    )}
                  >
                    {opt.imageUrl ? (
                      <div className="flex flex-col gap-2">
                        <span className="font-bold">{opt.id}</span>
                        <Image
                          src={opt.imageUrl}
                          alt={opt.id}
                          width={400}
                          height={200}
                          className="max-h-40 w-full object-contain rounded-lg"
                        />
                        {opt.text && (
                          <MathText
                            text={opt.text}
                            className="text-xs text-muted-foreground"
                          />
                        )}
                      </div>
                    ) : (
                      <>
                        <span className="font-bold mr-2">{opt.id}</span>
                        <MathText text={opt.text} />
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {question.type === "matching" && (
            <MatchingInput
              question={question as MatchingQuestion}
              value={
                answers[question.id]
                  ? (() => {
                      try {
                        return JSON.parse(answers[question.id]);
                      } catch {
                        return {};
                      }
                    })()
                  : {}
              }
              onChange={(pairs) =>
                setAnswer(question.id, JSON.stringify(pairs))
              }
            />
          )}

          {question.type === "open" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Введіть числову відповідь:
              </p>
              <input
                type="text"
                inputMode="numeric"
                value={answers[question.id] ?? ""}
                onChange={(e) => setAnswer(question.id, e.target.value)}
                placeholder="Ваша відповідь..."
                className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors"
              />
              {allowAnswerImages && (
                <AnswerPhoto
                  url={answerImages[question.id]}
                  uploading={uploadingId === question.id}
                  onSelect={(file) => handleUpload(question.id, file)}
                  onRemove={() =>
                    setAnswerImages((m) => {
                      const n = { ...m };
                      delete n[question.id];
                      return n;
                    })
                  }
                />
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
          >
            ← Попередня
          </Button>
          {isLast ? (
            <Button onClick={handleSubmitClick} disabled={submitting}>
              Завершити →
            </Button>
          ) : (
            <Button onClick={() => setCurrentIdx((i) => i + 1)}>
              Наступна →
            </Button>
          )}
        </div>
      </main>

      {showReference && (
        <button
          onClick={openReference}
          className={cn(
            "hidden md:flex fixed bottom-5 right-5 items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border/60 shadow-lg text-sm font-medium text-foreground hover:bg-muted transition-all z-50",
            drawerOpen && "opacity-0 pointer-events-none",
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          {referenceLabel}
        </button>
      )}

      {showSubmitConfirm &&
        (() => {
          const unanswered = questions.filter(
            (q) => !isAnswered(q, answers[q.id]),
          ).length;
          return (
            <div
              className="fixed inset-0 z-80 flex items-center justify-center p-4"
              onClick={() => setShowSubmitConfirm(false)}
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <div
                className="relative z-10 w-full max-w-sm rounded-2xl border border-border/60 bg-card shadow-xl p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-1">
                  <p className="font-semibold text-base">Завершити тест?</p>
                  <p className="text-sm text-muted-foreground">
                    У вас залишилось{" "}
                    <span className="font-semibold text-foreground">
                      {unanswered}
                    </span>{" "}
                    {unanswered === 1
                      ? "незаповнене питання"
                      : unanswered < 5
                        ? "незаповнені питання"
                        : "незаповнених питань"}
                    . Пропущені питання будуть зараховані як неправильні.
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowSubmitConfirm(false)}
                  >
                    Продовжити
                  </Button>
                  <Button size="sm" onClick={() => void doSubmit()}>
                    Завершити
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}

function AnswerPhoto({
  url,
  uploading,
  onSelect,
  onRemove,
}: {
  url?: string;
  uploading: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2">
      {url ? (
        <div className="relative inline-block">
          <Image
            src={url}
            alt="Фото відповіді"
            width={300}
            height={200}
            className="rounded-xl border border-border/50 object-contain max-h-48"
          />
          <button
            onClick={onRemove}
            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-black/60 text-white flex items-center justify-center text-xs hover:bg-black/80"
          >
            ✕
          </button>
        </div>
      ) : (
        <label
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:text-foreground transition-all",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          {uploading ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Завантаження...
            </>
          ) : (
            <>📷 Прикріпити фото розвʼязку</>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onSelect(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

function MatchingInput({
  question,
  value,
  onChange,
}: {
  question: MatchingQuestion;
  value: Record<string, string>;
  onChange: (pairs: Record<string, string>) => void;
}) {
  const [activeLeft, setActiveLeft] = useState<string | null>(null);

  function selectOption(optId: string) {
    if (!activeLeft) return;
    onChange({ ...value, [activeLeft]: optId });
    setActiveLeft(null);
  }
  function toggleLeft(itemId: string) {
    setActiveLeft((prev) => (prev === itemId ? null : itemId));
  }

  return (
    <div className="flex gap-3 items-start">
      <div className="flex-2 min-w-0 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 p-3 space-y-2">
        <p className="text-[11px] font-medium text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wide px-1">
          Вираз
        </p>
        {question.leftItems.map((item) => {
          const chosen = value[item.id];
          const isActive = activeLeft === item.id;
          return (
            <button
              key={item.id}
              onClick={() => toggleLeft(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left",
                isActive
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-transparent bg-white/70 dark:bg-white/5 hover:border-primary/30",
              )}
            >
              <span className="text-sm font-semibold text-muted-foreground w-5 shrink-0">
                {item.id}.
              </span>
              <MathText
                text={item.text}
                className="text-sm flex-1 leading-snug"
              />
              <span className="text-muted-foreground shrink-0">→</span>
              <span
                className={cn(
                  "w-9 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-all",
                  chosen
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-dashed border-border/50 text-muted-foreground/40",
                )}
              >
                {chosen || "?"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-w-0 rounded-2xl bg-green-50/60 dark:bg-green-950/20 border border-green-200/50 dark:border-green-800/30 p-2 space-y-1">
        <p className="text-[11px] font-medium text-green-600/70 dark:text-green-400/70 uppercase tracking-wide px-1">
          Відповідь
        </p>
        {question.rightOptions.map((opt) => {
          const usedBy = Object.entries(value).find(
            ([, v]) => v === opt.id,
          )?.[0];
          const isUsed = !!usedBy;
          return (
            <button
              key={opt.id}
              onClick={() => selectOption(opt.id)}
              disabled={!activeLeft}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-xl border-2 text-sm font-semibold transition-all text-left",
                isUsed
                  ? "border-green-400/60 bg-green-100/60 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  : activeLeft
                    ? "border-primary/40 bg-white/70 dark:bg-white/5 hover:border-primary hover:bg-primary/10 cursor-pointer"
                    : "border-transparent bg-white/70 dark:bg-white/5 text-foreground/80",
              )}
            >
              <span className="shrink-0">{opt.id}.</span>
              {opt.text && <MathText text={opt.text} className="font-normal" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
