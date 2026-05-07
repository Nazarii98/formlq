"use client";

import { useEffect, useState } from "react";
import { getTips, createTip, updateTip, deleteTip, Tip } from "@/lib/tips";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2, Pencil, Plus, Check, X, ChevronUp, ChevronDown } from "lucide-react";

const EMOJI_SUGGESTIONS = ["📐", "🔢", "📏", "🎯", "⏱️", "📊", "🔄", "📉", "🧮", "📌", "🔺", "💡", "📈", "🎲", "🔵", "🔁", "✏️", "🧠", "📋", "⭐"];


function TipRow({ tip, badge, onSave, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  tip: Tip;
  badge?: "today" | "tomorrow";
  onSave: (id: string, data: Partial<Tip>) => void;
  onDelete: (id: string) => void;
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
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={cn(
                "w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all",
                emoji === e ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"
              )}
            >
              {e}
            </button>
          ))}
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className="w-14 h-8 rounded-lg border border-border/60 bg-muted/30 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            maxLength={4}
            placeholder="або"
          />
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={save} className="gap-1"><Check size={14} /> Зберегти</Button>
          <Button size="sm" variant="ghost" onClick={cancel} className="gap-1"><X size={14} /> Скасувати</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-2xl border bg-card px-4 py-3 flex items-center gap-3 group transition-all",
      tip.active ? "border-border/50" : "border-border/30 opacity-50"
    )}>
      <div className="flex flex-col gap-0.5 shrink-0 self-center">
        <button onClick={onMoveUp} disabled={isFirst} className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-20 disabled:cursor-default">
          <ChevronUp size={13} />
        </button>
        <button onClick={onMoveDown} disabled={isLast} className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-20 disabled:cursor-default">
          <ChevronDown size={13} />
        </button>
      </div>
      <span className="text-2xl shrink-0">{tip.emoji}</span>
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        {badge && (
          <span className={cn(
            "shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full",
            badge === "today" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {badge === "today" ? "Сьогодні" : "Завтра"}
          </span>
        )}
        <p className="text-sm leading-relaxed text-foreground/80">{tip.text}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onSave(tip.id, { active: !tip.active })}
          title={tip.active ? "Деактивувати" : "Активувати"}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all text-xs font-bold"
        >
          {tip.active ? "✓" : "○"}
        </button>
        <button
          onClick={() => setEditing(true)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onDelete(tip.id)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
        >
          <Trash2 size={13} />
        </button>
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
    setText("");
    setEmoji("💡");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-dashed border-border/50 py-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-all"
      >
        <Plus size={16} /> Додати пораду
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-card p-4 space-y-3">
      <p className="text-sm font-medium">Нова порада</p>
      <div className="flex gap-2 flex-wrap">
        {EMOJI_SUGGESTIONS.map((e) => (
          <button
            key={e}
            onClick={() => setEmoji(e)}
            className={cn(
              "w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all",
              emoji === e ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"
            )}
          >
            {e}
          </button>
        ))}
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          className="w-14 h-8 rounded-lg border border-border/60 bg-muted/30 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          maxLength={4}
          placeholder="або"
        />
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Текст поради..."
        className="w-full rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        rows={3}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} className="gap-1"><Plus size={14} /> Додати</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="gap-1"><X size={14} /> Скасувати</Button>
      </div>
    </div>
  );
}

function getDayIndex() {
  return Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
}

export default function AdminTipsPage() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);

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

  async function handleDelete(id: string) {
    await deleteTip(id);
    setTips((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleMove(index: number, direction: "up" | "down") {
    const next = direction === "up" ? index - 1 : index + 1;
    if (next < 0 || next >= tips.length) return;
    const newTips = [...tips];
    [newTips[index], newTips[next]] = [newTips[next], newTips[index]];
    const updated = newTips.map((t, i) => ({ ...t, order: i }));
    setTips(updated);
    await Promise.all([
      updateTip(updated[index].id, { order: index }),
      updateTip(updated[next].id, { order: next }),
    ]);
  }

  const active = tips.filter((t) => t.active).length;
  const dayIdx = getDayIndex();
  const todayIdx = active > 0 ? dayIdx % active : -1;
  const tomorrowIdx = active > 0 ? (dayIdx + 1) % active : -1;

  let activeCount = 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Поради дня</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {active} активних · щодня показується одна по черзі
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {tips.map((tip, i) => {
            let badge: "today" | "tomorrow" | undefined;
            if (tip.active) {
              if (activeCount === todayIdx) badge = "today";
              else if (activeCount === tomorrowIdx) badge = "tomorrow";
              activeCount++;
            }
            return (
              <TipRow
                key={tip.id}
                tip={tip}
                badge={badge}
                onSave={handleSave}
                onDelete={handleDelete}
                onMoveUp={() => handleMove(i, "up")}
                onMoveDown={() => handleMove(i, "down")}
                isFirst={i === 0}
                isLast={i === tips.length - 1}
              />
            );
          })}
          <NewTipForm onAdd={handleAdd} />
        </div>
      )}
    </div>
  );
}
