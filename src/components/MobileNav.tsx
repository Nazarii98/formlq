"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Home, FileText, History, ShieldCheck, Lightbulb, Users, LogOut, ClipboardCheck, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useExamGuard } from "@/context/ExamGuardContext";
import { useQuery } from "@tanstack/react-query";
import { getStudentTutorLinks } from "@/lib/tutor";

const NAV = [
  { icon: Home,     href: "/dashboard",         label: "Головна" },
  { icon: FileText, href: "/dashboard/tests",   label: "Тести" },
  { icon: ClipboardCheck, href: "/dashboard/homework", label: "Домашні", tutorOnly: true },
  { icon: CalendarDays, href: "/dashboard/calendar", label: "Календар", tutorOnly: true },
  { icon: History,  href: "/dashboard/history", label: "Історія" },
];

const TUTOR_NAV = [
  { icon: Users,          href: "/tutor/students", label: "Учні" },
  { icon: ClipboardCheck, href: "/tutor/homework", label: "Домашні" },
  { icon: CalendarDays,   href: "/tutor/calendar", label: "Календар" },
];

const ADMIN_NAV = [
  { icon: ShieldCheck, href: "/admin/tests", label: "Тести" },
  { icon: Lightbulb,   href: "/admin/tips",  label: "Поради" },
  { icon: Users,       href: "/admin/users", label: "Користувачі" },
  {icon: ClipboardCheck, href: "/admin/questions", label: "Завдання"}
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const { user, userProfile, logOut } = useAuth();
  const { requestNav, requestAction } = useExamGuard();
  const ref = useRef<HTMLDivElement>(null);

  const { data: tutorLinks = [] } = useQuery({
    queryKey: ["my-tutors", user?.uid],
    queryFn: () => getStudentTutorLinks(user!.uid),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  const hasTutor = tutorLinks.length > 0;

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => { setOpen(false); }, [path]);

  function handleNav(href: string) {
    setOpen(false);
    requestNav(href);
  }

  function handleLogout() {
    setOpen(false);
    requestAction(async () => {
      await logOut();
      router.push("/login");
    });
  }

  return (
    <div ref={ref} className="relative md:hidden shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
          open
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
        )}
      >
        {open ? <X size={19} /> : <Menu size={19} />}
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[100] min-w-[210px] bg-card border border-border/50 rounded-2xl shadow-xl p-1.5 flex flex-col gap-0.5">
          {NAV.filter((n) => !n.tutorOnly || hasTutor).map(({ icon: Icon, href, label }) => {
            const active =
              href === "/dashboard" ? path === href : path.startsWith(href);
            return (
              <button
                key={href}
                onClick={() => handleNav(href)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-left transition-all",
                  active
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}

          {(userProfile?.role === "tutor" || userProfile?.role === "editor") && (
            <>
              <div className="my-1 h-px bg-border/50 mx-2" />
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40 font-semibold px-3 pb-0.5">
                Кабінет вчителя
              </p>
              {TUTOR_NAV.map(({ icon: Icon, href, label }) => {
                const active = path === href || path.startsWith(href);
                return (
                  <button
                    key={href}
                    onClick={() => handleNav(href)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-left transition-all",
                      active
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                );
              })}
            </>
          )}

          {userProfile?.role === "editor" && (
            <>
              <div className="my-1 h-px bg-border/50 mx-2" />
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40 font-semibold px-3 pb-0.5">
                Адмін
              </p>
              {ADMIN_NAV.map(({ icon: Icon, href, label }) => {
                const active = path === href || path.startsWith(href);
                return (
                  <button
                    key={href}
                    onClick={() => handleNav(href)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-left transition-all",
                      active
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                );
              })}
            </>
          )}

          {/* Logout */}
          <div className="my-1 h-px bg-border/50 mx-2" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-left text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-all"
          >
            <LogOut size={16} />
            Вийти
          </button>
        </div>
      )}
    </div>
  );
}
