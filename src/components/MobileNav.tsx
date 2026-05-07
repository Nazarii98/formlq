"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Home, FileText, History, BookOpen, ShieldCheck, Lightbulb, Users, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useExamGuard } from "@/context/ExamGuardContext";
import { useReferenceDrawer } from "@/context/ReferenceDrawerContext";

const NAV = [
  { icon: Home,     href: "/dashboard",         label: "Головна" },
  { icon: FileText, href: "/dashboard/tests",   label: "Тести" },
  { icon: History,  href: "/dashboard/history", label: "Історія" },
  { icon: BookOpen, href: "__drawer__",          label: "Довідка" },
];

const ADMIN_NAV = [
  { icon: ShieldCheck, href: "/admin/tests", label: "Тести" },
  { icon: Lightbulb,   href: "/admin/tips",  label: "Поради" },
  { icon: Users,       href: "/admin/users", label: "Користувачі" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const { userProfile, logOut } = useAuth();
  const { requestNav, requestAction } = useExamGuard();
  const { open: drawerOpen, openDrawer } = useReferenceDrawer();
  const ref = useRef<HTMLDivElement>(null);

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
    if (href === "__drawer__") openDrawer();
    else requestNav(href);
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
          {NAV.map(({ icon: Icon, href, label }) => {
            const isDrawer = href === "__drawer__";
            const active = isDrawer
              ? drawerOpen
              : href === "/dashboard"
                ? path === href
                : path.startsWith(href);
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
