"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useHeader } from "@/context/HeaderContext";
import { ReferenceDrawerProvider } from "@/context/ReferenceDrawerContext";
import { ReferenceDrawer } from "@/components/ReferenceDrawer";
import { Flame, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading, logOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { title, subtitle } = useHeader();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Warm PDF cache in idle time so drawer opens instantly
  useEffect(() => {
    const id = requestIdleCallback(() => {
      import("@/lib/pdf-cache").then((m) => m.preloadPdf());
    });
    return () => cancelIdleCallback(id);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  async function handleLogout() {
    await logOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const streak = userProfile?.streak ?? 0;
  const firstName = (
    userProfile?.displayName ??
    user.displayName ??
    "Учень"
  ).split(" ")[0];
  const isHome = pathname === "/dashboard";

  return (
    <ReferenceDrawerProvider>
      <div className="min-h-screen bg-background flex">
        <AppSidebar />
        <ReferenceDrawer />
        <div className="ml-16 flex-1 flex flex-col min-h-screen">
          <header
            className={cn(
              "sticky top-0 z-30 px-6 h-16 flex items-center justify-between transition-all duration-200",
              "bg-background/85 backdrop-blur-sm",
              scrolled
                ? "border-b border-border/40 shadow-[0_1px_16px_color-mix(in_oklch,var(--primary)_8%,transparent)]"
                : "border-b border-transparent",
            )}
          >
            {isHome ? (
              <div className="flex flex-col justify-center">
                <span className="text-xs text-muted-foreground leading-tight">
                  Вітаємо
                </span>
                <span className="text-lg font-semibold leading-tight">
                  {firstName}
                </span>
              </div>
            ) : (
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-semibold text-lg leading-tight truncate">
                  {title}
                </span>
                {subtitle && (
                  <span className="text-sm text-muted-foreground leading-tight truncate hidden sm:block">
                    {subtitle}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              {/* Streak */}
              <div className="relative group/streak">
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-semibold transition-all cursor-default",
                    streak > 0
                      ? "bg-orange-500/10 text-orange-500 dark:text-orange-400"
                      : "bg-muted/50 text-muted-foreground",
                  )}
                >
                  <Flame
                    size={16}
                    className={
                      streak > 0
                        ? "text-orange-500 dark:text-orange-400"
                        : "text-muted-foreground"
                    }
                  />
                  <span className="tabular-nums leading-none">{streak}</span>
                </div>
                <div
                  className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-50
                px-3 py-2 rounded-xl
                bg-popover border border-border/50 shadow-lg
                text-xs font-medium text-foreground whitespace-nowrap
                opacity-0 translate-y-1 group-hover/streak:opacity-100 group-hover/streak:translate-y-0
                transition-all duration-150"
                >
                  {streak === 0
                    ? "Почни сьогодні — перший день стріку! 🚀"
                    : streak === 1
                      ? "Відмінний старт! Не зупиняйся 💪"
                      : streak < 7
                        ? `${streak} дні поспіль — так тримати! 🔥`
                        : streak < 30
                          ? `${streak} днів поспіль — ти в потоці! ⚡`
                          : `${streak} днів — легенда! Неймовірно 🏆`}
                </div>
              </div>

              <ThemeSelector />

              {/* Logout with tooltip */}
              <div className="relative group">
                <button
                  onClick={handleLogout}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  <LogOut size={16} />
                </button>
                <div
                  className="pointer-events-none absolute right-0 top-[calc(100%+6px)] z-50
                flex items-center px-2.5 py-1.5 rounded-lg
                bg-popover border border-border/50 shadow-md
                text-xs font-medium text-foreground whitespace-nowrap
                opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0
                transition-all duration-150"
                >
                  Вийти
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </ReferenceDrawerProvider>
  );
}
