"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { queryKeys } from "@/lib/queryKeys";
import {
  getDailyQuestion,
  getTodayDailyAnswer,
  saveDailyAnswer,
  todayDateKey,
} from "@/lib/questions";
import type { BankQuestion } from "@/lib/tests";
import { cn } from "@/lib/utils";
import { MathText } from "@/components/MathText";
import { Select, SelectItem } from "@/components/ui/select";
import { SectionLabel } from "@/components/ui/section-label";
import { Spinner } from "@/components/ui/spinner";
import { TextInput } from "@/components/ui/text-field";

/** The question (and today's answer) only change once a day. */
const DAILY_STALE = 60 * 60 * 1000;

function DailyCaption({ className }: { className?: string }) {
  return (
    <SectionLabel size="2xs" className={cn("px-0 text-primary", className)}>
      Завдання дня
    </SectionLabel>
  );
}

function QuestionImage({ src, className }: { src: string; className?: string }) {
  return (
    <div className={cn("rounded-xl overflow-hidden border border-border/50", className)}>
      <Image src={src} alt="" width={800} height={400} className="w-full object-contain max-h-48" />
    </div>
  );
}

function correctAnswerLabel(q: BankQuestion): string {
  switch (q.type) {
    case "mcq": {
      const opt = q.options.find((o) => o.id === q.correctOptionId);
      return opt ? `${opt.id}. ${opt.text}` : q.correctOptionId;
    }
    case "open":
      return q.correctAnswer;
    case "matching":
      return Object.entries(q.correctPairs)
        .map(([k, v]) => `${k}→${v}`)
        .join(", ");
    default:
      return "";
  }
}

export function DailyQuestion({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.dailyQuestion(userId, todayDateKey());

  // question: null = no approved questions; answer: null = not answered yet today.
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const [question, answer] = await Promise.all([
        getDailyQuestion(),
        getTodayDailyAnswer(userId),
      ]);
      return { question, answer };
    },
    staleTime: DAILY_STALE,
  });

  const [selected, setSelected] = useState("");
  const [matching, setMatching] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [saving, setSaving] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="w-5 h-5" />
      </div>
    );
  }

  const { question, answer } = data;

  if (answer) return <AnsweredCard question={question} correct={answer.isCorrect} />;

  if (!question) {
    return (
      <section className="rounded-2xl border border-dashed border-border/50 py-8 text-center text-sm text-muted-foreground">
        Схвалених завдань ще немає
      </section>
    );
  }

  const q = question;

  function checkAnswer(): boolean {
    switch (q.type) {
      case "mcq":
        return selected === q.correctOptionId;
      case "open":
        return selected.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      case "matching":
        return q.leftItems.every((item) => matching[item.id] === q.correctPairs[item.id]);
      default:
        return false;
    }
  }

  const canSubmit =
    q.type === "mcq"
      ? !!selected
      : q.type === "open"
        ? selected.trim().length > 0
        : q.type === "matching"
          ? q.leftItems.every((i) => !!matching[i.id])
          : false;

  async function handleSubmit() {
    const correct = checkAnswer();
    setIsCorrect(correct);
    setSubmitted(true);
    setSaving(true);
    try {
      await saveDailyAnswer(userId, q.id, correct);
      // Keep showing the in-place result now; the next mount refetches and shows the answered card.
      queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
      <div>
        <DailyCaption className="mb-2" />
        <MathText text={q.text} className="text-sm font-medium leading-relaxed" />
        {q.imageUrl && <QuestionImage src={q.imageUrl} className="mt-3" />}
      </div>

      {q.type === "mcq" && !submitted && (
        <div className="space-y-2">
          {q.options.map((opt) => (
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
                  {opt.text && <MathText text={opt.text} className="text-xs text-muted-foreground" />}
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

      {q.type === "open" && !submitted && (
        <TextInput
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit && !saving) handleSubmit();
          }}
          placeholder="Введіть відповідь..."
          className="bg-background"
        />
      )}

      {q.type === "matching" && !submitted && (
        <div className="space-y-2">
          {q.leftItems.map((item) => (
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
                onValueChange={(v) => setMatching((p) => ({ ...p, [item.id]: v }))}
                className="shrink-0 w-20"
              >
                <SelectItem value="">—</SelectItem>
                {q.rightOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.id}
                  </SelectItem>
                ))}
              </Select>
            </div>
          ))}
          <div className="space-y-0.5 pt-1">
            {q.rightOptions.map((opt) => (
              <p key={opt.id} className="text-xs text-muted-foreground px-1">
                <span className="font-semibold text-foreground">{opt.id}.</span>{" "}
                <MathText text={opt.text} />
              </p>
            ))}
          </div>
        </div>
      )}

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
          {!isCorrect && q.type === "open" && (
            <span className="font-normal text-muted-foreground ml-1">
              Відповідь: <b className="text-foreground">{q.correctAnswer}</b>
            </span>
          )}
        </div>
      )}
      {submitted && q.explanation && (
        <div className="px-4 py-3 rounded-xl border border-border/40 bg-muted/30 text-sm text-muted-foreground leading-relaxed">
          <MathText text={q.explanation} />
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

/** Today's question was already answered — show verdict, correct answer and explanation. */
function AnsweredCard({ question, correct }: { question: BankQuestion | null; correct: boolean }) {
  const correctLabel = question ? correctAnswerLabel(question) : "";

  return (
    <section className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <DailyCaption />
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

      {question && (
        <div className="space-y-3">
          <MathText text={question.text} className="text-sm font-medium leading-relaxed" />
          {question.imageUrl && <QuestionImage src={question.imageUrl} />}
        </div>
      )}

      {correctLabel && (
        <div className="px-4 py-2.5 rounded-xl border border-green-500/30 bg-green-500/8 text-sm">
          <span className="text-xs text-muted-foreground mr-2">Правильна відповідь:</span>
          <span className="font-medium text-green-700 dark:text-green-400">
            <MathText text={correctLabel} />
          </span>
        </div>
      )}

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
