"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { MathText } from "@/components/MathText";
import { pluralize, PLURAL } from "@/lib/format";
import { parseMatchingAnswer } from "@/lib/exam-scoring";
import { MatchingInput } from "@/components/exam/MatchingInput";
import { AnswerPhoto } from "@/components/exam/AnswerPhoto";
import type { TestQuestion } from "@/lib/tests";

const TYPE_LABEL: Record<TestQuestion["type"], string> = {
  mcq: "Вибір відповіді",
  matching: "Відповідність",
  open: "Коротка відповідь",
};

interface QuestionViewProps {
  question: TestQuestion;
  index: number;
  answer: string | undefined;
  onAnswer: (questionId: string, answer: string) => void;
  /** Photo upload on open questions (homework). */
  allowAnswerImages?: boolean;
  answerImage?: string;
  uploading?: boolean;
  onUploadImage?: (questionId: string, file: File) => void;
  onRemoveImage?: (questionId: string) => void;
}

/** The current question card with its type-specific answer input. */
export function QuestionView({
  question,
  index,
  answer,
  onAnswer,
  allowAnswerImages = false,
  answerImage,
  uploading = false,
  onUploadImage,
  onRemoveImage,
}: QuestionViewProps) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          Завдання {index + 1} · {TYPE_LABEL[question.type]} ·{" "}
          {pluralize(question.points, PLURAL.point)}
        </div>
        <MathText
          text={question.text}
          className="text-base font-medium leading-relaxed"
        />
        {question.imageUrl && (
          <div className="rounded-xl overflow-hidden border border-border/50">
            <Image
              src={question.imageUrl}
              alt=""
              width={800}
              height={400}
              className="w-full object-contain max-h-64"
            />
          </div>
        )}
      </div>

      {question.type === "mcq" && (
        <div className="space-y-2">
          {question.options.map((opt) => {
            const selected = answer === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onAnswer(question.id, opt.id)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl border transition-all text-sm",
                  selected
                    ? "border-primary bg-primary/10 font-medium"
                    : "border-border/50 hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                {opt.imageUrl ? (
                  <div className="flex flex-col gap-2">
                    <span className="font-bold">{opt.id}</span>
                    <Image
                      src={opt.imageUrl}
                      alt={opt.id}
                      width={400}
                      height={200}
                      className="max-h-40 w-full object-contain rounded-lg"
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
            );
          })}
        </div>
      )}

      {question.type === "matching" && (
        <MatchingInput
          // Remount per question so a half-made selection doesn't carry over.
          key={question.id}
          question={question}
          value={parseMatchingAnswer(answer)}
          onChange={(pairs) => onAnswer(question.id, JSON.stringify(pairs))}
        />
      )}

      {question.type === "open" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Введіть числову відповідь:
          </p>
          <input
            type="text"
            inputMode="numeric"
            value={answer ?? ""}
            onChange={(e) => onAnswer(question.id, e.target.value)}
            placeholder="Ваша відповідь..."
            className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors"
          />
          {allowAnswerImages && (
            <AnswerPhoto
              url={answerImage}
              uploading={uploading}
              onSelect={(file) => onUploadImage?.(question.id, file)}
              onRemove={() => onRemoveImage?.(question.id)}
            />
          )}
        </div>
      )}
    </div>
  );
}
