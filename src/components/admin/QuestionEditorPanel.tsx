"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { ImagePlus, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/MathText";
import Image from "next/image";
import { uploadQuestionImage, deleteQuestionImage } from "@/lib/storage";
import { QuestionOption } from "@/types";
import { MatchingItem } from "@/lib/tests";

// Minimal interfaces — work with both TestQuestion and BankQuestion subtypes

type MCQEditorQ = { id: string; options: QuestionOption[]; correctOptionId: string };
type OpenEditorQ = { correctAnswer: string };
type MatchingEditorQ = { leftItems: MatchingItem[]; rightOptions: MatchingItem[]; correctPairs: Record<string, string> };

// ── QuestionImageUpload ───────────────────────────────────────────────────────

export function QuestionImageUpload({
  contextId,
  slotId,
  imageUrl,
  onUploaded,
  onRemoved,
  label = "Зображення",
}: {
  contextId: string;
  slotId: string;
  imageUrl?: string;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const url = await uploadQuestionImage(contextId, slotId, file);
      onUploaded(url);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (imageUrl) await deleteQuestionImage(imageUrl);
    onRemoved();
  }

  if (imageUrl) {
    return (
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</label>
        <div className="relative rounded-xl overflow-hidden border border-border/50 bg-muted/30 group">
          <Image src={imageUrl} alt="" width={800} height={400} className="w-full h-48 object-contain" />
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-background/90 border border-border/60 flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-all"
          >
            <XIcon size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
        {label} <span className="normal-case font-normal">(необов'язково)</span>
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full h-24 rounded-xl border border-dashed border-border/50 bg-muted/20 hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1.5 text-muted-foreground disabled:opacity-50"
      >
        <ImagePlus size={20} />
        <span className="text-xs">{uploading ? "Завантаження..." : "Додати зображення"}</span>
      </button>
    </div>
  );
}

// ── OptionImageSlot ───────────────────────────────────────────────────────────

export function OptionImageSlot({
  contextId,
  questionId,
  optionId,
  imageUrl,
  onUploaded,
  onRemoved,
}: {
  contextId: string;
  questionId: string;
  optionId: string;
  imageUrl?: string;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const url = await uploadQuestionImage(contextId, `${questionId}-opt-${optionId}`, file);
      onUploaded(url);
    } finally {
      setUploading(false);
    }
  }

  if (imageUrl) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-border/50 bg-muted/20 group">
        <Image src={imageUrl} alt="" width={400} height={200} className="w-full max-h-32 object-contain" />
        <button
          onClick={onRemoved}
          className="absolute top-1 right-1 w-6 h-6 rounded-md bg-background/90 border border-border/60 flex items-center justify-center text-muted-foreground hover:text-destructive transition-all opacity-0 group-hover:opacity-100"
        >
          <XIcon size={11} />
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full h-8 rounded-lg border border-dashed border-border/40 bg-muted/10 hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center gap-1.5 text-muted-foreground disabled:opacity-50"
      >
        <ImagePlus size={12} />
        <span className="text-[11px]">{uploading ? "Завантаження..." : "Додати зображення"}</span>
      </button>
    </>
  );
}

// ── MCQEditor ─────────────────────────────────────────────────────────────────

