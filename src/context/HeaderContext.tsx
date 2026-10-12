"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";

interface HeaderContextType {
  title: string;
  subtitle: string;
  setHeader: (title: string, subtitle?: string) => void;
}

const HeaderContext = createContext<HeaderContextType>({
  title: "",
  subtitle: "",
  setHeader: () => {},
});

const ROUTE_MAP: Record<string, { title: string; subtitle: string }> = {
  "/dashboard/tests":    { title: "Тести НМТ",       subtitle: "Пробні варіанти для підготовки" },
  "/dashboard/history":  { title: "Історія тестів",   subtitle: "Всі ваші спроби з деталями" },
  "/dashboard/reference":{ title: "Довідка",          subtitle: "Матеріали для підготовки" },
  "/admin/tests":        { title: "Тести",            subtitle: "Управління тестами" },
  "/admin/tips":         { title: "Поради дня",       subtitle: "Управління порадами" },
  "/admin/questions":    { title: "Перевірка завдань", subtitle: "Authoring & Review Tool" },
};

export function HeaderProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");

  // Apply static route titles on navigation (adjusted during render, not in an effect).
  const [prevPath, setPrevPath] = useState<string | null>(null);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    const match = ROUTE_MAP[pathname];
    if (match) {
      setTitle(match.title);
      setSubtitle(match.subtitle);
    } else if (pathname === "/dashboard") {
      setTitle("");
      setSubtitle("");
    }
  }

  const setHeader = useCallback((t: string, s = "") => {
    setTitle(t);
    setSubtitle(s);
  }, []);

  const value = useMemo(() => ({ title, subtitle, setHeader }), [title, subtitle, setHeader]);

  return (
    <HeaderContext.Provider value={value}>
      {children}
    </HeaderContext.Provider>
  );
}

export const useHeader = () => useContext(HeaderContext);

/** Sets the layout header for the current page and clears it on unmount. */
export function usePageHeader(title: string, subtitle = "") {
  const { setHeader } = useHeader();
  useEffect(() => {
    setHeader(title, subtitle);
    return () => setHeader("", "");
  }, [setHeader, title, subtitle]);
}
