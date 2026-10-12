"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { usePageHeader } from "@/context/HeaderContext";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { subscribeToUsers, updateUserRole } from "@/lib/users";
import { queryKeys } from "@/lib/queryKeys";
import { UserProfile, UserRole } from "@/types";
import { SpinnerPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { SectionLabel } from "@/components/ui/section-label";
import { UserRow } from "@/components/admin/users/UserRow";

const PAGE = 10;

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { onlineUids, count: onlineCount } = useOnlineUsers();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [studentsVisible, setStudentsVisible] = useState(PAGE);

  // Real-time Firestore subscription — one read per user on mount, then only deltas.
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToUsers((all) => {
      setUsers(
        all.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)),
      );
      setIsLoading(false);
    });
  }, []);

  usePageHeader(
    "Користувачі",
    `Управління доступом${onlineCount > 0 ? ` · ${onlineCount} онлайн` : ""}`,
  );

  const setRole = useCallback(
    async (uid: string, role: UserRole) => {
      setUpdatingRole(uid);
      try {
        await updateUserRole(uid, role);
        // onSnapshot delivers the list update; other cached views must refetch.
        queryClient.invalidateQueries({ queryKey: queryKeys.user(uid) });
        queryClient.invalidateQueries({ queryKey: queryKeys.allTutors });
      } finally {
        setUpdatingRole(null);
      }
    },
    [queryClient],
  );

  const openUser = useCallback((uid: string) => router.push(`/admin/users/${uid}`), [router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q),
    );
  }, [users, search]);

  const groups = useMemo(() => {
    const online: UserProfile[] = [];
    const editors: UserProfile[] = [];
    const tutors: UserProfile[] = [];
    const students: UserProfile[] = [];
    for (const u of filtered) {
      if (onlineUids.has(u.uid)) online.push(u);
      else if (u.role === "editor") editors.push(u);
      else if (u.role === "tutor") tutors.push(u);
      else students.push(u);
    }
    return { online, editors, tutors, students };
  }, [filtered, onlineUids]);

  const renderRow = (u: UserProfile) => (
    <UserRow
      key={u.uid}
      user={u}
      search={search}
      isSelf={u.uid === currentUser?.uid}
      isOnline={onlineUids.has(u.uid)}
      updating={updatingRole === u.uid}
      onSetRole={setRole}
      onOpen={openUser}
    />
  );

  const { online, editors, tutors, students } = groups;
  const remaining = students.length - studentsVisible;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <SearchInput
        value={search}
        onChange={(v) => {
          setSearch(v);
          setStudentsVisible(PAGE);
        }}
        placeholder="Пошук за іменем або email..."
      />

      {isLoading ? (
        <SpinnerPage />
      ) : (
        <div className="space-y-4">
          <UserGroup
            label="● Зараз онлайн"
            className="text-green-600 dark:text-green-400"
            users={online}
            renderRow={renderRow}
          />
          <UserGroup label="Редактори" users={editors} renderRow={renderRow} />
          <UserGroup
            label="Вчителі"
            className="text-amber-600 dark:text-amber-400"
            users={tutors}
            renderRow={renderRow}
          />
          <UserGroup
            label="Учні"
            users={students}
            limit={studentsVisible}
            renderRow={renderRow}
          >
            {remaining > 0 && (
              <button
                onClick={() => setStudentsVisible((v) => v + PAGE)}
                className="w-full py-2.5 rounded-xl border border-border/50 bg-card text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-all"
              >
                Показати ще {Math.min(PAGE, remaining)} з {remaining}
              </button>
            )}
          </UserGroup>

          {filtered.length === 0 && <EmptyState emoji="👤" title="Нічого не знайдено" />}
        </div>
      )}
    </div>
  );
}

function UserGroup({
  label,
  className,
  users,
  limit,
  renderRow,
  children,
}: {
  label: string;
  className?: string;
  users: UserProfile[];
  limit?: number;
  renderRow: (u: UserProfile) => React.ReactNode;
  children?: React.ReactNode;
}) {
  if (users.length === 0) return null;
  return (
    <div className="space-y-2">
      <SectionLabel size="2xs" className={className}>
        {label} ({users.length})
      </SectionLabel>
      {(limit != null ? users.slice(0, limit) : users).map(renderRow)}
      {children}
    </div>
  );
}
