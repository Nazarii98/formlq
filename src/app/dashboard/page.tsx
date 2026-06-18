"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { getTips, Tip } from "@/lib/tips";
import { getStudentHomework, Homework } from "@/lib/tutor";
import { subscribeStudentLessons, Lesson } from "@/lib/lessons";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { LessonViewModal } from "@/components/calendar/LessonViewModal";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, ClipboardCheck, CalendarClock, ArrowRight } from "lucide-react";
import Image from "next/image";
import { MathText } from "@/components/MathText";
import { Select, SelectItem } from "@/components/ui/select";
import {
  getDailyQuestion,
  getTodayDailyAnswer,
  saveDailyAnswer,
  DailyAnswer,
} from "@/lib/questions";
import {
  BankQuestion,
  BankMCQQuestion,
  BankOpenQuestion,
  BankMatchingQuestion,
} from "@/lib/tests";
import { formatDate } from "@/lib/format";

// ── Daily Tip ─────────────────────────────────────────────────
function DailyTip({ tips }: { tips: Tip[] }) {
  const tip = useMemo(() => {
    if (!tips.length) return null;
    const now = new Date();
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
    );
    const baseIdx = dayOfYear % tips.length;
    for (let i = 0; i < tips.length; i++) {
      const t = tips[(baseIdx + i) % tips.length];
      if (t.active) return t;
    }
    return null;
  }, [tips]);

  if (!tip) return null;

  return (
    <section className="rounded-2xl border border-border/50 bg-card px-6 py-5 text-sm flex items-start gap-3">
      <span className="text-2xl mt-0.5 shrink-0">{tip.emoji}</span>
      <div>
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-1">
          Порада дня
        </p>
        <p className="text-foreground/80 leading-relaxed">{tip.text}</p>
      </div>
    </section>
  );
}

// ── Calendar widget ────────────────────────────────────────────
function CalendarWidget({ userId }: { userId: string }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selected, setSelected] = useState<Lesson | null>(null);

  useEffect(() => subscribeStudentLessons(userId, setLessons), [userId]);

  return (
    <>
      <MonthCalendar lessons={lessons} onSelectLesson={setSelected} />
      <LessonViewModal lesson={selected} onClose={() => setSelected(null)} />
    </>
  );
}

