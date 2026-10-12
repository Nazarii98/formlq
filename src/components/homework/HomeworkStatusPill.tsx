import type { HomeworkStatus } from "@/lib/tutor";
import { getHomeworkStatusMeta, type HomeworkAudience } from "@/lib/homework-status";
import { cn } from "@/lib/utils";

interface HomeworkStatusPillProps {
  status: HomeworkStatus;
  audience: HomeworkAudience;
  className?: string;
}

/** Colored status chip; the label collapses to icon-only on mobile. */
export function HomeworkStatusPill({ status, audience, className }: HomeworkStatusPillProps) {
  const { label, cls, Icon } = getHomeworkStatusMeta(status, audience);
  return (
    <span
      title={label}
      className={cn(
        "shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full",
        cls,
        className,
      )}
    >
      <Icon size={12} />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
