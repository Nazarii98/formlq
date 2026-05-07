"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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
};

export function HeaderProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");

  useEffect(() => {
    const match = ROUTE_MAP[pathname];
    if (match) {
      setTitle(match.title);
      setSubtitle(match.subtitle);
    } else if (pathname === "/dashboard") {
      setTitle("");
      setSubtitle("");
    }
  }, [pathname]);

  function setHeader(t: string, s = "") {
    setTitle(t);
    setSubtitle(s);
  }

  return (
    <HeaderContext.Provider value={{ title, subtitle, setHeader }}>
      {children}
    </HeaderContext.Provider>
  );
}

export const useHeader = () => useContext(HeaderContext);
