"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useHeader } from "@/context/HeaderContext";
import {
  subscribeTutorStudents,
  addStudentByEmail,
  removeStudent,
  TutorStudent,
} from "@/lib/tutor";
import { SpinnerPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { UserPlus, Trash2, ClipboardPlus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TutorStudentsPage() {
  const { user } = useAuth();
  const { setHeader } = useHeader();
  const router = useRouter();

  const [students, setStudents] = useState<TutorStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<TutorStudent | null>(null);

  useEffect(() => {
    setHeader("Мої учні", "Керування учнями та домашніми завданнями");
    return () => setHeader("", "");
  }, [setHeader]);

  useEffect(() => {
    if (!user) return;
    return subscribeTutorStudents(user.uid, (list) => {
      setStudents(list);
      setLoading(false);
    });
  }, [user]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !email.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await addStudentByEmail(user.uid, email);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося додати учня");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove() {
    if (!toRemove) return;
    await removeStudent(toRemove.id);
    setToRemove(null);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Add student */}
      <form onSubmit={handleAdd} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="Email учня..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-border/50 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="lg"
            disabled={adding || !email.trim()}
            className="gap-1.5"
          >
            <UserPlus size={16} />
            {adding ? "..." : "Додати"}
          </Button>
        </div>
        {error && <p className="text-xs text-red-500 px-1">{error}</p>}
      </form>

      {loading ? (
        <SpinnerPage />
      ) : students.length === 0 ? (
        <EmptyState
          emoji="🧑‍🎓"
          title="Поки немає учнів"
          description="Додайте учня за його email, щоб призначати домашні завдання."
        />
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Учні ({students.length})
          </p>
          {students.map((s) => (
            <div
              key={s.id}
              onClick={() => router.push(`/tutor/students/${s.studentId}`)}
              className={cn(
                "rounded-2xl border border-border/50 bg-card px-4 py-3 flex items-center gap-3 group transition-all cursor-pointer",
                "hover:bg-muted/30 hover:border-border/80",
              )}
            >
              <div className="w-9 h-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold shrink-0">
                {s.studentName?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {s.studentName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {s.studentEmail}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/tutor/homework/new?student=${s.studentId}`);
                }}
              >
                <ClipboardPlus size={14} />
                <span className="hidden sm:inline">Призначити</span>
              </Button>
              <button
                onClick={(e) => { e.stopPropagation(); setToRemove(s); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                title="Прибрати учня"
              >
                <Trash2 size={15} />
              </button>
              <ChevronRight
                size={14}
                className="text-muted-foreground/30 group-hover:text-muted-foreground shrink-0"
              />
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toRemove}
        title="Прибрати учня?"
        description={`${toRemove?.studentName ?? ""} більше не буде у вашому списку. Призначені домашні завдання залишаться.`}
        confirmLabel="Прибрати"
        onConfirm={handleRemove}
        onCancel={() => setToRemove(null)}
      />
    </div>
  );
}
