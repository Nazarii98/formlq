"use client";

import { useRef, useEffect, useState } from "react";
import { useColorTheme, ColorTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const THEMES: { id: ColorTheme; label: string; color: string }[] = [
  { id: "violet", label: "Фіолетовий",  color: "oklch(0.52 0.28 290)" },
  { id: "indigo", label: "Індиго",      color: "oklch(0.46 0.24 268)" },
  { id: "blue",   label: "Синій",       color: "oklch(0.50 0.26 250)" },
  { id: "teal",   label: "Бірюзовий",   color: "oklch(0.50 0.18 185)" },
  { id: "green",  label: "Зелений",     color: "oklch(0.50 0.20 155)" },
  { id: "amber",  label: "Бурштиновий", color: "oklch(0.62 0.20 75)"  },
  { id: "orange", label: "Помаранчевий", color: "oklch(0.60 0.22 45)" },
  { id: "rose",   label: "Рожевий",     color: "oklch(0.54 0.26 10)"  },
];

export function ThemeSelector() {
  const { colorTheme, setColorTheme } = useColorTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = THEMES.find((t) => t.id === colorTheme) ?? THEMES[0];

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
          "hover:bg-muted",
          open && "bg-muted"
        )}
        title="Тема"
      >
        <span
          className="w-4 h-4 rounded-full ring-2 ring-offset-1 ring-offset-background transition-all"
          style={{ background: current.color, ringColor: current.color } as React.CSSProperties}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className={cn(
          "absolute right-0 top-[calc(100%+8px)] z-50 w-44",
          "bg-popover border border-border/50 rounded-xl shadow-lg overflow-hidden",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
        )}>
          <div className="p-1.5 space-y-0.5">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => { setColorTheme(t.id); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all",
                  colorTheme === t.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <span
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ background: t.color }}
                />
                <span className="flex-1 text-left">{t.label}</span>
                {colorTheme === t.id && (
                  <Check size={13} className="text-foreground shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
