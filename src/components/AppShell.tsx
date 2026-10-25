"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "firebase/auth";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useHeader } from "@/context/HeaderContext";
import { useExamGuard } from "@/context/ExamGuardContext";
import { ReferenceDrawerProvider } from "@/context/ReferenceDrawerContext";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import { ThemeSelector } from "@/components/ThemeSelector";
import { IconButton } from "@/components/ui/icon-button";
import { SpinnerScreen } from "@/components/ui/spinner";
import { cn, withNext } from "@/lib/utils";
import type { UserProfile } from "@/types";

const ReferenceDrawer = dynamic(
  () => import("@/components/ReferenceDrawer").then((m) => ({ default: m.ReferenceDrawer })),
  { ssr: false },
);

interface AppShellProps {
  children: React.ReactNode;
  /** Access check, evaluated once auth has finished loading. */
  allow: (auth: { user: User | null; userProfile: UserProfile | null }) => boolean;
  /** Where to send users who fail `allow`. */
  redirectTo: string;
  /** `replace` (default) or `push` the redirect onto history. */
  redirectMode?: "replace" | "push";
  /** Section root path; the greeting is shown there instead of the page title. */
  homePath: string;
  /** Name shown when the profile has no display name. */
  fallbackName: string;
  /** Also show the greeting on sub-pages that did not set a header title. */
  greetWhenUntitled?: boolean;
  /** Renders the greeting block for the header. */
  greeting: (firstName: string) => React.ReactNode;
}

/** Shared authenticated chrome: role guard, sticky header, sidebar, mobile nav, reference drawer. */
export function AppShell({
  children,
  allow,
  redirectTo,
  redirectMode = "replace",
  homePath,
  fallbackName,
  greetWhenUntitled = false,
  greeting,
}: AppShellProps) {
  const { user, userProfile, loading, logOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { title, subtitle } = useHeader();
  const { requestAction } = useExamGuard();
  const [scrolled, setScrolled] = useState(false);

  const allowed = allow({ user, userProfile });

  useEffect(() => {
    if (loading || allowed) return;
    // Signed-out visitors come back to this page after logging in (e.g. from a test QR code).
    const target = !user && redirectTo === "/login" ? withNext("/login", pathname) : redirectTo;
    if (redirectMode === "push") router.push(target);
    else router.replace(target);
  }, [allowed, loading, router, redirectTo, redirectMode, user, pathname]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  function handleLogout() {
    requestAction(async () => {
      await logOut();
      router.push("/login");
    });
  }

  if (loading) return <SpinnerScreen />;
  if (!allowed) return null;

  const firstName = (userProfile?.displayName ?? user?.displayName ?? fallbackName).split(" ")[0];
  const showGreeting = pathname === homePath || (greetWhenUntitled && !title);

  return (
    <ReferenceDrawerProvider>
      <div
        className="min-h-screen bg-background flex flex-col"
        // Height of the sticky header below; sticky content (exam bar) offsets by it.
        style={{ "--app-header-h": "4rem" } as React.CSSProperties}
      >
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
          {showGreeting ? (
            greeting(firstName)
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
                {/* Empty title: the styled tooltip below replaces the native one. */}
                <IconButton label="Вийти" title="" size="md" onClick={handleLogout}>
                  <LogOut size={16} />
                </IconButton>
                <div className="pointer-events-none absolute right-0 top-[calc(100%+6px)] z-50 flex items-center px-2.5 py-1.5 rounded-lg bg-popover border border-border/50 shadow-md text-xs font-medium text-foreground whitespace-nowrap opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150">
                  Вийти
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1">
          <AppSidebar />
          <ReferenceDrawer />
          <main className="ml-0 md:ml-18 flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </ReferenceDrawerProvider>
  );
}

/** Two-line greeting: small section label above the user's first name. */
export function SectionGreeting({ label, name }: { label: string; name: string }) {
  return (
    <div className="flex flex-col justify-center flex-1 min-w-0">
      <span className="text-xs text-muted-foreground leading-tight">{label}</span>
      <span className="text-xl font-semibold leading-tight">{name}</span>
    </div>
  );
}
