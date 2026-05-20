"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectContextValue {
  value: string;
  onValueChange: (v: string) => void;
  close: () => void;
}

const SelectCtx = React.createContext<SelectContextValue>({
  value: "",
  onValueChange: () => {},
  close: () => {},
});

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

function Select({ value, onValueChange, children, className, disabled }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const label = React.useMemo(() => {
    let found: React.ReactNode = value;
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && (child.props as { value?: string }).value === value) {
        found = (child.props as { children?: React.ReactNode }).children ?? value;
      }
    });
    return found;
  }, [children, value]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <SelectCtx.Provider value={{ value, onValueChange, close: () => setOpen(false) }}>
      <div ref={ref} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-background px-3 py-2",
            "text-sm text-foreground transition-colors cursor-pointer outline-none whitespace-nowrap",
            "hover:border-border focus-visible:border-primary",
            open && "border-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className,
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown
            size={14}
            className={cn("shrink-0 text-muted-foreground transition-transform duration-200 pointer-events-none", open && "rotate-180")}
          />
        </button>

        {open && (
          <div
            className={cn(
              "absolute left-0 top-[calc(100%+6px)] z-50 min-w-full rounded-xl border border-border/50 bg-popover p-1 shadow-xl",
              "animate-in fade-in-0 zoom-in-95 duration-100",
            )}
          >
            <div className="max-h-60 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </div>
        )}
      </div>
    </SelectCtx.Provider>
  );
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

function SelectItem({ value, children, disabled, className }: SelectItemProps) {
  const { value: selectedValue, onValueChange, close } = React.useContext(SelectCtx);
  const selected = selectedValue === value;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => { onValueChange(value); close(); }}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg pl-7 pr-3 py-1.5 text-sm text-left relative",
        "cursor-pointer transition-colors outline-none",
        "hover:bg-muted",
        selected && "font-medium text-primary",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
    >
      {selected && (
        <span className="absolute left-2 flex items-center justify-center">
          <Check size={12} className="text-primary" />
        </span>
      )}
      {children}
    </button>
  );
}

export { Select, SelectItem };
