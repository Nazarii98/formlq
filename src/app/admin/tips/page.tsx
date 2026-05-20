"use client";

import { useEffect, useState } from "react";
import { useDragReorder } from "@/hooks/useDragReorder";
import { getTips, createTip, updateTip, deleteTip, Tip } from "@/lib/tips";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { Trash2, Pencil, Plus, Check, X, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";
import { getDayIndex } from "@/lib/format";
import { SpinnerPage } from "@/components/ui/spinner";

const EMOJI_SUGGESTIONS = ["📐", "🔢", "📏", "🎯", "⏱️", "📊", "🔄", "📉", "🧮", "📌", "🔺", "💡", "📈", "🎲", "🔵", "🔁", "✏️", "🧠", "📋", "⭐"];

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
  const [emoji, setEmoji] = useState(tip.emoji);
  const [text, setText] = useState(tip.text);

  function save() {
    if (!text.trim()) return;
    onSave(tip.id, { emoji, text: text.trim() });
    setEditing(false);
  }

  function cancel() {
    setEmoji(tip.emoji);
    setText(tip.text);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-card p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {EMOJI_SUGGESTIONS.map((e) => (
            <button key={e} onClick={() => setEmoji(e)} className={cn("w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all", emoji === e ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted")}>{e}</button>
          ))}
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-14 h-8 rounded-lg border border-border/60 bg-muted/30 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary" maxLength={4} placeholder="або" />
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" rows={3} />
        <div className="flex gap-2">
          <Button size="sm" onClick={save} className="gap-1"><Check size={14} /> Зберегти</Button>
          <Button size="sm" variant="ghost" onClick={cancel} className="gap-1"><X size={14} /> Скасувати</Button>
        </div>
      </div>
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
          <button onClick={onMoveUp} disabled={isFirst} className="text-muted-foreground disabled:opacity-20 p-0.5">
            <ChevronUp size={14} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className="text-muted-foreground disabled:opacity-20 p-0.5">
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
            <button onClick={() => onSave(tip.id, { active: !tip.active })} title={tip.active ? "Деактивувати" : "Активувати"} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
              {tip.active ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
            <button onClick={() => setEditing(true)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
              <Pencil size={13} />
            </button>
            <button onClick={() => onDelete(tip.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
    </div>
  );
}

function NewTipForm({ onAdd }: { onAdd: (data: Omit<Tip, "id">) => void }) {
  const [open, setOpen] = useState(false);
  const [emoji, setEmoji] = useState("💡");
  const [text, setText] = useState("");

  function submit() {
    if (!text.trim()) return;
    onAdd({ emoji, text: text.trim(), active: true });
    setText(""); setEmoji("💡"); setOpen(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded-2xl border border-dashed border-border/50 py-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-all">
        <Plus size={16} /> Додати пораду
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-card p-4 space-y-3">
      <p className="text-sm font-medium">Нова порада</p>
      <div className="flex gap-2 flex-wrap">
        {EMOJI_SUGGESTIONS.map((e) => (
          <button key={e} onClick={() => setEmoji(e)} className={cn("w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all", emoji === e ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted")}>{e}</button>
        ))}
        <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-14 h-8 rounded-lg border border-border/60 bg-muted/30 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary" maxLength={4} placeholder="або" />
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Текст поради..." className="w-full rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" rows={3} />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} className="gap-1"><Plus size={14} /> Додати</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="gap-1"><X size={14} /> Скасувати</Button>
      </div>
    </div>
  );
}

export default function AdminTipsPage() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    getTips().then((t) => { setTips(t); setLoading(false); });
  }, []);

  async function handleAdd(data: Omit<Tip, "id">) {
    const order = tips.length;
    const id = await createTip({ ...data, order });
    setTips((prev) => [...prev, { id, ...data, order }]);
  }

  async function handleSave(id: string, data: Partial<Tip>) {
    await updateTip(id, data);
    setTips((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    await deleteTip(id);
    setTips((prev) => prev.filter((t) => t.id !== id));
  }

  function handleReorder(src: number, dst: number) {
    const next = [...tips];
    const [moved] = next.splice(src, 1);
    next.splice(dst, 0, moved);
    const updated = next.map((t, idx) => ({ ...t, order: idx }));
    setTips(updated);
    Promise.all(updated.map((t, idx) => updateTip(t.id, { order: idx })));
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
