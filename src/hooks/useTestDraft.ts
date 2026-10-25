import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useExamGuard } from "@/context/ExamGuardContext";
import { queryKeys } from "@/lib/queryKeys";
import {
  getTest,
  updateTest,
  makeEmptyMCQ,
  makeEmptyOpen,
  makeEmptyMatching,
  NMT_2025_TABLE,
  type TestQuestion,
  type ScoreRow,
  type ScaleType,
} from "@/lib/tests";

type QuestionType = TestQuestion["type"];

/**
 * Editable draft of a test: loads it, tracks dirtiness against the last
 * saved snapshot and persists it. Redirects to the list if the test is gone.
 */
export function useTestDraft(id: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [published, setPublished] = useState(false);
  const [publicAccess, setPublicAccess] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(150);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [scoreTable, setScoreTable] = useState<ScoreRow[]>(NMT_2025_TABLE);
  const [scaleType, setScaleType] = useState<ScaleType>("nmt");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  useEffect(() => {
    let cancelled = false;
    getTest(id).then((test) => {
      if (cancelled) return;
      if (!test) {
        router.replace("/admin/tests");
        return;
      }
      const data = {
        title: test.title,
        subtitle: test.subtitle,
        published: test.published,
        publicAccess: test.publicAccess ?? false,
        durationMinutes: test.durationMinutes ?? 150,
        questions: test.questions ?? [],
        scoreTable: test.scoreTable?.length ? test.scoreTable : NMT_2025_TABLE,
        scaleType: test.scaleType ?? "nmt",
      };
      setTitle(data.title);
      setSubtitle(data.subtitle);
      setPublished(data.published);
      setPublicAccess(data.publicAccess);
      setDurationMinutes(data.durationMinutes);
      setQuestions(data.questions);
      setScoreTable(data.scoreTable);
      setScaleType(data.scaleType);
      setSavedSnapshot(JSON.stringify(data));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const draft = useMemo(
    () => ({
      title,
      subtitle,
      published,
      publicAccess,
      durationMinutes,
      questions,
      scoreTable,
      scaleType,
    }),
    [
      title,
      subtitle,
      published,
      publicAccess,
      durationMinutes,
      questions,
      scoreTable,
      scaleType,
    ],
  );
  const snapshot = useMemo(() => JSON.stringify(draft), [draft]);
  const isDirty = snapshot !== savedSnapshot;

  async function save() {
    if (saving || !isDirty) return;
    setSaving(true);
    try {
      await updateTest(id, draft);
      setSavedSnapshot(snapshot);
      queryClient.invalidateQueries({ queryKey: queryKeys.tests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tests.published });
      setSaved(true);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2000);
    } catch {
      // Draft stays dirty, so nothing is lost; the user can retry.
      toast.error(
        "Не вдалося зберегти тест. Перевірте з'єднання й спробуйте ще раз",
      );
    } finally {
      setSaving(false);
    }
  }

  // Unsaved edits: warn on tab close/reload, and on in-app navigation (sidebar, logout).
  const { setGuarded } = useExamGuard();
  useEffect(() => {
    if (loading || !isDirty) return;
    setGuarded(true, {
      title: "Вийти без збереження?",
      message: "Незбережені зміни в тесті буде втрачено.",
      confirmLabel: "Вийти без збереження",
    });
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onUnload);
    return () => {
      setGuarded(false);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [loading, isDirty, setGuarded]);

  // ⌘S / Ctrl+S saves instead of opening the browser's "Save page" dialog.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** Appends an empty question of `type`; returns its id. */
  function addQuestion(type: QuestionType): string {
    const order = questions.length;
    const next =
      type === "mcq"
        ? makeEmptyMCQ(order)
        : type === "matching"
          ? makeEmptyMatching(order)
          : makeEmptyOpen(order);
    setQuestions((prev) => [...prev, next]);
    return next.id;
  }

  function appendQuestions(qs: TestQuestion[]) {
    setQuestions((prev) => [...prev, ...qs]);
  }

  /** Puts a question back at `index` (undo of deleteQuestion). */
  function insertQuestion(q: TestQuestion, index: number) {
    setQuestions((prev) => {
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, q);
      return next.map((x, i) => ({ ...x, order: i }));
    });
  }

  function deleteQuestion(qId: string) {
    setQuestions((prev) =>
      prev.filter((q) => q.id !== qId).map((q, i) => ({ ...q, order: i })),
    );
  }

  function moveQuestion(qId: string, dir: -1 | 1) {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === qId);
      if (idx + dir < 0 || idx + dir >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
      return next.map((q, i) => ({ ...q, order: i }));
    });
  }

  function updateQuestion(qId: string, patch: Partial<TestQuestion>) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId ? ({ ...q, ...patch } as TestQuestion) : q,
      ),
    );
  }

  return {
    loading,
    title,
    setTitle,
    subtitle,
    setSubtitle,
    published,
    setPublished,
    publicAccess,
    setPublicAccess,
    durationMinutes,
    setDurationMinutes,
    questions,
    scoreTable,
    setScoreTable,
    scaleType,
    setScaleType,
    isDirty,
    saving,
    /** True for 2s after a successful save. */
    saved,
    save,
    addQuestion,
    appendQuestions,
    insertQuestion,
    deleteQuestion,
    moveQuestion,
    updateQuestion,
  };
}
