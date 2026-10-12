/**
 * Duplicate detection for the question bank.
 *
 * Each question gets a `dedupeKey`: a SHA-256 hash of its normalized *content*
 * (type, prompt, image, options / matching items). Answers, explanations,
 * topic, difficulty and status are deliberately excluded — the same task with a
 * different answer or difficulty is still the same task.
 *
 * Hashing keeps the indexed field short (Firestore only indexes the first
 * 1500 bytes of a string) and makes equality lookups cheap.
 */

/** Fields that define a question's identity; changing any of them changes its key. */
export const DEDUPE_FIELDS = [
  "type",
  "text",
  "imageUrl",
  "options",
  "leftItems",
  "rightOptions",
] as const;

/**
 * Normalizes text for comparison while keeping math meaning intact:
 * Unicode compatibility forms (NFKC — keeps й/ї/є as letters), case,
 * dash/minus and quote variants, and all whitespace.
 * Math symbols, digits, operators and LaTeX are preserved, so
 * "x² − 5x + 6" and "x² + 5x − 6" stay different.
 */
export function normalizeQuestionText(text: string | undefined | null): string {
  if (!text) return "";
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‐-―−]/g, "-") // hyphens, en/em dashes, minus sign
    .replace(/[«»„“”]/g, '"')
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/\s+/g, "");
}

/** The subset of a question that defines its identity (bank or test question, or raw doc data). */
export interface DedupeSource {
  type?: string;
  text?: string;
  imageUrl?: string;
  options?: { text: string; imageUrl?: string }[];
  leftItems?: { text: string }[];
  rightOptions?: { text: string }[];
}

/** Canonical, order-insensitive string describing the question's content. */
export function dedupeSource(q: DedupeSource): string {
  const n = normalizeQuestionText;
  const set = (items?: { text: string; imageUrl?: string }[]) =>
    (items ?? []).map((i) => `${n(i.text)}|${i.imageUrl ?? ""}`).sort();
  return JSON.stringify([
    q.type ?? "",
    n(q.text),
    q.imageUrl ?? "",
    set(q.options),
    set(q.leftItems),
    set(q.rightOptions),
  ]);
}

/** SHA-256 hex of the canonical content; null for questions without a prompt. */
export async function computeDedupeKey(q: DedupeSource): Promise<string | null> {
  if (!normalizeQuestionText(q.text)) return null;
  const bytes = new TextEncoder().encode(dedupeSource(q));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Thrown by createQuestion / updateQuestion when the bank already has this question. */
export class DuplicateQuestionError extends Error {
  constructor(public readonly duplicateId: string) {
    super("Таке завдання вже є в банку");
    this.name = "DuplicateQuestionError";
  }
}
