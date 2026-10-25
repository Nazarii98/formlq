"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AlertTriangle, BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import { ResultsView } from "@/components/exam/ResultsView";
import { ExamIntro } from "@/components/exam/ExamIntro";
import { ExamTimer } from "@/components/exam/ExamTimer";
import { QuestionNav } from "@/components/exam/QuestionNav";
import { QuestionView } from "@/components/exam/QuestionView";
import { SubmitConfirmDialog } from "@/components/exam/SubmitConfirmDialog";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useReferenceDrawer } from "@/context/ReferenceDrawerContext";
import { useExamGuard } from "@/context/ExamGuardContext";
import {
  buildQuestionResults,
  countUnanswered,
} from "@/lib/exam-scoring";
import {
  TestQuestion,
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
  /** null hides the intro "Назад" button. */
  backHref?: string | null;
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

type Progress = {
  answers: Record<string, string>;
  answerImages: Record<string, string>;
};

const AUTOSAVE_DELAY_MS = 800;

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

  const showReference = notesPdfUrl ? true : !hideReference;
  const referenceLabel = notesPdfUrl ? "Конспект" : "Довідка";
  const openReference = () =>
    openDrawer(
      notesPdfUrl ? { url: notesPdfUrl, title: "Конспект" } : undefined,
    );

  const questions = useMemo(() => config.questions ?? [], [config.questions]);
  const scoreTable = useMemo(() => config.scoreTable ?? [], [config.scoreTable]);
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
  const [finalTimeSpent, setFinalTimeSpent] = useState(
    initialResult?.timeSpent ?? 0,
  );
  const startTimeRef = useRef<number>(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /** Last submit failed (network etc.) — answers are kept, offer a retry. */
  const [submitFailed, setSubmitFailed] = useState(false);
  const submittingRef = useRef(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  /** Answers not yet handed to onProgress (debounce pending). */
  const pendingProgressRef = useRef<Progress | null>(null);
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

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

  // Elapsed time is recorded for every attempt (the countdown lives in ExamTimer).
  useEffect(() => {
    if (phase === "exam") startTimeRef.current = Date.now();
  }, [phase]);

  // Autosave in-progress answers (debounced) so the student can resume later.
  // Keyed on the data only — a new onProgress identity must not re-trigger a save.
  const autosave = !!onProgress;
  useEffect(() => {
    if (phase !== "exam" || !autosave) return;
    pendingProgressRef.current = { answers, answerImages };
    const t = setTimeout(() => {
      pendingProgressRef.current = null;
      onProgressRef.current?.(answers, answerImages);
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [answers, answerImages, phase, autosave]);

  // Leaving mid-exam within the debounce window → flush instead of dropping edits.
  useEffect(() => {
    return () => {
      const pending = pendingProgressRef.current;
      pendingProgressRef.current = null;
      if (pending) onProgressRef.current?.(pending.answers, pending.answerImages);
    };
  }, []);

  function saveAndExit() {
    pendingProgressRef.current = null;
    onProgress?.(answers, answerImages);
    setGuarded(false);
    if (backHref) router.push(backHref);
  }

  const setAnswer = useCallback((questionId: string, answer: string) => {
    setAnswers((a) => ({ ...a, [questionId]: answer }));
  }, []);

  async function handleUpload(questionId: string, file: File) {
    if (!uploadImage) return;
    setUploadingId(questionId);
    try {
      const url = await uploadImage(questionId, file);
      setAnswerImages((m) => ({ ...m, [questionId]: url }));
    } catch {
      toast.error("Не вдалося завантажити фото. Спробуйте ще раз");
    } finally {
      setUploadingId(null);
    }
  }

  function removeImage(questionId: string) {
    setAnswerImages((m) => {
      const n = { ...m };
      delete n[questionId];
      return n;
    });
  }

  const unanswered =
    phase === "exam" ? countUnanswered(questions, answers) : 0;

  // Finishing is irreversible, so it always asks — even with every question answered.
  function handleSubmitClick() {
    setShowSubmitConfirm(true);
  }

  async function doSubmit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    // The attempt is being finalised — don't autosave it as in-progress.
    pendingProgressRef.current = null;
    setShowSubmitConfirm(false);
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
        nmtScore: rawToNMT(raw, scoreTable),
        maxRaw,
        timeSpent: elapsed,
        questions: buildQuestionResults(questions, answers),
      });
      setResultId(id);
      setSubmitFailed(false);
      setPhase("results");
    } catch {
      setSubmitFailed(true);
      toast.error("Не вдалося надіслати відповіді. Перевірте з'єднання");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function handleRestart() {
    setAnswers({});
    setAnswerImages({});
    setFlagged([]);
    setResultId(null);
    setCurrentIdx(0);
    setPhase("intro");
  }

  async function toggleFlag(questionId: string) {
    const next = flagged.includes(questionId)
      ? flagged.filter((id) => id !== questionId)
      : [...flagged, questionId];
    setFlagged(next);
    if (resultId && onToggleFlag) await onToggleFlag(resultId, next);
  }

  // Scored result — computed once per finished attempt, not on every render.
  const initialResultId = initialResult?.resultId ?? "";
  const resultData = useMemo<TestResult | null>(() => {
    if (phase !== "results") return null;
    const rawScore = calcRawScore(questions, answers);
    return {
      id: initialResultId,
      userId: "",
      testId: config.id,
      testTitle: config.title,
      testSubtitle: config.subtitle ?? "",
      completedAt: null,
      timeSpent: finalTimeSpent,
      rawScore,
      nmtScore: rawToNMT(rawScore, scoreTable),
      maxRaw,
      answers,
      questions: buildQuestionResults(questions, answers),
      scoreTable,
      scaleType: config.scaleType ?? "nmt",
    };
  }, [
    phase,
    questions,
    answers,
    initialResultId,
    config.id,
    config.title,
    config.subtitle,
    config.scaleType,
    finalTimeSpent,
    scoreTable,
    maxRaw,
  ]);

  // Celebration intensity (0–100) for a freshly finished attempt.
  const celebratePct = useMemo(() => {
    if (!resultData || reviewing) return null;
    const nmtScore = resultData.nmtScore;
    const maxScaled = isNmt ? 200 : maxScaledScore(scoreTable);
    return isNmt
      ? Math.max(0, nmtScore - 100)
      : maxScaled
        ? (nmtScore / maxScaled) * 100
        : 0;
  }, [resultData, reviewing, isNmt, scoreTable]);

  // Confetti on results; library loaded lazily, animation stopped on unmount.
  useEffect(() => {
    if (celebratePct === null) return;
    const pct = celebratePct;
    let cancelled = false;
    let raf = 0;
    let reset: (() => void) | null = null;
    void import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      reset = () => confetti.reset();
      const duration = pct >= 80 ? 4000 : pct >= 50 ? 2500 : 1500;
      const end = Date.now() + duration;
      const colors =
        pct >= 80
          ? ["#f59e0b", "#fbbf24", "#fde68a", "#ffffff"]
          : pct >= 50
            ? ["#6366f1", "#818cf8", "#a5b4fc", "#ffffff"]
            : ["#64748b", "#94a3b8", "#cbd5e1", "#ffffff"];
      const frame = () => {
        if (cancelled) return;
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end) raf = requestAnimationFrame(frame);
      };
      frame();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      reset?.();
    };
  }, [celebratePct]);

  // ── INTRO ──────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <ExamIntro
        config={config}
        questions={questions}
        maxRaw={maxRaw}
        isNmt={isNmt}
        untimed={untimed}
        allowAnswerImages={allowAnswerImages}
        introNote={introNote}
        introEmoji={introEmoji}
        startLabel={startLabel}
        backHref={backHref}
        history={history}
        onStart={() => setPhase("exam")}
      />
    );
  }

  // ── RESULTS ────────────────────────────────────────────────────
  if (phase === "results") {
    if (!resultData) return null;
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
  const isLast = currentIdx + 1 >= questions.length;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Sticky so the timer and "Завершити" stay in reach on long questions.
            --app-header-h is set by AppShell; 0 on the header-less public page. */}
        <div className="sticky top-[var(--app-header-h,0px)] z-40 -mx-4 px-4 py-2 flex items-center justify-between gap-3 bg-background/90 backdrop-blur-md">
          <span className="text-sm text-muted-foreground tabular-nums">
            {questions.length - unanswered} / {questions.length}
          </span>
          {untimed ? (
            <span />
          ) : (
            <ExamTimer
              durationSeconds={examDuration}
              paused={submitting}
              onExpire={() => void doSubmit()}
            />
          )}
          <div className="flex items-center gap-2">
            {showReference && (
              <IconButton
                label={referenceLabel}
                size="md"
                onClick={openReference}
                className="md:hidden rounded-xl"
              >
                <BookOpen size={17} />
              </IconButton>
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

        {submitFailed && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span className="flex-1">
              Відповіді не надіслано — вони збережені на цій сторінці. Не закривайте
              її і спробуйте ще раз.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void doSubmit()}
              disabled={submitting}
            >
              {submitting ? "Надсилаю…" : "Спробувати ще раз"}
            </Button>
          </div>
        )}

        <QuestionNav
          questions={questions}
          answers={answers}
          currentIdx={currentIdx}
          onSelect={setCurrentIdx}
        />

        <QuestionView
          question={question}
          index={currentIdx}
          answer={answers[question.id]}
          onAnswer={setAnswer}
          allowAnswerImages={allowAnswerImages}
          answerImage={answerImages[question.id]}
          uploading={uploadingId === question.id}
          onUploadImage={handleUpload}
          onRemoveImage={removeImage}
        />

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
          type="button"
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

      <SubmitConfirmDialog
        open={showSubmitConfirm}
        unanswered={unanswered}
        total={questions.length}
        onCancel={() => setShowSubmitConfirm(false)}
        onConfirm={() => void doSubmit()}
      />
    </div>
  );
}
