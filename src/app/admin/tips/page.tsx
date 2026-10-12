"use client";

import { useEffect, useState } from "react";
import { useDragReorder } from "@/hooks/useDragReorder";
import { getTips, createTip, updateTip, deleteTip, saveTipsOrder, Tip } from "@/lib/tips";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { Trash2, Pencil, Plus, Check, X, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";
import { getDayIndex } from "@/lib/format";
import { SpinnerPage } from "@/components/ui/spinner";
import { IconButton } from "@/components/ui/icon-button";
import { Textarea } from "@/components/ui/text-field";

const EMOJI_SUGGESTIONS = ["📐", "🔢", "📏", "🎯", "⏱️", "📊", "🔄", "📉", "🧮", "📌", "🔺", "💡", "📈", "🎲", "🔵", "🔁", "✏️", "🧠", "📋", "⭐"];

function TipForm({
  title,
  initialEmoji,
  initialText,
  placeholder,
  submitLabel,
  submitIcon,
  onSubmit,
  onCancel,
}: {
  title?: string;
  initialEmoji: string;
  initialText: string;
  placeholder?: string;
  submitLabel: string;
  submitIcon: React.ReactNode;
  onSubmit: (emoji: string, text: string) => void;
  onCancel: () => void;
}) {
  const [emoji, setEmoji] = useState(initialEmoji);
  const [text, setText] = useState(initialText);

  function submit() {
    if (!text.trim()) return;
    onSubmit(emoji, text.trim());
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-card p-4 space-y-3">
      {title && <p className="text-sm font-medium">{title}</p>}
      <div className="flex gap-2 flex-wrap">
        {EMOJI_SUGGESTIONS.map((e) => (
          <button key={e} type="button" onClick={() => setEmoji(e)} className={cn("w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all", emoji === e ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted")}>{e}</button>
        ))}
        <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-14 h-8 rounded-lg border border-border/60 bg-muted/30 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary" maxLength={4} placeholder="або" aria-label="Свій емодзі" />
      </div>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="px-3 py-2 resize-none" rows={3} />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} className="gap-1">{submitIcon} {submitLabel}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="gap-1"><X size={14} /> Скасувати</Button>
      </div>
    </div>
  );
}

function TipRow({
  tip, badge, onSave, onDelete,
  onDragStart, onDragEnter, onDrop, onDragEnd,
  isSrc, isOver, onMoveUp, onMoveDown, isFirst, isLast,
}: {
  tip: Tip;
  badge?: "today" | "tomorrow";
  onSave: (id: string, data: Partial<Tip>) => void;
  onDelete: (id: string) => void;
  onDragStart: () => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  isSrc: boolean;
  isOver: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <TipForm
        initialEmoji={tip.emoji}
        initialText={tip.text}
        submitLabel="Зберегти"
        submitIcon={<Check size={14} />}
        onSubmit={(emoji, text) => {
          onSave(tip.id, { emoji, text });
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-2xl border bg-card px-4 py-3 flex items-center gap-3 group transition-all select-none relative overflow-hidden",
        !tip.active && "border-border/30 opacity-50",
        badge === "today" && !isOver && "border-primary/40 bg-primary/5",
        !badge && tip.active && !isOver && "border-border/50",
        isSrc && "opacity-40",
        isOver && "border-primary/60 bg-primary/5 scale-[1.01]",
      )}
      >
        <div className="hidden [@media(hover:hover)]:flex shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors cursor-grab active:cursor-grabbing">
          <GripVertical size={16} />
        </div>
        <div className="flex [@media(hover:hover)]:hidden flex-col shrink-0">
          <button onClick={onMoveUp} disabled={isFirst} aria-label="Вгору" className="text-muted-foreground disabled:opacity-20 p-0.5">
            <ChevronUp size={14} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} aria-label="Вниз" className="text-muted-foreground disabled:opacity-20 p-0.5">
            <ChevronDown size={14} />
          </button>
        </div>

        <span className="text-2xl shrink-0">{tip.emoji}</span>

        <div className="flex-1 min-w-0">
          <p className="text-sm leading-relaxed text-foreground/80">{tip.text}</p>
        </div>

        <div className="relative shrink-0 ml-auto flex items-center" style={{ minWidth: "fit-content" }}>
          {badge && (
            <span className={cn(
              "text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-all duration-150",
              "group-hover:opacity-0 group-hover:scale-90 group-hover:pointer-events-none",
              "[@media(hover:none)]:hidden",
              badge === "today" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
            )}>
              {badge === "today" ? "Сьогодні" : "Завтра"}
            </span>
          )}
          <div className={cn(
            "flex items-center gap-1 transition-all duration-150",
            badge
              ? "absolute right-0 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 [@media(hover:none)]:static [@media(hover:none)]:opacity-100 [@media(hover:none)]:scale-100"
              : "opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100",
          )}>
            <IconButton label={tip.active ? "Деактивувати" : "Активувати"} onClick={() => onSave(tip.id, { active: !tip.active })}>
              {tip.active ? <Eye size={13} /> : <EyeOff size={13} />}
            </IconButton>
            <IconButton label="Редагувати" onClick={() => setEditing(true)}>
              <Pencil size={13} />
            </IconButton>
            <IconButton label="Видалити" tone="danger" onClick={() => onDelete(tip.id)}>
              <Trash2 size={13} />
            </IconButton>
          </div>
        </div>
    </div>
  );
}

function NewTipForm({ onAdd }: { onAdd: (data: Omit<Tip, "id">) => void }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded-2xl border border-dashed border-border/50 py-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-all">
        <Plus size={16} /> Додати пораду
      </button>
    );
  }

  return (
    <TipForm
      title="Нова порада"
      initialEmoji="💡"
      initialText=""
      placeholder="Текст поради..."
      submitLabel="Додати"
      submitIcon={<Plus size={14} />}
      onSubmit={(emoji, text) => {
        onAdd({ emoji, text, active: true });
        setOpen(false);
      }}
      onCancel={() => setOpen(false)}
    />
  );
}

