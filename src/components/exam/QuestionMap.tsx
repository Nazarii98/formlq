import { cn } from "@/lib/utils";

interface Question {
  id?: string;
  isCorrect?: boolean;
  userAnswer?: string;
  partialScore?: number;
  points?: number;
}

interface QuestionMapProps {
  questions: Question[];
  onSelect?: (index: number) => void;
}

export function QuestionMap({ questions, onSelect }: QuestionMapProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {questions.map((q, i) => {
        const skipped = !q.userAnswer || q.userAnswer === "";
        const isPartial = !q.isCorrect && !skipped && (q.partialScore ?? 0) > 0;
        const cls = q.isCorrect
          ? "bg-green-500/15 border-green-500/40 text-green-600 dark:text-green-400"
          : isPartial
          ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400"
          : skipped
          ? "bg-muted border-border/50 text-muted-foreground"
          : "bg-red-500/15 border-red-500/40 text-red-500";

        const inner = (
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all",
            cls,
            onSelect && "cursor-pointer hover:scale-110",
          )}>
            {i + 1}
          </div>
        );

        return onSelect ? (
          <button key={q.id ?? i} onClick={() => onSelect(i)} type="button">
            {inner}
          </button>
        ) : (
          <a key={q.id ?? i} href={`#q-${i}`}>
            {inner}
          </a>
        );
      })}
    </div>
  );
}
