"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUserById } from "@/lib/users";
import { getUserResults } from "@/lib/tests";
import { formatDuration, scoreColor, timeAgo } from "@/lib/format";
import { SpinnerPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ResultListItem } from "@/components/exam/ResultListItem";
import { useHeader } from "@/context/HeaderContext";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { cn } from "@/lib/utils";
import { ArrowLeft, Flame } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function AdminUserHistoryPage() {
  const { uid } = useParams<{ uid: string }>();
  const router = useRouter();
  const { setHeader } = useHeader();

  const { onlineUids, presence } = useOnlineUsers();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["user", uid],
    queryFn: () => getUserById(uid),
    staleTime: 5 * 60 * 1000,
  });

  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["results", uid],
    queryFn: () => getUserResults(uid),
    staleTime: 60 * 1000,
  });

  const loading = profileLoading || resultsLoading;

  useEffect(() => {
    if (profile) setHeader(profile.displayName, "Історія тестів");
    return () => setHeader("", "");
  }, [profile, setHeader]);

  if (loading) return <SpinnerPage />;

  const best = results.length
    ? Math.max(...results.map((r) => r.nmtScore))
    : null;
  const avg = results.length
    ? Math.round(results.reduce((s, r) => s + r.nmtScore, 0) / results.length)
    : null;
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
              <div className="flex items-center gap-1.5 text-sm font-semibold text-orange-500">
                <Flame size={14} /> {profile.streak}
              </div>
            </div>
          );
        })()}

      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: "Найкращий",
              value: best,
              color: "text-green-600 dark:text-green-400",
            },
            {
              label: "Середній",
              value: avg,
              color: "text-blue-600 dark:text-blue-400",
            },
            { label: "Спроб", value: results.length, color: "text-foreground" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-2xl border border-border/50 bg-card px-4 py-3 text-center"
            >
              <p className={cn("text-2xl font-bold tabular-nums", color)}>
                {value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

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
