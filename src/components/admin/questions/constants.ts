import type { BankQuestion } from "@/lib/tests";

export type QuestionStatus = "draft" | "approved" | "rejected";
export type QuestionType = BankQuestion["type"];

export const STATUS_CFG: Record<QuestionStatus, { label: string; cls: string }> = {
  draft: { label: "Чернетка", cls: "border-border/50 text-muted-foreground" },
  approved: {
    label: "Схвалено",
    cls: "border-green-500/40 text-green-600 bg-green-500/10",
  },
  rejected: {
    label: "Відхилено",
    cls: "border-red-400/40 text-red-500 bg-red-500/10",
  },
};

export const DIFF_LABEL = [
  "",
  "Легко",
  "Нижче серед.",
  "Середньо",
  "Вище серед.",
  "Складно",
];

export const DIFFICULTIES = [1, 2, 3, 4, 5] as const;

export const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "MCQ",
  open: "Відповідь",
  matching: "Відповідність",
};

export const QUESTION_TYPES = ["mcq", "open", "matching"] as const;

export function qStatus(q: BankQuestion): QuestionStatus {
  return q.status ?? "draft";
}
