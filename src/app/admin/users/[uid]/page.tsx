"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUserById } from "@/lib/users";
import { getUserResults } from "@/lib/tests";
import {
  subscribeTutorStudents,
  addStudentByEmail,
  removeStudent,
  getStudentTutorLinks,
  getStudentHomework,
  TutorStudent,
  Homework,
  HomeworkStatus,
} from "@/lib/tutor";
import { subscribeTutorLessons, subscribeStudentLessons, Lesson } from "@/lib/lessons";
import { formatDuration, formatDate, timeAgo } from "@/lib/format";
import { SpinnerPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ResultListItem } from "@/components/exam/ResultListItem";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { LessonViewModal } from "@/components/calendar/LessonViewModal";
import { Button } from "@/components/ui/button";
import { useHeader } from "@/context/HeaderContext";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  UserPlus,
  Trash2,
  GraduationCap,
  CalendarClock,
  CheckCircle2,
  Hourglass,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const HW_STATUS: Record<HomeworkStatus, { label: string; cls: string; Icon: React.ElementType }> = {
  assigned: { label: "Призначено", cls: "text-blue-600 dark:text-blue-400 bg-blue-500/10", Icon: Hourglass },
  in_progress: { label: "Виконується", cls: "text-amber-600 dark:text-amber-400 bg-amber-500/10", Icon: Hourglass },
  completed: { label: "Завершено", cls: "text-green-600 dark:text-green-400 bg-green-500/10", Icon: CheckCircle2 },
};

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
    if (profile)
      setHeader(
        profile.displayName,
        profile.role === "editor"
          ? "Редактор"
          : profile.role === "tutor"
            ? "Вчитель"
            : "Учень",
      );
    return () => setHeader("", "");
  }, [profile, setHeader]);

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

      {profile && (profile.role === "tutor" || profile.role === "editor") && (
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

// Tutor overview — editor view of a tutor's students and calendar.
function TutorSection({ tutorId }: { tutorId: string }) {
  const [students, setStudents] = useState<TutorStudent[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => subscribeTutorStudents(tutorId, setStudents), [tutorId]);
  useEffect(() => subscribeTutorLessons(tutorId, setLessons), [tutorId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await addStudentByEmail(tutorId, email);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося додати учня");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <GraduationCap size={16} className="text-amber-500" /> Кабінет вчителя
      </p>

      {/* Add student */}
      <form onSubmit={handleAdd} className="space-y-1.5">
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            placeholder="Email учня..."
            className="flex-1 px-3 py-2 rounded-xl border border-border/50 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <Button type="submit" size="sm" disabled={adding || !email.trim()} className="gap-1.5">
            <UserPlus size={14} /> {adding ? "..." : "Додати"}
          </Button>
        </div>
        {error && <p className="text-xs text-red-500 px-1">{error}</p>}
      </form>

      {/* Students */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Учні ({students.length})
        </p>
        {students.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">Немає учнів</p>
        ) : (
          students.map((s) => (
            <div
              key={s.id}
              onClick={() => router.push(`/admin/users/${s.studentId}`)}
              className="rounded-xl border border-border/50 bg-card px-3 py-2 flex items-center gap-2.5 cursor-pointer hover:bg-muted/40 hover:border-border/80 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold shrink-0">
                {s.studentName?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.studentName}</p>
                <p className="text-xs text-muted-foreground truncate">{s.studentEmail}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeStudent(s.id); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 shrink-0"
                title="Прибрати учня"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Calendar */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Календар занять
        </p>
        <MonthCalendar lessons={lessons} onSelectLesson={setSelectedLesson} />
      </div>

      <LessonViewModal lesson={selectedLesson} onClose={() => setSelectedLesson(null)} />
    </div>
  );
}

// Student overview — editor view of a student's tutors, homework and calendar.
function StudentSection({ studentId }: { studentId: string }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const router = useRouter();

  useEffect(() => subscribeStudentLessons(studentId, setLessons), [studentId]);

  const { data: tutors = [] } = useQuery({
    queryKey: ["student-tutors", studentId],
    queryFn: async () => {
      const links = await getStudentTutorLinks(studentId);
      const profiles = await Promise.all(links.map((l) => getUserById(l.tutorId)));
      return profiles.filter((p): p is NonNullable<typeof p> => !!p);
    },
  });

  const { data: homework = [] } = useQuery({
    queryKey: ["student-homework-admin", studentId],
    queryFn: () => getStudentHomework(studentId),
  });

  // Nothing on the student side → don't render the block at all.
  if (tutors.length === 0 && homework.length === 0 && lessons.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/50 bg-card p-4">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <Users size={16} className="text-primary" /> Як учень
      </p>

      {/* Tutors */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-1.5">
          <Users size={12} /> Вчителі ({tutors.length})
        </p>
        {tutors.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">Немає призначених вчителів</p>
        ) : (
          tutors.map((t) => (
            <div
              key={t.uid}
              onClick={() => router.push(`/admin/users/${t.uid}`)}
              className="rounded-xl border border-border/50 bg-background px-3 py-2 flex items-center gap-2.5 cursor-pointer hover:bg-muted/40 hover:border-border/80 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-400/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
                {t.displayName?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{t.email}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Homework */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Домашні завдання ({homework.length})
        </p>
        {homework.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">Немає завдань</p>
        ) : (
          homework.map((hw: Homework) => {
            const meta = HW_STATUS[hw.status];
            return (
              <button
                key={hw.id}
                onClick={() => router.push(`/tutor/homework/${hw.id}`)}
                className="w-full text-left rounded-xl border border-border/50 bg-background px-3 py-2 flex items-center gap-2.5 hover:bg-muted/40 hover:border-border/80 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{hw.title}</p>
                  {hw.dueAt && (
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <CalendarClock size={11} /> до {formatDate(hw.dueAt, { day: "numeric", month: "short" })}
                    </p>
                  )}
                </div>
                <span className={cn("shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full", meta.cls)}>
                  <meta.Icon size={12} />
                  <span className="hidden sm:inline">{meta.label}</span>
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Calendar */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Календар занять
        </p>
        <MonthCalendar lessons={lessons} onSelectLesson={setSelectedLesson} />
      </div>

      <LessonViewModal lesson={selectedLesson} onClose={() => setSelectedLesson(null)} />
    </div>
  );
}
