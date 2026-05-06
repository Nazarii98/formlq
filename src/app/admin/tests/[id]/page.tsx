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
  TestQuestion,
  MCQQuestion,
  OpenQuestion,
} from "@/lib/tests";

const OPTION_IDS = ["А", "Б", "В", "Г", "Д"];

export default function TestEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [published, setPublished] = useState(false);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [activeQId, setActiveQId] = useState<string | null>(null);
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
      setLoading(false);
    });
  }, [id, router]);

  const save = useCallback(async () => {
    setSaving(true);
    await updateTest(id, { title, subtitle, published, questions });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [id, title, subtitle, published, questions]);

  function addQuestion(type: "mcq" | "open") {
    const next = type === "mcq"
      ? makeEmptyMCQ(questions.length)
      : makeEmptyOpen(questions.length);
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
        return {
          ...q,
          options: q.options.map((o) => (o.id === optionId ? { ...o, text } : o)),
        };
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
          <Button
            size="sm"
            onClick={save}
            disabled={saving}
            className="min-w-[100px]"
          >
            {saving ? "Збереження..." : saved ? "✓ Збережено" : "Зберегти"}
          </Button>
        </div>

        {/* Test meta */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
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
              className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background focus:outline-none focus:border-primary text-sm transition-colors text-muted-foreground"
            />
          </div>
        </div>

        {/* Questions + editor */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">

          {/* Question list */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium px-1">
              Питання ({questions.length})
            </p>
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
                      {q.type === "mcq" ? "MCQ" : "Відповідь"}
                    </Badge>
                    <span className="text-sm truncate text-foreground/80">
                      {q.text || <span className="italic text-muted-foreground">Без тексту</span>}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
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
                onClick={() => addQuestion("open")}
              >
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
                    {activeQ.type === "mcq" ? "Вибір відповіді" : "Вписати відповідь"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 text-muted-foreground"
                    onClick={() => moveQuestion(activeQ.id, -1)}
                    title="Вгору"
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 text-muted-foreground"
                    onClick={() => moveQuestion(activeQ.id, 1)}
                    title="Вниз"
                  >
                    ↓
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => deleteQuestion(activeQ.id)}
                    title="Видалити"
                  >
                    ✕
                  </Button>
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

              {/* MCQ options */}
              {activeQ.type === "mcq" && (
                <MCQEditor
                  question={activeQ as MCQQuestion}
                  onOptionChange={(optId, text) => updateMCQOption(activeQ.id, optId, text)}
                  onCorrectChange={(optId) => updateQ(activeQ.id, { correctOptionId: optId })}
                />
              )}

              {/* Open answer */}
              {activeQ.type === "open" && (
                <OpenEditor
                  question={activeQ as OpenQuestion}
                  onChange={(patch) => updateQ(activeQ.id, patch)}
                />
              )}

              {/* Explanation */}
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

        {/* Bottom save */}
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
      <p className="text-xs text-muted-foreground">Клікніть на літеру, щоб позначити правильну відповідь</p>
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
