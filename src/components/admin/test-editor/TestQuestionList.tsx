import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TestQuestion } from "@/lib/tests";
import { TYPE_LABELS, type QuestionType } from "./constants";

/** Sidebar: compact list of test questions + add/import/export actions. */
export function TestQuestionList({
  questions,
  activeId,
  onSelect,
  onAdd,
  onImport,
  onExport,
}: {
  questions: TestQuestion[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (type: QuestionType) => void;
  onImport: () => void;
  onExport: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {questions.map((q, i) => (
          <button
            key={q.id}
            type="button"
            onClick={() => onSelect(q.id === activeId ? null : q.id)}
            className={cn(
              "w-full text-left px-4 py-3 rounded-xl border transition-all",
              activeId === q.id
                ? "border-primary bg-primary/10"
                : "border-border/40 bg-card hover:border-primary/40",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">
                {i + 1}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                {TYPE_LABELS[q.type]}
              </Badge>
              <span className="text-xs font-semibold text-primary shrink-0">
                {q.points}б
              </span>
              <span className="text-sm truncate text-foreground/80">
                {q.text || (
                  <span className="italic text-muted-foreground">Без тексту</span>
                )}
              </span>
            </div>
          </button>
        ))}
      </div>
      <div className="flex gap-2 pt-1 flex-wrap">
        {(["mcq", "matching", "open"] as const).map((type) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onAdd(type)}
          >
            + {TYPE_LABELS[type]}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs border-primary/40 text-primary hover:bg-primary/5"
          onClick={onImport}
        >
          З банку
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs border-orange-400/40 text-orange-600 hover:bg-orange-500/5"
          onClick={onExport}
          disabled={questions.length === 0}
        >
          В банк
        </Button>
      </div>
    </div>
  );
}
