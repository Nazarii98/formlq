"use client";

import { useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { usePageHeader } from "@/context/HeaderContext";
import { queryKeys } from "@/lib/queryKeys";
import {
  subscribeTutorLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  Lesson,
} from "@/lib/lessons";
import { getTutorStudents } from "@/lib/tutor";
import { MonthCalendar, formatLessonTime } from "@/components/calendar/MonthCalendar";
import { SelectNative } from "@/components/ui/select-native";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { TextInput } from "@/components/ui/text-field";
import { Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Draft {
  id?: string;
  studentId: string;
  title: string;
  start: string; // datetime-local
  durationMin: number;
  note: string;
  meetingUrl: string;
}

const inputCls = "h-9 px-3 bg-background";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TutorCalendarPage() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  usePageHeader("Календар занять", "Розклад уроків з учнями");

  useEffect(() => {
    if (!user) return;
    return subscribeTutorLessons(user.uid, setLessons);
  }, [user]);

  const { data: students = [] } = useQuery({
    queryKey: queryKeys.tutorStudents(user?.uid),
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
      meetingUrl: "",
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
      meetingUrl: l.meetingUrl ?? "",
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
      meetingUrl: draft.meetingUrl.trim() || undefined,
    };
    setBusy(true);
    try {
      if (draft.id) await updateLesson(draft.id, payload);
      else await createLesson(payload);
      setDraft(null);
    } catch {
      // Keep the form open with what was typed.
      toast.error("Не вдалося зберегти урок. Спробуйте ще раз");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setConfirmDelete(false);
    if (!draft?.id) return;
    setBusy(true);
    try {
      await deleteLesson(draft.id);
      setDraft(null);
    } catch {
      toast.error("Не вдалося видалити урок. Спробуйте ще раз");
    } finally {
      setBusy(false);
    }
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
      <Dialog
        open={!!draft}
        onClose={() => setDraft(null)}
        size="sm"
        // A stray click/Escape must not discard a half-filled lesson.
        closeOnEscape={false}
        closeOnBackdrop={false}
        className="p-5 space-y-3"
      >
        {draft && (
          <>
            <div className="flex items-center justify-between">
              <p className="font-semibold">{draft.id ? "Редагувати урок" : "Новий урок"}</p>
              <IconButton label="Закрити" onClick={() => setDraft(null)}>
                <X size={15} />
              </IconButton>
            </div>

            <div className="space-y-2.5">
              <Field label="Учень">
                <SelectNative
                  value={draft.studentId}
                  onChange={(e) => setDraft({ ...draft, studentId: e.target.value })}
                >
                  <option value="">Оберіть...</option>
                  {students.map((s) => (
                    <option key={s.studentId} value={s.studentId}>
                      {s.studentName}
                    </option>
                  ))}
                </SelectNative>
              </Field>
              <Field label="Назва">
                <TextInput
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Початок">
                  <TextInput
                    type="datetime-local"
                    value={draft.start}
                    onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Тривалість (хв)">
                  <TextInput
                    type="number"
                    min={15}
                    step={15}
                    value={draft.durationMin}
                    onChange={(e) =>
                      setDraft({ ...draft, durationMin: Math.max(15, Number(e.target.value) || 60) })
                    }
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Нотатка (необовʼязково)">
                <TextInput
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Посилання на онлайн-кімнату (необовʼязково)">
                <TextInput
                  type="url"
                  value={draft.meetingUrl}
                  onChange={(e) => setDraft({ ...draft, meetingUrl: e.target.value })}
                  placeholder="https://meet.google.com/..."
                  className={inputCls}
                />
              </Field>
            </div>

            {conflict && (
              <p className="text-xs text-red-500 px-1">
                Цей час уже зайнятий уроком з {conflict.studentName ?? "іншим учнем"}
                {" "}({formatLessonTime(conflict.start)}).
              </p>
            )}

            <div className="flex gap-2 justify-between pt-1">
              {draft.id ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy}
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
                <Button size="sm" onClick={save} disabled={busy || !draft.studentId || !!conflict}>
                  {busy ? "Збереження…" : "Зберегти"}
                </Button>
              </div>
            </div>
          </>
        )}
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title="Видалити урок?"
        description="Урок зникне з календаря у вас і в учня."
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
