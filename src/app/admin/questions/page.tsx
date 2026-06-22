"use client";

import { useEffect, useState, useMemo } from "react";
import { useDragReorder } from "@/hooks/useDragReorder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MathText } from "@/components/MathText";
import {
  getAllQuestions,
  updateQuestion,
  createQuestion,
  deleteQuestion,
  findDuplicateQuestion,
} from "@/lib/questions";
import { TOPICS } from "@/lib/topics";
import {
  BankQuestion,
  BankMCQQuestion,
  BankOpenQuestion,
  BankMatchingQuestion,
  makeEmptyBankMCQ,
  makeEmptyBankOpen,
  makeEmptyBankMatching,
} from "@/lib/tests";
import {
  QuestionImageUpload,
  MCQEditor,
  OpenEditor,
  MatchingEditor,
} from "@/components/admin/QuestionEditorPanel";
import {
  CheckCircle,
  XCircle,
  Columns2,
  Search,
  X,
  Plus,
  Pencil,
  Trash2,
  Eye,
  BookOpen,
  GripVertical,
} from "lucide-react";
import Image from "next/image";
import { useReferenceDrawer } from "@/context/ReferenceDrawerContext";
import { Select, SelectItem } from "@/components/ui/select";

type Status = "draft" | "approved" | "rejected";

const STATUS_CFG: Record<Status, { label: string; cls: string }> = {
  draft: { label: "Чернетка", cls: "border-border/50 text-muted-foreground" },
  approved: {
    label: "Схвалено",
    cls: "border-green-500/40 text-green-600 bg-green-500/10",
  },
  rejected: {
    label: "Відхилено",
    cls: "border-red-400/40 text-red-500 bg-red-500/10",
  },
};

const DIFF_LABEL = [
  "",
  "Легко",
  "Нижче серед.",
  "Середньо",
  "Вище серед.",
  "Складно",
];

const TYPE_LABELS = {
  mcq: "MCQ",
  open: "Відповідь",
  matching: "Відповідність",
};

function qStatus(q: BankQuestion): Status {
  return (q.status as Status) ?? "draft";
}

