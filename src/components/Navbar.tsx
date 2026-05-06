"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeSelector } from "@/components/ThemeSelector";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const { user, userProfile, logOut } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logOut();
    router.push("/login");
  }

  const initials = user?.displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "У";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <span className="w-7 h-7 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
            F
          </span>
          formlq
        </Link>

        <nav className="flex items-center gap-1" />

        <div className="flex items-center gap-3">
          {userProfile?.role === "editor" && (
            <Link href="/admin/tests">
              <Badge variant="outline" className="text-xs cursor-pointer hover:border-primary/60 transition-colors">
                Адмін
              </Badge>
            </Link>
          )}
          <ThemeSelector />
          {user ? (
            <>
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.photoURL ?? ""} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
                Вийти
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">Увійти</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
