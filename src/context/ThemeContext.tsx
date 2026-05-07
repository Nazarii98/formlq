"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ColorTheme = "violet" | "blue" | "green" | "rose" | "orange" | "teal" | "amber" | "indigo";

interface ThemeContextType {
  colorTheme: ColorTheme;
  setColorTheme: (t: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colorTheme: "violet",
  setColorTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("violet");

  useEffect(() => {
    const saved = localStorage.getItem("color-theme") as ColorTheme | null;
    if (saved) {
      setColorThemeState(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  function setColorTheme(theme: ColorTheme) {
    setColorThemeState(theme);
    localStorage.setItem("color-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }

  return (
    <ThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useColorTheme = () => useContext(ThemeContext);
