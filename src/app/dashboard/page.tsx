"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getPublishedTests, getUserResults, TestDoc, TestResult } from "@/lib/tests";
import { ChevronRight } from "lucide-react";
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
const TIPS = [
  { emoji: "📐", text: "Площа трикутника = ½ · a · h. Запам'ятай — половина основи на висоту." },
  { emoji: "🔢", text: "Сума кутів будь-якого трикутника = 180°. Перевіряй відповіді цим правилом." },
  { emoji: "📏", text: "Теорема Піфагора: a² + b² = c². Гіпотенуза — завжди найдовша сторона." },
  { emoji: "🎯", text: "НМТ дає 1 бал за вірну відповідь MCQ. Не залишай пусте — вгадуй з 5 варіантів." },
  { emoji: "⏱️", text: "Розподіляй час: ~1 хв на просте завдання, до 3 хв на складне. Не застрявай." },
  { emoji: "📊", text: "Середнє арифметичне: сума елементів / кількість. Завжди перевіряй чи відповідь в розумному діапазоні." },
  { emoji: "🔄", text: "Відсоток від числа: (число · відсоток) / 100. Або множ на 0.01 · відсоток." },
  { emoji: "📉", text: "Знижка 20% → множиш на 0.8. Збільшення на 20% → множиш на 1.2." },
  { emoji: "🧮", text: "Дріб a/b · c/d = ac/bd. Скорочуй до множення, а не після — простіше." },
  { emoji: "📌", text: "Коренення: √(a·b) = √a · √b. Спрощуй під коренем перед обчисленням." },
  { emoji: "🔺", text: "Сума внутрішніх кутів n-кутника = (n-2) · 180°. Для квадрата: (4-2)·180 = 360°." },
  { emoji: "💡", text: "Якщо рівняння має вигляд ax² + bx + c = 0, дискримінант D = b² - 4ac. D < 0 → немає дійсних коренів." },
  { emoji: "📈", text: "Прогресія: aₙ = a₁ + (n-1)·d — арифметична. Знаєш перший елемент і різницю — знайдеш будь-який." },
  { emoji: "🎲", text: "Ймовірність = кількість сприятливих / загальна кількість. Завжди від 0 до 1." },
  { emoji: "🔵", text: "Довжина кола = 2πr. Площа круга = πr². π ≈ 3.14 — для НМТ цього достатньо." },
  { emoji: "📐", text: "sin 30° = 0.5, cos 60° = 0.5, tg 45° = 1. Ці значення виходять на НМТ найчастіше." },
  { emoji: "🔁", text: "Перед перевіркою підстав відповідь назад в умову. 30 сек, зате без дурних помилок." },
  { emoji: "✏️", text: "Малюй схему до кожної задачі на геометрію. Навіть груба схема допомагає побачити розв'язок." },
  { emoji: "🧠", text: "Спочатку розв'яжи легкі завдання, потім повертайся до складних. Не витрачай час в порядку номерів." },
  { emoji: "📋", text: "Уважно читай умову двічі. Більшість помилок — від неправильно прочитаного питання, не від незнання." },
];

