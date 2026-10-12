"use client";

import { X } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DIFF_LABEL,
  DIFFICULTIES,
  QUESTION_TYPES,
  STATUS_CFG,
  TYPE_LABELS,
  type QuestionStatus,
  type QuestionType,
} from "./constants";

export interface QuestionFilterState {
  topic: string;
  difficulty: number | null;
  status: "all" | QuestionStatus;
  type: "all" | QuestionType;
  search: string;
}

export const EMPTY_FILTERS: QuestionFilterState = {
  topic: "all",
  difficulty: null,
  status: "all",
  type: "all",
  search: "",
};

export function hasActiveFilters(f: QuestionFilterState): boolean {
  return (
    f.topic !== "all" ||
    f.status !== "all" ||
    f.type !== "all" ||
    f.difficulty !== null ||
    f.search !== ""
  );
}

interface QuestionFiltersProps {
  value: QuestionFilterState;
  onChange: (patch: Partial<QuestionFilterState>) => void;
  onReset: () => void;
  topics: { id: string; icon: string; name: string; count: number }[];
  /** Trailing toolbar actions (compare controls). */
  children?: React.ReactNode;
}

export function QuestionFilters({
  value,
  onChange,
  onReset,
  topics,
  children,
}: QuestionFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <SearchInput
        value={value.search}
        onChange={(search) => onChange({ search })}
        size="sm"
        wrapperClassName="flex-1 min-w-40"
        className="h-9 bg-background"
      />

      <Select value={value.topic} onValueChange={(topic) => onChange({ topic })}>
        <SelectItem value="all">Всі теми</SelectItem>
        {topics.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.icon} {t.name} ({t.count})
          </SelectItem>
        ))}
      </Select>

      <Select
        value={value.status}
        onValueChange={(v) => onChange({ status: v as QuestionFilterState["status"] })}
      >
        <SelectItem value="all">Всі статуси</SelectItem>
        {(Object.keys(STATUS_CFG) as QuestionStatus[]).map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_CFG[s].label}
          </SelectItem>
        ))}
      </Select>

      <Select
        value={value.type}
        onValueChange={(v) => onChange({ type: v as QuestionFilterState["type"] })}
      >
        <SelectItem value="all">Всі типи</SelectItem>
        {QUESTION_TYPES.map((t) => (
          <SelectItem key={t} value={t}>
            {TYPE_LABELS[t]}
          </SelectItem>
        ))}
      </Select>

      <div className="flex gap-1">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            onClick={() =>
              onChange({ difficulty: value.difficulty === d ? null : d })
            }
            title={DIFF_LABEL[d]}
            className={cn(
              "w-7 h-7 rounded-lg border text-xs font-bold transition-all",
              value.difficulty === d
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/50 text-muted-foreground hover:border-primary/40",
            )}
          >
            {d}
          </button>
        ))}
      </div>

      {hasActiveFilters(value) && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <X size={12} /> Скинути
        </button>
      )}

      {children}
    </div>
  );
}
