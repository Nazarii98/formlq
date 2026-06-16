"use client";

import { useAuth } from "@/context/AuthContext";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { subscribeToUsers, updateUserRole, isProtectedEmail } from "@/lib/users";
import { timeAgo } from "@/lib/format";
import { SpinnerPage } from "@/components/ui/spinner";
import { useHeader } from "@/context/HeaderContext";
import { UserProfile, UserRole } from "@/types";
import { cn } from "@/lib/utils";
import {
  Flame,
  Crown,
  Search,
  ChevronRight,
  GraduationCap,
  Lock,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectItem } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { onlineUids, count: onlineCount } = useOnlineUsers();
  const { setHeader } = useHeader();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [studentsVisible, setStudentsVisible] = useState(10);

  // Real-time Firestore subscription — 116 reads on mount, then only deltas.
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToUsers((all) => {
      setUsers(
        all.sort(
          (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
        ),
      );
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    setHeader(
      "Користувачі",
      `Управління доступом${onlineCount > 0 ? ` · ${onlineCount} онлайн` : ""}`,
    );
    return () => setHeader("", "");
  }, [setHeader, onlineCount]);

  async function setRole(uid: string, role: UserRole) {
    setUpdatingRole(uid);
    try {
      await updateUserRole(uid, role);
      // onSnapshot will deliver the update — no manual cache patch needed.
    } finally {
      setUpdatingRole(null);
    }
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.displayName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const onlineUsers = filtered.filter((u) => onlineUids.has(u.uid));
  const offlineEditors = filtered.filter(
    (u) => u.role === "editor" && !onlineUids.has(u.uid),
  );
  const offlineTutors = filtered.filter(
    (u) => u.role === "tutor" && !onlineUids.has(u.uid),
  );
  const offlineStudents = filtered.filter(
    (u) => (!u.role || u.role === "student") && !onlineUids.has(u.uid),
  );

  function UserRow({ u }: { u: UserProfile }) {
    const isSelf = u.uid === currentUser?.uid;
    const locked = isProtectedEmail(u.email);
    const isEditor = u.role === "editor";
    const isTutor = u.role === "tutor";
    const isOnline = onlineUids.has(u.uid);
    const updating = updatingRole === u.uid;
    const roleLabel = isEditor ? "Редактор" : isTutor ? "Вчитель" : "Учень";

    return (
      <div
        className={cn(
          "rounded-2xl border bg-card px-4 py-3 flex items-center gap-3 group transition-all cursor-pointer",
          isEditor
            ? "border-primary/30 bg-primary/5 hover:border-primary/50"
            : isTutor
              ? "border-amber-400/30 bg-amber-400/5 hover:border-amber-400/50"
              : "border-border/50 hover:bg-muted/30 hover:border-border/80",
        )}
        onClick={() => router.push(`/admin/users/${u.uid}`)}
      >
        <div className="relative shrink-0">
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold",
              isEditor
                ? "bg-primary/15 text-primary"
                : isTutor
                  ? "bg-amber-400/15 text-amber-600 dark:text-amber-400"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {u.displayName?.[0]?.toUpperCase() ?? "?"}
          </div>
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-card" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold truncate">
              {u.displayName || "—"}
            </p>
            {isEditor && <Crown size={11} className="text-primary shrink-0" />}
            {isTutor && (
              <GraduationCap size={12} className="text-amber-500 shrink-0" />
            )}
            {isSelf && (
              <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium shrink-0">
                Ви
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
        </div>

        <div className="hidden sm:flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Flame
              size={11}
              className={u.streak > 0 ? "text-orange-500" : ""}
            />
            <span className={u.streak > 0 ? "text-orange-500 font-medium" : ""}>
              {u.streak}
            </span>
          </div>
          <span className="text-muted-foreground/50">
            {u.createdAt ? timeAgo(u.createdAt.toDate()) : "—"}
          </span>
        </div>

        {isSelf || locked ? (
          <span
            className={cn(
              "shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-full",
              locked
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground opacity-60",
            )}
            title={locked ? "Захищений акаунт — роль не можна змінити" : undefined}
          >
            {locked && <Lock size={11} />}
            {roleLabel}
          </span>
        ) : (
          <div onClick={(e) => e.stopPropagation()} className="shrink-0 w-32">
            <Select
              value={u.role ?? "student"}
              disabled={updating}
              onValueChange={(v) => setRole(u.uid, v as UserRole)}
              className={cn(updating && "opacity-50 pointer-events-none")}
            >
              <SelectItem value="student">Учень</SelectItem>
              <SelectItem value="tutor">Вчитель</SelectItem>
              <SelectItem value="editor">Редактор</SelectItem>
            </Select>
          </div>
        )}
        <ChevronRight
          size={14}
          className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0"
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setStudentsVisible(10);
          }}
          placeholder="Пошук за іменем або email..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border/50 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
        />
      </div>

      {isLoading ? (
        <SpinnerPage />
      ) : (
        <div className="space-y-4">
          {onlineUsers.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400 px-1">
                ● Зараз онлайн ({onlineUsers.length})
              </p>
              {onlineUsers.map((u) => (
                <UserRow key={u.uid} u={u} />
              ))}
            </div>
          )}

          {offlineEditors.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Редактори ({offlineEditors.length})
              </p>
              {offlineEditors.map((u) => (
                <UserRow key={u.uid} u={u} />
              ))}
            </div>
          )}

          {offlineTutors.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 px-1">
                Вчителі ({offlineTutors.length})
              </p>
              {offlineTutors.map((u) => (
                <UserRow key={u.uid} u={u} />
              ))}
            </div>
          )}

          {offlineStudents.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Учні ({offlineStudents.length})
              </p>
              {offlineStudents.slice(0, studentsVisible).map((u) => (
                <UserRow key={u.uid} u={u} />
              ))}
              {offlineStudents.length > studentsVisible && (
                <button
                  onClick={() => setStudentsVisible((v) => v + 10)}
                  className="w-full py-2.5 rounded-xl border border-border/50 bg-card text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-all"
                >
                  Показати ще{" "}
                  {Math.min(10, offlineStudents.length - studentsVisible)} з{" "}
                  {offlineStudents.length - studentsVisible}
                </button>
              )}
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
