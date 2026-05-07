"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useHeader } from "@/context/HeaderContext";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import { ThemeSelector } from "@/components/ThemeSelector";
import { ReferenceDrawerProvider } from "@/context/ReferenceDrawerContext";
import dynamic from "next/dynamic";
const ReferenceDrawer = dynamic(
  () => import("@/components/ReferenceDrawer").then((m) => ({ default: m.ReferenceDrawer })),
  { ssr: false },
);
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLayout({
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
    if (!loading && userProfile?.role !== "editor") {
      router.replace("/dashboard");
    }
  }, [userProfile, loading, router]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

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
  if (userProfile?.role !== "editor") return null;

  const firstName = (
    userProfile?.displayName ??
    user?.displayName ??
    "Адмін"
  ).split(" ")[0];
  const isAdmin = pathname === "/admin";

  return (
    <ReferenceDrawerProvider>
    <div className="min-h-screen bg-background flex flex-col">

      {/* Full-width header */}
      <header
        className={cn(
          "sticky top-0 z-50 w-full pl-4 md:pl-20 pr-6 h-16 flex items-center gap-3 justify-between transition-all duration-200",
          "bg-background/85 backdrop-blur-md",
          scrolled
            ? "border-b border-border/40 shadow-[0_1px_16px_color-mix(in_oklch,var(--primary)_8%,transparent)]"
            : "border-b border-transparent",
        )}
      >
        <MobileNav />
        {isAdmin ? (
          <div className="flex flex-col justify-center flex-1 min-w-0">
            <span className="text-xs text-muted-foreground leading-tight">Адмін-панель</span>
            <span className="text-xl font-semibold leading-tight">{firstName}</span>
          </div>
        ) : (
          <div className="flex items-baseline gap-2 flex-1 min-w-0">
            <span className="font-semibold text-xl leading-tight truncate">{title}</span>
            {subtitle && (
              <span className="text-sm text-muted-foreground leading-tight truncate hidden sm:block">
                {subtitle}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <ThemeSelector />
          <div className="hidden md:contents">
            <div className="relative group">
              <button
                onClick={handleLogout}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <LogOut size={16} />
              </button>
              <div className="pointer-events-none absolute right-0 top-[calc(100%+6px)] z-50 flex items-center px-2.5 py-1.5 rounded-lg bg-popover border border-border/50 shadow-md text-xs font-medium text-foreground whitespace-nowrap opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150">
                Вийти
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar + content */}
      <div className="flex flex-1">
        <AppSidebar />
        <ReferenceDrawer />
        <main className="ml-0 md:ml-18 flex-1 p-4 md:p-6">{children}</main>
      </div>

    </div>
    </ReferenceDrawerProvider>
  );
}
