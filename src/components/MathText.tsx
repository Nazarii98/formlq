"use client";

import katex from "katex";

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

export function MathText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  const parts = parse(text);
  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (p.type === "text") return <span key={i}>{p.content}</span>;
        try {
          const html = katex.renderToString(p.content, {
            displayMode: p.type === "block",
            throwOnError: false,
            output: "html",
          });
          return (
            <span
              key={i}
              className={p.type === "block" ? "block text-center my-2" : ""}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <span key={i} className="text-red-500 font-mono text-xs">{p.content}</span>;
        }
      })}
    </span>
  );
}
