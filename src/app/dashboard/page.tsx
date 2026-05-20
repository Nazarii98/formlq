"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { getUserResults, TestResult } from "@/lib/tests";
import { getTips, Tip } from "@/lib/tips";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";
import { useColorTheme } from "@/context/ThemeContext";
import { CheckCircle2, XCircle } from "lucide-react";
import Image from "next/image";
import { MathText } from "@/components/MathText";
import { Select, SelectItem } from "@/components/ui/select";
import {
  getDailyQuestion,
  getTodayDailyAnswer,
  saveDailyAnswer,
  getDailyAnswerDates,
  DailyAnswer,
} from "@/lib/questions";
import {
  BankQuestion,
  BankMCQQuestion,
  BankOpenQuestion,
  BankMatchingQuestion,
} from "@/lib/tests";
import { formatDuration } from "@/lib/format";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

// ── Mini Calendar ──────────────────────────────────────────────
function MiniCalendar({ activeDays = [] }: { activeDays?: number[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const DAYS = ["П", "В", "С", "Ч", "П", "С", "Н"];
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleString("uk", {
    month: "long",
    year: "numeric",
  });
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold capitalize">{monthName}</p>
      <div className="grid grid-cols-7 gap-0.5">
        {DAYS.map((d, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-medium text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          const isActive = day !== null && activeDays.includes(day);
          const isToday = day === today;
          return (
            <div
              key={i}
              className={cn(
                "aspect-square flex items-center justify-center rounded-lg text-xs transition-all relative",
                !day && "invisible",
                isToday && "bg-primary text-primary-foreground font-bold",
                !isToday && "text-foreground/70 hover:bg-muted",
              )}
            >
              <span>{day}</span>
              {isActive && (
                <span className="absolute top-0.5 right-0.5 text-[10px] leading-none pointer-events-none">
                  🔥
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Progress Chart ─────────────────────────────────────────────
type Range = "day" | "week" | "month";
type MonthStep = "week" | "month";
interface ChartPoint {
  label: string;
  score: number | null;
  count: number;
  totalTime: number;
  best: number | null;
}

function buildChartData(
  results: TestResult[],
  range: Range,
  monthStep: MonthStep,
): ChartPoint[] {
  const now = new Date();
  const points: ChartPoint[] = [];

  if (range === "day") {
    // today 00:00 → current hour, step = 1h
    const hours = now.getHours() + 1;
    for (let i = 0; i < hours; i++) {
      const start = new Date(now);
      start.setHours(i, 0, 0, 0);
      const end = new Date(start);
      end.setHours(i + 1);
      const label = `${String(i).padStart(2, "0")}:00`;
      const bucket = results.filter((r) => {
        if (!r.completedAt) return false;
        const t = r.completedAt.toDate().getTime();
        return t >= start.getTime() && t < end.getTime();
      });
      const best = bucket.length
        ? Math.max(...bucket.map((r) => r.nmtScore))
        : null;
      const avg = bucket.length
        ? Math.round(bucket.reduce((s, r) => s + r.nmtScore, 0) / bucket.length)
        : null;
      const totalTime = bucket.reduce((s, r) => s + (r.timeSpent ?? 0), 0);
      points.push({
        label,
        score: best,
        count: bucket.length,
        totalTime,
        best: avg,
      });
    }
  } else if (range === "week") {
    // last 7 days, step = 1 day
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);
      const label = d.toLocaleString("uk", { day: "numeric", month: "short" });
      const bucket = results.filter((r) => {
        if (!r.completedAt) return false;
        const t = r.completedAt.toDate().getTime();
        return t >= d.getTime() && t < nextD.getTime();
      });
      const best = bucket.length
        ? Math.max(...bucket.map((r) => r.nmtScore))
        : null;
      const avg = bucket.length
        ? Math.round(bucket.reduce((s, r) => s + r.nmtScore, 0) / bucket.length)
        : null;
      const totalTime = bucket.reduce((s, r) => s + (r.timeSpent ?? 0), 0);
      points.push({
        label,
        score: best,
        count: bucket.length,
        totalTime,
        best: avg,
      });
    }
  } else if (monthStep === "week") {
    // last 8 weeks, step = 1 week
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - i * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const label = weekStart.toLocaleString("uk", {
        day: "numeric",
        month: "short",
      });
      const bucket = results.filter((r) => {
        if (!r.completedAt) return false;
        const t = r.completedAt.toDate().getTime();
        return t >= weekStart.getTime() && t < weekEnd.getTime();
      });
      const best = bucket.length
        ? Math.max(...bucket.map((r) => r.nmtScore))
        : null;
      const avg = bucket.length
        ? Math.round(bucket.reduce((s, r) => s + r.nmtScore, 0) / bucket.length)
        : null;
      const totalTime = bucket.reduce((s, r) => s + (r.timeSpent ?? 0), 0);
      points.push({
        label,
        score: best,
        count: bucket.length,
        totalTime,
        best: avg,
      });
    }
  } else {
    // last 6 months, step = 1 month
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = d.toLocaleString("uk", { month: "short" });
      const bucket = results.filter((r) => {
        if (!r.completedAt) return false;
        const rd = r.completedAt.toDate();
        return `${rd.getFullYear()}-${rd.getMonth()}` === key;
      });
      const best = bucket.length
        ? Math.max(...bucket.map((r) => r.nmtScore))
        : null;
      const avg = bucket.length
        ? Math.round(bucket.reduce((s, r) => s + r.nmtScore, 0) / bucket.length)
        : null;
      const totalTime = bucket.reduce((s, r) => s + (r.timeSpent ?? 0), 0);
      points.push({
        label,
        score: best,
        count: bucket.length,
        totalTime,
        best: avg,
      });
    }
  }

  const firstReal = points.findIndex((p) => p.score !== null);
  return firstReal > 0 ? points.slice(firstReal) : points;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: ChartPoint }[];
  label?: string;
}) {
  if (!active || !payload?.length || payload[0]?.value == null) return null;
  const pt = payload[0].payload;
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-2.5 shadow-lg text-sm space-y-1.5 min-w-[140px]">
      {label && <p className="text-muted-foreground text-xs">{label}</p>}
      <div>
        <p className="font-bold text-primary text-lg leading-none">
          {payload[0].value}
        </p>
        <p className="text-[10px] text-muted-foreground">найкращий бал НМТ</p>
      </div>
      {pt.best !== null && pt.best !== payload[0].value && (
        <p className="text-xs text-muted-foreground">
          Середній:{" "}
          <span className="font-semibold text-foreground">{pt.best}</span>
        </p>
      )}
      <div className="border-t border-border/40 pt-1.5 space-y-0.5">
        <p className="text-xs text-muted-foreground">
          Спроб:{" "}
          <span className="font-semibold text-foreground">{pt.count}</span>
        </p>
        {pt.totalTime > 0 && (
          <p className="text-xs text-muted-foreground">
            Час:{" "}
            <span className="font-semibold text-foreground">
              {formatDuration(pt.totalTime)}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

const RANGE_LABELS: { value: Range; label: string }[] = [
  { value: "day", label: "День" },
  { value: "week", label: "Тиждень" },
  { value: "month", label: "Місяць" },
];

const MONTH_STEP_LABELS: { value: MonthStep; label: string }[] = [
  { value: "week", label: "По тижнях" },
  { value: "month", label: "По місяцях" },
];

const THEME_COLORS: Record<string, string> = {
  violet: "oklch(0.52 0.28 290)",
  blue: "oklch(0.50 0.26 250)",
  green: "oklch(0.50 0.20 155)",
  rose: "oklch(0.54 0.26 10)",
  orange: "oklch(0.60 0.22 45)",
  teal: "oklch(0.52 0.18 185)",
  amber: "oklch(0.62 0.18 75)",
  indigo: "oklch(0.50 0.26 268)",
};

function ProgressSection({ results }: { results: TestResult[] }) {
  const { distinctDays, distinctWeeks, distinctMonths } = useMemo(() => {
    const withDate = results.filter((r) => r.completedAt);
    return {
      distinctDays: new Set(
        withDate.map((r) => {
          const d = r.completedAt!.toDate();
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        }),
      ).size,
      distinctWeeks: new Set(
        withDate.map((r) => {
          const d = r.completedAt!.toDate();
          return `${d.getFullYear()}-${d.getMonth()}-${Math.floor(d.getDate() / 7)}`;
        }),
      ).size,
      distinctMonths: new Set(
        withDate.map((r) => {
          const d = r.completedAt!.toDate();
          return `${d.getFullYear()}-${d.getMonth()}`;
        }),
      ).size,
    };
  }, [results]);

  const [range, setRange] = useState<Range>(() =>
    distinctDays > 1 ? "week" : "day",
  );
  const [monthStep, setMonthStep] = useState<MonthStep>("week");
  const { colorTheme } = useColorTheme();
  const primary = THEME_COLORS[colorTheme] ?? THEME_COLORS.violet;
  const data = useMemo(
    () => buildChartData(results, range, monthStep),
    [results, range, monthStep],
  );
  const hasData = data.some((d) => d.score !== null);
  const showStepSelector =
    range === "month" && (distinctWeeks > 1 || distinctMonths > 1);

  const availableRanges = RANGE_LABELS.filter(({ value }) => {
    if (value === "day") return true;
    if (value === "week") return distinctDays > 1;
    if (value === "month") return distinctWeeks > 1;
    return false;
  });

  const visibleScores = data
    .map((d) => d.score)
    .filter((s): s is number => s !== null);
  const yMin = visibleScores.length
    ? Math.max(100, Math.min(...visibleScores) - 20)
    : 100;
  const yMax = visibleScores.length
    ? Math.min(200, Math.max(...visibleScores) + 20)
    : 200;

  return (
    <section
      className="rounded-2xl border border-border/50 bg-card p-5 flex flex-col gap-4"
      style={{ minHeight: "420px" }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-semibold text-base">Прогрес</h2>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {showStepSelector && (
            <div className="flex gap-1 bg-muted/40 p-1 rounded-xl">
              {MONTH_STEP_LABELS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setMonthStep(value)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                    monthStep === value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {availableRanges.length > 1 && (
            <div className="flex gap-1 bg-muted/40 p-1 rounded-xl">
              {availableRanges.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setRange(value)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                    range === value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-1">
          <span className="text-2xl">📈</span>
          <p>Пройдіть перший тест — графік з`явиться тут</p>
        </div>
      ) : (
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primary} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.5}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickCount={4}
                width={36}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke={primary}
                strokeWidth={2.5}
                fill="url(#scoreGrad)"
                dot={(props: { cx?: number; cy?: number; value?: number }) => {
                  if (props.value == null || !props.cx || !props.cy)
                    return <g key="empty" />;
                  return (
                    <circle
                      key={`${props.cx}-${props.cy}`}
                      cx={props.cx}
                      cy={props.cy}
                      r={3.5}
                      fill="hsl(var(--card))"
                      stroke={primary}
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={(props: { cx?: number; cy?: number }) => (
                  <circle
                    key={`active-${props.cx}`}
                    cx={props.cx}
                    cy={props.cy}
                    r={5}
                    fill={primary}
                    stroke={primary}
                    strokeWidth={0}
                  />
                )}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

// ── Recommended Test ───────────────────────────────────────────
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
  const { user, refreshProfile } = useAuth();

  const { data: tips = [] } = useQuery({
    queryKey: ["tips"],
    queryFn: getTips,
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const { data: results = [] } = useQuery<TestResult[]>({
    queryKey: ["results", user?.uid],
    queryFn: () => getUserResults(user!.uid),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const { data: dailyDates = [], refetch: refetchDailyDates } = useQuery<
    string[]
  >({
    queryKey: ["daily-dates", user?.uid],
    queryFn: () => getDailyAnswerDates(user!.uid),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    // combine test result dates + daily answer dates
    const activeDayKeys = new Set<string>();
    results
      .filter((r) => r.completedAt)
      .forEach((r) => {
        const d = r.completedAt!.toDate();
        activeDayKeys.add(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        );
      });
    dailyDates.forEach((date) => activeDayKeys.add(date));
    if (!activeDayKeys.size) return;
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (activeDayKeys.has(key)) streak++;
      else break;
    }
    updateDoc(doc(db, "users", user.uid), { streak }).then(() =>
      refreshProfile(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, dailyDates, user?.uid]);

  const activeDays = useMemo(() => {
    const now = new Date();
    const days = new Set<number>();
    results
      .filter((r) => {
        if (!r.completedAt) return false;
        const d = r.completedAt.toDate();
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .forEach((r) => days.add(r.completedAt!.toDate().getDate()));
    dailyDates.forEach((date) => {
      const [y, m, d] = date.split("-").map(Number);
      if (y === now.getFullYear() && m === now.getMonth() + 1) days.add(d);
    });
    return [...days];
  }, [results, dailyDates]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
      {/* Left */}
      <div className="space-y-6">
        <DailyTip tips={tips} />
        {user && (
          <DailyQuestion
            userId={user.uid}
            onAnswered={() => refetchDailyDates()}
          />
        )}
        <ProgressSection results={results} />
      </div>

      {/* Right */}
      <div className="space-y-6">
        <section className="rounded-2xl border border-border/50 bg-card p-5">
          <MiniCalendar activeDays={activeDays} />
        </section>

        {results.length > 0 &&
          (() => {
            const scores = results.map((r) => r.nmtScore);
            const best = Math.max(...scores);
            const last = scores[0];
            const avg = Math.round(
              scores.reduce((a, b) => a + b, 0) / scores.length,
            );
            return (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Найкращий", value: best, emoji: "🏆" },
                  { label: "Останній", value: last, emoji: "📋" },
                  { label: "Середній", value: avg, emoji: "📊" },
                ].map(({ label, value, emoji }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-border/50 bg-card px-2 py-3 text-center"
                  >
                    <p className="text-base mb-0.5">{emoji}</p>
                    <p className="text-lg font-bold tabular-nums text-primary">
                      {value}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            );
          })()}

        <section className="space-y-3">
          <h2 className="font-semibold text-base">Події</h2>
          <div className="space-y-2">
            {[
              { label: "НМТ 2026", date: "Незабаром" },
              { label: "Пробний тест", date: "Заплануй" },
            ].map((ev) => (
              <div
                key={ev.label}
                className="rounded-2xl border border-border/40 bg-card px-4 py-3 flex items-center justify-between"
              >
                <p className="text-sm font-medium">{ev.label}</p>
                <p className="text-xs text-muted-foreground">{ev.date}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
