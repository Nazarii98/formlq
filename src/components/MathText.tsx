"use client";

import { memo } from "react";
import katex from "katex";
import { cn } from "@/lib/utils";
import { Highlight } from "@/components/ui/highlight";

interface Part {
  type: "text" | "inline" | "block";
  content: string;
}

function parse(text: string): Part[] {
  const parts: Part[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", content: text.slice(last, m.index) });
    if (m[1] !== undefined) parts.push({ type: "block", content: m[1] });
    else parts.push({ type: "inline", content: m[2] });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ type: "text", content: text.slice(last) });
  return parts;
}

// KaTeX rendering is the hot path on list pages (hundreds of formulas) — cache by source.
const MAX_CACHE = 2000;
const katexCache = new Map<string, string | null>();

/** Rendered HTML, or null when KaTeX throws. */
function renderMath(content: string, block: boolean): string | null {
  const key = (block ? "B:" : "I:") + content;
  const hit = katexCache.get(key);
  if (hit !== undefined) return hit;
  let html: string | null;
  try {
    html = katex.renderToString(content, {
      displayMode: block,
      throwOnError: false,
      output: "html",
      // Cyrillic inside math (e.g. "$АВ_1$") is intentional here — don't warn.
      strict: false,
    });
  } catch {
    html = null;
  }
  if (katexCache.size >= MAX_CACHE) katexCache.delete(katexCache.keys().next().value!);
  katexCache.set(key, html);
  return html;
}

export const MathText = memo(function MathText({
  text,
  className,
  highlight = "",
}: {
  text: string;
  className?: string;
  /** Search query to mark: plain text gets <mark>, a matching formula gets a tinted backdrop. */
  highlight?: string;
}) {
  if (!text) return null;
  const needle = highlight.trim().toLowerCase();
  const parts = parse(text);
  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (p.type === "text") return (
          <span key={i}>
            {p.content.split("\n").map((line, j, arr) => (
              <span key={j}><Highlight text={line} query={highlight} />{j < arr.length - 1 && <br />}</span>
            ))}
          </span>
        );
        const html = renderMath(p.content, p.type === "block");
        if (html === null)
          return <span key={i} className="text-red-500 font-mono text-xs">{p.content}</span>;
        return (
          <span
            key={i}
            className={cn(
              p.type === "block" && "block text-center my-2",
              needle && p.content.toLowerCase().includes(needle) && "rounded-[3px] bg-primary/20",
            )}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
});
