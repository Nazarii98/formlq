"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useReferenceDrawer } from "@/context/ReferenceDrawerContext";
import { useExamGuard } from "@/context/ExamGuardContext";
import { Button } from "@/components/ui/button";
import {
  getTest,
  TestDoc,
  TestQuestion,
  MCQQuestion,
  OpenQuestion,
  MatchingQuestion,
  calcRawScore,
  rawToNMT,
  maxRawScore,
  saveTestResult,
  getUserResults,
  QuestionResult,
} from "@/lib/tests";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { BookOpen } from "lucide-react";
import { formatTimer } from "@/lib/format";
import { ResultListItem } from "@/components/exam/ResultListItem";
import { MathText } from "@/components/MathText";
import confetti from "canvas-confetti";

const DEFAULT_DURATION = 150 * 60;

function isAnswered(q: TestQuestion, answer: string | undefined): boolean {
  if (!answer) return false;
  if (q.type === "matching") {
    try {
      const p = JSON.parse(answer) as Record<string, string>;
      return q.leftItems.every((item) => !!p[item.id]);
    } catch { return false; }
  }
  return answer.trim().length > 0;
}

function isCorrect(q: TestQuestion, answer: string | undefined): boolean {
  if (!answer) return false;
  if (q.type === "mcq") return answer === q.correctOptionId;
  if (q.type === "open") return answer.trim() === q.correctAnswer.trim();
  if (q.type === "matching") {
    try {
      const p = JSON.parse(answer) as Record<string, string>;
      return Object.entries(q.correctPairs).every(([k, v]) => p[k] === v);
    } catch { return false; }
  }
  return false;
}