// ── Upcoming Homework ──────────────────────────────────────────
function UpcomingHomework({ userId }: { userId: string }) {
  const router = useRouter();
  const { data: list = [], isLoading } = useQuery<Homework[]>({
    queryKey: ["student-homework", userId],
    queryFn: () => getStudentHomework(userId),
    staleTime: 60 * 1000,
  });

  const next = useMemo(() => {
    const pending = list.filter((h) => h.status !== "completed");
    return [...pending].sort((a, b) => {
      const ad = a.dueAt?.toMillis() ?? Number.MAX_SAFE_INTEGER;
      const bd = b.dueAt?.toMillis() ?? Number.MAX_SAFE_INTEGER;
      if (ad !== bd) return ad - bd;
      return (b.assignedAt?.toMillis() ?? 0) - (a.assignedAt?.toMillis() ?? 0);
    })[0];
  }, [list]);

  return (
    <section className="rounded-2xl border border-border/50 bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-base">Найближче домашнє завдання</h2>
        <button
          onClick={() => router.push("/dashboard/homework")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          Усі <ArrowRight size={13} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : !next ? (
        <div className="flex flex-col items-center justify-center text-muted-foreground text-sm gap-1 py-8">
          <span className="text-2xl">✅</span>
          <p>Немає активних домашніх завдань</p>
        </div>
      ) : (
        <button
          onClick={() => router.push(`/dashboard/homework/${next.id}`)}
          className="group text-left rounded-2xl border border-border/50 bg-background hover:border-primary/40 hover:bg-muted/30 transition-all p-4 flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ClipboardCheck size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{next.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
              {next.status === "in_progress" && (
                <span className="text-amber-600 dark:text-amber-400 font-medium">Розпочато</span>
              )}
              {next.dueAt ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarClock size={12} /> до {formatDate(next.dueAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              ) : (
                <span>Без дедлайну</span>
              )}
            </p>
          </div>
          <span className="shrink-0 text-sm font-medium text-primary inline-flex items-center gap-1 group-hover:gap-2 transition-all">
            {next.status === "in_progress" ? "Продовжити" : "Почати"}
            <ArrowRight size={15} />
          </span>
        </button>
      )}
    </section>
  );
}

// ── Daily Question ─────────────────────────────────────────────
function DailyQuestion({
  userId,
  onAnswered,
}: {
  userId: string;
  onAnswered: () => void;
}) {
  const [question, setQuestion] = useState<BankQuestion | null>(null);
  const [todayAnswer, setTodayAnswer] = useState<
    DailyAnswer | null | "loading"
  >("loading");
  const [selected, setSelected] = useState<string>("");
  const [matching, setMatching] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDailyQuestion().then(setQuestion);
    getTodayDailyAnswer(userId).then(setTodayAnswer);
  }, [userId]);

  function checkAnswer(): boolean {
    if (!question) return false;
    if (question.type === "mcq")
      return selected === (question as BankMCQQuestion).correctOptionId;
    if (question.type === "open")
      return (
        selected.trim().toLowerCase() ===
        (question as BankOpenQuestion).correctAnswer.trim().toLowerCase()
      );
    if (question.type === "matching") {
      const q = question as BankMatchingQuestion;
      return q.leftItems.every(
        (item) => matching[item.id] === q.correctPairs[item.id],
      );
    }
    return false;
  }

  async function handleSubmit() {
    if (!question) return;
    const correct = checkAnswer();
    setIsCorrect(correct);
    setSubmitted(true);
    setSaving(true);
    try {
      await saveDailyAnswer(userId, question.id, correct);
      onAnswered();
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    question?.type === "mcq"
      ? !!selected
      : question?.type === "open"
        ? selected.trim().length > 0
        : question?.type === "matching"
          ? (question as BankMatchingQuestion).leftItems.every(
              (i) => !!matching[i.id],
            )
          : false;

  if (todayAnswer === "loading" || (!question && todayAnswer === null)) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Already answered today
  if (typeof todayAnswer === "object" && todayAnswer !== null) {
    const correct = todayAnswer.isCorrect;
    let correctLabel = "";
    if (question) {
      if (question.type === "mcq") {
        const opt = (question as BankMCQQuestion).options.find(
          (o) => o.id === (question as BankMCQQuestion).correctOptionId,
        );
        correctLabel = opt
          ? `${opt.id}. ${opt.text}`
          : (question as BankMCQQuestion).correctOptionId;
      } else if (question.type === "open") {
        correctLabel = (question as BankOpenQuestion).correctAnswer;
      } else if (question.type === "matching") {
        correctLabel = Object.entries(
          (question as BankMatchingQuestion).correctPairs,
        )
          .map(([k, v]) => `${k}→${v}`)
          .join(", ");
      }
    }
    return (
      <section className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Завдання дня
          </p>
          <span
            className={cn(
              "ml-auto flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
              correct
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-red-500/10 text-red-500",
            )}
          >
            {correct ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {correct ? "Правильно" : "Неправильно"}
          </span>
        </div>

        {/* Question */}
        {question && (
          <div className="space-y-3">
            <MathText
              text={question.text}
              className="text-sm font-medium leading-relaxed"
            />
            {question.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-border/50">
                <Image
                  src={question.imageUrl}
                  alt=""
                  width={800}
                  height={400}
                  className="w-full object-contain max-h-48"
                />
              </div>
            )}
          </div>
        )}

        {/* Correct answer */}
        {correctLabel && (
          <div className="px-4 py-2.5 rounded-xl border border-green-500/30 bg-green-500/8 text-sm">
            <span className="text-xs text-muted-foreground mr-2">
              Правильна відповідь:
            </span>
            <span className="font-medium text-green-700 dark:text-green-400">
              <MathText text={correctLabel} />
            </span>
          </div>
        )}

        {/* Explanation */}
        {question?.explanation && (
          <div className="px-4 py-3 rounded-xl border border-border/40 bg-muted/30 text-sm text-muted-foreground leading-relaxed">
            <MathText text={question.explanation} />
            {question.explanationImageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden border border-border/50">
                <Image
                  src={question.explanationImageUrl}
                  alt=""
                  width={800}
                  height={400}
                  className="w-full object-contain max-h-40"
                />
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">Нове завдання завтра 🔥</p>
      </section>
    );
  }

  if (!question) {
    return (
      <section className="rounded-2xl border border-dashed border-border/50 py-8 text-center text-sm text-muted-foreground">
        Схвалених завдань ще немає
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-2">
          Завдання дня
        </p>
        <MathText
          text={question.text}
          className="text-sm font-medium leading-relaxed"
        />
        {question.imageUrl && (
          <div className="mt-3 rounded-xl overflow-hidden border border-border/50">
            <Image
              src={question.imageUrl}
              alt=""
              width={800}
              height={400}
              className="w-full object-contain max-h-48"
            />
          </div>
        )}
      </div>

      {/* MCQ */}
      {question.type === "mcq" && !submitted && (
        <div className="space-y-2">
          {(question as BankMCQQuestion).options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={cn(
                "w-full text-left px-4 py-2.5 rounded-xl border transition-all text-sm",
                selected === opt.id
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border/50 hover:border-primary/40 hover:bg-muted/40",
              )}
            >
              {opt.imageUrl ? (
                <div className="flex flex-col gap-1">
                  <span className="font-bold">{opt.id}</span>
                  <Image
                    src={opt.imageUrl}
                    alt={opt.id}
                    width={400}
                    height={200}
                    className="max-h-32 w-full object-contain rounded-lg"
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
          ))}
        </div>
      )}

      {/* Open */}
      {question.type === "open" && !submitted && (
        <input
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit) handleSubmit();
          }}
          placeholder="Введіть відповідь..."
          className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors"
        />
      )}

      {/* Matching */}
      {question.type === "matching" && !submitted && (
        <div className="space-y-2">
          {(question as BankMatchingQuestion).leftItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-2 rounded-xl border border-border/50 bg-background"
            >
              <span className="text-sm flex-1 min-w-0">
                <span className="font-semibold mr-1">{item.id}.</span>
                <MathText text={item.text} />
              </span>
              <Select
                value={matching[item.id] ?? ""}
                onValueChange={(v) =>
                  setMatching((p) => ({ ...p, [item.id]: v }))
                }
                className="shrink-0 w-20"
              >
                <SelectItem value="">—</SelectItem>
                {(question as BankMatchingQuestion).rightOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.id}
                  </SelectItem>
                ))}
              </Select>
            </div>
          ))}
          <div className="space-y-0.5 pt-1">
            {(question as BankMatchingQuestion).rightOptions.map((opt) => (
              <p key={opt.id} className="text-xs text-muted-foreground px-1">
                <span className="font-semibold text-foreground">{opt.id}.</span>{" "}
                <MathText text={opt.text} />
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Result after submit */}
      {submitted && (
        <div
          className={cn(
            "px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2",
            isCorrect
              ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400"
              : "border-red-400/40 bg-red-500/10 text-red-500",
          )}
        >
          {isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {isCorrect ? "Правильно!" : "Неправильно"}
          {!isCorrect && question.type === "open" && (
            <span className="font-normal text-muted-foreground ml-1">
              Відповідь:{" "}
              <b className="text-foreground">
                {(question as BankOpenQuestion).correctAnswer}
              </b>
            </span>
          )}
        </div>
      )}
      {submitted && question.explanation && (
        <div className="px-4 py-3 rounded-xl border border-border/40 bg-muted/30 text-sm text-muted-foreground leading-relaxed">
          <MathText text={question.explanation} />
        </div>
      )}

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          className={cn(
            "w-full py-2.5 rounded-xl text-sm font-medium transition-all",
            canSubmit && !saving
              ? "bg-primary text-primary-foreground hover:opacity-90"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          {saving ? "Збереження..." : "Перевірити"}
        </button>
      )}
    </section>
  );
}

// ── Main ───────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();

  const { data: tips = [] } = useQuery({
    queryKey: ["tips"],
    queryFn: getTips,
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
      {/* Left */}
      <div className="space-y-6">
        <DailyTip tips={tips} />
        {user && <DailyQuestion userId={user.uid} onAnswered={() => {}} />}
        {user && <UpcomingHomework userId={user.uid} />}
      </div>

      {/* Right */}
      <div className="space-y-6">{user && <CalendarWidget userId={user.uid} />}</div>
    </div>
  );
}
