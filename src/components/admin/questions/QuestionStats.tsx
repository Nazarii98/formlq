import { cn } from "@/lib/utils";

/** Totals row above the review toolbar. */
export function QuestionStats({
  total,
  draft,
  approved,
  rejected,
}: {
  total: number;
  draft: number;
  approved: number;
  rejected: number;
}) {
  const items = [
    { label: "Всього", value: total, cls: "text-foreground" },
    { label: "Чернетки", value: draft, cls: "text-muted-foreground" },
    { label: "Схвалено", value: approved, cls: "text-green-600 dark:text-green-400" },
    { label: "Відхилено", value: rejected, cls: "text-red-500" },
  ];

  return (
    <div className="flex items-center gap-4 px-1">
      {items.map((s, i) => (
        <div
          key={s.label}
          className={cn(
            "flex items-baseline gap-1.5",
            i > 0 && "border-l border-border/40 pl-4",
          )}
        >
          <span className={cn("text-xl font-bold tabular-nums leading-none", s.cls)}>
            {s.value}
          </span>
          <span className="text-xs text-muted-foreground">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