export default function ExamPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const { setGuarded } = useExamGuard();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { open: drawerOpen, openDrawer } = useReferenceDrawer();

  const { data: allResults = [] } = useQuery({
    queryKey: ["results", user?.uid],
    queryFn: () => getUserResults(user!.uid),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
  const testHistory = allResults.filter((r) => r.testId === id);

  const [test, setTest] = useState<TestDoc | null>(null);
  const [loadingTest, setLoadingTest] = useState(true);
  const [phase, setPhase] = useState<"intro" | "exam" | "results">("intro");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const [startTime, setStartTime] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    setGuarded(phase === "exam");
    return () => setGuarded(false);
  }, [phase]);

  useEffect(() => {
    if (phase !== "exam") return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  useEffect(() => {
    if (!user) return;
    getTest(id).then((t) => {
      if (!t) { router.replace("/dashboard"); return; }
      setTest(t);
      setTimeLeft((t.durationMinutes ?? 150) * 60);
      setLoadingTest(false);
    });
  }, [id, user, router]);

  useEffect(() => {
    if (phase !== "results" || !test) return;
    const rawScore = calcRawScore(test.questions ?? [], answers);
    const nmtScore = rawToNMT(rawScore, test.scoreTable ?? []);
    const duration = nmtScore >= 180 ? 4000 : nmtScore >= 150 ? 2500 : 1500;
    const end = Date.now() + duration;
    const colors = nmtScore >= 180
      ? ["#f59e0b", "#fbbf24", "#fde68a", "#ffffff"]
      : nmtScore >= 150
      ? ["#6366f1", "#818cf8", "#a5b4fc", "#ffffff"]
      : ["#64748b", "#94a3b8", "#cbd5e1", "#ffffff"];

    function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    }
    frame();
  }, [phase]);

  useEffect(() => {
    if (phase !== "exam") return;
    setStartTime(Date.now());
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          persistResult();
          setPhase("results");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function setAnswer(questionId: string, answer: string) {
    setAnswers((a) => ({ ...a, [questionId]: answer }));
  }

  function buildQuestionResults(qs: TestQuestion[], ans: Record<string, string>): QuestionResult[] {
    return qs.map((q) => {
      const userAnswer = ans[q.id] ?? "";
      let correct = false;
      if (q.type === "mcq") correct = userAnswer === q.correctOptionId;
      if (q.type === "open") correct = userAnswer.trim() === q.correctAnswer.trim();
      if (q.type === "matching") {
        try {
          const p = JSON.parse(userAnswer) as Record<string, string>;
          correct = Object.entries(q.correctPairs).every(([k, v]) => p[k] === v);
        } catch { correct = false; }
      }
      const base = { id: q.id, type: q.type, text: q.text, imageUrl: q.imageUrl ?? null, points: q.points, userAnswer, isCorrect: correct, explanation: q.explanation ?? "", explanationImageUrl: q.explanationImageUrl ?? null };
      if (q.type === "mcq") return { ...base, options: q.options, correctOptionId: q.correctOptionId };
      if (q.type === "open") return { ...base, correctAnswer: q.correctAnswer };
      return { ...base, leftItems: q.leftItems, rightOptions: q.rightOptions, correctPairs: q.correctPairs };
    });
  }

  async function persistResult(currentAnswers = answers) {
    if (!test || !user) return;
    const qs = test.questions ?? [];
    const raw = calcRawScore(qs, currentAnswers);
    const nmt = rawToNMT(raw, test.scoreTable ?? []);
    const elapsed = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    await saveTestResult({
      userId: user.uid,
      testId: test.id,
      testTitle: test.title,
      testSubtitle: test.subtitle ?? "",
      timeSpent: elapsed,
      rawScore: raw,
      nmtScore: nmt,
      maxRaw: maxRawScore(qs),
      answers: currentAnswers,
      questions: buildQuestionResults(qs, currentAnswers),
      scoreTable: test.scoreTable ?? [],
    });

    // recalc streak
    const allResults = await getUserResults(user.uid);
    const activeDays = new Set(
      allResults
        .filter((r) => r.completedAt)
        .map((r) => {
          const d = r.completedAt!.toDate();
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        })
    );
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (activeDays.has(key)) streak++;
      else break;
    }
    await updateDoc(doc(db, "users", user.uid), { streak });
    await refreshProfile();
    queryClient.invalidateQueries({ queryKey: ["results", user.uid] });
  }

  function handleSubmit() {
    const unanswered = questions.filter((q) => !isAnswered(q, answers[q.id])).length;
    if (unanswered > 0) {
      setShowSubmitConfirm(true);
      return;
    }
    doSubmit();
  }

  function doSubmit() {
    setShowSubmitConfirm(false);
    if (timerRef.current) clearInterval(timerRef.current);
    persistResult(answers);
    setPhase("results");
  }

  function handleRestart() {
    setAnswers({});
    setCurrentIdx(0);
    setTimeLeft((test?.durationMinutes ?? 150) * 60);
    setStartTime(0);
    setPhase("intro");
  }

  if (authLoading || loadingTest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!test || !user) return null;

  const questions = test.questions ?? [];
  const maxRaw = maxRawScore(questions);
  const examDuration = (test.durationMinutes ?? 150) * 60;

  // ── INTRO ──────────────────────────────────────────────────────
  if (phase === "intro") {
    const mcqCount = questions.filter((q) => q.type === "mcq").length;
    const openCount = questions.filter((q) => q.type === "open").length;
    const mcqPoints = questions.filter((q) => q.type === "mcq").reduce((s, q) => s + q.points, 0);
    const openPoints = questions.filter((q) => q.type === "open").reduce((s, q) => s + q.points, 0);

    return (
      <div className="-m-6 min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6">
        <div className="w-full max-w-lg space-y-6 py-8">
          <div className="text-center space-y-2">
            <div className="text-5xl">📝</div>
            <h1 className="text-2xl font-bold">{test.title}</h1>
            {test.subtitle && <p className="text-muted-foreground">{test.subtitle}</p>}
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                [String(questions.length), "Завдань"],
                [String(maxRaw), "Макс. балів"],
                [`${test.durationMinutes ?? 150} хв`, "Часу"],
                [`${mcqCount} × ${questions.find(q=>q.type==="mcq")?.points ?? 1}б`, "Вибір"],
                [`${openCount} × ${questions.find(q=>q.type==="open")?.points ?? 2}б`, "Відповідь"],
                ["100–200", "Шкала НМТ"],
              ].map(([val, label]) => (
                <div key={label} className="rounded-xl bg-muted/50 px-3 py-3 text-center">
                  <div className="font-bold tabular-nums">{val}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-border/50 pt-4 space-y-1.5 text-sm text-muted-foreground">
              <p>• Відповідь можна змінити до завершення</p>
              <p>• Таймер запускається після «Почати»</p>
              <p>• Результат конвертується у бали НМТ (100–200)</p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <Button size="lg" className="w-full h-12 text-base" onClick={() => setPhase("exam")}>
              Почати іспит →
            </Button>
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full text-muted-foreground">Назад</Button>
            </Link>
          </div>

          {testHistory.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Мої спроби</p>
              {testHistory.map((r) => (
                <ResultListItem key={r.id} result={r} href={`/dashboard/results/${r.id}`} />
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
    const nmtScore = rawToNMT(rawScore, test.scoreTable ?? []);
    const failed = rawScore < 5;
    const emoji = nmtScore >= 180 ? "🏆" : nmtScore >= 160 ? "🎉" : nmtScore >= 140 ? "👍" : "💪";

    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* Score header */}
          <div className="rounded-2xl border border-border/50 bg-card p-6 text-center space-y-1">
            <div className="text-4xl mb-2">{failed ? "❌" : emoji}</div>
            {failed ? (
              <>
                <div className="text-3xl font-bold text-red-500">Не склав</div>
                <p className="text-muted-foreground text-sm">менше 5 балів — тест не зараховано</p>
              </>
            ) : (
              <>
                <div className="text-5xl font-bold tabular-nums">{nmtScore}</div>
                <p className="text-muted-foreground text-sm">балів НМТ (з 200)</p>
              </>
            )}
            <div className="flex justify-center gap-4 pt-3 text-sm text-muted-foreground">
              <span>Сирий бал: <b className="text-foreground">{rawScore}/{maxRaw}</b></span>
              <span>Час: <b className="text-foreground">{formatTimer(examDuration - timeLeft)}</b></span>
            </div>
          </div>

          {/* Quick map */}
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, i) => {
              const correct = isCorrect(q, answers[q.id]);
              const answered = isAnswered(q, answers[q.id]);
              return (
                <a key={q.id} href={`#q-${i}`}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all",
                    correct ? "bg-green-500/15 border-green-500/40 text-green-600 dark:text-green-400"
                    : answered ? "bg-red-500/15 border-red-500/40 text-red-500"
                    : "bg-muted border-border/50 text-muted-foreground"
                  )}>
                    {i + 1}
                  </div>
                </a>
              );
            })}
          </div>

          {/* Question breakdown */}
          <div className="space-y-3">
            {questions.map((q, i) => {
              const correct = isCorrect(q, answers[q.id]);
              const userAnswer = answers[q.id] ?? "";

              let userLabel = "—";
              let correctLabel = "";

              if (q.type === "mcq") {
                const uOpt = (q as MCQQuestion).options.find((o) => o.id === userAnswer);
                const cOpt = (q as MCQQuestion).options.find((o) => o.id === (q as MCQQuestion).correctOptionId);
                userLabel = uOpt ? `${uOpt.id}. ${uOpt.text}` : userAnswer || "—";
                correctLabel = cOpt ? `${cOpt.id}. ${cOpt.text}` : "";
              } else if (q.type === "open") {
                userLabel = userAnswer || "—";
                correctLabel = (q as OpenQuestion).correctAnswer;
              } else if (q.type === "matching") {
                try {
                  const parsed = JSON.parse(userAnswer) as Record<string, string>;
                  userLabel = Object.entries(parsed).map(([k, v]) => `${k}→${v}`).join(", ") || "—";
                } catch { userLabel = "—"; }
                correctLabel = Object.entries((q as MatchingQuestion).correctPairs).map(([k, v]) => `${k}→${v}`).join(", ");
              }

              return (
                <div
                  id={`q-${i}`}
                  key={q.id}
                  className={cn(
                    "rounded-2xl border p-5 space-y-3",
                    correct ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <span className={cn(
                      "shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5",
                      correct ? "bg-green-500/20 text-green-600 dark:text-green-400" : "bg-red-500/20 text-red-500"
                    )}>
                      {correct ? "✓" : "✗"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Завдання {i + 1} · {q.points} б</p>
                      <MathText text={q.text || "—"} className="text-sm text-foreground leading-relaxed" />
                      {q.imageUrl && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-border/50">
                          <Image src={q.imageUrl} alt="" width={800} height={400} className="w-full object-contain max-h-56" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Answers */}
                  <div className="pl-9 space-y-1.5 text-sm">
                    <div className="flex gap-2">
                      <span className="text-muted-foreground shrink-0 whitespace-nowrap">Ваша:</span>
                      <span className={correct ? "text-green-600 dark:text-green-400" : "text-red-500"}>{userLabel}</span>
                    </div>
                    {!correct && correctLabel && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground shrink-0 whitespace-nowrap">Правильна:</span>
                        <span className="text-green-600 dark:text-green-400">{correctLabel}</span>
                      </div>
                    )}
                  </div>

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="pl-9">
                      <details className="group">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-1 select-none">
                          <span className="group-open:rotate-90 transition-transform inline-block">›</span>
                          Пояснення
                        </summary>
                        <MathText text={q.explanation} className="block mt-2 text-sm text-foreground/80 leading-relaxed border-l-2 border-border pl-3" />
                        {q.explanationImageUrl && (
                          <div className="mt-3 rounded-xl overflow-hidden border border-border/50">
                            <Image src={q.explanationImageUrl} alt="" width={800} height={400} className="w-full object-contain max-h-64" />
                          </div>
                        )}
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pb-4">
            <Button variant="outline" className="flex-1" onClick={handleRestart}>Ще раз</Button>
            <Link href="/dashboard" className="flex-1">
              <Button className="w-full">На головну</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ── EXAM ───────────────────────────────────────────────────────
  const question = questions[currentIdx];
  if (!question) return null;
  const answeredCount = questions.filter((q) => isAnswered(q, answers[q.id])).length;
  const isLast = currentIdx + 1 >= questions.length;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground tabular-nums">
            {answeredCount} / {questions.length}
          </span>
          <span className={cn(
            "tabular-nums font-bold text-lg font-mono",
            timeLeft < 600 ? "text-red-500" : timeLeft < 1800 ? "text-amber-500" : ""
          )}>
            ⏱ {formatTimer(timeLeft)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={openDrawer}
              className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <BookOpen size={17} />
            </button>
            <Button size="sm" variant="outline" onClick={handleSubmit}>Завершити</Button>
          </div>
        </div>

        {/* Question grid */}
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
                    : "bg-muted border-border/50 text-muted-foreground hover:border-primary/30"
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Question card */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Завдання {currentIdx + 1}
              {question.type === "mcq" && " · Вибір відповіді"}
              {question.type === "matching" && " · Відповідність"}
              {question.type === "open" && " · Коротка відповідь"}
              {" · "}{question.points} {question.points === 1 ? "бал" : "бали"}
            </div>
            <MathText text={question.text} className="text-base font-medium leading-relaxed" />
          {question.imageUrl && (
            <div className="rounded-xl overflow-hidden border border-border/50">
              <Image src={question.imageUrl} alt="" width={800} height={400} className="w-full object-contain max-h-64" />
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
                        : "border-border/50 hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    {opt.imageUrl ? (
                      <div className="flex flex-col gap-2">
                        <span className="font-bold">{opt.id}</span>
                        <Image src={opt.imageUrl} alt={opt.id} width={400} height={200} className="max-h-40 w-full object-contain rounded-lg" />
                        {opt.text && <MathText text={opt.text} className="text-xs text-muted-foreground" />}
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
              value={answers[question.id] ? (() => { try { return JSON.parse(answers[question.id]); } catch { return {}; } })() : {}}
              onChange={(pairs) => setAnswer(question.id, JSON.stringify(pairs))}
            />
          )}

          {question.type === "open" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Введіть числову відповідь:</p>
              <input
                type="text"
                inputMode="numeric"
                value={answers[question.id] ?? ""}
                onChange={(e) => setAnswer(question.id, e.target.value)}
                placeholder="Ваша відповідь..."
                className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} disabled={currentIdx === 0}>
            ← Попередня
          </Button>
          {isLast ? (
            <Button onClick={handleSubmit}>Завершити →</Button>
          ) : (
            <Button onClick={() => setCurrentIdx((i) => i + 1)}>Наступна →</Button>
          )}
        </div>
      </main>

      {/* Reference button — desktop only */}
      <button
        onClick={openDrawer}
        className={cn(
          "hidden md:flex fixed bottom-5 right-5 items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border/60 shadow-lg text-sm font-medium text-foreground hover:bg-muted transition-all z-50",
          drawerOpen && "opacity-0 pointer-events-none",
        )}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        Довідка
      </button>

      {/* Submit confirmation modal */}
      {showSubmitConfirm && (() => {
        const unanswered = questions.filter((q) => !isAnswered(q, answers[q.id])).length;
        return (
          <div className="fixed inset-0 z-80 flex items-center justify-center p-4" onClick={() => setShowSubmitConfirm(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
              className="relative z-10 w-full max-w-sm rounded-2xl border border-border/60 bg-card shadow-xl p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-1">
                <p className="font-semibold text-base">Завершити тест?</p>
                <p className="text-sm text-muted-foreground">
                  У вас залишилось <span className="font-semibold text-foreground">{unanswered}</span> {unanswered === 1 ? "незаповнене питання" : unanswered < 5 ? "незаповнені питання" : "незаповнених питань"}.
                  Пропущені питання будуть зараховані як неправильні.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setShowSubmitConfirm(false)}>
                  Продовжити
                </Button>
                <Button size="sm" onClick={doSubmit}>
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
      {/* Left panel */}
      <div className="flex-2 min-w-0 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 p-3 space-y-2">
        <p className="text-[11px] font-medium text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wide px-1">Вираз</p>
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
                  : "border-transparent bg-white/70 dark:bg-white/5 hover:border-primary/30"
              )}
            >
              <span className="text-sm font-semibold text-muted-foreground w-5 shrink-0">{item.id}.</span>
              <MathText text={item.text} className="text-sm flex-1 leading-snug" />
              <span className="text-muted-foreground shrink-0">→</span>
              <span className={cn(
                "w-9 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-all",
                chosen
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-dashed border-border/50 text-muted-foreground/40"
              )}>
                {chosen || "?"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0 rounded-2xl bg-green-50/60 dark:bg-green-950/20 border border-green-200/50 dark:border-green-800/30 p-2 space-y-1">
        <p className="text-[11px] font-medium text-green-600/70 dark:text-green-400/70 uppercase tracking-wide px-1">Відповідь</p>
        {question.rightOptions.map((opt) => {
          const usedBy = Object.entries(value).find(([, v]) => v === opt.id)?.[0];
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
                  : "border-transparent bg-white/70 dark:bg-white/5 text-foreground/80"
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
