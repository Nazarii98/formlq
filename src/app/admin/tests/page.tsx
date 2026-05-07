"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getAllTests, updateTest, createTest, deleteTest } from "@/lib/tests";
import { getDayIndex } from "@/lib/format";
import { SpinnerPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { Pencil, Trash2, Plus, FileText, GripVertical, Eye, EyeOff } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TestDoc } from "@/lib/tests";

export default function AdminTestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [dragSrcIdx, setDragSrcIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragSrcRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);

  const { data: rawTests = [], isLoading } = useQuery({
    queryKey: ["all-tests"],
    queryFn: getAllTests,
    staleTime: 2 * 60 * 1000,
    select: (t) => [...t].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  });

  const tests = rawTests;

  const createMutation = useMutation({
    mutationFn: (uid: string) => createTest(uid),
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["all-tests"] });
      router.push(`/admin/tests/${id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-tests"] }),
  });

  async function handleTogglePublished(e: React.MouseEvent, id: string, current: boolean) {
    e.preventDefault();
    e.stopPropagation();
    await updateTest(id, { published: !current });
    queryClient.invalidateQueries({ queryKey: ["all-tests"] });
    queryClient.invalidateQueries({ queryKey: ["published-tests"] });
  }

  async function performReorder(src: number, dst: number) {
    const next = [...tests];
    const [moved] = next.splice(src, 1);
    next.splice(dst, 0, moved);
    const updated = next.map((t, i) => ({ ...t, order: i }));
    queryClient.setQueryData(["all-tests"], updated);
    await Promise.all(updated.map((t, i) => updateTest(t.id, { order: i })));
    queryClient.invalidateQueries({ queryKey: ["all-tests"] });
  }

  function handleDragStart(i: number) {
    dragSrcRef.current = i;
    setDragSrcIdx(i);
  }

  function handleDragEnter(i: number, e: React.DragEvent) {
    if ((e.currentTarget as Node).contains(e.relatedTarget as Node)) return;
    if (dragOverRef.current !== i) {
      dragOverRef.current = i;
      setDragOverIdx(i);
    }
  }

  function handleDrop(i: number) {
    const src = dragSrcRef.current;
    dragSrcRef.current = null;
    dragOverRef.current = null;
    setDragSrcIdx(null);
    setDragOverIdx(null);
    if (src !== null && src !== i) performReorder(src, i);
  }

  function handleDragEnd() {
    dragSrcRef.current = null;
    dragOverRef.current = null;
    setDragSrcIdx(null);
    setDragOverIdx(null);
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    deleteMutation.mutate(id);
  }

  const dayIdx = getDayIndex();
  const baseIdx = tests.length > 0 ? dayIdx % tests.length : -1;
  let todayIdx = -1;
  for (let i = 0; i < tests.length; i++) {
    const idx = (baseIdx + i) % tests.length;
    if (tests[idx].published) { todayIdx = idx; break; }
  }
  let tomorrowIdx = -1;
  for (let i = 1; i < tests.length; i++) {
    const idx = (todayIdx + i) % tests.length;
    if (tests[idx].published) { tomorrowIdx = idx; break; }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => user && createMutation.mutate(user.uid)}
          disabled={createMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
        >
          <Plus size={15} />
          {createMutation.isPending ? "Створення..." : "Новий тест"}
        </button>
      </div>

      {isLoading ? <SpinnerPage /> : tests.length === 0 ? (
        <EmptyState emoji="📝" title="Тестів ще немає" description="Створіть перший тест" />
      ) : (
        <div className="space-y-2">
          {tests.map((test, i) => {
            const badge: "today" | "tomorrow" | undefined =
              i === todayIdx ? "today" : i === tomorrowIdx ? "tomorrow" : undefined;
            const isSrc = dragSrcIdx === i;
            const isOver = dragOverIdx === i && dragSrcIdx !== i;

            return (
              <div
                key={test.id}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragEnter={(e) => handleDragEnter(i, e)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "rounded-2xl border bg-card px-4 py-3 flex items-center gap-3 group transition-all select-none relative overflow-hidden",
                  !test.published && "border-border/30 opacity-60",
                  badge === "today" && !isOver && "border-primary/40 bg-primary/5",
                  !badge && test.published && !isOver && "border-border/50",
                  isSrc && "opacity-40",
                  isOver && "border-primary/50 bg-primary/5 shadow-[0_0_0_2px_color-mix(in_oklch,var(--primary)_20%,transparent)]",
                )}
              >
                <div className="shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors cursor-grab active:cursor-grabbing">
                  <GripVertical size={16} />
                </div>

                <div className={cn("w-2 h-2 rounded-full shrink-0", test.published ? "bg-green-500" : "bg-muted-foreground/30")} />

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{test.title || "Без назви"}</p>
                  {test.subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{test.subtitle}</p>}
                </div>

                <div className="relative shrink-0 ml-auto flex items-center" style={{ minWidth: "fit-content" }}>
                  {badge && (
                    <span className={cn(
                      "text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-all duration-150",
                      "group-hover:opacity-0 group-hover:scale-90 group-hover:pointer-events-none",
                      badge === "today" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                    )}>
                      {badge === "today" ? "Сьогодні" : "Завтра"}
                    </span>
                  )}

                  <div className={cn(
                    "flex items-center gap-1 transition-all duration-150",
                    badge
                      ? "absolute right-0 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
                      : "opacity-0 group-hover:opacity-100",
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
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(test.id); }}
                      disabled={deleteMutation.isPending}
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
