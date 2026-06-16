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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useExamGuard } from "@/context/ExamGuardContext";
import { useQuery } from "@tanstack/react-query";
import { getStudentTutorLinks } from "@/lib/tutor";

// `tutorOnly` items appear only for students linked to at least one tutor.
const NAV = [
  { icon: Home, href: "/dashboard", label: "Головна" },
  { icon: FileText, href: "/dashboard/tests", label: "Тести" },
  { icon: ClipboardCheck, href: "/dashboard/homework", label: "Домашні", tutorOnly: true },
  { icon: CalendarDays, href: "/dashboard/calendar", label: "Календар", tutorOnly: true },
  { icon: History, href: "/dashboard/history", label: "Історія" },
];

const TUTOR_NAV = [
  { icon: Users, href: "/tutor/students", label: "Учні" },
  { icon: ClipboardCheck, href: "/tutor/homework", label: "Домашні" },
  { icon: CalendarDays, href: "/tutor/calendar", label: "Календар" },
];

const ADMIN_NAV = [
  { icon: ShieldCheck, href: "/admin/tests", label: "Тести" },
  { icon: Lightbulb, href: "/admin/tips", label: "Поради" },
  { icon: Users, href: "/admin/users", label: "Користувачі" },
  { icon: ClipboardCheck, href: "/admin/questions", label: "Завдання" },
];

export function AppSidebar() {
  const path = usePathname();
  const { user, userProfile } = useAuth();
  const { requestNav } = useExamGuard();

  const { data: tutorLinks = [] } = useQuery({
    queryKey: ["my-tutors", user?.uid],
    queryFn: () => getStudentTutorLinks(user!.uid),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  const hasTutor = tutorLinks.length > 0;

  function NavItem({
    href,
    label,
    Icon,
  }: {
    href: string;
    label: string;
    Icon: React.ElementType;
  }) {
    const active =
      href === "/dashboard" ? path === href : path.startsWith(href);

    return (
      <div className="relative group">
        <button
          onClick={() => requestNav(href)}
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
    <aside className="fixed left-4 top-1/2 -translate-y-1/2 w-16 hidden md:flex flex-col items-center z-40">
      {/* Single nav island — sections split by dividers */}
      <div
        className={cn(
          "flex flex-col items-center gap-1 p-1.5 rounded-3xl",
          "bg-card border border-border/50",
          "shadow-[0_2px_16px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)]",
        )}
      >
        {NAV.filter((n) => !n.tutorOnly || hasTutor).map(({ icon: Icon, href, label }) => (
          <NavItem key={href} href={href} label={label} Icon={Icon} />
        ))}

        {(userProfile?.role === "tutor" || userProfile?.role === "editor") && (
          <>
            <div className="h-px w-7 bg-border/60 my-1" />
            {TUTOR_NAV.map(({ icon: Icon, href, label }) => (
              <NavItem key={href} href={href} label={label} Icon={Icon} />
            ))}
          </>
        )}

        {userProfile?.role === "editor" && (
          <>
            <div className="h-px w-7 bg-border/60 my-1" />
            {ADMIN_NAV.map(({ icon: Icon, href, label }) => (
              <NavItem key={href} href={href} label={label} Icon={Icon} />
            ))}
          </>
        )}
      </div>
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
