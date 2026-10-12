"use client";

import { memo } from "react";
import { ChevronRight, Crown, GraduationCap } from "lucide-react";
import { isProtectedEmail } from "@/lib/users";
import { timeAgo } from "@/lib/format";
import { ROLE_META, isEditor as isEditorRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { Highlight } from "@/components/ui/highlight";
import { Select, SelectItem } from "@/components/ui/select";
import type { UserProfile, UserRole } from "@/types";

interface UserRowProps {
  user: UserProfile;
  search: string;
  isSelf: boolean;
  isOnline: boolean;
  updating: boolean;
  onSetRole: (uid: string, role: UserRole) => void;
  onOpen: (uid: string) => void;
}

const ROLE_OPTIONS: UserRole[] = ["student", "tutor", "editor"];

/** One row in the admin users list. Memoized: presence updates don't remount it. */
export const UserRow = memo(function UserRow({
  user: u,
  search,
  isSelf,
  isOnline,
  updating,
  onSetRole,
  onOpen,
}: UserRowProps) {
  const locked = isProtectedEmail(u.email);
  const isEditor = isEditorRole(u.role);
  const isTutor = u.role === "tutor";

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
      onClick={() => onOpen(u.uid)}
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
            {u.displayName ? <Highlight text={u.displayName} query={search} /> : "—"}
          </p>
          {isEditor && <Crown size={11} className="text-primary shrink-0" />}
          {isTutor && <GraduationCap size={12} className="text-amber-500 shrink-0" />}
          {isSelf && (
            <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium shrink-0">
              Ви
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          <Highlight text={u.email ?? ""} query={search} />
        </p>
      </div>

      <span className="hidden md:block shrink-0 whitespace-nowrap text-right text-xs text-muted-foreground/50 tabular-nums">
        {u.createdAt ? timeAgo(u.createdAt.toDate()) : "—"}
      </span>

      <div
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 w-36"
        title={locked ? "Захищений акаунт — роль не можна змінити" : undefined}
      >
        <Select
          value={u.role ?? "student"}
          disabled={updating || isSelf || locked}
          onValueChange={(v) => onSetRole(u.uid, v as UserRole)}
          className="w-full"
        >
          {ROLE_OPTIONS.map((r) => (
            <SelectItem key={r} value={r}>
              {ROLE_META[r].label}
            </SelectItem>
          ))}
        </Select>
      </div>
      <ChevronRight
        size={14}
        className="hidden sm:block text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0"
      />
    </div>
  );
});
