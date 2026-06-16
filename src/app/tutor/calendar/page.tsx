"use client";

import { useEffect, useState, useMemo } from "react";
import { Timestamp } from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useHeader } from "@/context/HeaderContext";
import {
  subscribeTutorLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  Lesson,
} from "@/lib/lessons";
import { getTutorStudents } from "@/lib/tutor";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { SelectNative } from "@/components/ui/select-native";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, X } from "lucide-react";

interface Draft {
  id?: string;
  studentId: string;
  title: string;
  start: string; // datetime-local
  durationMin: number;
  note: string;
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TutorCalendarPage() {
  const { user } = useAuth();
  const { setHeader } = useHeader();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    setHeader("Календар занять", "Розклад уроків з учнями");
    return () => setHeader("", "");
  }, [setHeader]);

  useEffect(() => {
    if (!user) return;
    return subscribeTutorLessons(user.uid, setLessons);
  }, [user]);

  const { data: students = [] } = useQuery({
    queryKey: ["tutor-students", user?.uid],
    queryFn: () => getTutorStudents(user!.uid),
    enabled: !!user,
  });

  function openNew(date: Date) {
    const start = new Date(date);
    start.setHours(16, 0, 0, 0); // default 16:00
    setDraft({
      studentId: students[0]?.studentId ?? "",
      title: "Урок",
      start: toLocalInput(start),
      durationMin: 60,
      note: "",
    });
  }

  function openEdit(l: Lesson) {
    setDraft({
      id: l.id,
      studentId: l.studentId,
      title: l.title,
      start: toLocalInput(l.start.toDate()),
      durationMin: l.durationMin,
      note: l.note ?? "",
    });
  }

  // Anti-overlap: find an existing lesson of this tutor whose time range
  // intersects the draft (ignoring the lesson being edited).
  const conflict = useMemo(() => {
    if (!draft || !draft.start) return null;
    const start = new Date(draft.start).getTime();
    if (Number.isNaN(start)) return null;
    const end = start + draft.durationMin * 60000;
    return (
      lessons.find((l) => {
        if (l.id === draft.id) return false;
        const s = l.start.toMillis();
        const e = s + l.durationMin * 60000;
        return start < e && s < end;
      }) ?? null
    );
  }, [draft, lessons]);

  async function save() {
    if (!draft || !user || !draft.studentId || conflict) return;
    const student = students.find((s) => s.studentId === draft.studentId);
    const payload = {
      tutorId: user.uid,
      tutorName: user.displayName ?? undefined,
      studentId: draft.studentId,
      studentName: student?.studentName,
      title: draft.title.trim() || "Урок",
      start: Timestamp.fromDate(new Date(draft.start)),
      durationMin: draft.durationMin,
      note: draft.note.trim() || undefined,
    };
    if (draft.id) await updateLesson(draft.id, payload);
    else await createLesson(payload);
    setDraft(null);
  }

  async function remove() {
    if (draft?.id) await deleteLesson(draft.id);
    setDraft(null);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex justify-end">
        <Button
          size="lg"
          className="gap-1.5"
          onClick={() => openNew(new Date())}
          disabled={students.length === 0}
        >
          <Plus size={16} /> Додати урок
        </Button>
      </div>

      {students.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Додайте учнів, щоб планувати заняття.
        </p>
      )}

      <MonthCalendar
        lessons={lessons}
        onSelectDay={openNew}
        onSelectLesson={openEdit}
      />

      {/* Lesson editor */}
      {draft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setDraft(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl border border-border/60 bg-card shadow-xl p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold">
                {draft.id ? "Редагувати урок" : "Новий урок"}
              </p>
              <button
                onClick={() => setDraft(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Учень
                </label>
                <SelectNative
                  value={draft.studentId}
                  onChange={(e) =>
                    setDraft({ ...draft, studentId: e.target.value })
                  }
                >
                  <option value="">Оберіть...</option>
                  {students.map((s) => (
                    <option key={s.studentId} value={s.studentId}>
                      {s.studentName}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Назва
                </label>
                <input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Початок
                  </label>
                  <input
                    type="datetime-local"
                    value={draft.start}
                    onChange={(e) =>
                      setDraft({ ...draft, start: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Тривалість (хв)
                  </label>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={draft.durationMin}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        durationMin: Math.max(15, Number(e.target.value) || 60),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Нотатка (необовʼязково)
                </label>
                <input
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            {conflict && (
              <p className="text-xs text-red-500 px-1">
                Цей час уже зайнятий уроком з {conflict.studentName ?? "іншим учнем"}
                {" "}({conflict.start.toDate().toLocaleTimeString("uk", { hour: "2-digit", minute: "2-digit" })}).
              </p>
            )}

            <div className="flex gap-2 justify-between pt-1">
              {draft.id ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={remove}
                  className="text-red-500 gap-1.5"
                >
                  <Trash2 size={14} /> Видалити
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraft(null)}
                >
                  Скасувати
                </Button>
                <Button size="sm" onClick={save} disabled={!draft.studentId || !!conflict}>
                  Зберегти
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