export default function AdminTipsPage() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  // Student dashboard caches tips — refresh it after any change here.
  const invalidateTips = () => queryClient.invalidateQueries({ queryKey: queryKeys.tips });

  useEffect(() => {
    getTips().then((t) => { setTips(t); setLoading(false); });
  }, []);

  async function handleAdd(data: Omit<Tip, "id">) {
    const order = tips.length;
    const id = await createTip({ ...data, order });
    setTips((prev) => [...prev, { id, ...data, order }]);
    invalidateTips();
  }

  async function handleSave(id: string, data: Partial<Tip>) {
    await updateTip(id, data);
    setTips((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
    invalidateTips();
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    await deleteTip(id);
    setTips((prev) => prev.filter((t) => t.id !== id));
    invalidateTips();
  }

  function handleReorder(src: number, dst: number) {
    const next = [...tips];
    const [moved] = next.splice(src, 1);
    next.splice(dst, 0, moved);
    setTips(next.map((t, idx) => ({ ...t, order: idx })));
    saveTipsOrder(next).then(invalidateTips, invalidateTips);
  }

  const { isSrc: isDragSrc, isOver: isDragOver, handleDragStart, handleDragEnter, handleDrop, handleDragEnd } = useDragReorder(handleReorder);

  const dayIdx = getDayIndex();
  const baseIdx = tips.length > 0 ? dayIdx % tips.length : -1;
  let todayIdx = -1;
  for (let i = 0; i < tips.length; i++) {
    const idx = (baseIdx + i) % tips.length;
    if (tips[idx].active) { todayIdx = idx; break; }
  }
  let tomorrowIdx = -1;
  for (let i = 1; i < tips.length; i++) {
    const idx = (todayIdx + i) % tips.length;
    if (tips[idx].active) { tomorrowIdx = idx; break; }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {loading ? <SpinnerPage /> : (
        <div className="space-y-2">
          {tips.map((tip, i) => {
            const badge: "today" | "tomorrow" | undefined =
              i === todayIdx ? "today" : i === tomorrowIdx ? "tomorrow" : undefined;
            return (
              <TipRow
                key={tip.id}
                tip={tip}
                badge={badge}
                onSave={handleSave}
                onDelete={(id) => setConfirmDeleteId(id)}
                onDragStart={() => handleDragStart(i)}
                onDragEnter={(e) => handleDragEnter(i, e)}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
                isSrc={isDragSrc(i)}
                isOver={isDragOver(i)}
                onMoveUp={() => handleReorder(i, i - 1)}
                onMoveDown={() => handleReorder(i, i + 1)}
                isFirst={i === 0}
                isLast={i === tips.length - 1}
              />
            );
          })}
          <NewTipForm onAdd={handleAdd} />
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Видалити пораду?"
        description="Цю дію не можна скасувати. Порада буде видалена назавжди."
        confirmLabel="Видалити"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
