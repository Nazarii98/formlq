import { cn } from "@/lib/utils";

interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ emoji, title, description, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "rounded-2xl border border-dashed border-border/50 py-20 text-center space-y-2",
      className,
    )}>
      {emoji && <p className="text-3xl">{emoji}</p>}
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
