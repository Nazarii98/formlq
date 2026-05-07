"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
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
  QuestionResult,
} from "@/lib/tests";
import Link from "next/link";
import { cn } from "@/lib/utils";

const EXAM_DURATION = 150 * 60;

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [test, setTest] = useState<TestDoc | null>(null);
  const [loadingTest, setLoadingTest] = useState(true);
  const [phase, setPhase] = useState<"intro" | "exam" | "results">("intro");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION);
  const [startTime, setStartTime] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    getTest(id).then((t) => {
      if (!t) { router.replace("/dashboard"); return; }
      setTest(t);
      setLoadingTest(false);
    });
  }, [id, user, router]);

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
      const base = { id: q.id, type: q.type, text: q.text, points: q.points, userAnswer, isCorrect: correct };
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
      testSubtitle: test.subtitle,
      timeSpent: elapsed,
      rawScore: raw,
      nmtScore: nmt,
      maxRaw: maxRawScore(qs),
      answers: currentAnswers,
      questions: buildQuestionResults(qs, currentAnswers),
      scoreTable: test.scoreTable ?? [],
    });
  }

  function handleSubmit() {
    if (timerRef.current) clearInterval(timerRef.current);
    persistResult(answers);
    setPhase("results");
  }

  function handleRestart() {
    setAnswers({});
    setCurrentIdx(0);
    setTimeLeft(EXAM_DURATION);
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

  // ── INTRO ──────────────────────────────────────────────────────
  if (phase === "intro") {
    const mcqCount = questions.filter((q) => q.type === "mcq").length;
    const openCount = questions.filter((q) => q.type === "open").length;
    const mcqPoints = questions.filter((q) => q.type === "mcq").reduce((s, q) => s + q.points, 0);
    const openPoints = questions.filter((q) => q.type === "open").reduce((s, q) => s + q.points, 0);

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-16 space-y-8">
          <div className="text-center space-y-3">
            <div className="text-5xl">📝</div>
            <h1 className="text-2xl font-bold">{test.title}</h1>
            {test.subtitle && <p className="text-muted-foreground text-sm">{test.subtitle}</p>}
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                [String(questions.length), "Завдань"],
                ["150 хв", "Часу"],
                [`${mcqCount} × ${questions.find(q=>q.type==="mcq")?.points ?? 1} бал`, "Тест з вибором"],
                [`${openCount} × ${questions.find(q=>q.type==="open")?.points ?? 2} бали`, "Коротка відповідь"],
                [String(maxRaw), "Балів максимум"],
                ["100–200", "Шкала НМТ"],
              ].map(([val, label]) => (
                <div key={label} className="rounded-xl bg-muted/50 p-3 text-center">
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

          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full h-12 text-base" onClick={() => setPhase("exam")}>
              Почати іспит →
            </Button>
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full text-muted-foreground">Назад</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ── RESULTS ────────────────────────────────────────────────────
  if (phase === "results") {
    const rawScore = calcRawScore(questions, answers);
    const nmtScore = rawToNMT(rawScore, test.scoreTable ?? []);
    const emoji = nmtScore >= 180 ? "🏆" : nmtScore >= 160 ? "🎉" : nmtScore >= 140 ? "👍" : "💪";

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-md mx-auto px-4 py-12 space-y-6">
          <div className="text-center space-y-1">
            <div className="text-4xl mb-2">{emoji}</div>
            <div className="text-4xl font-bold text-primary tabular-nums">{nmtScore}</div>
            <p className="text-muted-foreground text-sm">балів НМТ (з 200)</p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Результати</p>
            <div className="flex flex-wrap gap-2">
              {questions.map((q, i) => {
                const correct = isCorrect(q, answers[q.id]);
                const answered = isAnswered(q, answers[q.id]);
                return (
                  <div
                    key={q.id}
                    title={`Завд. ${i + 1}: ${correct ? "правильно" : answered ? "неправильно" : "не відповіли"}`}
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border",
                      correct
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : answered
                        ? "bg-red-500/15 border-red-500/40 text-red-500"
                        : "bg-muted border-border/50 text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border/50 pt-4 space-y-3 text-sm">
              <div className="flex justify-between font-semibold text-base">
                <span>Сума балів</span>
                <span className="tabular-nums">{rawScore} / {maxRaw}</span>
              </div>
              {["mcq", "matching", "open"].map((type) => {
                const qs = questions.filter((q) => q.type === type);
                if (!qs.length) return null;
                const correct = qs.filter((q) => isCorrect(q, answers[q.id]));
                const earned = correct.reduce((s, q) => s + q.points, 0);
                const total = qs.reduce((s, q) => s + q.points, 0);
                return (
                  <div key={type} className="flex justify-between text-muted-foreground">
                    <span>{type === "mcq" ? "Тест з вибором" : type === "matching" ? "Відповідність" : "Коротка відповідь"}</span>
                    <span className="tabular-nums">{earned} / {total}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
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
  const answeredCount = questions.filter((q) => isAnswered(q, answers[q.id])).length;
  const isLast = currentIdx + 1 >= questions.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
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
            ⏱ {formatTime(timeLeft)}
          </span>
          <Button size="sm" variant="outline" onClick={handleSubmit}>Завершити</Button>
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
            <p className="text-base font-medium leading-relaxed">{question.text}</p>
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
                    <span className="font-bold mr-2">{opt.id}</span>
                    {opt.text}
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

      {/* Reference button */}
      <a
        href="/dovidka.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border/60 shadow-lg text-sm font-medium text-foreground hover:bg-muted transition-all z-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        Довідка
      </a>
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
              <span className="text-sm flex-1 leading-snug">{item.text}</span>
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
      <div className="w-24 rounded-2xl bg-green-50/60 dark:bg-green-950/20 border border-green-200/50 dark:border-green-800/30 p-2 space-y-1">
        <p className="text-[11px] font-medium text-green-600/70 dark:text-green-400/70 uppercase tracking-wide px-1">Точка</p>
        {question.rightOptions.map((opt) => {
          const usedBy = Object.entries(value).find(([, v]) => v === opt.id)?.[0];
          const isUsed = !!usedBy;
          return (
            <button
              key={opt.id}
              onClick={() => selectOption(opt.id)}
              disabled={!activeLeft}
              className={cn(
                "w-full px-2 py-1.5 rounded-xl border-2 text-sm font-semibold transition-all",
                isUsed
                  ? "border-green-400/60 bg-green-100/60 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  : activeLeft
                  ? "border-primary/40 bg-white/70 dark:bg-white/5 hover:border-primary hover:bg-primary/10 cursor-pointer"
                  : "border-transparent bg-white/70 dark:bg-white/5 text-foreground/80"
              )}
            >
              {opt.id}{opt.text ? `. ${opt.text}` : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
