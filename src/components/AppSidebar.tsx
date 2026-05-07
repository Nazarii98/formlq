"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, History, BookOpen, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { icon: Home, href: "/dashboard", label: "Головна" },
  { icon: FileText, href: "/dashboard/tests", label: "Тести" },
  { icon: History, href: "/dashboard/history", label: "Історія" },
  { icon: BookOpen, href: "/dashboard/reference", label: "Довідка" },
];

export function AppSidebar() {
  const path = usePathname();
  const { userProfile } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-background border-r border-border/50 flex flex-col items-center py-5 gap-2 z-40">
      <Link href="/dashboard" className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm mb-4">
        F
      </Link>

      <nav className="flex flex-col items-center gap-1 flex-1">
        {NAV.map(({ icon: Icon, href, label }) => {
          const active = path === href || (href !== "/dashboard" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon size={20} />
            </Link>
          );
        })}
      </nav>

      {userProfile?.role === "editor" && (
        <Link
          href="/admin/tests"
          title="Адмін-панель"
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
            path.startsWith("/admin")
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <ShieldCheck size={20} />
        </Link>
      )}
    </aside>
  );
}