function DailyTip() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const tip = TIPS[dayOfYear % TIPS.length];
  return (
    <section className="rounded-2xl border border-dashed border-border/50 bg-muted/20 px-6 py-5 text-sm flex items-start gap-3">
      <span className="text-2xl mt-0.5 shrink-0">{tip.emoji}</span>
      <div>
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-1">Порада дня</p>
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
  const monthName = now.toLocaleString("uk", { month: "long", year: "numeric" });
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold capitalize">{monthName}</p>
      <div className="grid grid-cols-7 gap-0.5">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
        {cells.map((day, i) => (
          <div key={i} className={cn(
            "aspect-square flex items-center justify-center rounded-lg text-xs transition-all",
            !day && "invisible",
            day === today && "bg-primary text-primary-foreground font-bold",
            day && day !== today && activeDays.includes(day) && "bg-primary/15 text-primary font-semibold",
            day && day !== today && !activeDays.includes(day) && "text-foreground/70 hover:bg-muted"
          )}>
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Progress Chart ─────────────────────────────────────────────
type Range = "day" | "week" | "month";
type MonthStep = "week" | "month";
interface ChartPoint { label: string; score: number | null; count: number }

function buildChartData(results: TestResult[], range: Range, monthStep: MonthStep): ChartPoint[] {
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
      const avg = bucket.length ? Math.round(bucket.reduce((s, r) => s + r.nmtScore, 0) / bucket.length) : null;
      points.push({ label, score: avg, count: bucket.length });
    }
  } else if (range === "week") {
    // last 7 days, step = 1 day
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);
      const label = `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = results.filter((r) => {
        if (!r.completedAt) return false;
        const t = r.completedAt.toDate().getTime();
        return t >= d.getTime() && t < nextD.getTime();
      });
      const avg = bucket.length ? Math.round(bucket.reduce((s, r) => s + r.nmtScore, 0) / bucket.length) : null;
      points.push({ label, score: avg, count: bucket.length });
    }
  } else if (monthStep === "week") {
    // last 8 weeks, step = 1 week
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - i * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const label = `${weekStart.getDate()}.${String(weekStart.getMonth() + 1).padStart(2, "0")}`;
      const bucket = results.filter((r) => {
        if (!r.completedAt) return false;
        const t = r.completedAt.toDate().getTime();
        return t >= weekStart.getTime() && t < weekEnd.getTime();
      });
      const avg = bucket.length ? Math.round(bucket.reduce((s, r) => s + r.nmtScore, 0) / bucket.length) : null;
      points.push({ label, score: avg, count: bucket.length });
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
      const avg = bucket.length ? Math.round(bucket.reduce((s, r) => s + r.nmtScore, 0) / bucket.length) : null;
      points.push({ label, score: avg, count: bucket.length });
    }
  }

  const lastReal = points.findLastIndex((p) => p.score !== null);
  return lastReal >= 0 ? points.slice(0, lastReal + 1) : points;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length || payload[0]?.value == null) return null;
  return (
    <div className="rounded-xl border border-border/50 bg-background px-3 py-2 shadow-md text-sm">
      {label && <p className="text-muted-foreground text-xs mb-0.5">{label}</p>}
      <p className="font-bold text-foreground">{payload[0].value} балів</p>
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

function ProgressSection({ results }: { results: TestResult[] }) {
  const [range, setRange] = useState<Range>("week");
  const [monthStep, setMonthStep] = useState<MonthStep>("week");
  const data = buildChartData(results, range, monthStep);
  const hasData = data.some((d) => d.score !== null);

  const allScores = results.map((r) => r.nmtScore);
  const best = allScores.length ? Math.max(...allScores) : null;
  const last = results[0]?.nmtScore ?? null;
  const avg = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null;

  const visibleScores = data.map((d) => d.score).filter((s): s is number => s !== null);
  const yMin = visibleScores.length ? Math.max(100, Math.min(...visibleScores) - 10) : 100;

  return (
    <section className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-semibold text-base">Прогрес</h2>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {range === "month" && (
            <div className="flex gap-1 bg-muted/40 p-1 rounded-xl">
              {MONTH_STEP_LABELS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setMonthStep(value)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                    monthStep === value
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-1 bg-muted/40 p-1 rounded-xl">
            {RANGE_LABELS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setRange(value)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                  range === value
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats pills */}
      {allScores.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {[
            { label: "Найкращий", value: best },
            { label: "Останній", value: last },
            { label: "Середній", value: avg },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs">
              <span className="text-muted-foreground">{label}:</span>
              <span className="font-bold text-foreground">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {!hasData ? (
        <div className="h-32 flex flex-col items-center justify-center text-muted-foreground text-sm gap-1">
          <span className="text-2xl">📈</span>
          <p>Пройдіть перший тест — графік з'явиться тут</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.12} />
                <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              domain={[yMin, 200]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickCount={4}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              strokeOpacity={0.6}
              fill="url(#scoreGrad)"
              dot={{ r: 3, fill: "hsl(var(--foreground))", strokeWidth: 0, fillOpacity: 0.5 }}
              activeDot={{ r: 5, fill: "hsl(var(--foreground))", strokeWidth: 0 }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

// ── Main ───────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const [tests, setTests] = useState<TestDoc[]>([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [results, setResults] = useState<TestResult[]>([]);
  const [activeDays, setActiveDays] = useState<number[]>([]);

  useEffect(() => {
    if (!user) return;
    getPublishedTests().then((t) => { setTests(t); setTestsLoading(false); });
    getUserResults(user.uid).then((results) => {
      setResults(results);
      const now = new Date();
      const days = results
        .filter((r) => {
          if (!r.completedAt) return false;
          const d = r.completedAt.toDate();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .map((r) => r.completedAt!.toDate().getDate());
      setActiveDays([...new Set(days)]);
    });
  }, [user]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

      {/* Left */}
      <div className="space-y-6">

        {/* Tips */}
        <DailyTip />

        {/* Tests */}
        <section className="space-y-3">
          <h2 className="font-semibold text-base">Тести НМТ</h2>
          {testsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : tests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/50 py-12 text-center text-sm text-muted-foreground">
              Тести ще не додані
            </div>
          ) : (
            <div className="space-y-2">
              {tests.map((test) => (
                <Link key={test.id} href={`/exam/${test.id}`}>
                  <div className="flex items-center justify-between px-5 py-4 rounded-2xl border border-border/40 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group cursor-pointer">
                    <div>
                      <p className="font-semibold text-sm">{test.title}</p>
                      {test.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{test.subtitle}</p>}
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Progress */}
        <ProgressSection results={results} />
      </div>

      {/* Right */}
      <div className="space-y-6">
        <section className="rounded-2xl border border-border/50 bg-card p-5">
          <MiniCalendar activeDays={activeDays} />
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-base">Події</h2>
          <div className="space-y-2">
            {[
              { label: "НМТ 2026", date: "Незабаром" },
              { label: "Пробний тест", date: "Заплануй" },
            ].map((ev) => (
              <div key={ev.label} className="rounded-2xl border border-border/40 bg-card px-4 py-3 flex items-center justify-between">
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
