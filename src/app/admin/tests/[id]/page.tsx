"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpinnerScreen } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  NMT_2025_TABLE,
  maxRawScore,
  makeLinearTable,
  bankToTestQuestion,
  type BankQuestion,
  type TestQuestion,
} from "@/lib/tests";
import { useTestDraft } from "@/hooks/useTestDraft";
import { TestMetaCard } from "@/components/admin/test-editor/TestMetaCard";
import { TestQuestionList } from "@/components/admin/test-editor/TestQuestionList";
import { TestQuestionEditor } from "@/components/admin/test-editor/TestQuestionEditor";
import { ScoreTableEditor } from "@/components/admin/test-editor/ScoreTableEditor";
import { BankImportModal } from "@/components/admin/test-editor/BankImportModal";
import { BankExportModal } from "@/components/admin/test-editor/BankExportModal";
import { SegmentedControl } from "@/components/admin/test-editor/primitives";

type Tab = "questions" | "scoring";

export default function TestEditorPage() {
  const { id } = useParams<{ id: string }>();
  const draft = useTestDraft(id);
  const { questions } = draft;

  const [activeQId, setActiveQId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("questions");
  const [showBank, setShowBank] = useState(false);
  const [showExport, setShowExport] = useState(false);

  if (draft.loading) return <SpinnerScreen />;

  const activeIndex = questions.findIndex((q) => q.id === activeQId);
  const activeQ = activeIndex >= 0 ? questions[activeIndex] : null;
  const totalPoints = maxRawScore(questions);

  function importFromBank(selected: BankQuestion[]) {
    const startOrder = questions.length;
    // Fresh ids so importing the same bank question twice doesn't collide.
    const converted: TestQuestion[] = selected.map((bq, i) => ({
      ...bankToTestQuestion(bq, startOrder + i),
      id: crypto.randomUUID(),
    }));
    draft.appendQuestions(converted);
    setActiveQId(converted[0]?.id ?? null);
  }

  return (
    <div>
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
                draft.published
                  ? "border-green-500/40 text-green-600 bg-green-500/10 hover:bg-green-500/20"
                  : "border-border/50 text-muted-foreground hover:border-primary/40",
              )}
              onClick={() => draft.setPublished((v) => !v)}
            >
              {draft.published ? "✓ Опубліковано" : "Чернетка"}
            </Badge>
          </div>
          <Button
            size="sm"
            onClick={draft.save}
            disabled={draft.saving || !draft.isDirty}
            className="min-w-[100px]"
          >
            {draft.saving
              ? "Збереження..."
              : draft.saved && !draft.isDirty
                ? "✓ Збережено"
                : "Зберегти"}
          </Button>
        </div>

        <TestMetaCard
          title={draft.title}
          onTitleChange={draft.setTitle}
          subtitle={draft.subtitle}
          onSubtitleChange={draft.setSubtitle}
          durationMinutes={draft.durationMinutes}
          onDurationChange={draft.setDurationMinutes}
          totalPoints={totalPoints}
        />

        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "questions", label: `Питання (${questions.length})` },
            { value: "scoring", label: "Шкала балів" },
          ]}
        />

        {activeTab === "questions" && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
            <TestQuestionList
              questions={questions}
              activeId={activeQId}
              onSelect={setActiveQId}
              onAdd={(type) => setActiveQId(draft.addQuestion(type))}
              onImport={() => setShowBank(true)}
              onExport={() => setShowExport(true)}
            />

            {activeQ ? (
              <TestQuestionEditor
                contextId={id}
                question={activeQ}
                index={activeIndex}
                onChange={(patch) => draft.updateQuestion(activeQ.id, patch)}
                onMove={(dir) => draft.moveQuestion(activeQ.id, dir)}
                onDelete={() => {
                  draft.deleteQuestion(activeQ.id);
                  setActiveQId(null);
                }}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-border/50 flex items-center justify-center h-48 text-sm text-muted-foreground">
                Оберіть питання для редагування
              </div>
            )}
          </div>
        )}

        {activeTab === "scoring" && (
          <ScoreTableEditor
            table={draft.scoreTable}
            onChange={draft.setScoreTable}
            scaleType={draft.scaleType}
            onScaleTypeChange={(type) => {
              draft.setScaleType(type);
              draft.setScoreTable(
                type === "nmt" ? NMT_2025_TABLE : makeLinearTable(totalPoints),
              );
            }}
            maxRaw={totalPoints}
          />
        )}
      </main>

      <BankImportModal
        open={showBank}
        onClose={() => setShowBank(false)}
        onImport={importFromBank}
      />
      <BankExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        questions={questions}
      />
    </div>
  );
}
