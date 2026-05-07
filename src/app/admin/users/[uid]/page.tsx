"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUserById } from "@/lib/users";
import { getUserResults, TestResult } from "@/lib/tests";
import { formatDuration, scoreColor } from "@/lib/format";
import { SpinnerPage } from "@/components/ui/spinner";
import { useHeader } from "@/context/HeaderContext";
import { UserProfile } from "@/types";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChevronRight, Flame, Clock, Target } from "lucide-react";
import Link from "next/link";

export default function AdminUserHistoryPage() {
  const { uid } = useParams<{ uid: string }>();
  const router = useRouter();
  const { setHeader } = useHeader();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getUserById(uid), getUserResults(uid)]).then(([u, res]) => {
      setProfile(u);
      setResults(res);
      setLoading(false);
    });
  }, [uid]);

  useEffect(() => {
    if (profile) setHeader(profile.displayName, "Історія тестів");
    return () => setHeader("", "");
  }, [profile, setHeader]);

  if (loading) return <SpinnerPage />;

  const best = results.length ? Math.max(...results.map((r) => r.nmtScore)) : null;
  const avg = results.length ? Math.round(results.reduce((s, r) => s + r.nmtScore, 0) / results.length) : null;
  const totalTime = results.reduce((s, r) => s + (r.timeSpent ?? 0), 0);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Back */}
      <button
        onClick={() => router.push("/admin/users")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Користувачі
      </button>

      {/* User card */}
      {profile && (
        <div className="rounded-2xl border border-border/50 bg-card px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">
            {profile.displayName?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{profile.displayName}</p>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-orange-500">
            <Flame size={14} /> {profile.streak}
          </div>
        </div>
      )}

      {/* Stats row */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Найкращий", value: best, icon: Target, color: "text-green-600 dark:text-green-400" },
            { label: "Середній",  value: avg,  icon: Target, color: "text-blue-600 dark:text-blue-400"  },
            { label: "Спроб",     value: results.length, icon: null, color: "text-foreground" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-border/50 bg-card px-4 py-3 text-center">
              <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Results list */}
      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 py-16 text-center text-sm text-muted-foreground">
          Ще немає пройдених тестів
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {results.map((r) => {
            const { text, bg } = scoreColor(r.nmtScore);
            const date = r.completedAt?.toDate().toLocaleDateString("uk", { day: "numeric", month: "short", year: "numeric" });
            return (
              <Link key={r.id} href={`/admin/users/${uid}/results/${r.id}`} className="block">
                <div className="rounded-2xl border border-border/50 bg-card px-4 py-3 flex items-center gap-4 hover:bg-muted/30 hover:border-border/80 transition-all group cursor-pointer">
                  {/* Score badge */}
                  <div className={cn("w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0", bg)}>
                    <span className={cn("text-lg font-bold leading-none tabular-nums", text)}>{r.nmtScore}</span>
                    <span className={cn("text-[9px] font-medium leading-none mt-0.5", text)}>НМТ</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{r.testTitle || "Без назви"}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{r.rawScore}/{r.maxRaw} балів</span>
                      {r.timeSpent && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5"><Clock size={10} />{formatDuration(r.timeSpent)}</span>
                        </>
                      )}
                      {date && <><span>·</span><span>{date}</span></>}
                    </div>
                  </div>

                  <ChevronRight size={15} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </div>
              </Link>
            );
          })}
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
