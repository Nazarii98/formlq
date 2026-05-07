"use client";

import { usePathname } from "next/navigation";
import { Home, FileText, History, BookOpen, ShieldCheck, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useExamGuard } from "@/context/ExamGuardContext";

const NAV = [
  { icon: Home,     href: "/dashboard",           label: "Головна" },
  { icon: FileText, href: "/dashboard/tests",     label: "Тести" },
  { icon: History,  href: "/dashboard/history",   label: "Історія" },
  { icon: BookOpen, href: "/dashboard/reference", label: "Довідка" },
];

const ADMIN_NAV = [
  { icon: ShieldCheck, href: "/admin/tests", label: "Тести" },
  { icon: Lightbulb,   href: "/admin/tips",  label: "Поради" },
];

export function AppSidebar() {
  const path = usePathname();
  const { userProfile } = useAuth();
  const { requestNav } = useExamGuard();

  function NavBtn({ href, label, Icon }: { href: string; label: string; Icon: React.ElementType }) {
    const active = path === href || (href !== "/dashboard" && path.startsWith(href));

    return (
      <div className="relative group">
        <button
          onClick={() => requestNav(href)}
          className={cn(
            "relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            active ? "" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {/* Background fill */}
          <span className={cn(
            "absolute inset-0 rounded-xl transition-all duration-200",
            active
              ? "bg-primary/12"
              : "bg-transparent group-hover:bg-muted"
          )} />

          {/* Icon */}
          <Icon size={20} className={cn(
            "relative z-10 transition-all duration-200 group-hover:scale-110",
            active ? "text-primary" : ""
          )} />
        </button>

        {/* Tooltip */}
        <div className={cn(
          "pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-50",
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
          "bg-popover border border-border/50 shadow-md",
          "text-xs font-medium text-foreground whitespace-nowrap",
          "opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0",
          "transition-all duration-150"
        )}>
          {label}
          {/* Arrow */}
          <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-border/50" />
          <span className="absolute right-full top-1/2 -translate-y-1/2 ml-px border-[3.5px] border-transparent border-r-popover translate-x-px" />
        </div>
      </div>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-background/80 backdrop-blur-xl border-r border-border/40 flex flex-col items-center py-5 gap-2 z-40 shadow-[1px_0_16px_color-mix(in_oklch,var(--primary)_6%,transparent)]">
      <nav className="flex flex-col items-center gap-1 flex-1">
        {NAV.map(({ icon: Icon, href, label }) => (
          <NavBtn key={href} href={href} label={label} Icon={Icon} />
        ))}
      </nav>

      {userProfile?.role === "editor" && (
        <div className="flex flex-col items-center gap-1 pt-3 mt-1 border-t border-border/40 w-10">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-medium mb-1 leading-none">ADM</span>
          {ADMIN_NAV.map(({ icon: Icon, href, label }) => (
            <NavBtn key={href} href={href} label={label} Icon={Icon} />
          ))}
        </div>
      )}
    </aside>
  );
}
