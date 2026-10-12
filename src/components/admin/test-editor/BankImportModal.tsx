"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectItem } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { MathText } from "@/components/MathText";
import { getAllQuestions } from "@/lib/questions";
import { queryKeys, STALE } from "@/lib/queryKeys";
import { TOPICS } from "@/lib/topics";
import type { BankQuestion } from "@/lib/tests";
import { TYPE_LABELS, type Difficulty, type QuestionType } from "./constants";
import { DifficultyPicker, SelectableRow, toggleInSet } from "./primitives";

const selectApproved = (qs: BankQuestion[]) =>
  qs.filter((q) => q.status === "approved");

/** Pick approved bank questions to append to the test. Filters persist between openings. */
export function BankImportModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (questions: BankQuestion[]) => void;
}) {
  const { data: bankQuestions = [], isLoading } = useQuery({
    queryKey: queryKeys.bankQuestions,
    queryFn: getAllQuestions,
    select: selectApproved,
    staleTime: STALE.long,
    enabled: open,
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("all");
  const [type, setType] = useState<"all" | QuestionType>("all");
  const [diff, setDiff] = useState<Difficulty | null>(null);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return bankQuestions.filter((q) => {
      if (topic !== "all" && q.topicId !== topic) return false;
      if (type !== "all" && q.type !== type) return false;
      if (diff !== null && q.difficulty !== diff) return false;
      if (s && !q.text.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [bankQuestions, search, topic, type, diff]);

  function close() {
    setSelected(new Set());
    onClose();
  }

  function submit() {
    onImport(bankQuestions.filter((bq) => selected.has(bq.id)));
    close();
  }

  return (
    <Dialog open={open} onClose={close} size="lg" className="flex flex-col max-h-[88vh]">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 shrink-0">
        <span className="font-semibold text-sm">Імпорт з банку завдань</span>
        <IconButton label="Закрити" onClick={close}>
          <X size={15} />
        </IconButton>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-border/50 shrink-0">
        <SearchInput
          size="sm"
          value={search}
          onChange={setSearch}
          autoFocus
          wrapperClassName="flex-1 min-w-36"
          className="bg-background"
        />
        <Select value={topic} onValueChange={setTopic}>
          <SelectItem value="all">Всі теми</SelectItem>
          {TOPICS.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.icon} {t.name}
            </SelectItem>
          ))}
        </Select>
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectItem value="all">Всі типи</SelectItem>
          <SelectItem value="mcq">{TYPE_LABELS.mcq}</SelectItem>
          <SelectItem value="open">{TYPE_LABELS.open}</SelectItem>
          <SelectItem value="matching">{TYPE_LABELS.matching}</SelectItem>
        </Select>
        <DifficultyPicker
          size="sm"
          value={diff}
          onChange={(d) => setDiff(diff === d ? null : d)}
        />
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Немає схвалених завдань за фільтром
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map((bq) => {
              const t = TOPICS.find((x) => x.id === bq.topicId);
              return (
                <SelectableRow
                  key={bq.id}
                  selected={selected.has(bq.id)}
                  onToggle={() => setSelected((prev) => toggleInSet(prev, bq.id))}
                >
                  <p className="text-sm leading-snug line-clamp-2">
                    <MathText text={bq.text} />
                  </p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">
                      {TYPE_LABELS[bq.type]}
                    </span>
                    {t && (
                      <span className="text-[10px] text-muted-foreground">
                        {t.icon} {t.name}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      Рівень {bq.difficulty}
                    </span>
                  </div>
                </SelectableRow>
              );
            })}
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
          <Button size="sm" disabled={selected.size === 0} onClick={submit}>
            Імпортувати ({selected.size})
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
