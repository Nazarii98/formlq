"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { SectionLabel } from "@/components/ui/section-label";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/text-field";
import { MathText } from "@/components/MathText";
import {
  QuestionImageUpload,
  MCQEditor,
  OpenEditor,
  MatchingEditor,
} from "@/components/admin/QuestionEditorPanel";
import { TOPICS } from "@/lib/topics";
import { cn } from "@/lib/utils";
import {
  type BankQuestion,
  type BankMCQQuestion,
  type BankOpenQuestion,
  type BankMatchingQuestion,
  makeEmptyBankMCQ,
  makeEmptyBankOpen,
  makeEmptyBankMatching,
} from "@/lib/tests";
import {
  DIFF_LABEL,
  DIFFICULTIES,
  QUESTION_TYPES,
  TYPE_LABELS,
  type QuestionType,
} from "./constants";

const fieldCls = "px-4 py-3 bg-background resize-none";

interface QuestionFormModalProps {
  /** Question to edit; null creates a new one. Mount only while open. */
  initial: BankQuestion | null;
  onClose: () => void;
  onSave: (draft: BankQuestion, editId: string | null) => Promise<void>;
}

/** Create / edit modal for a bank question. Owns the draft while open. */
export function QuestionFormModal({ initial, onClose, onSave }: QuestionFormModalProps) {
  const editId = initial?.id ?? null;
  const [draft, setDraft] = useState<BankQuestion>(() =>
    initial ? { ...initial } : makeEmptyBankMCQ(TOPICS[0].id),
  );
  const [creating, setCreating] = useState(false);

  function changeType(type: QuestionType) {
    setDraft((d) => {
      const base =
        type === "mcq"
          ? makeEmptyBankMCQ(d.topicId)
          : type === "open"
            ? makeEmptyBankOpen(d.topicId)
            : makeEmptyBankMatching(d.topicId);
      return { ...base, difficulty: d.difficulty };
    });
  }

  async function handleSubmit() {
    if (!draft.text.trim()) return;
    setCreating(true);
    try {
      await onSave(draft, editId);
      onClose();
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      closeOnEscape={false}
      className="shadow-2xl flex flex-col max-h-[90vh]"
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
        <span className="font-semibold text-sm">
          {editId ? "Редагувати завдання" : "Нове завдання"}
        </span>
        <IconButton label="Закрити" onClick={onClose}>
          <X size={15} />
        </IconButton>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto">
        {/* Type */}
        <div className="space-y-1">
          <SectionLabel as="label">Тип</SectionLabel>
          <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit">
            {QUESTION_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => changeType(t)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                  draft.type === t
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Topic + Difficulty */}
        <div className="flex gap-3 items-end">
          <div className="space-y-1 flex-1 min-w-0">
            <SectionLabel as="label">Тема</SectionLabel>
            <Select
              value={draft.topicId}
              onValueChange={(v) => setDraft((d) => ({ ...d, topicId: v }))}
            >
              {TOPICS.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.icon} {t.name}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className="space-y-1 shrink-0">
            <SectionLabel as="label">Складність</SectionLabel>
            <div className="flex gap-1">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDraft((prev) => ({ ...prev, difficulty: d }))}
                  title={DIFF_LABEL[d]}
                  className={cn(
                    "w-8 h-8 rounded-lg border text-sm font-bold transition-all",
                    draft.difficulty === d
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/50 text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Question text */}
        <div className="space-y-1">
          <SectionLabel as="label">Текст завдання</SectionLabel>
          <Textarea
            value={draft.text}
            onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
            placeholder="Текст завдання... Використовуйте $...$ для math"
            rows={3}
            className={cn(fieldCls, "font-mono")}
          />
          {draft.text && (
            <div className="px-4 py-2 rounded-xl border border-border/30 bg-muted/30 text-sm">
              <MathText text={draft.text} />
            </div>
          )}
        </div>

        {/* Question image */}
        <QuestionImageUpload
          contextId="bank-draft"
          slotId={draft.id}
          imageUrl={draft.imageUrl}
          onUploaded={(url) => setDraft((d) => ({ ...d, imageUrl: url }))}
          onRemoved={() => setDraft((d) => ({ ...d, imageUrl: undefined }))}
        />

        {/* Type-specific editor */}
        {draft.type === "mcq" && (
          <MCQEditor
            contextId="bank-draft"
            question={draft as BankMCQQuestion}
            onOptionChange={(optId, text) =>
              setDraft((d) => {
                if (d.type !== "mcq") return d;
                return {
                  ...d,
                  options: d.options.map((o) => (o.id === optId ? { ...o, text } : o)),
                };
              })
            }
            onCorrectChange={(optId) =>
              setDraft((d) => ({ ...d, correctOptionId: optId }))
            }
            onOptionImageChange={(optId, url) =>
              setDraft((d) => {
                if (d.type !== "mcq") return d;
                return {
                  ...d,
                  options: d.options.map((o) =>
                    o.id === optId ? { ...o, imageUrl: url } : o,
                  ),
                };
              })
            }
          />
        )}

        {draft.type === "open" && (
          <OpenEditor
            question={draft as BankOpenQuestion}
            onChange={(correctAnswer) => setDraft((d) => ({ ...d, correctAnswer }))}
          />
        )}

        {draft.type === "matching" && (
          <MatchingEditor
            question={draft as BankMatchingQuestion}
            onChange={(p) => setDraft((d) => ({ ...d, ...p }) as BankQuestion)}
          />
        )}

        {/* Explanation */}
        <div className="space-y-1">
          <SectionLabel as="label">
            Пояснення{" "}
            <span className="normal-case font-normal">(необов`язково)</span>
          </SectionLabel>
          <Textarea
            value={draft.explanation}
            onChange={(e) => setDraft((d) => ({ ...d, explanation: e.target.value }))}
            placeholder="Пояснення правильної відповіді... Використовуйте $...$ для math"
            rows={2}
            className={fieldCls}
          />
        </div>

        <QuestionImageUpload
          contextId="bank-draft"
          slotId={`${draft.id}-explanation`}
          imageUrl={draft.explanationImageUrl}
          onUploaded={(url) => setDraft((d) => ({ ...d, explanationImageUrl: url }))}
          onRemoved={() => setDraft((d) => ({ ...d, explanationImageUrl: undefined }))}
          label="Зображення до пояснення"
        />
      </div>

      <div className="flex justify-end gap-2 px-5 py-3 border-t border-border/50">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Скасувати
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={creating || !draft.text.trim()}
        >
          {creating ? "Збереження..." : editId ? "Зберегти" : "Створити завдання"}
        </Button>
      </div>
    </Dialog>
  );
}
