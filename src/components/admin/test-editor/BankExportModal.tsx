"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { SectionLabel } from "@/components/ui/section-label";
import { Select, SelectItem } from "@/components/ui/select";
import { MathText } from "@/components/MathText";
import { createQuestion } from "@/lib/questions";
import { queryKeys } from "@/lib/queryKeys";
import { pluralize, PLURAL } from "@/lib/format";
import { TOPICS } from "@/lib/topics";
import type { TestQuestion } from "@/lib/tests";
import { TYPE_LABELS, type Difficulty } from "./constants";
import { DifficultyPicker, SelectableRow, toggleInSet } from "./primitives";

/** Copy selected test questions into the question bank as drafts. */
export function BankExportModal({
  open,
  onClose,
  questions,
}: {
  open: boolean;
  onClose: () => void;
  questions: TestQuestion[];
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [topic, setTopic] = useState(TOPICS[0].id);
  const [diff, setDiff] = useState<Difficulty>(3);
  const [exporting, setExporting] = useState(false);

  const allSelected = questions.length > 0 && selected.size === questions.length;

  function close() {
    setSelected(new Set());
    onClose();
  }

  async function submit() {
    const toExport = questions.filter((q) => selected.has(q.id));
    if (!toExport.length) return;
    setExporting(true);
    try {
      await Promise.all(
        toExport.map(({ points, order, id, ...rest }) =>
          createQuestion({ ...rest, topicId: topic, difficulty: diff, status: "draft" }),
        ),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.bankQuestions });
      close();
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onClose={close} size="lg" className="flex flex-col max-h-[88vh]">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 shrink-0">
        <span className="font-semibold text-sm">Експорт у банк завдань</span>
        <IconButton label="Закрити" onClick={close}>
          <X size={15} />
        </IconButton>
      </div>

      {/* Topic + Difficulty */}
      <div className="flex flex-wrap gap-3 items-end px-5 py-3 border-b border-border/50 shrink-0">
        <div className="space-y-1 flex-1 min-w-40">
          <SectionLabel as="label">Тема</SectionLabel>
          <Select value={topic} onValueChange={setTopic}>
            {TOPICS.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.icon} {t.name}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div className="space-y-1 shrink-0">
          <SectionLabel as="label">Складність</SectionLabel>
          <DifficultyPicker value={diff} onChange={setDiff} />
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
                type="button"
                onClick={() =>
                  setSelected(allSelected ? new Set() : new Set(questions.map((q) => q.id)))
                }
                className="text-xs text-primary hover:underline"
              >
                {allSelected ? "Зняти всі" : "Вибрати всі"}
              </button>
              <span className="text-xs text-muted-foreground">
                {pluralize(questions.length, PLURAL.task)}
              </span>
            </div>
            {questions.map((q) => (
              <SelectableRow
                key={q.id}
                selected={selected.has(q.id)}
                onToggle={() => setSelected((prev) => toggleInSet(prev, q.id))}
              >
                <p className="text-sm leading-snug line-clamp-2">
                  <MathText text={q.text || "Без тексту"} />
                </p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {TYPE_LABELS[q.type]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{q.points}б</span>
                </div>
              </SelectableRow>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border/50 shrink-0">
        <span className="text-xs text-muted-foreground">
          {selected.size > 0 ? `Вибрано ${selected.size}` : "Оберіть завдання"}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={close}>
            Скасувати
          </Button>
          <Button size="sm" disabled={selected.size === 0 || exporting} onClick={submit}>
            {exporting ? "Збереження..." : `Експортувати (${selected.size})`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
