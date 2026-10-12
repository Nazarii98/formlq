"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getAllQuestions,
  updateQuestion,
  createQuestion,
  deleteQuestion,
  saveDailyOrder,
} from "@/lib/questions";
import { queryKeys } from "@/lib/queryKeys";
import type { BankQuestion } from "@/lib/tests";

function withoutId(q: BankQuestion): Omit<BankQuestion, "id"> {
  const { id, ...data } = q;
  return data;
}

/**
 * Local, optimistic copy of the whole question bank for the admin review page.
 * All returned callbacks are referentially stable.
 */
export function useQuestionBank() {
  const queryClient = useQueryClient();
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<string>>(() => new Set());

  // Edits here change the bank other pages cache — refresh it when leaving.
  useEffect(
    () => () => void queryClient.invalidateQueries({ queryKey: queryKeys.bankQuestions }),
    [queryClient],
  );

  useEffect(() => {
    getAllQuestions().then((qs) => {
      setQuestions(qs);
      setLoading(false);
    });
  }, []);

  const markSaving = useCallback((id: string, on: boolean) => {
    setSaving((prev) => {
      const s = new Set(prev);
      if (on) s.add(id);
      else s.delete(id);
      return s;
    });
  }, []);

  const patch = useCallback(
    async (id: string, data: Partial<BankQuestion>) => {
      markSaving(id, true);
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? ({ ...q, ...data } as BankQuestion) : q)),
      );
      try {
        await updateQuestion(id, data);
      } finally {
        markSaving(id, false);
      }
    },
    [markSaving],
  );

  const remove = useCallback(
    async (id: string) => {
      markSaving(id, true);
      try {
        await deleteQuestion(id);
        setQuestions((prev) => prev.filter((q) => q.id !== id));
      } finally {
        markSaving(id, false);
      }
    },
    [markSaving],
  );

  /** Creates `draft` or, when `editId` is given, overwrites that question. */
  const save = useCallback(async (draft: BankQuestion, editId: string | null) => {
    const data = withoutId(draft);
    if (editId) {
      await updateQuestion(editId, data);
      setQuestions((prev) =>
        prev.map((q) => (q.id === editId ? { ...draft, id: editId } : q)),
      );
    } else {
      const newId = await createQuestion(data);
      setQuestions((prev) => [{ ...draft, id: newId }, ...prev]);
    }
  }, []);

  /** Persists a new daily order for the given (already reordered) list. */
  const reorderDaily = useCallback((next: BankQuestion[]) => {
    const newOrder = new Map(next.map((q, idx) => [q.id, idx]));
    setQuestions((prev) =>
      prev.map((q) =>
        newOrder.has(q.id) ? { ...q, dailyOrder: newOrder.get(q.id) } : q,
      ),
    );
    saveDailyOrder(next).catch(() => getAllQuestions().then(setQuestions));
  }, []);

  return { questions, loading, saving, patch, remove, save, reorderDaily };
}
