"use client";

import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  History,
  ShieldCheck,
  Lightbulb,
  Users,
  ClipboardCheck,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useExamGuard } from "@/context/ExamGuardContext";
import { canTutor, isEditor } from "@/lib/roles";

type NavLink = { icon: LucideIcon; href: string; label: string };

export const NAV: NavLink[] = [
  { icon: Home, href: "/dashboard", label: "Головна" },
  { icon: FileText, href: "/dashboard/tests", label: "Тести" },
  { icon: ClipboardCheck, href: "/dashboard/homework", label: "Домашні" },
  { icon: CalendarDays, href: "/dashboard/calendar", label: "Календар" },
  { icon: History, href: "/dashboard/history", label: "Історія" },
];

export const TUTOR_NAV: NavLink[] = [
  { icon: Users, href: "/tutor/students", label: "Учні" },
  { icon: ClipboardCheck, href: "/tutor/homework", label: "Домашні" },
  { icon: CalendarDays, href: "/tutor/calendar", label: "Календар" },
];

export const ADMIN_NAV: NavLink[] = [
  { icon: ShieldCheck, href: "/admin/tests", label: "Тести" },
  { icon: Lightbulb, href: "/admin/tips", label: "Поради" },
  { icon: Users, href: "/admin/users", label: "Користувачі" },
  { icon: ClipboardCheck, href: "/admin/questions", label: "Завдання" },
];

/** Dashboard home matches exactly; every other link matches its subtree. */
export function isNavActive(path: string, href: string) {
  return href === "/dashboard" ? path === href : path.startsWith(href);
}

export function AppSidebar() {
  const path = usePathname();
  const { userProfile } = useAuth();
  const { requestNav } = useExamGuard();

  function renderLinks(links: NavLink[]) {
    return links.map(({ icon, href, label }) => (
      <NavItem
        key={href}
        label={label}
        Icon={icon}
        active={isNavActive(path, href)}
        onClick={() => requestNav(href)}
      />
    ));
  }

  return (
    <aside className="fixed left-4 top-1/2 -translate-y-1/2 w-16 hidden md:flex flex-col items-center z-40">
      {/* Single nav island — sections split by dividers */}
      <div
        className={cn(
          "flex flex-col items-center gap-1 p-1.5 rounded-3xl",
          "bg-card border border-border/50",
          "shadow-[0_2px_16px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)]",
        )}
      >
        {renderLinks(NAV)}

        {canTutor(userProfile?.role) && (
          <>
            <div className="h-px w-7 bg-border/60 my-1" />
            {renderLinks(TUTOR_NAV)}
          </>
        )}

        {isEditor(userProfile?.role) && (
          <>
            <div className="h-px w-7 bg-border/60 my-1" />
            {renderLinks(ADMIN_NAV)}
          </>
        )}
      </div>
    </aside>
  );
}

function NavItem({
  label,
  Icon,
  active,
  onClick,
}: {
  label: string;
  Icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        aria-label={label}
        className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          active
            ? "bg-primary text-primary-foreground shadow-[0_3px_10px_color-mix(in_oklch,var(--primary)_45%,transparent)]"
            : "text-muted-foreground hover:text-foreground hover:bg-background/60",
        )}
      >
        <Icon size={20} className="transition-transform duration-200 group-hover:scale-110" />
      </button>
      <Tooltip label={label} />
    </div>
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
