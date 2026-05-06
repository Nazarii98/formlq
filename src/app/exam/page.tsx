"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { EXAM_QUESTIONS, calcRawScore, rawToNMT, MAX_RAW_SCORE } from "@/lib/exam-questions";
import { ExamQuestion, MatchingExamQuestion } from "@/types";
import Link from "next/link";
import { cn } from "@/lib/utils";

const EXAM_DURATION = 150 * 60;

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function isAnswered(q: ExamQuestion, answer: string | undefined): boolean {
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

function isCorrect(q: ExamQuestion, answer: string | undefined): boolean {
  if (!answer) return false;
  if (q.type === "mcq") return answer === q.correctOptionId;
  if (q.type === "open") return answer.trim() === q.correctAnswer.trim();
  if (q.type === "matching") {
    try {
      const p = JSON.parse(answer) as Record<string, string>;
      return Object.entries(q.correctPairs).every(([k, v]) => p[k] === v);
    } catch {
      return false;
    }
  }
  return false;
}

export default function ExamPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [phase, setPhase] = useState<"intro" | "exam" | "results">("intro");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION);
  const [showRef, setShowRef] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (phase !== "exam") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("results");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  function setAnswer(questionId: string, answer: string) {
    setAnswers((a) => ({ ...a, [questionId]: answer }));
  }

  function handleSubmit() {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("results");
  }

  function handleRestart() {
    setAnswers({});
    setCurrentIdx(0);
    setTimeLeft(EXAM_DURATION);
    setShowRef(false);
    setPhase("intro");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── INTRO ─────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-16 space-y-8">
          <div className="text-center space-y-3">
            <div className="text-5xl">📝</div>
            <h1 className="text-2xl font-bold">Пробний НМТ з математики</h1>
            <p className="text-muted-foreground text-sm">Симуляція реального іспиту НМТ 2026</p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["22", "Завдань"],
                ["150 хв", "Часу"],
                ["15 × 1 бал", "Тест з вибором"],
                ["3 × 3 бали", "Відповідність"],
                ["4 × 2 бали", "Коротка відповідь"],
                ["32", "Балів максимум"],
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

  // ── RESULTS ───────────────────────────────────────────────────
  if (phase === "results") {
    const rawScore = calcRawScore(EXAM_QUESTIONS, answers);
    const nmtScore = rawToNMT(rawScore);
    const emoji = nmtScore >= 180 ? "🏆" : nmtScore >= 160 ? "🎉" : nmtScore >= 140 ? "👍" : "💪";

    const mcqCorrect = EXAM_QUESTIONS.filter(
      (q) => q.type === "mcq" && isCorrect(q, answers[q.id])
    ).length;
    const matchCorrect = EXAM_QUESTIONS.filter(
      (q) => q.type === "matching" && isCorrect(q, answers[q.id])
    ).length;
    const openCorrect = EXAM_QUESTIONS.filter(
      (q) => q.type === "open" && isCorrect(q, answers[q.id])
    ).length;

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-md mx-auto px-4 py-12 space-y-6">
          <div className="text-center space-y-1">
            <div className="text-4xl mb-2">{emoji}</div>
            <div className="text-4xl font-bold text-primary tabular-nums">{nmtScore}</div>
            <p className="text-muted-foreground text-sm">балів НМТ (з 200)</p>
          </div>

          {/* Question circles */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Результати тесту
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAM_QUESTIONS.map((q, i) => {
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

            {/* Score breakdown */}
            <div className="border-t border-border/50 pt-4 space-y-3 text-sm">
              <div className="flex justify-between font-semibold text-base">
                <span>Сума балів</span>
                <span className="tabular-nums">{rawScore} / {MAX_RAW_SCORE}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Тест з вибором (15 × 1 бал)</span>
                <span className="tabular-nums">{mcqCorrect} / 15</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Відповідність (3 × 3 бали)</span>
                <span className="tabular-nums">{matchCorrect * 3} / 9</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Коротка відповідь (4 × 2 бали)</span>
                <span className="tabular-nums">{openCorrect * 2} / 8</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleRestart}>
              Ще раз
            </Button>
            <Link href="/dashboard" className="flex-1">
              <Button className="w-full">На головну</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ── EXAM ──────────────────────────────────────────────────────
  const question = EXAM_QUESTIONS[currentIdx];
  const answeredCount = EXAM_QUESTIONS.filter((q) => isAnswered(q, answers[q.id])).length;
  const isLast = currentIdx + 1 >= EXAM_QUESTIONS.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">

        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground tabular-nums">
            {answeredCount} / {EXAM_QUESTIONS.length}
          </span>
          <span className={cn(
            "tabular-nums font-bold text-lg font-mono",
            timeLeft < 600 ? "text-red-500" : timeLeft < 1800 ? "text-amber-500" : ""
          )}>
            ⏱ {formatTime(timeLeft)}
          </span>
          <Button size="sm" variant="outline" onClick={handleSubmit}>
            Завершити
          </Button>
        </div>

        {/* Question grid */}
        <div className="flex flex-wrap gap-1.5">
          {EXAM_QUESTIONS.map((q, i) => {
            const answered = isAnswered(q, answers[q.id]);
            return (
              <button
                key={q.id}
                onClick={() => { setCurrentIdx(i); setShowRef(false); }}
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
          {/* Question header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Завдання {currentIdx + 1}
                {question.type === "mcq" && " · Вибір відповіді"}
                {question.type === "matching" && " · Встановлення відповідності"}
                {question.type === "open" && " · Коротка відповідь"}
                {question.type === "mcq" && " · 1 бал"}
                {question.type === "matching" && " · 3 бали"}
                {question.type === "open" && " · 2 бали"}
              </div>
              <p className="text-base font-medium leading-relaxed">{question.text}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 text-xs"
              onClick={() => setShowRef((v) => !v)}
            >
              Довідка
            </Button>
          </div>

          {/* Reference panel */}
          {showRef && (
            <div className="rounded-xl bg-muted/50 border border-border/50 p-4 text-sm space-y-2">
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Довідкові формули</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <span>Площа трикутника: ½·b·h</span>
                <span>Площа кола: πr²</span>
                <span>Площа трапеції: (a+b)/2·h</span>
                <span>Довжина кола: 2πr</span>
                <span>Теорема Піфагора: a²+b²=c²</span>
                <span>C(n,k) = n!/(k!(n−k)!)</span>
                <span>Вієта: x₁+x₂ = −b/a</span>
                <span>f′(xⁿ) = n·xⁿ⁻¹</span>
              </div>
            </div>
          )}

          {/* MCQ */}
          {question.type === "mcq" && (
            <div className="space-y-2">
              {question.options.map((opt) => {
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

          {/* Matching grid */}
          {question.type === "matching" && (
            <MatchingGrid
              question={question as MatchingExamQuestion}
              value={answers[question.id] ? (JSON.parse(answers[question.id]) as Record<string, string>) : {}}
              onChange={(pairs) => setAnswer(question.id, JSON.stringify(pairs))}
            />
          )}

          {/* Open answer */}
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
          <Button
            variant="outline"
            onClick={() => { setCurrentIdx((i) => Math.max(0, i - 1)); setShowRef(false); }}
            disabled={currentIdx === 0}
          >
            ← Попередня
          </Button>
          {isLast ? (
            <Button onClick={handleSubmit}>Завершити →</Button>
          ) : (
            <Button onClick={() => { setCurrentIdx((i) => i + 1); setShowRef(false); }}>
              Наступна →
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

function MatchingGrid({
  question,
  value,
  onChange,
}: {
  question: MatchingExamQuestion;
  value: Record<string, string>;
  onChange: (pairs: Record<string, string>) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2 pr-4 text-muted-foreground font-medium text-xs w-1/2">
              Твердження
            </th>
            {question.rightOptions.map((opt) => (
              <th key={opt.id} className="py-2 px-2 text-center text-xs font-bold text-muted-foreground w-10">
                {opt.id}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {question.leftItems.map((item, rowIdx) => (
            <tr
              key={item.id}
              className={rowIdx % 2 === 0 ? "bg-muted/20" : ""}
            >
              <td className="py-2.5 pr-4 text-sm leading-snug rounded-l-lg">
                <span className="font-semibold mr-1">{item.id}.</span>
                {item.text}
              </td>
              {question.rightOptions.map((opt) => {
                const selected = value[item.id] === opt.id;
                return (
                  <td key={opt.id} className="py-2.5 px-2 text-center rounded-r-lg">
                    <button
                      onClick={() => onChange({ ...value, [item.id]: opt.id })}
                      className={cn(
                        "w-7 h-7 rounded-full border-2 mx-auto flex items-center justify-center transition-all",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/60"
                      )}
                    >
                      {selected && (
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {/* Right option labels below */}
        <tfoot>
          <tr>
            <td />
            {question.rightOptions.map((opt) => (
              <td key={opt.id} className="pt-2 px-1 text-center align-top">
                <span className="text-xs text-muted-foreground leading-tight block"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: "4rem" }}>
                  {opt.text}
                </span>
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