export function MCQEditor({
  contextId,
  question,
  onOptionChange,
  onCorrectChange,
  onOptionImageChange,
}: {
  contextId: string;
  question: MCQEditorQ;
  onOptionChange: (optId: string, text: string) => void;
  onCorrectChange: (optId: string) => void;
  onOptionImageChange: (optId: string, url: string | undefined) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
        Варіанти відповіді
      </label>
      <div className="space-y-3">
        {question.options.map((opt) => (
          <div key={opt.id} className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => onCorrectChange(opt.id)}
              className={cn(
                "w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-all mt-2",
                question.correctOptionId === opt.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/60 text-muted-foreground",
              )}
              title="Позначити правильною"
            >
              {opt.id}
            </button>
            <div className="flex-1 space-y-1.5">
              <textarea
                value={opt.text}
                onChange={(e) => onOptionChange(opt.id, e.target.value)}
                placeholder={`Варіант ${opt.id}... Використовуйте $...$ для math`}
                rows={1}
                className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors resize-none font-mono"
              />
              {opt.text && opt.text.includes("$") && (
                <div className="px-3 py-1.5 rounded-lg border border-border/30 bg-muted/30 text-sm">
                  <MathText text={opt.text} />
                </div>
              )}
              <OptionImageSlot
                contextId={contextId}
                questionId={question.id}
                optionId={opt.id}
                imageUrl={opt.imageUrl}
                onUploaded={(url) => onOptionImageChange(opt.id, url)}
                onRemoved={() => onOptionImageChange(opt.id, undefined)}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Клікніть на літеру — правильна відповідь</p>
    </div>
  );
}

// ── OpenEditor ────────────────────────────────────────────────────────────────

export function OpenEditor({
  question,
  onChange,
}: {
  question: OpenEditorQ;
  onChange: (correctAnswer: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Правильна відповідь</label>
      <input
        value={question.correctAnswer}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Числова або текстова відповідь..."
        className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors"
      />
    </div>
  );
}

// ── MatchingEditor ────────────────────────────────────────────────────────────

export function MatchingEditor({
  question,
  onChange,
}: {
  question: MatchingEditorQ;
  onChange: (patch: Partial<MatchingEditorQ>) => void;
}) {
  function updateLeft(id: string, text: string) {
    onChange({ leftItems: question.leftItems.map((i) => i.id === id ? { ...i, text } : i) });
  }
  function updateRight(id: string, text: string) {
    onChange({ rightOptions: question.rightOptions.map((i) => i.id === id ? { ...i, text } : i) });
  }
  function addLeft() {
    const nextId = String(question.leftItems.length + 1);
    onChange({ leftItems: [...question.leftItems, { id: nextId, text: "" }] });
  }
  function removeLeft(id: string) {
    const pairs = { ...question.correctPairs };
    delete pairs[id];
    onChange({ leftItems: question.leftItems.filter((i) => i.id !== id), correctPairs: pairs });
  }
  function setPair(leftId: string, rightId: string) {
    onChange({ correctPairs: { ...question.correctPairs, [leftId]: rightId } });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          Вирази / твердження (ліва колонка)
        </label>
        {question.leftItems.map((item) => (
          <div key={item.id} className="flex items-start gap-2">
            <span className="text-xs font-semibold w-5 text-center shrink-0 text-muted-foreground mt-2.5">{item.id}.</span>
            <div className="flex-1 space-y-1">
              <textarea
                value={item.text}
                onChange={(e) => updateLeft(item.id, e.target.value)}
                placeholder={`Вираз ${item.id}... Використовуйте $...$ для math`}
                rows={1}
                className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors resize-none font-mono"
              />
              {item.text && item.text.includes("$") && (
                <div className="px-3 py-1.5 rounded-lg border border-border/30 bg-muted/30 text-sm">
                  <MathText text={item.text} />
                </div>
              )}
            </div>
            <button onClick={() => removeLeft(item.id)} className="text-muted-foreground hover:text-destructive transition-colors text-xs px-1 mt-2.5">✕</button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="text-xs" onClick={addLeft}>+ Додати рядок</Button>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          Варіанти відповіді (права колонка)
        </label>
        {question.rightOptions.map((opt) => (
          <div key={opt.id} className="flex items-start gap-2">
            <span className="text-xs font-semibold w-5 text-center shrink-0 text-primary mt-2.5">{opt.id}.</span>
            <div className="flex-1 space-y-1">
              <textarea
                value={opt.text}
                onChange={(e) => updateRight(opt.id, e.target.value)}
                placeholder={`Варіант ${opt.id}... Використовуйте $...$ для math`}
                rows={1}
                className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors resize-none font-mono"
              />
              {opt.text && opt.text.includes("$") && (
                <div className="px-3 py-1.5 rounded-lg border border-border/30 bg-muted/30 text-sm">
                  <MathText text={opt.text} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Правильні пари</label>
        <div className="rounded-xl border border-border/50 overflow-hidden">
          {question.leftItems.map((item, i) => (
            <div key={item.id} className={cn("flex items-center gap-3 px-4 py-2.5", i % 2 === 0 ? "bg-muted/20" : "")}>
              <span className="text-sm w-24 truncate text-foreground/80">
                {item.id}. {item.text || <span className="italic text-muted-foreground">...</span>}
              </span>
              <span className="text-muted-foreground">→</span>
              <div className="flex gap-1.5 flex-wrap">
                {question.rightOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setPair(item.id, opt.id)}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 text-xs font-bold transition-all",
                      question.correctPairs[item.id] === opt.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/60 text-muted-foreground",
                    )}
                  >
                    {opt.id}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Клікніть літеру — правильна відповідь для рядка</p>
      </div>
    </div>
  );
}
