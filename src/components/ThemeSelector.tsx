"use client";

import { useRef, useEffect, useState } from "react";
import { useColorTheme, ColorTheme, FontTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import { Settings, Check } from "lucide-react";

const COLORS: { id: ColorTheme; label: string; color: string }[] = [
  { id: "violet", label: "Фіолетовий",   color: "oklch(0.52 0.28 290)" },
  { id: "indigo", label: "Індиго",        color: "oklch(0.46 0.24 268)" },
  { id: "blue",   label: "Синій",         color: "oklch(0.50 0.26 250)" },
  { id: "teal",   label: "Бірюзовий",     color: "oklch(0.50 0.18 185)" },
  { id: "green",  label: "Зелений",       color: "oklch(0.50 0.20 155)" },
  { id: "amber",  label: "Бурштиновий",   color: "oklch(0.62 0.20 75)"  },
  { id: "orange", label: "Помаранчевий",  color: "oklch(0.60 0.22 45)"  },
  { id: "rose",   label: "Рожевий",       color: "oklch(0.54 0.26 10)"  },
];

const FONTS: { id: FontTheme; label: string; className: string }[] = [
  { id: "geist",       label: "Geist",       className: "font-[family-name:var(--font-geist-sans)]" },
  { id: "nunito",      label: "Nunito",      className: "font-[family-name:var(--font-nunito)]" },
  { id: "roboto",      label: "Roboto",      className: "font-[family-name:var(--font-roboto)]" },
  { id: "montserrat",  label: "Montserrat",  className: "font-[family-name:var(--font-montserrat)]" },
  { id: "unbounded",   label: "Unbounded",   className: "font-[family-name:var(--font-unbounded)]" },
  { id: "comfortaa",   label: "Comfortaa",   className: "font-[family-name:var(--font-comfortaa)]" },
  { id: "geologica",   label: "Geologica",   className: "font-[family-name:var(--font-geologica)]" },
];

export function ThemeSelector() {
  const { colorTheme, setColorTheme, fontTheme, setFontTheme } = useColorTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all text-muted-foreground hover:text-foreground hover:bg-muted",
          open && "bg-muted text-foreground"
        )}
        title="Налаштування"
      >
        <Settings size={16} />
      </button>

      {open && (
        <div className={cn(
          "absolute right-0 top-[calc(100%+8px)] z-50 w-56",
          "bg-popover border border-border/50 rounded-2xl shadow-lg overflow-hidden",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
        )}>
          <div className="p-3 space-y-4">

            {/* Color */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Колір
              </p>
              <div className="space-y-0.5">
                {COLORS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setColorTheme(t.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-2.5 py-1.5 rounded-xl text-sm transition-all",
                      colorTheme === t.id
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: t.color }} />
                    <span className="flex-1 text-left">{t.label}</span>
                    {colorTheme === t.id && <Check size={12} className="shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border/40" />

            {/* Font */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Шрифт
              </p>
              <div className="space-y-0.5">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFontTheme(f.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-2.5 py-1.5 rounded-xl text-sm transition-all",
                      fontTheme === f.id
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <span className={cn("text-base leading-none w-5 text-center shrink-0 font-semibold", f.className)}>
                      Аа
                    </span>
                    <span className={cn("flex-1 text-left", f.className)}>{f.label}</span>
                    {fontTheme === f.id && <Check size={12} className="shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
