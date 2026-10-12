import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { SectionLabel } from "@/components/ui/section-label";
import { Textarea } from "@/components/ui/text-field";
import { MathText } from "@/components/MathText";
import {
  QuestionImageUpload,
  MCQEditor,
  OpenEditor,
  MatchingEditor,
} from "@/components/admin/QuestionEditorPanel";
import type { TestQuestion } from "@/lib/tests";
import { TYPE_LABELS_LONG } from "./constants";
import { StepButton } from "./primitives";

const textareaClass = "resize-none py-3 text-sm bg-background";

/** Full editor for the active test question. */
export function TestQuestionEditor({
  contextId,
  question: q,
  index,
  onChange,
  onMove,
  onDelete,
}: {
  /** Storage folder for uploaded images (the test id). */
  contextId: string;
  question: TestQuestion;
  index: number;
  onChange: (patch: Partial<TestQuestion>) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Завдання {index + 1}</span>
          <Badge variant="outline" className="text-xs">
            {TYPE_LABELS_LONG[q.type]}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <IconButton label="Перемістити вгору" size="md" onClick={() => onMove(-1)}>
            ↑
          </IconButton>
          <IconButton label="Перемістити вниз" size="md" onClick={() => onMove(1)}>
            ↓
          </IconButton>
          <IconButton
            label="Видалити завдання"
            size="md"
            tone="danger"
            className="text-destructive"
            onClick={onDelete}
          >
            ✕
          </IconButton>
        </div>
      </div>

      {/* Points */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
        <span className="text-sm text-muted-foreground">
          Балів за правильну відповідь:
        </span>
        <div className="flex items-center gap-1">
          <StepButton
            size="sm"
            aria-label="Менше балів"
            onClick={() => onChange({ points: Math.max(1, q.points - 1) })}
          >
            −
          </StepButton>
          <span className="w-8 text-center font-bold tabular-nums">{q.points}</span>
          <StepButton
            size="sm"
            aria-label="Більше балів"
            onClick={() => onChange({ points: q.points + 1 })}
          >
            +
          </StepButton>
        </div>
      </div>

      {/* Question text */}
      <div className="space-y-1">
        <SectionLabel as="label">Текст завдання</SectionLabel>
        <Textarea
          mono
          value={q.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Введіть текст завдання... Використовуйте $...$ для inline math, $$...$$ для block math"
          rows={3}
          className={textareaClass}
        />
        {q.text && (
          <div className="px-4 py-3 rounded-xl border border-border/30 bg-muted/30 text-sm leading-relaxed">
            <MathText text={q.text} />
          </div>
        )}
      </div>

      <QuestionImageUpload
        contextId={contextId}
        slotId={q.id}
        imageUrl={q.imageUrl}
        onUploaded={(url) => onChange({ imageUrl: url })}
        onRemoved={() => onChange({ imageUrl: undefined })}
      />

      {q.type === "mcq" && (
        <MCQEditor
          contextId={contextId}
          question={q}
          onOptionChange={(optId, text) =>
            onChange({
              options: q.options.map((o) => (o.id === optId ? { ...o, text } : o)),
            })
          }
          onCorrectChange={(optId) => onChange({ correctOptionId: optId })}
          onOptionImageChange={(optId, url) =>
            onChange({
              options: q.options.map((o) =>
                o.id === optId ? { ...o, imageUrl: url } : o,
              ),
            })
          }
        />
      )}

      {q.type === "matching" && <MatchingEditor question={q} onChange={onChange} />}

      {q.type === "open" && (
        <OpenEditor
          question={q}
          onChange={(correctAnswer) => onChange({ correctAnswer })}
        />
      )}

      <div className="space-y-1">
        <SectionLabel as="label">
          Пояснення{" "}
          <span className="normal-case font-normal">(необов`язково)</span>
        </SectionLabel>
        <Textarea
          mono
          value={q.explanation}
          onChange={(e) => onChange({ explanation: e.target.value })}
          placeholder="Пояснення правильної відповіді... Використовуйте $...$ для inline math, $$...$$ для block math"
          rows={2}
          className={textareaClass}
        />
        {q.explanation && (
          <div className="px-4 py-3 rounded-xl border border-border/30 bg-muted/30 text-sm leading-relaxed">
            <MathText text={q.explanation} />
          </div>
        )}
      </div>

      <QuestionImageUpload
        contextId={contextId}
        slotId={`${q.id}-explanation`}
        imageUrl={q.explanationImageUrl}
        onUploaded={(url) => onChange({ explanationImageUrl: url })}
        onRemoved={() => onChange({ explanationImageUrl: undefined })}
        label="Зображення до пояснення"
      />
    </div>
  );
}
