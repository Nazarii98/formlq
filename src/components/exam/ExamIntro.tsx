"use client";

import Link from "next/link";
import { MathText } from "@/components/MathText";
import { ResultListItem } from "@/components/exam/ResultListItem";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { maxScaledScore, type TestQuestion, type TestResult } from "@/lib/tests";
import type { RunnerConfig } from "@/components/exam/ExamRunner";

interface ExamIntroProps {
  config: RunnerConfig;
  questions: TestQuestion[];
  maxRaw: number;
  isNmt: boolean;
  untimed: boolean;
  allowAnswerImages: boolean;
  introNote?: string;
  introEmoji: string;
  startLabel: string;
  backHref: string;
  history: TestResult[];
  onStart: () => void;
}

/** Pre-start screen: summary stats, rules, previous attempts. */
export function ExamIntro({
  config,
  questions,
  maxRaw,
  isNmt,
  untimed,
  allowAnswerImages,
  introNote,
  introEmoji,
  startLabel,
  backHref,
  history,
  onStart,
}: ExamIntroProps) {
  const mcqCount = questions.filter((q) => q.type === "mcq").length;
  const openCount = questions.filter((q) => q.type === "open").length;
  const maxScaled = maxScaledScore(config.scoreTable ?? []);

  const stats: [string, string][] = [
    [String(questions.length), "Завдань"],
    [String(maxRaw), "Макс. балів"],
    ...(untimed
      ? []
      : ([[`${config.durationMinutes ?? 150} хв`, "Часу"]] as [string, string][])),
    [
      `${mcqCount} × ${questions.find((q) => q.type === "mcq")?.points ?? 1}б`,
      "Вибір",
    ],
    [
      `${openCount} × ${questions.find((q) => q.type === "open")?.points ?? 2}б`,
      "Відповідь",
    ],
    isNmt ? ["100–200", "Шкала НМТ"] : [`до ${maxScaled}`, "Шкала балів"],
  ];

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
            {stats.map(([val, label]) => (
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
          <Button size="lg" className="w-full h-12 text-base" onClick={onStart}>
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
            <SectionLabel>Мої спроби</SectionLabel>
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
