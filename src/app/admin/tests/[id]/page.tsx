"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
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
  MatchingItem,
  ScoreRow,
  NMT_2025_TABLE,
  maxRawScore,
} from "@/lib/tests";

export default function TestEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [published, setPublished] = useState(false);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [scoreTable, setScoreTable] = useState<ScoreRow[]>(NMT_2025_TABLE);
  const [activeQId, setActiveQId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"questions" | "scoring">("questions");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getTest(id).then((test) => {
      if (!test) { router.replace("/admin/tests"); return; }
      setTitle(test.title);
      setSubtitle(test.subtitle);
      setPublished(test.published);
      setQuestions(test.questions ?? []);
      setScoreTable(test.scoreTable?.length ? test.scoreTable : NMT_2025_TABLE);
      setLoading(false);
    });
  }, [id, router]);

  const save = useCallback(async () => {
    setSaving(true);
    await updateTest(id, { title, subtitle, published, questions, scoreTable });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [id, title, subtitle, published, questions, scoreTable]);

  function addQuestion(type: "mcq" | "open" | "matching") {
    const next =
      type === "mcq" ? makeEmptyMCQ(questions.length) :
      type === "matching" ? makeEmptyMatching(questions.length) :
      makeEmptyOpen(questions.length);
    setQuestions((prev) => [...prev, next]);
    setActiveQId(next.id);
  }

  function deleteQuestion(qId: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== qId).map((q, i) => ({ ...q, order: i })));
    setActiveQId(null);
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
      prev.map((q) => (q.id === qId ? ({ ...q, ...patch } as TestQuestion) : q))
    );
  }

  function updateMCQOption(qId: string, optionId: string, text: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId || q.type !== "mcq") return q;
        return { ...q, options: q.options.map((o) => (o.id === optionId ? { ...o, text } : o)) };
      })
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/admin/tests" className="text-muted-foreground hover:text-foreground text-sm">
              ← Тести
            </Link>
            <Badge
              variant="outline"
              className={cn(
                "cursor-pointer select-none text-xs",
                published
                  ? "border-green-500/40 text-green-600 bg-green-500/10 hover:bg-green-500/20"
                  : "border-border/50 text-muted-foreground hover:border-primary/40"
              )}
              onClick={() => setPublished((v) => !v)}
            >
              {published ? "✓ Опубліковано" : "Чернетка"}
            </Badge>
          </div>
          <Button size="sm" onClick={save} disabled={saving} className="min-w-[100px]">
            {saving ? "Збереження..." : saved ? "✓ Збережено" : "Зберегти"}
          </Button>
        </div>

        {/* Test meta */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Назва</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Тест 1"
                className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Підзаголовок</label>
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="НМТ 2026 · Варіант 1"
                className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors"
              />
            </div>
          </div>
          <div className="text-xs text-muted-foreground pt-1">
            Максимум балів: <span className="font-semibold text-foreground">{totalPoints}</span>
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
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "questions" ? `Питання (${questions.length})` : "Шкала балів"}
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
                    onClick={() => setActiveQId(q.id === activeQId ? null : q.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl border transition-all",
                      activeQId === q.id
                        ? "border-primary bg-primary/10"
                        : "border-border/40 bg-card hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">{i + 1}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                        {q.type === "mcq" ? "MCQ" : q.type === "matching" ? "Відповідність" : "Відповідь"}
                      </Badge>
                      <span className="text-xs font-semibold text-primary shrink-0">{q.points}б</span>
                      <span className="text-sm truncate text-foreground/80">
                        {q.text || <span className="italic text-muted-foreground">Без тексту</span>}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-1 flex-wrap">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => addQuestion("mcq")}>
                  + MCQ
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => addQuestion("matching")}>
                  + Відповідність
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => addQuestion("open")}>
                  + Відповідь
                </Button>
              </div>
            </div>

            {/* Question editor */}
            {activeQ ? (
              <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Завдання {questions.findIndex((q) => q.id === activeQ.id) + 1}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {activeQ.type === "mcq" ? "Вибір відповіді" : activeQ.type === "matching" ? "Відповідність" : "Вписати відповідь"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-muted-foreground"
                      onClick={() => moveQuestion(activeQ.id, -1)}>↑</Button>
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-muted-foreground"
                      onClick={() => moveQuestion(activeQ.id, 1)}>↓</Button>
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteQuestion(activeQ.id)}>✕</Button>
                  </div>
                </div>

                {/* Points */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                  <span className="text-sm text-muted-foreground">Балів за правильну відповідь:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQ(activeQ.id, { points: Math.max(1, activeQ.points - 1) })}
                      className="w-7 h-7 rounded-lg border border-border/50 bg-background hover:border-primary/60 text-sm font-bold flex items-center justify-center transition-colors"
                    >−</button>
                    <span className="w-8 text-center font-bold tabular-nums">{activeQ.points}</span>
                    <button
                      onClick={() => updateQ(activeQ.id, { points: activeQ.points + 1 })}
                      className="w-7 h-7 rounded-lg border border-border/50 bg-background hover:border-primary/60 text-sm font-bold flex items-center justify-center transition-colors"
                    >+</button>
                  </div>
                </div>

                {/* Question text */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Текст завдання</label>
                  <textarea
                    value={activeQ.text}
                    onChange={(e) => updateQ(activeQ.id, { text: e.target.value })}
                    placeholder="Введіть текст завдання..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors resize-none"
                  />
                </div>

                {activeQ.type === "mcq" && (
                  <MCQEditor
                    question={activeQ as MCQQuestion}
                    onOptionChange={(optId, text) => updateMCQOption(activeQ.id, optId, text)}
                    onCorrectChange={(optId) => updateQ(activeQ.id, { correctOptionId: optId })}
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
                    onChange={(patch) => updateQ(activeQ.id, patch)}
                  />
                )}

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Пояснення <span className="normal-case font-normal">(необов'язково)</span>
                  </label>
                  <textarea
                    value={activeQ.explanation}
                    onChange={(e) => updateQ(activeQ.id, { explanation: e.target.value })}
                    placeholder="Пояснення правильної відповіді..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors resize-none"
                  />
                </div>
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
            maxRaw={totalPoints}
          />
        )}

        <div className="flex justify-end pb-8">
          <Button onClick={save} disabled={saving} className="min-w-[120px]">
            {saving ? "Збереження..." : saved ? "✓ Збережено" : "Зберегти тест"}
          </Button>
        </div>
      </main>
    </div>
  );
}

