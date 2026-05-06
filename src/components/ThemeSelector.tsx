"use client";

import { useColorTheme, ColorTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

const THEMES: { id: ColorTheme; label: string; color: string }[] = [
  { id: "violet", label: "Фіолетовий", color: "oklch(0.52 0.28 290)" },
  { id: "blue",   label: "Синій",      color: "oklch(0.50 0.26 250)" },
  { id: "green",  label: "Зелений",    color: "oklch(0.50 0.20 155)" },
  { id: "rose",   label: "Рожевий",    color: "oklch(0.54 0.26 10)"  },
  { id: "orange", label: "Помаранчевий", color: "oklch(0.60 0.22 45)" },
];

export function ThemeSelector() {
  const { colorTheme, setColorTheme } = useColorTheme();

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-full bg-muted">
      {THEMES.map((t) => (
        <button
          key={t.id}
          title={t.label}
          onClick={() => setColorTheme(t.id)}
          className={cn(
            "w-6 h-6 rounded-full transition-all duration-200 ring-offset-background",
            colorTheme === t.id
              ? "ring-2 ring-offset-2 scale-110"
              : "opacity-60 hover:opacity-90 hover:scale-105"
          )}
          style={{
            background: t.color,
            outlineColor: colorTheme === t.id ? t.color : "transparent",
          }}
        />
      ))}
    </div>
  );
}
