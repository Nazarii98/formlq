"use client";

import { memo, useState } from "react";
import { CheckCircle, XCircle, X, Pencil, Trash2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { TextInput } from "@/components/ui/text-field";
import { MathText } from "@/components/MathText";
import { TOPICS } from "@/lib/topics";
import { cn } from "@/lib/utils";
import type { BankQuestion } from "@/lib/tests";
import { STATUS_CFG, TYPE_LABELS, qStatus } from "./constants";

interface QuestionReviewRowProps {
  question: BankQuestion;
  highlight: string;
  inCompare: boolean;
  compareDisabled: boolean;
  isSaving: boolean;
  isRejectOpen: boolean;
  onToggleCompare: (id: string) => void;
  onPreview: (q: BankQuestion) => void;
  onEdit: (q: BankQuestion) => void;
  onDelete: (id: string) => void;
  onApprove: (id: string) => void;
  /** Rejected → back to draft; otherwise opens the reject-note form. */
  onRejectToggle: (q: BankQuestion) => void;
  onRejectConfirm: (id: string, note: string) => void;
  onRejectCancel: () => void;
}

/** One question card in the review list. All callbacks must be stable. */
export const QuestionReviewRow = memo(function QuestionReviewRow({
  question: q,
  highlight,
  inCompare,
  compareDisabled,
  isSaving,
  isRejectOpen,
  onToggleCompare,
  onPreview,
  onEdit,
  onDelete,
  onApprove,
  onRejectToggle,
  onRejectConfirm,
  onRejectCancel,
}: QuestionReviewRowProps) {
  const status = qStatus(q);
  const topic = TOPICS.find((t) => t.id === q.topicId);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 transition-all",
        inCompare ? "border-primary/60 bg-primary/5" : "border-border/50",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggleCompare(q.id)}
          disabled={compareDisabled}
          className={cn(
            "w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all",
            inCompare
              ? "border-primary bg-primary text-primary-foreground"
              : compareDisabled
                ? "border-border/30 opacity-30"
                : "border-border/60 hover:border-primary/60",
          )}
        >
          {inCompare && <span className="text-[9px] font-bold">✓</span>}
        </button>

        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-sm leading-snug line-clamp-2 text-foreground">
            <MathText text={q.text} highlight={highlight} />
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {TYPE_LABELS[q.type]}
            </Badge>
            {topic && (
              <span className="text-[11px] text-muted-foreground">
                {topic.icon} {topic.name}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">
              Рівень {q.difficulty}
            </span>
            <Badge
              variant="outline"
              className={cn("text-[10px]", STATUS_CFG[status].cls)}
            >
              {STATUS_CFG[status].label}
            </Badge>
            {status === "rejected" && q.reviewNote && (
              <span className="text-[11px] text-red-400 italic truncate max-w-48">
                {q.reviewNote}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-1 shrink-0 items-center">
          {isSaving ? (
            <Spinner className="w-5 h-5" />
          ) : (
            <>
              <IconButton
                size="md"
                label="Переглянути як учень"
                onClick={() => onPreview(q)}
              >
                <Eye size={14} />
              </IconButton>
              <IconButton size="md" label="Редагувати" onClick={() => onEdit(q)}>
                <Pencil size={14} />
              </IconButton>
              <IconButton
                size="md"
                tone="danger"
                label="Видалити"
                onClick={() => onDelete(q.id)}
              >
                <Trash2 size={14} />
              </IconButton>
              <IconButton
                size="md"
                label="Схвалити"
                onClick={() => onApprove(q.id)}
                className={
                  status === "approved"
                    ? "bg-green-500/20 text-green-600 hover:bg-green-500/20 hover:text-green-600"
                    : "hover:text-green-600 hover:bg-green-500/10"
                }
              >
                <CheckCircle size={16} />
              </IconButton>
              <IconButton
                size="md"
                label={status === "rejected" ? "Зняти відхилення" : "Відхилити"}
                onClick={() => onRejectToggle(q)}
                className={
                  status === "rejected"
                    ? "bg-red-500/20 text-red-500 hover:bg-red-500/20 hover:text-red-500"
                    : "hover:text-red-500 hover:bg-red-500/10"
                }
              >
                <XCircle size={16} />
              </IconButton>
            </>
          )}
        </div>
      </div>

      {isRejectOpen && (
        <RejectNoteForm
          onConfirm={(note) => onRejectConfirm(q.id, note)}
          onCancel={onRejectCancel}
        />
      )}
    </div>
  );
});

/** Inline reject-reason field; owns its text so typing re-renders only itself. */
function RejectNoteForm({
  onConfirm,
  onCancel,
}: {
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");

  return (
    <div className="mt-3 flex gap-2 items-center pl-8">
      <TextInput
        size="sm"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onConfirm(note);
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Причина відхилення (необов'язково)..."
        autoFocus
        className="flex-1 rounded-lg bg-background focus:border-destructive/60 focus:ring-destructive/20"
      />
      <Button size="sm" variant="destructive" onClick={() => onConfirm(note)}>
        Відхилити
      </Button>
      <IconButton label="Скасувати" onClick={onCancel} className="hover:bg-transparent">
        <X size={16} />
      </IconButton>
    </div>
  );
}
