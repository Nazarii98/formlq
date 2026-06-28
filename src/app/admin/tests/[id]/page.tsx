"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MathText } from "@/components/MathText";
import {
  getTest,
  updateTest,
  makeEmptyMCQ,
  makeEmptyOpen,
  makeEmptyMatching,
  TestQuestion,
  MCQQuestion,
  OpenQuestion,
  MatchingQuestion,
  ScoreRow,
  ScaleType,
  NMT_2025_TABLE,
  maxRawScore,
  makeLinearTable,
} from "@/lib/tests";
import {
  QuestionImageUpload,
  MCQEditor,
  OpenEditor,
  MatchingEditor,
} from "@/components/admin/QuestionEditorPanel";
import { getAllQuestions, createQuestion, findDuplicateQuestion } from "@/lib/questions";
import { BankQuestion } from "@/lib/tests";
import { TOPICS } from "@/lib/topics";
import { Search, X } from "lucide-react";
import { Select, SelectItem } from "@/components/ui/select";
import toast, {Toaster} from 'react-hot-toast'

export default function TestEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [published, setPublished] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(150);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [scoreTable, setScoreTable] = useState<ScoreRow[]>(NMT_2025_TABLE);
  const [scaleType, setScaleType] = useState<ScaleType>("nmt");
  const [activeQId, setActiveQId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"questions" | "scoring">(
    "questions",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState("");

  // Export to bank modal
  const [showExport, setShowExport] = useState(false);
  const [exportSelected, setExportSelected] = useState<Set<string>>(new Set());
  const [exportTopic, setExportTopic] = useState(TOPICS[0].id);
  const [exportDiff, setExportDiff] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [exporting, setExporting] = useState(false);

  // Bank import modal
  const [showBank, setShowBank] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSelected, setBankSelected] = useState<Set<string>>(new Set());
  const [bankSearch, setBankSearch] = useState("");
  const [bankTopic, setBankTopic] = useState("all");
  const [bankType, setBankType] = useState<"all" | "mcq" | "open" | "matching">(
    "all",
  );
  const [bankDiff, setBankDiff] = useState<number | null>(null);

  const snapshot = () =>
    JSON.stringify({
      title,
      subtitle,
      published,
      durationMinutes,
      questions,
      scoreTable,
      scaleType,
    });
  const isDirty = !saved && snapshot() !== savedSnapshot;

  useEffect(() => {
    getTest(id).then((test) => {
      if (!test) {
        router.replace("/admin/tests");
        return;
      }
      setTitle(test.title);
      setSubtitle(test.subtitle);
      setPublished(test.published);
      setDurationMinutes(test.durationMinutes ?? 150);
      setQuestions(test.questions ?? []);
      const table = test.scoreTable?.length ? test.scoreTable : NMT_2025_TABLE;
      const type = test.scaleType ?? "nmt";
      setScoreTable(table);
      setScaleType(type);
      setSavedSnapshot(
        JSON.stringify({
          title: test.title,
          subtitle: test.subtitle,
          published: test.published,
          durationMinutes: test.durationMinutes ?? 150,
          questions: test.questions ?? [],
          scoreTable: table,
          scaleType: type,
        }),
      );
      setLoading(false);
    });
  }, [id, router]);

  const save = useCallback(async () => {
    setSaving(true);
    await updateTest(id, {
      title,
      subtitle,
      published,
      durationMinutes,
      questions,
      scoreTable,
      scaleType,
    });
    setSavedSnapshot(
      JSON.stringify({
        title,
        subtitle,
        published,
        durationMinutes,
        questions,
        scoreTable,
        scaleType,
      }),
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [
    id,
    title,
    subtitle,
    published,
    durationMinutes,
    questions,
    scoreTable,
    scaleType,
    setSavedSnapshot,
  ]);

  function addQuestion(type: "mcq" | "open" | "matching") {
    const next =
      type === "mcq"    //maybe change to switch statement
        ? makeEmptyMCQ(questions.length)
        : type === "matching"
          ? makeEmptyMatching(questions.length)
          : makeEmptyOpen(questions.length);
    setQuestions((prev) => [...prev, next]);
    setActiveQId(next.id);
  }

  function deleteQuestion(qId: string) {
    setQuestions((prev) =>
      prev.filter((q) => q.id !== qId).map((q, i) => ({ ...q, order: i })),
    );
    setActiveQId(null);
  }

  async function openBankModal() {
    setShowBank(true);
    setBankSelected(new Set());
    if (bankQuestions.length === 0) {
      setBankLoading(true);
      const qs = await getAllQuestions();
      setBankQuestions(qs.filter((q) => q.status === "approved"));
      setBankLoading(false);
    }
  }

  function importFromBank() {
    const toImport = bankQuestions.filter((bq) => bankSelected.has(bq.id));
    const startOrder = questions.length;
    const converted: TestQuestion[] = toImport.map((bq, i) => {
      const order = startOrder + i;
      const { topicId, difficulty, status, reviewNote, ...rest } =
        bq as BankQuestion & {
          topicId: string;
          difficulty: number;
          status?: string;
          reviewNote?: string;
        };
      if (rest.type === "mcq")
        return { ...rest, points: 1, order } as TestQuestion;
      if (rest.type === "open")
        return { ...rest, points: 2, order } as TestQuestion;
      return { ...rest, points: 3, order } as TestQuestion;
    });
    setQuestions((prev) => [...prev, ...converted]);
    setActiveQId(converted[0]?.id ?? null);
    setShowBank(false);
    setBankSelected(new Set());
  }

  async function exportToBank() {
    const toExport = questions.filter((q) => exportSelected.has(q.id));
    if (!toExport.length) return;
    setExporting(true);

    for(const oneToExport of toExport) {
        const duplicateQuestion = await findDuplicateQuestion(oneToExport);
        if (duplicateQuestion) {
        toast.error('Помилка експорту: дуплікати вже наявних завдань не допускаються.');
        return;
      }
    }

    try {
      await Promise.all(
        toExport.map((q) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { points, order, id, ...rest } = q;

          return createQuestion({
            ...rest,
            topicId: exportTopic,
            difficulty: exportDiff,
            status: "draft",
          });
        }),
      );
      setShowExport(false);
      setExportSelected(new Set());
    } finally {
      setExporting(false);
    }
  }

  function moveQuestion(qId: string, dir: -1 | 1) {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === qId);
      if (idx + dir < 0 || idx + dir >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
      return next.map((q, i) => ({ ...q, order: i }));
    });
  }

  function updateQ(qId: string, patch: Partial<TestQuestion>) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId ? ({ ...q, ...patch } as TestQuestion) : q,
      ),
    );
  }

  function updateMCQOption(qId: string, optionId: string, text: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId || q.type !== "mcq") return q;
        return {
          ...q,
          options: q.options.map((o) =>
            o.id === optionId ? { ...o, text } : o,
          ),
        };
      }),
    );
  }

  function updateMCQOptionImage(
    qId: string,
    optionId: string,
    url: string | undefined,
  ) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId || q.type !== "mcq") return q;
        return {
          ...q,
          options: q.options.map((o) =>
            o.id === optionId ? { ...o, imageUrl: url } : o,
          ),
        };
      }),
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const activeQ = questions.find((q) => q.id === activeQId) ?? null;
  const totalPoints = maxRawScore(questions);

  return (
    <div>
      <Toaster/>
      <main className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/tests"
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              ← Тести
            </Link>
            <Badge
              variant="outline"
              className={cn(
                "cursor-pointer select-none text-xs",
                published
                  ? "border-green-500/40 text-green-600 bg-green-500/10 hover:bg-green-500/20"
                  : "border-border/50 text-muted-foreground hover:border-primary/40",
              )}
              onClick={() => setPublished((v) => !v)}
            >
              {published ? "✓ Опубліковано" : "Чернетка"}
            </Badge>
          </div>
          <Button
            size="sm"
            onClick={save}
            disabled={saving || !isDirty}
            className="min-w-[100px]"
          >
            {saving ? "Збереження..." : saved ? "✓ Збережено" : "Зберегти"}
          </Button>
        </div>

        {/* Test meta */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Назва
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Тест 1"
                className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Підзаголовок
              </label>
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="НМТ 2026 · Варіант 1"
                className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors"
              />
            </div>
          </div>
          <div className="space-y-1 w-fit">
            <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Тривалість (хв)
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDurationMinutes((v) => Math.max(5, v - 5))}
                className="w-8 h-8 rounded-lg border border-border/50 bg-background hover:border-primary/60 text-sm font-bold flex items-center justify-center transition-colors"
              >
                −
              </button>
              <input
                type="number"
                min={5}
                max={360}
                value={durationMinutes}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 5) setDurationMinutes(v);
                }}
                className="w-20 px-3 py-2 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm text-center transition-colors tabular-nums"
              />
              <button
                onClick={() => setDurationMinutes((v) => Math.min(360, v + 5))}
                className="w-8 h-8 rounded-lg border border-border/50 bg-background hover:border-primary/60 text-sm font-bold flex items-center justify-center transition-colors"
              >
                +
              </button>
              <span className="text-xs text-muted-foreground">хв</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground pt-1">
            Максимум балів:{" "}
            <span className="font-semibold text-foreground">{totalPoints}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit">
          {(["questions", "scoring"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === tab
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab === "questions"
                ? `Питання (${questions.length})`
                : "Шкала балів"}
            </button>
          ))}
        </div>

        {/* Questions tab */}
        {activeTab === "questions" && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
            {/* Question list */}
            <div className="space-y-2">
              <div className="space-y-1.5">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() =>
                      setActiveQId(q.id === activeQId ? null : q.id)
                    }
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl border transition-all",
                      activeQId === q.id
                        ? "border-primary bg-primary/10"
                        : "border-border/40 bg-card hover:border-primary/40",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">
                        {i + 1}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 shrink-0"
                      >
                        {q.type === "mcq"
                          ? "MCQ"
                          : q.type === "matching"
                            ? "Відповідність"
                            : "Відповідь"}
                      </Badge>
                      <span className="text-xs font-semibold text-primary shrink-0">
                        {q.points}б
                      </span>
                      <span className="text-sm truncate text-foreground/80">
                        {q.text || (
                          <span className="italic text-muted-foreground">
                            Без тексту
                          </span>
                        )}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-1 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => addQuestion("mcq")}
                >
                  + MCQ
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => addQuestion("matching")}
                >
                  + Відповідність
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => addQuestion("open")}
                >
                  + Відповідь
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs border-primary/40 text-primary hover:bg-primary/5"
                  onClick={openBankModal}
                >
                  З банку
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs border-orange-400/40 text-orange-600 hover:bg-orange-500/5"
                  onClick={() => {
                    setShowExport(true);
                    setExportSelected(new Set());
                  }}
                  disabled={questions.length === 0}
                >
                  В банк
                </Button>
              </div>
            </div>

            {/* Question editor */}
            {activeQ ? (
              <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Завдання{" "}
                      {questions.findIndex((q) => q.id === activeQ.id) + 1}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {activeQ.type === "mcq"
                        ? "Вибір відповіді"
                        : activeQ.type === "matching"
                          ? "Відповідність"
                          : "Вписати відповідь"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 text-muted-foreground"
                      onClick={() => moveQuestion(activeQ.id, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 text-muted-foreground"
                      onClick={() => moveQuestion(activeQ.id, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteQuestion(activeQ.id)}
                    >
                      ✕
                    </Button>
                  </div>
                </div>

                {/* Points */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                  <span className="text-sm text-muted-foreground">
                    Балів за правильну відповідь:
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        updateQ(activeQ.id, {
                          points: Math.max(1, activeQ.points - 1),
                        })
                      }
                      className="w-7 h-7 rounded-lg border border-border/50 bg-background hover:border-primary/60 text-sm font-bold flex items-center justify-center transition-colors"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-bold tabular-nums">
                      {activeQ.points}
                    </span>
                    <button
                      onClick={() =>
                        updateQ(activeQ.id, { points: activeQ.points + 1 })
                      }
                      className="w-7 h-7 rounded-lg border border-border/50 bg-background hover:border-primary/60 text-sm font-bold flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Question text */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Текст завдання
                  </label>
                  <textarea
                    value={activeQ.text}
                    onChange={(e) =>
                      updateQ(activeQ.id, { text: e.target.value })
                    }
                    placeholder="Введіть текст завдання... Використовуйте $...$ для inline math, $$...$$ для block math"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors resize-none font-mono"
                  />
                  {activeQ.text && (
                    <div className="px-4 py-3 rounded-xl border border-border/30 bg-muted/30 text-sm leading-relaxed">
                      <MathText text={activeQ.text} />
                    </div>
                  )}
                </div>

                {/* Image upload */}
                <QuestionImageUpload
                  contextId={id}
                  slotId={activeQ.id}
                  imageUrl={activeQ.imageUrl}
                  onUploaded={(url) => updateQ(activeQ.id, { imageUrl: url })}
                  onRemoved={() => updateQ(activeQ.id, { imageUrl: undefined })}
                />

                {activeQ.type === "mcq" && (
                  <MCQEditor
                    contextId={id}
                    question={activeQ as MCQQuestion}
                    onOptionChange={(optId, text) =>
                      updateMCQOption(activeQ.id, optId, text)
                    }
                    onCorrectChange={(optId) =>
                      updateQ(activeQ.id, { correctOptionId: optId })
                    }
                    onOptionImageChange={(optId, url) =>
                      updateMCQOptionImage(activeQ.id, optId, url)
                    }
                  />
                )}

                {activeQ.type === "matching" && (
                  <MatchingEditor
                    question={activeQ as MatchingQuestion}
                    onChange={(patch) => updateQ(activeQ.id, patch)}
                  />
                )}

                {activeQ.type === "open" && (
                  <OpenEditor
                    question={activeQ as OpenQuestion}
                    onChange={(correctAnswer) =>
                      updateQ(activeQ.id, { correctAnswer })
                    }
                  />
                )}

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Пояснення{" "}
                    <span className="normal-case font-normal">
                      (необов`язково)
                    </span>
                  </label>
                  <textarea
                    value={activeQ.explanation}
                    onChange={(e) =>
                      updateQ(activeQ.id, { explanation: e.target.value })
                    }
                    placeholder="Пояснення правильної відповіді... Використовуйте $...$ для inline math, $$...$$ для block math"
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors resize-none font-mono"
                  />
                  {activeQ.explanation && (
                    <div className="px-4 py-3 rounded-xl border border-border/30 bg-muted/30 text-sm leading-relaxed">
                      <MathText text={activeQ.explanation} />
                    </div>
                  )}
                </div>

                <QuestionImageUpload
                  contextId={id}
                  slotId={`${activeQ.id}-explanation`}
                  imageUrl={activeQ.explanationImageUrl}
                  onUploaded={(url) =>
                    updateQ(activeQ.id, { explanationImageUrl: url })
                  }
                  onRemoved={() =>
                    updateQ(activeQ.id, { explanationImageUrl: undefined })
                  }
                  label="Зображення до пояснення"
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/50 flex items-center justify-center h-48 text-sm text-muted-foreground">
                Оберіть питання для редагування
              </div>
            )}
          </div>
        )}

        {/* Scoring tab */}
        {activeTab === "scoring" && (
          <ScoreTableEditor
            table={scoreTable}
            onChange={setScoreTable}
            scaleType={scaleType}
            onScaleTypeChange={(type) => {
              setScaleType(type);
              setScoreTable(
                type === "nmt" ? NMT_2025_TABLE : makeLinearTable(totalPoints),
              );
            }}
            maxRaw={totalPoints}
          />
        )}
      </main>

      {/* Bank import modal */}
      {showBank &&
        (() => {
          const s = bankSearch.toLowerCase();
          const filtered = bankQuestions.filter((q) => {
            if (bankTopic !== "all" && q.topicId !== bankTopic) return false;
            if (bankType !== "all" && q.type !== bankType) return false;
            if (bankDiff !== null && q.difficulty !== bankDiff) return false;
            if (s && !q.text.toLowerCase().includes(s)) return false;
            return true;
          });
          return (
            <div
              className="fixed inset-0 z-80 flex items-center justify-center p-4"
              onClick={() => setShowBank(false)}
            >
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
              <div
                className="relative z-10 w-full max-w-2xl rounded-2xl border border-border/60 bg-card shadow-2xl flex flex-col max-h-[88vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 shrink-0">
                  <span className="font-semibold text-sm">
                    Імпорт з банку завдань
                  </span>
                  <button
                    onClick={() => setShowBank(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-border/50 shrink-0">
                  <div className="relative flex-1 min-w-36">
                    <Search
                      size={13}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      placeholder="Пошук..."
                      autoFocus
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors"
                    />
                  </div>
                  <Select value={bankTopic} onValueChange={setBankTopic}>
                    <SelectItem value="all">Всі теми</SelectItem>
                    {TOPICS.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.icon} {t.name}
                      </SelectItem>
                    ))}
                  </Select>
                  <Select
                    value={bankType}
                    onValueChange={(v) => setBankType(v as typeof bankType)}
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
                        onClick={() => setBankDiff(bankDiff === d ? null : d)}
                        className={cn(
                          "w-7 h-7 rounded-lg border text-xs font-bold transition-all",
                          bankDiff === d
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/50 text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1">
                  {bankLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                      Немає схвалених завдань за фільтром
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {filtered.map((bq) => {
                        const sel = bankSelected.has(bq.id);
                        const topic = TOPICS.find((t) => t.id === bq.topicId);
                        return (
                          <button
                            key={bq.id}
                            onClick={() =>
                              setBankSelected((prev) => {
                                const next = new Set(prev);
                                sel ? next.delete(bq.id) : next.add(bq.id);
                                return next;
                              })
                            }
                            className={cn(
                              "w-full text-left px-5 py-3 flex items-start gap-3 transition-all",
                              sel ? "bg-primary/8" : "hover:bg-muted/40",
                            )}
                          >
                            <div
                              className={cn(
                                "w-4 h-4 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all",
                                sel
                                  ? "border-primary bg-primary"
                                  : "border-border/60",
                              )}
                            >
                              {sel && (
                                <span className="text-[9px] font-bold text-primary-foreground">
                                  ✓
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm leading-snug line-clamp-2">
                                <MathText text={bq.text} />
                              </p>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                <span className="text-[10px] text-muted-foreground">
                                  {bq.type === "mcq"
                                    ? "MCQ"
                                    : bq.type === "open"
                                      ? "Відповідь"
                                      : "Відповідність"}
                                </span>
                                {topic && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {topic.icon} {topic.name}
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground">
                                  Рівень {bq.difficulty}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-border/50 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {bankSelected.size > 0
                      ? `Вибрано ${bankSelected.size}`
                      : "Оберіть завдання"}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowBank(false)}
                    >
                      Скасувати
                    </Button>
                    <Button
                      size="sm"
                      disabled={bankSelected.size === 0}
                      onClick={importFromBank}
                    >
                      Імпортувати ({bankSelected.size})
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Export to bank modal */}
      {showExport && (
        <div
          className="fixed inset-0 z-80 flex items-center justify-center p-4"
          onClick={() => setShowExport(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-2xl rounded-2xl border border-border/60 bg-card shadow-2xl flex flex-col max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 shrink-0">
              <span className="font-semibold text-sm">
                Експорт у банк завдань
              </span>
              <button
                onClick={() => setShowExport(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <X size={15} />
              </button>
            </div>

            {/* Topic + Difficulty */}
            <div className="flex flex-wrap gap-3 items-end px-5 py-3 border-b border-border/50 shrink-0">
              <div className="space-y-1 flex-1 min-w-40">
                <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Тема
                </label>
                <Select value={exportTopic} onValueChange={setExportTopic}>
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
                      onClick={() => setExportDiff(d as 1 | 2 | 3 | 4 | 5)}
                      className={cn(
                        "w-8 h-8 rounded-lg border text-sm font-bold transition-all",
                        exportDiff === d
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/50 text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <p className="w-full text-xs text-muted-foreground -mt-1">
                Тема та складність застосовуються до всіх вибраних завдань
              </p>
            </div>

            {/* Question list */}
            <div className="overflow-y-auto flex-1">
              {questions.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  Немає завдань
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between px-5 py-2 border-b border-border/30">
                    <button
                      onClick={() =>
                        setExportSelected(
                          exportSelected.size === questions.length
                            ? new Set()
                            : new Set(questions.map((q) => q.id)),
                        )
                      }
                      className="text-xs text-primary hover:underline"
                    >
                      {exportSelected.size === questions.length
                        ? "Зняти всі"
                        : "Вибрати всі"}
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {questions.length} завдань
                    </span>
                  </div>
                  {questions.map((q) => {
                    const sel = exportSelected.has(q.id);
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() =>
                          setExportSelected((prev) => {
                            const s = new Set(prev);
                            if (sel) s.delete(q.id);
                            else s.add(q.id);
                            return s;
                          })
                        }
                        className={cn(
                          "w-full text-left px-5 py-3 flex items-start gap-3 transition-all",
                          sel ? "bg-primary/8" : "hover:bg-muted/40",
                        )}
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all",
                            sel
                              ? "border-primary bg-primary"
                              : "border-border/60",
                          )}
                        >
                          {sel && (
                            <span className="text-[9px] font-bold text-primary-foreground">
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug line-clamp-2">
                            <MathText text={q.text || "Без тексту"} />
                          </p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground">
                              {q.type === "mcq"
                                ? "MCQ"
                                : q.type === "open"
                                  ? "Відповідь"
                                  : "Відповідність"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {q.points}б
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-border/50 shrink-0">
              <span className="text-xs text-muted-foreground">
                {exportSelected.size > 0
                  ? `Вибрано ${exportSelected.size}`
                  : "Оберіть завдання"}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExport(false)}
                >
                  Скасувати
                </Button>
                <Button
                  size="sm"
                  disabled={exportSelected.size === 0 || exporting}
                  onClick={exportToBank}
                >
                  {exporting
                    ? "Збереження..."
                    : `Експортувати (${exportSelected.size})`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreTableEditor({
  table,
  onChange,
  scaleType,
  onScaleTypeChange,
  maxRaw,
}: {
  table: ScoreRow[];
  onChange: (t: ScoreRow[]) => void;
  scaleType: ScaleType;
  onScaleTypeChange: (t: ScaleType) => void;
  maxRaw: number;
}) {
  const sorted = [...table].sort((a, b) => a.raw - b.raw);
  const isNmt = scaleType === "nmt";

  function updateRow(idx: number, field: "raw" | "nmt", val: string) {
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    const next = [...sorted];
    next[idx] = { ...next[idx], [field]: num };
    onChange(next);
  }

  function addRow() {
    const lastRaw = sorted[sorted.length - 1]?.raw ?? 0;
    onChange([...sorted, { raw: lastRaw + 1, nmt: isNmt ? 100 : lastRaw + 1 }]);
  }

  function removeRow(idx: number) {
    onChange(sorted.filter((_, i) => i !== idx));
  }

  function reset() {
    onChange(isNmt ? NMT_2025_TABLE : makeLinearTable(maxRaw));
  }

  const defaultTable = isNmt ? NMT_2025_TABLE : makeLinearTable(maxRaw);

  return (
    <div className="space-y-4">
      {/* Scale type switcher */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit">
        {(["nmt", "custom"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onScaleTypeChange(t)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              scaleType === t
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "nmt" ? "Шкала НМТ (100–200)" : "Звичайна шкала"}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Таблиця переведення балів</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isNmt
              ? `Тестовий бал → Бал за шкалою 100–200. Максимум тесту: ${maxRaw} балів.`
              : `Тестовий бал → Власний бал (будь-які числа). Максимум тесту: ${maxRaw} балів.`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={reset}
          disabled={
            JSON.stringify(sorted) ===
            JSON.stringify([...defaultTable].sort((a, b) => a.raw - b.raw))
          }
        >
          ↺ Скинути
        </Button>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_40px] text-xs text-muted-foreground uppercase tracking-wide font-medium px-4 py-2.5 border-b border-border/50 bg-muted/30">
          <span>Тестовий бал</span>
          <span>{isNmt ? "Бал (100–200)" : "Бал"}</span>
          <span />
        </div>
        <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto">
          {sorted.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_40px] items-center px-4 py-2 gap-2"
            >
              <input
                type="number"
                value={row.raw}
                onChange={(e) => updateRow(i, "raw", e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors"
              />
              <input
                type="number"
                value={row.nmt}
                min={isNmt ? 100 : undefined}
                max={isNmt ? 200 : undefined}
                onChange={(e) => updateRow(i, "nmt", e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors"
              />
              <button
                onClick={() => removeRow(i)}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors rounded-lg"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={addRow}
          >
            + Додати рядок
          </Button>
        </div>
      </div>
    </div>
  );
}
