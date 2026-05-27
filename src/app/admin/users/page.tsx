"use client";

import { useAuth } from "@/context/AuthContext";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { getAllUsers, updateUserRole } from "@/lib/users";
import { timeAgo } from "@/lib/format";
import { SpinnerPage } from "@/components/ui/spinner";
import { useHeader } from "@/context/HeaderContext";
import { UserProfile } from "@/types";
import { cn } from "@/lib/utils";
import { Flame, Crown, Search, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { onlineUids, count: onlineCount } = useOnlineUsers();
  const { setHeader } = useHeader();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  useEffect(() => {
    setHeader("Користувачі", `Управління доступом${onlineCount > 0 ? ` · ${onlineCount} онлайн` : ""}`);
    return () => setHeader("", "");
  }, [setHeader, onlineCount]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const u = await getAllUsers();
      return u.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    },
    staleTime: 2 * 60 * 1000,
  });

  const roleMutation = useMutation({
    mutationFn: ({ uid, role }: { uid: string; role: "student" | "editor" }) =>
      updateUserRole(uid, role),
    onMutate: async ({ uid, role }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-users"] });
      const prev = queryClient.getQueryData<UserProfile[]>(["admin-users"]);
      queryClient.setQueryData<UserProfile[]>(["admin-users"], (old = []) =>
        old.map((u) => (u.uid === uid ? { ...u, role } : u)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["admin-users"], ctx.prev);
    },
  });

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  // Online users appear first within each group.
  const sortOnline = (a: UserProfile, b: UserProfile) =>
    Number(onlineUids.has(b.uid)) - Number(onlineUids.has(a.uid));
  const editors = filtered.filter((u) => u.role === "editor").sort(sortOnline);
  const students = filtered.filter((u) => u.role === "student").sort(sortOnline);

  function UserRow({ u }: { u: UserProfile }) {
    const isSelf = u.uid === currentUser?.uid;
    const isEditor = u.role === "editor";
    const isOnline = onlineUids.has(u.uid);
    const updating = roleMutation.isPending && roleMutation.variables?.uid === u.uid;

    return (
      <div
        className={cn(
          "rounded-2xl border bg-card px-4 py-3 flex items-center gap-3 group transition-all cursor-pointer",
          isEditor ? "border-primary/30 bg-primary/5 hover:border-primary/50" : "border-border/50 hover:bg-muted/30 hover:border-border/80",
        )}
        onClick={() => router.push(`/admin/users/${u.uid}`)}
      >
        <div className="relative shrink-0">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold",
            isEditor ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          )}>
            {u.displayName?.[0]?.toUpperCase() ?? "?"}
          </div>
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-card" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold truncate">{u.displayName || "—"}</p>
            {isEditor && <Crown size={11} className="text-primary shrink-0" />}
            {isSelf && <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium shrink-0">Ви</span>}
          </div>
          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
        </div>

        <div className="hidden sm:flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Flame size={11} className={u.streak > 0 ? "text-orange-500" : ""} />
            <span className={u.streak > 0 ? "text-orange-500 font-medium" : ""}>{u.streak}</span>
          </div>
          <span className="text-muted-foreground/50">{u.createdAt ? timeAgo(u.createdAt.toDate()) : "—"}</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isSelf) return;
            roleMutation.mutate({ uid: u.uid, role: isEditor ? "student" : "editor" });
          }}
          disabled={isSelf || updating}
          className={cn(
            "shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all",
            isSelf && "opacity-40 cursor-default",
            !isSelf && isEditor && "bg-primary/10 text-primary hover:bg-red-500/10 hover:text-red-500",
            !isSelf && !isEditor && "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary",
            updating && "opacity-50 pointer-events-none",
          )}
        >
          {updating ? "..." : isEditor ? "Редактор" : "Учень"}
        </button>
        <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Пошук за іменем або email..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border/50 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
        />
      </div>

      {isLoading ? <SpinnerPage /> : (
        <div className="space-y-4">
          {editors.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Редактори ({editors.length})
              </p>
              {editors.map((u) => <UserRow key={u.uid} u={u} />)}
            </div>
          )}

          {students.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Учні ({students.length})
              </p>
              {students.map((u) => <UserRow key={u.uid} u={u} />)}
            </div>
          )}

          {filtered.length === 0 && (
            <EmptyState emoji="👤" title="Нічого не знайдено" />
          )}
        </div>
      )}
    </div>
  );
}
