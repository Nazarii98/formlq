import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/** Shared look for app text inputs/textareas (rounded-xl card field, primary focus ring). */
export const fieldClass = cn(
  "w-full rounded-xl border border-border/50 bg-card text-sm outline-none transition-colors",
  "placeholder:text-muted-foreground/70 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20",
  "disabled:opacity-50 disabled:cursor-not-allowed",
);

const inputSizes = { sm: "h-8 px-3", md: "h-10 px-4" } as const;

interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: keyof typeof inputSizes;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { size = "md", className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(fieldClass, inputSizes[size], className)} {...props} />;
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Monospace — for LaTeX / formula sources. */
  mono?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { mono, className, rows = 3, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(fieldClass, "px-4 py-2.5 resize-y leading-relaxed", mono && "font-mono text-xs", className)}
      {...props}
    />
  );
});
