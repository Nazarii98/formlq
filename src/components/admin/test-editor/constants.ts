import type { TestQuestion } from "@/lib/tests";

export type QuestionType = TestQuestion["type"];

/** Compact type labels (lists, badges, filters). */
export const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "MCQ",
  open: "Відповідь",
  matching: "Відповідність",
};

/** Descriptive type labels (editor header). */
export const TYPE_LABELS_LONG: Record<QuestionType, string> = {
  mcq: "Вибір відповіді",
  open: "Вписати відповідь",
  matching: "Відповідність",
};

export const DIFFICULTIES = [1, 2, 3, 4, 5] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
