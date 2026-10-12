"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { Columns2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SpinnerPage } from "@/components/ui/spinner";
import { useQuestionBank } from "@/hooks/useQuestionBank";
import { PLURAL, pluralize } from "@/lib/format";
import { TOPICS } from "@/lib/topics";
import { cn } from "@/lib/utils";
import type { BankQuestion } from "@/lib/tests";
import { qStatus } from "@/components/admin/questions/constants";
import { CompareModal } from "@/components/admin/questions/CompareModal";
import { DailyOrderTab } from "@/components/admin/questions/DailyOrderTab";
import {
  EMPTY_FILTERS,
  QuestionFilters,
  type QuestionFilterState,
} from "@/components/admin/questions/QuestionFilters";
import { QuestionFormModal } from "@/components/admin/questions/QuestionFormModal";
import { QuestionReviewRow } from "@/components/admin/questions/QuestionReviewRow";
import { QuestionStats } from "@/components/admin/questions/QuestionStats";
import { StudentPreviewModal } from "@/components/admin/questions/StudentPreviewModal";

export default function QuestionsReviewPage() {
  const { questions, loading, saving, patch, remove, save, reorderDaily } =
    useQuestionBank();

  const [activeTab, setActiveTab] = useState<"review" | "order">("review");

  const [filters, setFilters] = useState<QuestionFilterState>(EMPTY_FILTERS);
  const updateFilters = useCallback(
    (p: Partial<QuestionFilterState>) => setFilters((f) => ({ ...f, ...p })),
    [],
  );
  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);
  // Typing updates the input immediately; filtering + highlighting lag behind.
  const search = useDeferredValue(filters.search);

  const [compareIds, setCompareIds] = useState<Set<string>>(() => new Set());
  const [showCompare, setShowCompare] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [previewQ, setPreviewQ] = useState<BankQuestion | null>(null);
  // null = closed; { initial: null } = create; { initial: q } = edit.
  const [form, setForm] = useState<{ initial: BankQuestion | null } | null>(null);

  const stats = useMemo(
    () => ({
      total: questions.length,
      draft: questions.filter((q) => qStatus(q) === "draft").length,
      approved: questions.filter((q) => qStatus(q) === "approved").length,
      rejected: questions.filter((q) => qStatus(q) === "rejected").length,
      byTopic: TOPICS.map((t) => ({
        ...t,
        count: questions.filter((q) => q.topicId === t.id).length,
      })),
    }),
    [questions],
  );

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    const { topic, difficulty, status, type } = filters;
    return questions.filter((q) => {
      if (topic !== "all" && q.topicId !== topic) return false;
      if (difficulty !== null && q.difficulty !== difficulty) return false;
      if (status !== "all" && qStatus(q) !== status) return false;
      if (type !== "all" && q.type !== type) return false;
      if (s && !q.text.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [questions, filters, search]);

  const compareList = useMemo(
    () =>
      [...compareIds]
        .map((id) => questions.find((q) => q.id === id))
        .filter((q): q is BankQuestion => !!q),
    [compareIds, questions],
  );

  // ── Stable row handlers ────────────────────────────────────────────────
  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 2) next.add(id);
      return next;
    });
  }, []);

  const openEdit = useCallback((q: BankQuestion) => setForm({ initial: q }), []);

  const approve = useCallback(
    (id: string) => void patch(id, { status: "approved", reviewNote: undefined }),
    [patch],
  );

  const rejectToggle = useCallback(
    (q: BankQuestion) => {
      if (qStatus(q) === "rejected") {
        void patch(q.id, { status: "draft", reviewNote: undefined });
      } else {
        setRejectTarget(q.id);
      }
    },
    [patch],
  );

  const confirmReject = useCallback(
    async (id: string, note: string) => {
      await patch(id, { status: "rejected", reviewNote: note || undefined });
      setRejectTarget(null);
    },
    [patch],
  );

  const cancelReject = useCallback(() => setRejectTarget(null), []);

  const confirmDelete = useCallback(async () => {
    const id = deleteTarget;
    if (!id) return;
    setDeleteTarget(null);
    await remove(id);
    setCompareIds((prev) => {
      if (!prev.has(id)) return prev;
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  }, [deleteTarget, remove]);

  const closePreview = useCallback(() => setPreviewQ(null), []);
  const closeCompare = useCallback(() => setShowCompare(false), []);
  const closeForm = useCallback(() => setForm(null), []);
  const cancelDelete = useCallback(() => setDeleteTarget(null), []);

  if (loading) return <SpinnerPage size="lg" />;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Tabs + primary action */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit">
          {(["review", "order"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === t
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "review" ? "Перевірка" : "Порядок дня"}
            </button>
          ))}
        </div>
        {activeTab === "review" && (
          <Button
            size="sm"
            onClick={() => setForm({ initial: null })}
            className="gap-1.5"
          >
            <Plus size={14} />
            Нове завдання
          </Button>
        )}
      </div>

      {activeTab === "order" && (
        <DailyOrderTab questions={questions} onReorder={reorderDaily} />
      )}

      {activeTab === "review" && (
        <>
          <QuestionStats
            total={stats.total}
            draft={stats.draft}
            approved={stats.approved}
            rejected={stats.rejected}
          />

          <QuestionFilters
            value={filters}
            onChange={updateFilters}
            onReset={resetFilters}
            topics={stats.byTopic}
          >
            {compareIds.size === 2 && (
              <Button
                size="sm"
                onClick={() => setShowCompare(true)}
                className="gap-1.5"
              >
                <Columns2 size={14} /> Порівняти
              </Button>
            )}
            {compareIds.size > 0 && (
              <button
                onClick={() => setCompareIds(new Set())}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Скасувати ({compareIds.size}/2)
              </button>
            )}
          </QuestionFilters>

          <p className="text-xs text-muted-foreground">
            Показано{" "}
            <span className="font-semibold text-foreground">
              {filtered.length}
            </span>{" "}
            з {pluralize(stats.total, PLURAL.task)}
          </p>

          <div className="space-y-2">
            {filtered.length === 0 && (
              <EmptyState
                title="Немає завдань за вибраними фільтрами"
                className="py-12 text-sm text-muted-foreground"
              />
            )}
            {filtered.map((q) => {
              const inCompare = compareIds.has(q.id);
              return (
                <QuestionReviewRow
                  key={q.id}
                  question={q}
                  highlight={search}
                  inCompare={inCompare}
                  compareDisabled={!inCompare && compareIds.size >= 2}
                  isSaving={saving.has(q.id)}
                  isRejectOpen={rejectTarget === q.id}
                  onToggleCompare={toggleCompare}
                  onPreview={setPreviewQ}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  onApprove={approve}
                  onRejectToggle={rejectToggle}
                  onRejectConfirm={confirmReject}
                  onRejectCancel={cancelReject}
                />
              );
            })}
          </div>

          {previewQ && (
            <StudentPreviewModal question={previewQ} onClose={closePreview} />
          )}

          <ConfirmDialog
            open={deleteTarget !== null}
            title="Видалити завдання?"
            description="Цю дію не можна скасувати."
            onConfirm={confirmDelete}
            onCancel={cancelDelete}
          />

          <CompareModal
            open={showCompare && compareList.length === 2}
            questions={compareList}
            onClose={closeCompare}
          />

          {form && (
            <QuestionFormModal
              initial={form.initial}
              onClose={closeForm}
              onSave={save}
            />
          )}
        </>
      )}
    </div>
  );
}
