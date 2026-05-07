"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeSelector } from "@/components/ThemeSelector";
import { Flame, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading, logOut } = useAuth();
  const router = useRouter();

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
  const firstName = (userProfile?.displayName ?? user.displayName ?? "Учень").split(" ")[0];

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <div className="ml-16 flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50 px-6 h-14 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Привіт, <span className="font-semibold text-foreground">{firstName}</span>
          </span>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold",
              streak > 0
                ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                : "bg-muted text-muted-foreground"
            )}>
              <Flame size={15} />
              <span>{streak}</span>
            </div>
            <ThemeSelector />
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              title="Вийти"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
