"use client";

import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  History,
  BookOpen,
  ShieldCheck,
  Lightbulb,
  Users,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useExamGuard } from "@/context/ExamGuardContext";
import { useReferenceDrawer } from "@/context/ReferenceDrawerContext";

const NAV = [
  { icon: Home, href: "/dashboard", label: "Головна" },
  { icon: FileText, href: "/dashboard/tests", label: "Тести" },
  { icon: History, href: "/dashboard/history", label: "Історія" },
  { icon: BookOpen, href: "__drawer__", label: "Довідка" },
];

const ADMIN_NAV = [
  { icon: ShieldCheck, href: "/admin/tests", label: "Тести" },
  { icon: Lightbulb, href: "/admin/tips", label: "Поради" },
  { icon: Users, href: "/admin/users", label: "Користувачі" },
  { icon: ClipboardCheck, href: "/admin/questions", label: "Завдання" },
];

export function AppSidebar() {
  const path = usePathname();
  const { userProfile } = useAuth();
  const { requestNav } = useExamGuard();
  const { open: drawerOpen, openDrawer } = useReferenceDrawer();

  function NavItem({
    href,
    label,
    Icon,
  }: {
    href: string;
    label: string;
    Icon: React.ElementType;
  }) {
    const isDrawer = href === "__drawer__";
    const active = isDrawer
      ? drawerOpen
      : href === "/dashboard"
        ? path === href
        : path.startsWith(href);

    return (
      <div className="relative group">
        <button
          onClick={isDrawer ? openDrawer : () => requestNav(href)}
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            active
              ? "bg-primary text-primary-foreground shadow-[0_3px_10px_color-mix(in_oklch,var(--primary)_45%,transparent)]"
              : "text-muted-foreground hover:text-foreground hover:bg-background/60",
          )}
        >
          <Icon
            size={20}
            className="transition-transform duration-200 group-hover:scale-110"
          />
        </button>
        <Tooltip label={label} />
      </div>
    );
  }

  return (
    <aside className="fixed left-4 top-16 h-[calc(100vh-4rem)] w-16 hidden md:flex flex-col items-center py-6 z-40 gap-3">
      {/* User nav island */}
      <div
        className={cn(
          "flex flex-col items-center gap-1 p-1.5 rounded-3xl",
          "bg-card border border-border/50",
          "shadow-[0_2px_16px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)]",
        )}
      >
        {NAV.map(({ icon: Icon, href, label }) => (
          <NavItem key={href} href={href} label={label} Icon={Icon} />
        ))}
      </div>

      {/* Admin nav island — pinned to bottom */}
      {userProfile?.role === "editor" && (
        <div
          className={cn(
            "mt-auto flex flex-col items-center gap-1 p-1.5 rounded-3xl",
            "bg-card border border-border/50",
            "shadow-[0_2px_16px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)]",
          )}
        >
          <span className="text-[8px] uppercase tracking-widest text-muted-foreground/40 font-semibold py-0.5 select-none">
            ADM
          </span>
          {ADMIN_NAV.map(({ icon: Icon, href, label }) => (
            <NavItem key={href} href={href} label={label} Icon={Icon} />
          ))}
        </div>
      )}
    </aside>
  );
}

function Tooltip({ label }: { label: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-50",
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
        "bg-popover border border-border/50 shadow-md",
        "text-xs font-medium text-foreground whitespace-nowrap",
        "opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0",
        "transition-all duration-150",
      )}
    >
      {label}
      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-border/50" />
      <span className="absolute right-full top-1/2 -translate-y-1/2 ml-px border-[3.5px] border-transparent border-r-popover translate-x-px" />
    </div>
  );
}
