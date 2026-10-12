"use client";

import { useState } from "react";
import Image from "next/image";
import { BookOpen, Eye, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { SectionLabel } from "@/components/ui/section-label";
import { Select, SelectItem } from "@/components/ui/select";
import { TextInput } from "@/components/ui/text-field";
import { MathText } from "@/components/MathText";
import { useReferenceDrawer } from "@/context/ReferenceDrawerContext";
import { cn } from "@/lib/utils";
import type { BankQuestion } from "@/lib/tests";
import { TYPE_LABELS } from "./constants";

const KIND_LABEL: Record<BankQuestion["type"], string> = {
  mcq: "Вибір відповіді",
  open: "Коротка відповідь",
  matching: "Відповідність",
};

function isCorrect(q: BankQuestion, answer: Record<string, string>): boolean {
  if (q.type === "mcq") return answer["sel"] === q.correctOptionId;
  if (q.type === "open")
    return (answer["ans"] ?? "").trim() === q.correctAnswer.trim();
  return q.leftItems.every((item) => answer[item.id] === q.correctPairs[item.id]);
}

/** Shows a bank question the way a student sees it, with a self-check. Mount only while open. */
export function StudentPreviewModal({
  question: q,
  onClose,
}: {
  question: BankQuestion;
  onClose: () => void;
}) {
  const [answer, setAnswer] = useState<Record<string, string>>({});
  const { openDrawer } = useReferenceDrawer();

  const answered = Object.keys(answer).length > 0;
  const correct = answered && isCorrect(q, answer);

  return (
    <Dialog
      open
      onClose={onClose}
      className="max-w-xl shadow-2xl flex flex-col max-h-[90vh]"
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-muted-foreground" />
          <span className="font-semibold text-sm">Вигляд для учня</span>
          <Badge variant="outline" className="text-[10px]">
            {TYPE_LABELS[q.type]}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <IconButton label="Довідкові матеріали" onClick={() => openDrawer()}>
            <BookOpen size={15} />
          </IconButton>
          <IconButton label="Закрити" onClick={onClose}>
            <X size={15} />
          </IconButton>
        </div>
      </div>

      <div className="p-5 space-y-5 overflow-y-auto">
        {/* Question text */}
        <div className="space-y-3">
          <SectionLabel>
            {KIND_LABEL[q.type]}
            {" · Рівень "}
            {q.difficulty}
          </SectionLabel>
          <MathText
            text={q.text}
            className="text-base font-medium leading-relaxed"
          />
          {q.imageUrl && (
            <div className="rounded-xl overflow-hidden border border-border/50">
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

        {/* MCQ options */}
        {q.type === "mcq" && (
          <div className="space-y-2">
            {q.options.map((opt) => {
              const selected = answer["sel"] === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setAnswer({ sel: opt.id })}
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

        {/* Open answer */}
        {q.type === "open" && (
          <TextInput
            value={answer["ans"] ?? ""}
            onChange={(e) => setAnswer({ ans: e.target.value })}
            placeholder="Введіть відповідь..."
            className="h-auto py-3 bg-background"
          />
        )}

        {/* Matching */}
        {q.type === "matching" && (
          <div className="space-y-2">
            {q.leftItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border/50 bg-background"
              >
                <span className="text-sm flex-1">
                  <span className="font-semibold mr-1">{item.id}.</span>
                  <MathText text={item.text} />
                </span>
                <Select
                  value={answer[item.id] ?? ""}
                  onValueChange={(v) =>
                    setAnswer((prev) => ({ ...prev, [item.id]: v }))
                  }
                  className="w-20"
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
            <div className="space-y-1 pt-1">
              {q.rightOptions.map((opt) => (
                <p key={opt.id} className="text-sm text-muted-foreground px-1">
                  <span className="font-semibold text-foreground">{opt.id}.</span>{" "}
                  <MathText text={opt.text} />
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {answered && (
          <div className="pt-1">
            <div
              className={cn(
                "px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2",
                correct
                  ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400"
                  : "border-red-400/40 bg-red-500/10 text-red-500",
              )}
            >
              {correct ? "✓ Правильно!" : "✗ Неправильно"}
              {!correct && q.type === "open" && (
                <span className="font-normal text-muted-foreground ml-1">
                  Відповідь: <b className="text-foreground">{q.correctAnswer}</b>
                </span>
              )}
            </div>
            {q.explanation && (
              <div className="mt-2 px-4 py-3 rounded-xl border border-border/40 bg-muted/30 text-sm text-muted-foreground leading-relaxed">
                <MathText text={q.explanation} />
                {q.explanationImageUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-border/50">
                    <Image
                      src={q.explanationImageUrl}
                      alt=""
                      width={800}
                      height={400}
                      className="w-full object-contain max-h-48"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
