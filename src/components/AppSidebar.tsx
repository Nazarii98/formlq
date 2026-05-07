"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, History, BookOpen, ShieldCheck, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useExamGuard } from "@/context/ExamGuardContext";

const NAV = [
  { icon: Home, href: "/dashboard", label: "Головна" },
  { icon: FileText, href: "/dashboard/tests", label: "Тести" },
  { icon: History, href: "/dashboard/history", label: "Історія" },
  { icon: BookOpen, href: "/dashboard/reference", label: "Довідка" },
];

export function AppSidebar() {
  const path = usePathname();
  const { userProfile } = useAuth();
  const { requestNav } = useExamGuard();

  function navBtn(href: string, label: string, Icon: React.ElementType) {
    const active = path === href || (href !== "/dashboard" && path.startsWith(href));
    return (
      <button
        key={href}
        title={label}
        onClick={() => requestNav(href)}
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
          active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon size={20} />
      </button>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-background border-r border-border/50 flex flex-col items-center py-5 gap-2 z-40">
      <nav className="flex flex-col items-center gap-1 flex-1">
        {NAV.map(({ icon: Icon, href, label }) => navBtn(href, label, Icon))}
      </nav>

      {userProfile?.role === "editor" && (
        <div className="flex flex-col items-center gap-1 border-t border-border/40 pt-2">
          {navBtn("/admin/tests", "Тести (адмін)", ShieldCheck)}
          {navBtn("/admin/tips", "Поради (адмін)", Lightbulb)}
        </div>
      )}
    </aside>
  );
}
