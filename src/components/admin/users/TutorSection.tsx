"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, Trash2, UserPlus } from "lucide-react";
import { subscribeTutorStudents, addStudentByEmail, removeStudent, TutorStudent } from "@/lib/tutor";
import { subscribeTutorLessons, Lesson } from "@/lib/lessons";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { SectionLabel } from "@/components/ui/section-label";
import { TextInput } from "@/components/ui/text-field";
import { LessonsCalendarBlock } from "./LessonsCalendarBlock";

/** Editor view of a tutor's students and calendar. */
export function TutorSection({ tutorId }: { tutorId: string }) {
  const [students, setStudents] = useState<TutorStudent[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      <form onSubmit={handleAdd} className="space-y-1.5">
        <div className="flex gap-2">
          <TextInput
            type="email"
            size="sm"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="Email учня..."
            className="flex-1 h-9"
          />
          <Button type="submit" size="sm" disabled={adding || !email.trim()} className="gap-1.5">
            <UserPlus size={14} /> {adding ? "..." : "Додати"}
          </Button>
        </div>
        {error && <p className="text-xs text-red-500 px-1">{error}</p>}
      </form>

      <div className="space-y-1.5">
        <SectionLabel size="2xs">Учні ({students.length})</SectionLabel>
        {students.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">Немає учнів</p>
        ) : (
          students.map((s) => (
            <div
              key={s.id}
              className="relative rounded-xl border border-border/50 bg-card px-3 py-2 flex items-center gap-2.5 hover:bg-muted/40 hover:border-border/80 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold shrink-0">
                {s.studentName?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                {/* Stretched link: the whole row opens the student's profile. */}
                <Link
                  href={`/admin/users/${s.studentId}`}
                  className="block text-sm font-medium truncate after:absolute after:inset-0 after:content-['']"
                >
                  {s.studentName}
                </Link>
                <p className="text-xs text-muted-foreground truncate">{s.studentEmail}</p>
              </div>
              <IconButton
                label="Прибрати учня"
                tone="danger"
                className="relative z-10"
                onClick={() => removeStudent(s.id)}
              >
                <Trash2 size={14} />
              </IconButton>
            </div>
          ))
        )}
      </div>

      <LessonsCalendarBlock lessons={lessons} />
    </div>
  );
}
