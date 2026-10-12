import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const sizes = { sm: "w-7 h-7", md: "w-8 h-8" } as const;
const tones = {
  neutral: "text-muted-foreground hover:text-foreground hover:bg-muted",
  danger: "text-muted-foreground hover:text-red-500 hover:bg-red-500/10",
  primary: "text-muted-foreground hover:text-primary hover:bg-primary/10",
} as const;

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /** Accessible name; also shown as the native tooltip unless `title` is given. */
  label: string;
  size?: keyof typeof sizes;
  tone?: keyof typeof tones;
}

/** Square icon-only action button (row actions, toolbars, dialogs). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, size = "sm", tone = "neutral", className, title, type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={title ?? label}
        className={cn(
          "rounded-lg flex items-center justify-center shrink-0 transition-all outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40 disabled:pointer-events-none",
          sizes[size],
          tones[tone],
          className,
        )}
        {...props}
      />
    );
  },
);
