import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import type { Homework } from "@/lib/tutor";
import type { HomeworkAudience } from "@/lib/homework-status";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { HomeworkStatusPill } from "./HomeworkStatusPill";

interface HomeworkListItemProps {
  hw: Homework;
  href: string;
  audience: HomeworkAudience;
  /** Second line under the title. Defaults to the due date (if any). */
  subtitle?: React.ReactNode;
  /** Red border for overdue homework. */
  overdue?: boolean;
  /** Compact nested variant (inside a section card): smaller radius, no chevron. */
  compact?: boolean;
}

/** Homework row used in student/tutor/admin homework lists. */
export function HomeworkListItem({
  hw,
  href,
  audience,
  subtitle,
  overdue,
  compact,
}: HomeworkListItemProps) {
  const line = subtitle ?? (hw.dueAt ? <HomeworkDue hw={hw} /> : null);

  return (
    <Link
      href={href}
      className={cn(
        "w-full text-left border flex items-center group transition-all",
        compact
          ? "rounded-xl bg-background px-3 py-2 gap-2.5"
          : "rounded-2xl bg-card px-4 py-3 gap-3",
        overdue
          ? "border-red-500/30 hover:border-red-500/50"
          : cn(
              "border-border/50 hover:border-border/80",
              compact ? "hover:bg-muted/40" : "hover:bg-muted/30",
            ),
      )}
    >
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm truncate", compact ? "font-medium" : "font-semibold")}>
          {hw.title}
        </p>
        {line && <p className="text-xs text-muted-foreground truncate">{line}</p>}
      </div>
      <HomeworkStatusPill status={hw.status} audience={audience} />
      {!compact && (
        <ChevronRight
          size={14}
          className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0"
        />
      )}
    </Link>
  );
}

/** "до 12 жовт." with a calendar icon; pass `withTime` for the hour too. */
export function HomeworkDue({
  hw,
  withTime,
  className,
}: {
  hw: Pick<Homework, "dueAt">;
  withTime?: boolean;
  className?: string;
}) {
  if (!hw.dueAt) return null;
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <CalendarClock size={11} /> до{" "}
      {formatDate(
        hw.dueAt,
        withTime
          ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
          : { day: "numeric", month: "short" },
      )}
    </span>
  );
}
