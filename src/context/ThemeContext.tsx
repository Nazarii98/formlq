"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ColorTheme = "violet" | "blue" | "green" | "rose" | "orange" | "teal" | "amber" | "indigo";
export type FontTheme = "geist" | "nunito" | "roboto" | "montserrat" | "unbounded" | "comfortaa" | "geologica";

interface ThemeContextType {
  colorTheme: ColorTheme;
  setColorTheme: (t: ColorTheme) => void;
  fontTheme: FontTheme;
  setFontTheme: (f: FontTheme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colorTheme: "violet",
  setColorTheme: () => {},
  fontTheme: "geist",
  setFontTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("violet");
  const [fontTheme, setFontThemeState] = useState<FontTheme>("geist");

  useEffect(() => {
    const savedColor = localStorage.getItem("color-theme") as ColorTheme | null;
    if (savedColor) {
      setColorThemeState(savedColor);
      document.documentElement.setAttribute("data-theme", savedColor);
    }
    const savedFont = localStorage.getItem("font-theme") as FontTheme | null;
    if (savedFont) {
      setFontThemeState(savedFont);
      document.documentElement.setAttribute("data-font", savedFont);
    }
  }, []);

  function setColorTheme(theme: ColorTheme) {
    setColorThemeState(theme);
    localStorage.setItem("color-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }

  function setFontTheme(font: FontTheme) {
    setFontThemeState(font);
    localStorage.setItem("font-theme", font);
    document.documentElement.setAttribute("data-font", font);
  }

  return (
    <ThemeContext.Provider value={{ colorTheme, setColorTheme, fontTheme, setFontTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useColorTheme = () => useContext(ThemeContext);
