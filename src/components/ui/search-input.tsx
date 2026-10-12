"use client";

import { forwardRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "size"> {
  value: string;
  onChange: (value: string) => void;
  /** sm = compact toolbars/popovers, md = page-level search. */
  size?: "sm" | "md";
  /** Classes for the outer wrapper (width, flex). */
  wrapperClassName?: string;
}

/** Search field with icon, clear button and Escape-to-clear. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    { value, onChange, size = "md", className, wrapperClassName, onKeyDown, placeholder = "Пошук...", ...props },
    ref,
  ) {
    return (
      <div className={cn("relative", wrapperClassName)}>
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          ref={ref}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && value) {
              e.stopPropagation();
              onChange("");
            }
            onKeyDown?.(e);
          }}
          className={cn(
            "w-full rounded-xl border border-border/50 bg-card pl-9 pr-8 text-sm outline-none transition-colors",
            "placeholder:text-muted-foreground/70 hover:border-border focus:border-primary",
            size === "sm" ? "h-8" : "h-10",
            className,
          )}
          {...props}
        />
        {value && (
          <button
            type="button"
            aria-label="Очистити пошук"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X size={12} />
          </button>
        )}
      </div>
    );
  },
);
