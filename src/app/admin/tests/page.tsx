"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getAllTests, updateTest, createTest, deleteTest, TestDoc } from "@/lib/tests";
import { cn } from "@/lib/utils";
import { Pencil, Trash2, Plus, FileText, GripVertical, Eye, EyeOff } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function getDayIndex() {
  return Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
}

export default function AdminTestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState<TestDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    getAllTests().then((t) => {
      const sorted = [...t].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setTests(sorted);
      setLoading(false);
    });
  }, []);

  async function handleCreate() {
    if (!user) return;
    setCreating(true);
    try {
      const id = await createTest(user.uid);
      router.push(`/admin/tests/${id}`);
    } finally {
      setCreating(false);
    }
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDeleteId(id);
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    setDeletingId(id);
    try {
      await deleteTest(id);
      setTests((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleTogglePublished(e: React.MouseEvent, id: string, current: boolean) {
    e.preventDefault();
    e.stopPropagation();
    await updateTest(id, { published: !current });
    setTests((prev) => prev.map((t) => t.id === id ? { ...t, published: !current } : t));
  }

  async function handleDragEnd() {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...tests];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dragOverIndex, 0, moved);
    const updated = next.map((t, i) => ({ ...t, order: i }));
    setTests(updated);
    setDragIndex(null);
    setDragOverIndex(null);
    await Promise.all(updated.map((t, i) => updateTest(t.id, { order: i })));
  }

  const dayIdx = getDayIndex();
  const todayIdx = tests.length > 0 ? dayIdx % tests.length : -1;
  const tomorrowIdx = tests.length > 0 ? (dayIdx + 1) % tests.length : -1;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
        >
          <Plus size={15} />
          {creating ? "Створення..." : "Новий тест"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : tests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 py-20 text-center space-y-2">
          <p className="text-3xl">📝</p>
          <p className="font-medium">Тестів ще немає</p>
          <p className="text-sm text-muted-foreground">Створіть перший тест</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tests.map((test, i) => {
            const badge: "today" | "tomorrow" | undefined =
              i === todayIdx && test.published ? "today"
              : i === tomorrowIdx && test.published ? "tomorrow"
              : undefined;
            const isDragging = dragIndex === i;
            const isDragOver = dragOverIndex === i && dragIndex !== i;

            return (
              <div
                key={test.id}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragEnter={() => setDragOverIndex(i)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={cn(
                  "rounded-2xl border bg-card px-4 py-3 flex items-center gap-3 group transition-all select-none relative overflow-hidden",
                  !test.published && "border-border/30 opacity-60",
                  badge === "today" && "border-primary/40 bg-primary/5",
                  badge === "tomorrow" && "border-border/50",
                  !badge && test.published && "border-border/50",
                  isDragging && "opacity-40 scale-[0.98]",
                  isDragOver && "border-primary/50 bg-primary/5 shadow-[0_0_0_2px_color-mix(in_oklch,var(--primary)_20%,transparent)]",
                )}
              >
                {/* Drag handle */}
                <div className="shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors cursor-grab active:cursor-grabbing">
                  <GripVertical size={16} />
                </div>

                {/* Status dot */}
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  test.published ? "bg-green-500" : "bg-muted-foreground/30"
                )} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{test.title || "Без назви"}</p>
                  {test.subtitle && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{test.subtitle}</p>
                  )}
                </div>

                {/* Right side: badge ↔ buttons */}
                <div className="relative shrink-0 ml-auto flex items-center" style={{ minWidth: "fit-content" }}>
                  {badge && (
                    <span className={cn(
                      "text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-all duration-150",
                      "group-hover:opacity-0 group-hover:scale-90 group-hover:pointer-events-none",
                      badge === "today" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {badge === "today" ? "Сьогодні" : "Завтра"}
                    </span>
                  )}

                  <div className={cn(
                    "flex items-center gap-1 transition-all duration-150",
                    badge
                      ? "absolute right-0 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
                      : "opacity-0 group-hover:opacity-100"
                  )}>
                    <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground mr-1">
                      <FileText size={11} />
                      <span>{test.questions?.length ?? 0}</span>
                    </div>

                    <button
                      onClick={(e) => handleTogglePublished(e, test.id, test.published)}
                      title={test.published ? "Деактивувати" : "Активувати"}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    >
                      {test.published ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/admin/tests/${test.id}`); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    >
                      <Pencil size={13} />
                    </button>

                    <button
                      onClick={(e) => handleDelete(e, test.id)}
                      disabled={deletingId === test.id}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Видалити тест?"
        description="Цю дію не можна скасувати. Тест буде видалено назавжди."
        confirmLabel="Видалити"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
