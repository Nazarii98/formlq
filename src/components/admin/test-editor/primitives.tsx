import { cn } from "@/lib/utils";
import { DIFFICULTIES, type Difficulty } from "./constants";

/** Pill-style tab bar (bg-muted track, raised active segment). */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: React.ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
            value === o.value
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** 1–5 difficulty buttons. `sm` = compact filter, `md` = form field. */
export function DifficultyPicker({
  value,
  onChange,
  size = "md",
}: {
  value: Difficulty | null;
  onChange: (d: Difficulty) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex gap-1">
      {DIFFICULTIES.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className={cn(
            "rounded-lg border font-bold transition-all",
            size === "sm" ? "w-7 h-7 text-xs" : "w-8 h-8 text-sm",
            value === d
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/50 text-muted-foreground hover:border-primary/40",
          )}
        >
          {d}
        </button>
      ))}
    </div>
  );
}

/** Bordered −/+ stepper button. */
export function StepButton({
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-lg border border-border/50 bg-background hover:border-primary/60 text-sm font-bold flex items-center justify-center transition-colors",
        size === "sm" ? "w-7 h-7" : "w-8 h-8",
        className,
      )}
      {...props}
    />
  );
}

/** Checkbox-style selectable list row used by the bank import/export dialogs. */
export function SelectableRow({
  selected,
  onToggle,
  children,
}: {
  selected: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full text-left px-5 py-3 flex items-start gap-3 transition-all",
        selected ? "bg-primary/8" : "hover:bg-muted/40",
      )}
    >
      <div
        className={cn(
          "w-4 h-4 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all",
          selected ? "border-primary bg-primary" : "border-border/60",
        )}
      >
        {selected && (
          <span className="text-[9px] font-bold text-primary-foreground">✓</span>
        )}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </button>
  );
}

/** Toggle membership of `id` in a Set (immutable). */
export function toggleInSet<T>(set: Set<T>, id: T): Set<T> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
