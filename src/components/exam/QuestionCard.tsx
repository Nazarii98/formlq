"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { QuestionResult } from "@/lib/tests";
import { MathText } from "@/components/MathText";

interface QuestionCardProps {
  q: QuestionResult;
  index: number;
  answerLabel?: string;
  /** Uploaded photo of the answer (homework open questions). */
  photo?: string;
  /** Whether the student flagged this question with a duck. */
  flagged?: boolean;
  /** If provided, the duck is a toggle (student). Otherwise a static badge when flagged. */
  onToggleFlag?: () => void;
  /** Read-only tutor comment (shown to the student). */
  comment?: string;
  /** Editable tutor comment (tutor review). Takes precedence over `comment`. */
  editableComment?: { value: string; onSave: (v: string) => void };
}

export function QuestionCard({
  q,
  index,
  answerLabel = "Ваша відповідь",
  photo,
  flagged = false,
  onToggleFlag,
  comment,
  editableComment,
}: QuestionCardProps) {
  const [commentDraft, setCommentDraft] = useState(editableComment?.value ?? "");

  let userLabel = "—";
  let correctLabel = "";

  if (q.type === "mcq") {
    const uOpt = q.options?.find((o) => o.id === q.userAnswer);
    const cOpt = q.options?.find((o) => o.id === q.correctOptionId);
    userLabel = uOpt
      ? `${uOpt.id}${uOpt.text ? `. ${uOpt.text}` : ""}`
      : q.userAnswer || "—";
    correctLabel = cOpt
      ? `${cOpt.id}${cOpt.text ? `. ${cOpt.text}` : ""}`
      : (q.correctOptionId ?? "");
  } else if (q.type === "open") {
    userLabel = q.userAnswer || "—";
    correctLabel = q.correctAnswer ?? "";
  } else if (q.type === "matching") {
    try {
      const parsed = JSON.parse(q.userAnswer) as Record<string, string>;
      userLabel =
        Object.entries(parsed)
          .map(([k, v]) => `${k}→${v}`)
          .join(", ") || "—";
    } catch {
      userLabel = "—";
    }
    correctLabel = Object.entries(q.correctPairs ?? {})
      .map(([k, v]) => `${k}→${v}`)
      .join(", ");
  }

  const skipped = !q.userAnswer || q.userAnswer === "";
  const isPartial = q.type === "matching" && !q.isCorrect && (q.partialScore ?? 0) > 0;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 space-y-4 border-l-[3px]",
        q.isCorrect
          ? "border-border/50 border-l-green-500/60"
          : isPartial
            ? "border-border/50 border-l-amber-500/60"
            : skipped
              ? "border-border/50 border-l-border"
              : "border-border/50 border-l-red-400/70",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1.5">
            Завдання {index + 1}
            <span className="mx-1.5 opacity-40">·</span>
            {q.points} {q.points === 1 ? "бал" : "бали"}
          </p>
          <MathText text={q.text || "—"} className="text-sm leading-relaxed" />
          {q.imageUrl && (
            <div className="mt-3 rounded-xl overflow-hidden border border-border/50">
              <Image
                src={q.imageUrl}
                alt=""
                width={800}
                height={400}
                className="w-full object-contain max-h-64"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {onToggleFlag ? (
            <button
              onClick={onToggleFlag}
              title={flagged ? "Прибрати позначку" : "Позначити для обговорення з учителем"}
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center text-base transition-all",
                flagged
                  ? "bg-amber-400/20 grayscale-0"
                  : "bg-muted grayscale opacity-50 hover:opacity-100 hover:grayscale-0",
              )}
            >
              🦆
            </button>
          ) : (
            flagged && (
              <span className="text-base" title="Позначено учнем">🦆</span>
            )
          )}
          <span
            className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              q.isCorrect
                ? "bg-green-500/12 text-green-600 dark:text-green-400"
                : isPartial
                  ? "bg-amber-500/12 text-amber-600 dark:text-amber-400"
                  : skipped
                    ? "bg-muted text-muted-foreground"
                    : "bg-red-500/12 text-red-500",
            )}
          >
            {q.isCorrect ? "Вірно" : isPartial ? `Частково (${q.partialScore}/${q.points})` : skipped ? "Пропущено" : "Невірно"}
          </span>
        </div>
      </div>

      {/* Answers */}
      <div className="space-y-2 text-sm">
        {q.type === "matching" && q.leftItems ? (() => {
          let pairs: Record<string, string> = {};
          try { pairs = JSON.parse(q.userAnswer); } catch { /* noop */ }
          return (
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">{answerLabel}:</span>
              {q.leftItems.map((item) => {
                const userVal = pairs[item.id];
                const correctVal = q.correctPairs?.[item.id];
                const pairOk = !!userVal && userVal === correctVal;
                return (
                  <div key={item.id} className={cn(
                    "flex items-center gap-1.5 text-xs font-medium",
                    pairOk ? "text-green-600 dark:text-green-400" : "text-red-500",
                  )}>
                    <span className="text-muted-foreground">{item.id} →</span>
                    <span>{userVal || "—"}</span>
                    {!pairOk && correctVal && userVal !== correctVal && (
                      <span className="text-green-600 dark:text-green-400 ml-1">(→ {correctVal})</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })() : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-muted-foreground text-xs shrink-0 w-32">
                {answerLabel}
              </span>
              <MathText
                text={userLabel}
                className={cn(
                  "font-medium",
                  q.isCorrect
                    ? "text-green-600 dark:text-green-400"
                    : skipped
                      ? "text-muted-foreground"
                      : "text-red-500",
                )}
              />
            </div>
            {!q.isCorrect && correctLabel && (
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground text-xs shrink-0 w-32">
                  Правильна відповідь
                </span>
                <MathText
                  text={correctLabel}
                  className="font-medium text-green-600 dark:text-green-400"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Answer photo */}
      {photo && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Прикріплене фото:</p>
          <a
            href={photo}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl overflow-hidden border border-border/50 max-w-xs"
          >
            <Image src={photo} alt="Фото відповіді" width={400} height={300} className="w-full object-contain max-h-60" />
          </a>
        </div>
      )}

      {/* Explanation */}
      {q.explanation && (
        <details className="group">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-1.5 select-none w-fit">
            <span className="group-open:rotate-90 transition-transform inline-block leading-none">
              ›
            </span>
            Пояснення
          </summary>
          <MathText
            text={q.explanation}
            className="block mt-2.5 text-sm text-foreground/80 leading-relaxed border-l-2 border-border/60 pl-3"
          />
          {q.explanationImageUrl && (
            <div className="mt-3 rounded-xl overflow-hidden border border-border/50">
              <Image
                src={q.explanationImageUrl}
                alt=""
                width={800}
                height={400}
                className="w-full object-contain max-h-64"
              />
            </div>
          )}
        </details>
      )}

      {/* Tutor comment */}
      {editableComment ? (
        <textarea
          value={commentDraft}
          onChange={(e) => setCommentDraft(e.target.value)}
          onBlur={(e) => editableComment.onSave(e.target.value)}
          rows={1}
          placeholder="Коментар до питання..."
          className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      ) : (
        comment && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-0.5">
              Коментар вчителя
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed">{comment}</p>
          </div>
        )
      )}
    </div>
  );
}