function MCQEditor({
  question,
  onOptionChange,
  onCorrectChange,
}: {
  question: MCQQuestion;
  onOptionChange: (optId: string, text: string) => void;
  onCorrectChange: (optId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
        Варіанти відповіді
      </label>
      <div className="space-y-2">
        {question.options.map((opt) => (
          <div key={opt.id} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onCorrectChange(opt.id)}
              className={cn(
                "w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-all",
                question.correctOptionId === opt.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/60 text-muted-foreground"
              )}
              title="Позначити правильною"
            >
              {opt.id}
            </button>
            <input
              value={opt.text}
              onChange={(e) => onOptionChange(opt.id, e.target.value)}
              placeholder={`Варіант ${opt.id}...`}
              className="flex-1 px-3 py-2 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors"
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Клікніть на літеру — правильна відповідь</p>
    </div>
  );
}

function OpenEditor({
  question,
  onChange,
}: {
  question: OpenQuestion;
  onChange: (patch: Partial<OpenQuestion>) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Правильна відповідь</label>
      <input
        value={question.correctAnswer}
        onChange={(e) => onChange({ correctAnswer: e.target.value })}
        placeholder="Числова або текстова відповідь..."
        className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors"
      />
    </div>
  );
}

function MatchingEditor({
  question,
  onChange,
}: {
  question: MatchingQuestion;
  onChange: (patch: Partial<MatchingQuestion>) => void;
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
    onChange({
      leftItems: question.leftItems.filter((i) => i.id !== id),
      correctPairs: pairs,
    });
  }

  function setPair(leftId: string, rightId: string) {
    onChange({ correctPairs: { ...question.correctPairs, [leftId]: rightId } });
  }

  return (
    <div className="space-y-4">
      {/* Left items */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          Вирази / твердження (ліва колонка)
        </label>
        {question.leftItems.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="text-xs font-semibold w-5 text-center shrink-0 text-muted-foreground">{item.id}.</span>
            <input
              value={item.text}
              onChange={(e) => updateLeft(item.id, e.target.value)}
              placeholder={`Вираз ${item.id}...`}
              className="flex-1 px-3 py-2 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors"
            />
            <button
              onClick={() => removeLeft(item.id)}
              className="text-muted-foreground hover:text-destructive transition-colors text-xs px-1"
            >✕</button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="text-xs" onClick={addLeft}>
          + Додати рядок
        </Button>
      </div>

      {/* Right options */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          Варіанти відповіді (права колонка)
        </label>
        {question.rightOptions.map((opt) => (
          <div key={opt.id} className="flex items-center gap-2">
            <span className="text-xs font-semibold w-5 text-center shrink-0 text-primary">{opt.id}.</span>
            <input
              value={opt.text}
              onChange={(e) => updateRight(opt.id, e.target.value)}
              placeholder={`Варіант ${opt.id}...`}
              className="flex-1 px-3 py-2 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors"
            />
          </div>
        ))}
      </div>

      {/* Correct pairs */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          Правильні пари
        </label>
        <div className="rounded-xl border border-border/50 overflow-hidden">
          {question.leftItems.map((item, i) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5",
                i % 2 === 0 ? "bg-muted/20" : ""
              )}
            >
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
                        : "border-border hover:border-primary/60 text-muted-foreground"
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

function ScoreTableEditor({
  table,
  onChange,
  maxRaw,
}: {
  table: ScoreRow[];
  onChange: (t: ScoreRow[]) => void;
  maxRaw: number;
}) {
  const sorted = [...table].sort((a, b) => a.raw - b.raw);

  function updateRow(idx: number, field: "raw" | "nmt", val: string) {
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    const next = [...sorted];
    next[idx] = { ...next[idx], [field]: num };
    onChange(next);
  }

  function addRow() {
    const lastRaw = sorted[sorted.length - 1]?.raw ?? 0;
    onChange([...sorted, { raw: lastRaw + 1, nmt: 100 }]);
  }

  function removeRow(idx: number) {
    onChange(sorted.filter((_, i) => i !== idx));
  }

  function resetToNMT2025() {
    onChange(NMT_2025_TABLE);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Таблиця переведення балів</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Тестовий бал → Бал за шкалою 100–200. Максимум тесту: {maxRaw} балів.
          </p>
        </div>
        <Button variant="outline" size="sm" className="text-xs" onClick={resetToNMT2025}>
          ↺ НМТ-2025
        </Button>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_40px] text-xs text-muted-foreground uppercase tracking-wide font-medium px-4 py-2.5 border-b border-border/50 bg-muted/30">
          <span>Тестовий бал</span>
          <span>Бал (100–200)</span>
          <span />
        </div>
        <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto">
          {sorted.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_40px] items-center px-4 py-2 gap-2">
              <input
                type="number"
                value={row.raw}
                onChange={(e) => updateRow(i, "raw", e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors"
              />
              <input
                type="number"
                value={row.nmt}
                min={100}
                max={200}
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
          <Button variant="outline" size="sm" className="text-xs" onClick={addRow}>
            + Додати рядок
          </Button>
        </div>
      </div>
    </div>
  );
}
