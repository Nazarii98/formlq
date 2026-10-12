"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { queryKeys, STALE } from "@/lib/queryKeys";
import { getUserById } from "@/lib/users";
import { getUserResults } from "@/lib/tests";
import { formatDuration, timeAgo } from "@/lib/format";
import { ROLE_META, canTutor } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { usePageHeader } from "@/context/HeaderContext";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { SpinnerPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ResultListItem } from "@/components/exam/ResultListItem";
import { TutorSection } from "@/components/admin/users/TutorSection";
import { StudentSection } from "@/components/admin/users/StudentSection";

export default function AdminUserHistoryPage() {
  const { uid } = useParams<{ uid: string }>();
  const router = useRouter();

  const { onlineUids, presence } = useOnlineUsers();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: queryKeys.user(uid),
    queryFn: () => getUserById(uid),
    staleTime: STALE.long,
  });

  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: queryKeys.results(uid),
    queryFn: () => getUserResults(uid),
    staleTime: STALE.short,
  });

  const loading = profileLoading || resultsLoading;

  usePageHeader(
    profile?.displayName ?? "",
    profile ? ROLE_META[profile.role ?? "student"]?.label ?? "" : "",
  );

  if (loading) return <SpinnerPage />;

  const totalTime = results.reduce((s, r) => s + (r.timeSpent ?? 0), 0);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button
        onClick={() => router.push("/admin/users")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Користувачі
      </button>

      {profile &&
        (() => {
          const online = onlineUids.has(uid);
          const entry = presence[uid];
          const lastSeen = entry?.lastChanged
            ? new Date(entry.lastChanged)
            : null;

          return (
            <div className="rounded-2xl border border-border/50 bg-card px-5 py-4 flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                  {profile.displayName?.[0]?.toUpperCase() ?? "?"}
                </div>
                {online && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-card" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{profile.displayName}</p>
                <p className="text-xs text-muted-foreground">{profile.email}</p>
                <p
                  className={cn(
                    "text-[11px] mt-0.5 font-medium",
                    online
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground",
                  )}
                >
                  {online
                    ? "● Онлайн"
                    : lastSeen
                      ? `Був(ла) ${timeAgo(lastSeen)}`
                      : "Офлайн"}
                </p>
              </div>
            </div>
          );
        })()}

      {profile && canTutor(profile.role) && (
        <TutorSection tutorId={uid} />
      )}

      {/* Student side — shown whenever the user has tutors/homework/lessons,
          regardless of role (a tutor/editor can also be someone's student). */}
      {profile && <StudentSection studentId={uid} />}

      {results.length === 0 ? (
        <EmptyState emoji="📋" title="Ще немає пройдених тестів" />
      ) : (
        <div className="flex flex-col gap-2">
          {results.map((r) => (
            <ResultListItem
              key={r.id}
              result={r}
              href={`/admin/users/${uid}/results/${r.id}`}
            />
          ))}
        </div>
      )}

      {results.length > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          Загальний час: {formatDuration(totalTime)}
        </p>
      )}
    </div>
  );
}