export default function QuestionsReviewPage() {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterTopic, setFilterTopic] = useState("all");
  const [filterDiff, setFilterDiff] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | Status>("all");
  const [filterType, setFilterType] = useState<
    "all" | "mcq" | "open" | "matching"
  >("all");
  const [search, setSearch] = useState("");

  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [previewQ, setPreviewQ] = useState<BankQuestion | null>(null);
  const [previewAnswer, setPreviewAnswer] = useState<Record<string, string>>(
    {},
  );
  const { openDrawer } = useReferenceDrawer();

  // View tab
  const [activeTab, setActiveTab] = useState<"review" | "order">("review");

  // Create / edit modal
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null); // id when editing
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<BankQuestion>(() =>
    makeEmptyBankMCQ(TOPICS[0].id),
  );

  useEffect(() => {
    getAllQuestions().then((qs) => {
      setQuestions(qs);
      setLoading(false);
    });
  }, []);

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
    return questions.filter((q) => {
      if (filterTopic !== "all" && q.topicId !== filterTopic) return false;
      if (filterDiff !== null && q.difficulty !== filterDiff) return false;
      if (filterStatus !== "all" && qStatus(q) !== filterStatus) return false;
      if (filterType !== "all" && q.type !== filterType) return false;
      if (s && !q.text.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [questions, filterTopic, filterDiff, filterStatus, filterType, search]);

  async function patch(id: string, data: Partial<BankQuestion>) {
    setSaving((prev) => new Set(prev).add(id));
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? ({ ...q, ...data } as BankQuestion) : q)),
    );
    try {
      await updateQuestion(id, data);
    } finally {
      setSaving((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  }

  // Ordered list for "order" tab — approved only, sorted by dailyOrder
  const orderedList = useMemo(() => {
    const approved = questions.filter((q) => q.status === "approved");
    return [...approved].sort((a, b) => {
      if (a.dailyOrder != null && b.dailyOrder != null)
        return a.dailyOrder - b.dailyOrder;
      if (a.dailyOrder != null) return -1;
      if (b.dailyOrder != null) return 1;
      return a.id.localeCompare(b.id);
    });
  }, [questions]);

  const {
    isSrc: isDragSrc,
    isOver: isDragOver,
    handleDragStart,
    handleDragEnter,
    handleDrop: dropReorder,
    handleDragEnd,
  } = useDragReorder((src, dst) => {
    const next = [...orderedList];
    const [moved] = next.splice(src, 1);
    next.splice(dst, 0, moved);
    const updates = next.map(
      (q, idx) => ({ ...q, dailyOrder: idx }) as BankQuestion,
    );
    setQuestions((prev) =>
      prev.map((q) => {
        const u = updates.find((u) => u.id === q.id);
        return u ?? q;
      }),
    );
    Promise.all(
      updates.map((q) => updateQuestion(q.id, { dailyOrder: q.dailyOrder })),
    );
  });

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      }
      return next;
    });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving((prev) => new Set(prev).add(deleteTarget));
    try {
      await deleteQuestion(deleteTarget);
      setQuestions((prev) => prev.filter((q) => q.id !== deleteTarget));
      setCompareIds((prev) => {
        const s = new Set(prev);
        s.delete(deleteTarget!);
        return s;
      });
    } finally {
      setSaving((prev) => {
        const s = new Set(prev);
        s.delete(deleteTarget!);
        return s;
      });
      setDeleteTarget(null);
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    await patch(rejectTarget, {
      status: "rejected",
      reviewNote: rejectNote || undefined,
    });
    setRejectTarget(null);
  }

  function changeDraftType(type: "mcq" | "open" | "matching") {
    const topicId = draft.topicId;
    const difficulty = draft.difficulty;
    const base =
      type === "mcq"
        ? makeEmptyBankMCQ(topicId)
        : type === "open"
          ? makeEmptyBankOpen(topicId)
          : makeEmptyBankMatching(topicId);
    setDraft({ ...base, difficulty });
  }

  function openEdit(q: BankQuestion) {
    setDraft({ ...q });
    setEditTarget(q.id);
    setShowCreate(true);
  }

  function closeModal() {
    setShowCreate(false);
    setEditTarget(null);
    setDraft(makeEmptyBankMCQ(TOPICS[0].id));
  }

  async function handleCreate() {
    if (!draft.text.trim()) return;
    setCreating(true);
    try {
      if (editTarget) {
        const { id, ...data } = draft;
        await updateQuestion(editTarget, data);
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === editTarget ? { ...draft, id: editTarget } : q,
          ),
        );
      } else {
        const { id, ...data } = draft;
        const duplicateQuestion = await findDuplicateQuestion(data);
        if (duplicateQuestion) {
          throw new Error('DUPLICATE');
        }
        const newId = await createQuestion(data);
        setQuestions((prev) => [{ ...draft, id: newId }, ...prev]);
      }
      closeModal();
    } finally {
      setCreating(false);
    }
  }

  const compareList = [...compareIds]
    .map((id) => questions.find((q) => q.id === id))
    .filter(Boolean) as BankQuestion[];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

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
            onClick={() => {
              setEditTarget(null);
              setDraft(makeEmptyBankMCQ(TOPICS[0].id));
              setShowCreate(true);
            }}
            className="gap-1.5"
          >
            <Plus size={14} />
            Нове завдання
          </Button>
        )}
      </div>

      {/* Order tab */}
      {activeTab === "order" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Тільки схвалені завдання. Перетягніть для зміни порядку — завдання
            дня обирається за циклом.
          </p>
          {orderedList.length === 0 && (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground rounded-2xl border border-dashed border-border/50">
              Немає схвалених завдань
            </div>
          )}
          {(() => {
            const now = new Date();
            const dayOfYear = Math.floor(
              (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) /
                86400000,
            );
            const todayIdx =
              orderedList.length > 0 ? dayOfYear % orderedList.length : -1;
            return orderedList.map((q, i) => {
              const topic = TOPICS.find((t) => t.id === q.topicId);
              const isToday = i === todayIdx;
              return (
                <div
                  key={q.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragEnter={(e) => handleDragEnter(i, e)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropReorder(i)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "rounded-2xl border bg-card p-4 flex items-center gap-3 transition-all cursor-grab active:cursor-grabbing",
                    isDragSrc(i) ? "opacity-40" : "",
                    isDragOver(i)
                      ? "border-primary/60 bg-primary/5 scale-[1.01]"
                      : isToday
                        ? "border-orange-400/60 bg-orange-500/5"
                        : "border-border/50",
                  )}
                >
                  <GripVertical
                    size={16}
                    className="text-muted-foreground/50 shrink-0"
                  />
                  <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm flex-1 min-w-0 line-clamp-1">
                    <MathText text={q.text} />
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {isToday && (
                      <span className="text-[11px] font-medium text-orange-500 flex items-center gap-1">
                        🔥 Сьогодні
                      </span>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {TYPE_LABELS[q.type]}
                    </Badge>
                    {topic && (
                      <span className="text-[11px] text-muted-foreground hidden sm:inline">
                        {topic.icon} {topic.name}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      Рівень {q.difficulty}
                    </span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {activeTab === "review" && (
        <>
          {/* Stats row */}
          <div className="flex items-center gap-4 px-1">
            {[
              { label: "Всього", value: stats.total, cls: "text-foreground" },
              {
                label: "Чернетки",
                value: stats.draft,
                cls: "text-muted-foreground",
              },
              {
                label: "Схвалено",
                value: stats.approved,
                cls: "text-green-600 dark:text-green-400",
              },
              {
                label: "Відхилено",
                value: stats.rejected,
                cls: "text-red-500",
              },
            ].map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  "flex items-baseline gap-1.5",
                  i > 0 && "border-l border-border/40 pl-4",
                )}
              >
                <span
                  className={cn(
                    "text-xl font-bold tabular-nums leading-none",
                    s.cls,
                  )}
                >
                  {s.value}
                </span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-40">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Пошук..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors"
              />
            </div>

            <Select value={filterTopic} onValueChange={setFilterTopic}>
              <SelectItem value="all">Всі теми</SelectItem>
              {stats.byTopic.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.icon} {t.name} ({t.count})
                </SelectItem>
              ))}
            </Select>

            <Select
              value={filterStatus}
              onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}
            >
              <SelectItem value="all">Всі статуси</SelectItem>
              <SelectItem value="draft">Чернетка</SelectItem>
              <SelectItem value="approved">Схвалено</SelectItem>
              <SelectItem value="rejected">Відхилено</SelectItem>
            </Select>

            <Select
              value={filterType}
              onValueChange={(v) => setFilterType(v as typeof filterType)}
            >
              <SelectItem value="all">Всі типи</SelectItem>
              <SelectItem value="mcq">MCQ</SelectItem>
              <SelectItem value="open">Відповідь</SelectItem>
              <SelectItem value="matching">Відповідність</SelectItem>
            </Select>

            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((d) => (
                <button
                  key={d}
                  onClick={() => setFilterDiff(filterDiff === d ? null : d)}
                  title={DIFF_LABEL[d]}
                  className={cn(
                    "w-7 h-7 rounded-lg border text-xs font-bold transition-all",
                    filterDiff === d
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/50 text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>

            {(filterTopic !== "all" ||
              filterStatus !== "all" ||
              filterType !== "all" ||
              filterDiff !== null ||
              search !== "") && (
              <button
                onClick={() => {
                  setFilterTopic("all");
                  setFilterStatus("all");
                  setFilterType("all");
                  setFilterDiff(null);
                  setSearch("");
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <X size={12} /> Скинути
              </button>
            )}

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
          </div>

          <p className="text-xs text-muted-foreground">
            Показано{" "}
            <span className="font-semibold text-foreground">
              {filtered.length}
            </span>{" "}
            з {stats.total} завдань
          </p>

          {/* List */}
          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground rounded-2xl border border-dashed border-border/50">
                Немає завдань за вибраними фільтрами
              </div>
            )}
            {filtered.map((q) => {
              const status = qStatus(q);
              const topic = TOPICS.find((t) => t.id === q.topicId);
              const inCompare = compareIds.has(q.id);
              const compareDisabled = !inCompare && compareIds.size >= 2;
              const isSaving = saving.has(q.id);
              const isRejectOpen = rejectTarget === q.id;

              return (
                <div
                  key={q.id}
                  className={cn(
                    "rounded-2xl border bg-card p-4 transition-all",
                    inCompare
                      ? "border-primary/60 bg-primary/5"
                      : "border-border/50",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleCompare(q.id)}
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
                      {inCompare && (
                        <span className="text-[9px] font-bold">✓</span>
                      )}
                    </button>

                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-sm leading-snug line-clamp-2 text-foreground">
                        <MathText text={q.text} />
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
                        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setPreviewQ(q);
                              setPreviewAnswer({});
                            }}
                            title="Переглянути як учень"
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => openEdit(q)}
                            title="Редагувати"
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(q.id)}
                            title="Видалити"
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-muted-foreground hover:text-destructive hover:bg-red-500/10"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() =>
                              patch(q.id, {
                                status: "approved",
                                reviewNote: undefined,
                              })
                            }
                            title="Схвалити"
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                              status === "approved"
                                ? "bg-green-500/20 text-green-600"
                                : "text-muted-foreground hover:text-green-600 hover:bg-green-500/10",
                            )}
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (status === "rejected") {
                                patch(q.id, {
                                  status: "draft",
                                  reviewNote: undefined,
                                });
                              } else {
                                setRejectTarget(q.id);
                                setRejectNote("");
                              }
                            }}
                            title={
                              status === "rejected"
                                ? "Зняти відхилення"
                                : "Відхилити"
                            }
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                              status === "rejected"
                                ? "bg-red-500/20 text-red-500"
                                : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10",
                            )}
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isRejectOpen && (
                    <div className="mt-3 flex gap-2 items-center pl-8">
                      <input
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmReject();
                          if (e.key === "Escape") setRejectTarget(null);
                        }}
                        placeholder="Причина відхилення (необов'язково)..."
                        autoFocus
                        className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-border/50 bg-background focus:outline-none focus:border-destructive/60 transition-colors"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={confirmReject}
                      >
                        Відхилити
                      </Button>
                      <button
                        onClick={() => setRejectTarget(null)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Student preview modal */}
          {previewQ && (
            <div
              className="fixed inset-0 z-90 flex items-center justify-center p-4"
              onClick={() => setPreviewQ(null)}
            >
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
              <div
                className="relative z-10 w-full max-w-xl rounded-2xl border border-border/60 bg-card shadow-2xl flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Eye size={14} className="text-muted-foreground" />
                    <span className="font-semibold text-sm">
                      Вигляд для учня
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {TYPE_LABELS[previewQ.type]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openDrawer()}
                      title="Довідкові матеріали"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    >
                      <BookOpen size={15} />
                    </button>
                    <button
                      onClick={() => setPreviewQ(null)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-5 overflow-y-auto">
                  {/* Question text */}
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                      {previewQ.type === "mcq"
                        ? "Вибір відповіді"
                        : previewQ.type === "open"
                          ? "Коротка відповідь"
                          : "Відповідність"}
                      {" · Рівень "}
                      {previewQ.difficulty}
                    </p>
                    <MathText
                      text={previewQ.text}
                      className="text-base font-medium leading-relaxed"
                    />
                    {previewQ.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-border/50">
                        <Image
                          src={previewQ.imageUrl}
                          alt=""
                          width={800}
                          height={400}
                          className="w-full object-contain max-h-64"
                        />
                      </div>
                    )}
                  </div>

                  {/* MCQ options */}
                  {previewQ.type === "mcq" && (
                    <div className="space-y-2">
                      {previewQ.options.map((opt) => {
                        const selected = previewAnswer["sel"] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => setPreviewAnswer({ sel: opt.id })}
                            className={cn(
                              "w-full text-left px-4 py-3 rounded-xl border transition-all text-sm",
                              selected
                                ? "border-primary bg-primary/10 font-medium"
                                : "border-border/50 hover:border-primary/40 hover:bg-muted/40",
                            )}
                          >
                            {opt.imageUrl ? (
                              <div className="flex flex-col gap-2">
                                <span className="font-bold">{opt.id}</span>
                                <Image
                                  src={opt.imageUrl}
                                  alt={opt.id}
                                  width={400}
                                  height={200}
                                  className="max-h-40 w-full object-contain rounded-lg"
                                />
                                {opt.text && (
                                  <MathText
                                    text={opt.text}
                                    className="text-xs text-muted-foreground"
                                  />
                                )}
                              </div>
                            ) : (
                              <>
                                <span className="font-bold mr-2">{opt.id}</span>
                                <MathText text={opt.text} />
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Open answer */}
                  {previewQ.type === "open" && (
                    <input
                      value={previewAnswer["ans"] ?? ""}
                      onChange={(e) =>
                        setPreviewAnswer({ ans: e.target.value })
                      }
                      placeholder="Введіть відповідь..."
                      className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors"
                    />
                  )}

                  {/* Matching */}
                  {previewQ.type === "matching" && (
                    <div className="space-y-2">
                      {previewQ.leftItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border/50 bg-background"
                        >
                          <span className="text-sm flex-1">
                            <span className="font-semibold mr-1">
                              {item.id}.
                            </span>
                            <MathText text={item.text} />
                          </span>
                          <Select
                            value={previewAnswer[item.id] ?? ""}
                            onValueChange={(v) =>
                              setPreviewAnswer((prev) => ({
                                ...prev,
                                [item.id]: v,
                              }))
                            }
                            className="w-20"
                          >
                            <SelectItem value="">—</SelectItem>
                            {previewQ.rightOptions.map((opt) => (
                              <SelectItem key={opt.id} value={opt.id}>
                                {opt.id}
                              </SelectItem>
                            ))}
                          </Select>
                        </div>
                      ))}
                      <div className="space-y-1 pt-1">
                        {previewQ.rightOptions.map((opt) => (
                          <p
                            key={opt.id}
                            className="text-sm text-muted-foreground px-1"
                          >
                            <span className="font-semibold text-foreground">
                              {opt.id}.
                            </span>{" "}
                            <MathText text={opt.text} />
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Check answer button */}
                  {Object.keys(previewAnswer).length > 0 && (
                    <div className="pt-1">
                      {(() => {
                        let correct = false;
                        if (previewQ.type === "mcq")
                          correct =
                            previewAnswer["sel"] === previewQ.correctOptionId;
                        else if (previewQ.type === "open")
                          correct =
                            (previewAnswer["ans"] ?? "").trim() ===
                            previewQ.correctAnswer.trim();
                        else if (previewQ.type === "matching")
                          correct = previewQ.leftItems.every(
                            (item) =>
                              previewAnswer[item.id] ===
                              previewQ.correctPairs[item.id],
                          );
                        return (
                          <div
                            className={cn(
                              "px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2",
                              correct
                                ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400"
                                : "border-red-400/40 bg-red-500/10 text-red-500",
                            )}
                          >
                            {correct ? "✓ Правильно!" : "✗ Неправильно"}
                            {!correct && previewQ.type === "open" && (
                              <span className="font-normal text-muted-foreground ml-1">
                                Відповідь:{" "}
                                <b className="text-foreground">
                                  {previewQ.correctAnswer}
                                </b>
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      {previewQ.explanation && (
                        <div className="mt-2 px-4 py-3 rounded-xl border border-border/40 bg-muted/30 text-sm text-muted-foreground leading-relaxed">
                          <MathText text={previewQ.explanation} />
                          {previewQ.explanationImageUrl && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-border/50">
                              <Image
                                src={previewQ.explanationImageUrl}
                                alt=""
                                width={800}
                                height={400}
                                className="w-full object-contain max-h-48"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Delete confirm */}
          {deleteTarget && (
            <div
              className="fixed inset-0 z-90 flex items-center justify-center p-4"
              onClick={() => setDeleteTarget(null)}
            >
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
              <div
                className="relative z-10 w-full max-w-sm rounded-2xl border border-border/60 bg-card shadow-2xl p-5 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="font-semibold text-sm">Видалити завдання?</p>
                <p className="text-xs text-muted-foreground">
                  Цю дію не можна скасувати.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(null)}
                  >
                    Скасувати
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={confirmDelete}
                  >
                    Видалити
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Compare modal */}
          {showCompare && compareList.length === 2 && (
            <div
              className="fixed inset-0 z-80 flex items-start justify-center p-4 pt-16"
              onClick={() => setShowCompare(false)}
            >
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
              <div
                className="relative z-10 w-full max-w-4xl rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
                  <span className="font-semibold text-sm">
                    Порівняння завдань
                  </span>
                  <button
                    onClick={() => setShowCompare(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-2 divide-x divide-border/50 max-h-[70vh] overflow-y-auto">
                  {compareList.map((q, i) => {
                    const topic = TOPICS.find((t) => t.id === q.topicId);
                    const status = qStatus(q);
                    return (
                      <div key={q.id} className="p-5 space-y-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-muted-foreground">
                            Завдання {i + 1}
                          </span>
                          {topic && (
                            <Badge variant="outline" className="text-[10px]">
                              {topic.icon} {topic.name}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            {TYPE_LABELS[q.type]}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            Рівень {q.difficulty}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              STATUS_CFG[status].cls,
                            )}
                          >
                            {STATUS_CFG[status].label}
                          </Badge>
                        </div>
                        <div className="text-sm leading-relaxed font-medium">
                          <MathText text={q.text} />
                        </div>
                        {q.type === "mcq" && (
                          <div className="space-y-1.5">
                            {q.options.map((opt) => (
                              <div
                                key={opt.id}
                                className={cn(
                                  "px-3 py-2 rounded-xl border text-sm",
                                  opt.id === q.correctOptionId
                                    ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400 font-medium"
                                    : "border-border/40 text-muted-foreground",
                                )}
                              >
                                <span className="font-semibold mr-2">
                                  {opt.id}.
                                </span>
                                <MathText text={opt.text} />
                              </div>
                            ))}
                          </div>
                        )}
                        {q.type === "open" && (
                          <div className="px-3 py-2 rounded-xl border border-green-500/40 bg-green-500/10 text-sm text-green-700 dark:text-green-400">
                            Відповідь:{" "}
                            <span className="font-medium">
                              {q.correctAnswer}
                            </span>
                          </div>
                        )}
                        {q.explanation && (
                          <div className="text-xs text-muted-foreground border-l-2 border-border/50 pl-3 leading-relaxed">
                            <MathText text={q.explanation} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Create modal */}
          {showCreate && (
            <div
              className="fixed inset-0 z-80 flex items-center justify-center p-4"
              onClick={closeModal}
            >
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
              <div
                className="relative z-10 w-full max-w-2xl rounded-2xl border border-border/60 bg-card shadow-2xl flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
                  <span className="font-semibold text-sm">
                    {editTarget ? "Редагувати завдання" : "Нове завдання"}
                  </span>
                  <button
                    onClick={closeModal}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto">
                  {/* Type */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                      Тип
                    </label>
                    <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit">
                      {(["mcq", "open", "matching"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => changeDraftType(t)}
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
                      <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                        Тема
                      </label>
                      <Select
                        value={draft.topicId}
                        onValueChange={(v) =>
                          setDraft((d) => ({ ...d, topicId: v }))
                        }
                      >
                        {TOPICS.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.icon} {t.name}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-1 shrink-0">
                      <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                        Складність
                      </label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((d) => (
                          <button
                            key={d}
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                difficulty: d as 1 | 2 | 3 | 4 | 5,
                              }))
                            }
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
                    <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                      Текст завдання
                    </label>
                    <textarea
                      value={draft.text}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, text: e.target.value }))
                      }
                      placeholder="Текст завдання... Використовуйте $...$ для math"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors resize-none font-mono"
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
                    onUploaded={(url) =>
                      setDraft((d) => ({ ...d, imageUrl: url }))
                    }
                    onRemoved={() =>
                      setDraft((d) => ({ ...d, imageUrl: undefined }))
                    }
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
                            options: d.options.map((o) =>
                              o.id === optId ? { ...o, text } : o,
                            ),
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
                      onChange={(correctAnswer) =>
                        setDraft((d) => ({ ...d, correctAnswer }))
                      }
                    />
                  )}

                  {draft.type === "matching" && (
                    <MatchingEditor
                      question={draft as BankMatchingQuestion}
                      onChange={(p) =>
                        setDraft((d) => ({ ...d, ...p }) as BankQuestion)
                      }
                    />
                  )}

                  {/* Explanation */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                      Пояснення{" "}
                      <span className="normal-case font-normal">
                        (необов`язково)
                      </span>
                    </label>
                    <textarea
                      value={draft.explanation}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, explanation: e.target.value }))
                      }
                      placeholder="Пояснення правильної відповіді... Використовуйте $...$ для math"
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors resize-none"
                    />
                  </div>

                  <QuestionImageUpload
                    contextId="bank-draft"
                    slotId={`${draft.id}-explanation`}
                    imageUrl={draft.explanationImageUrl}
                    onUploaded={(url) =>
                      setDraft((d) => ({ ...d, explanationImageUrl: url }))
                    }
                    onRemoved={() =>
                      setDraft((d) => ({
                        ...d,
                        explanationImageUrl: undefined,
                      }))
                    }
                    label="Зображення до пояснення"
                  />
                </div>

                <div className="flex justify-end gap-2 px-5 py-3 border-t border-border/50">
                  <Button variant="ghost" size="sm" onClick={closeModal}>
                    Скасувати
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={creating || !draft.text.trim()}
                  >
                    {creating
                      ? "Збереження..."
                      : editTarget
                        ? "Зберегти"
                        : "Створити завдання"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
