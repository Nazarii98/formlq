"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useExamGuard } from "@/context/ExamGuardContext";
import { canTutor, isEditor } from "@/lib/roles";
import { NAV, TUTOR_NAV, ADMIN_NAV, isNavActive } from "@/components/AppSidebar";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const { userProfile, logOut } = useAuth();
  const { requestNav, requestAction } = useExamGuard();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  // Close the menu on navigation (state adjusted during render, not in an effect).
  const [prevPath, setPrevPath] = useState(path);
  if (path !== prevPath) {
    setPrevPath(path);
    setOpen(false);
  }

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

  function renderLinks(links: typeof NAV) {
    return links.map(({ icon: Icon, href, label }) => (
      <button
        key={href}
        onClick={() => handleNav(href)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-left transition-all",
          isNavActive(path, href)
            ? "bg-primary text-primary-foreground font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
        )}
      >
        <Icon size={16} />
        {label}
      </button>
    ));
  }

  function renderSection(title: string, links: typeof NAV) {
    return (
      <>
        <div className="my-1 h-px bg-border/50 mx-2" />
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40 font-semibold px-3 pb-0.5">
          {title}
        </p>
        {renderLinks(links)}
      </>
    );
  }

  return (
    <div ref={ref} className="relative md:hidden shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Закрити меню" : "Відкрити меню"}
        aria-expanded={open}
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
        <div className="absolute left-0 top-[calc(100%+8px)] z-100 min-w-52.5 bg-card border border-border/50 rounded-2xl shadow-xl p-1.5 flex flex-col gap-0.5">
          {renderLinks(NAV)}
          {canTutor(userProfile?.role) && renderSection("Кабінет вчителя", TUTOR_NAV)}
          {isEditor(userProfile?.role) && renderSection("Адмін", ADMIN_NAV)}

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
