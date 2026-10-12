import { cn } from "@/lib/utils";

interface HighlightProps {
  text: string;
  query: string;
  className?: string;
}

/** Wraps case-insensitive matches of `query` inside `text` in <mark>. */
export function Highlight({ text, query, className }: HighlightProps) {
  const q = query.trim();
  if (!q) return <>{text}</>;

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  const needle = q.toLowerCase();

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === needle ? (
          <mark
            key={i}
            className={cn(
              "rounded-[3px] bg-primary/20 text-inherit px-px -mx-px font-semibold",
              className,
            )}
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
