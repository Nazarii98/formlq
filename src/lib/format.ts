import type { Timestamp } from "firebase/firestore";

/** MM:SS — for countdown timers */
export function formatTimer(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Human-readable duration: "Xхв Xс" */
export function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}с`;
  if (sec === 0) return `${m}хв`;
  return `${m}хв ${sec}с`;
}

/** Firestore Timestamp → localized date string */
export function formatDate(
  ts: Timestamp | null,
  opts?: Intl.DateTimeFormatOptions,
): string {
  if (!ts) return "—";
  return ts.toDate().toLocaleString(
    "uk",
    opts ?? {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

/** Day-of-year index (1-based, used for rotating tips/tests daily) */
export function getDayIndex(): number {
  return Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      86400000,
  );
}

/** NMT score → color classes */
export function scoreColor(score: number): { text: string; bg: string } {
  if (score >= 180)
    return {
      text: "text-green-600 dark:text-green-400",
      bg: "bg-green-500/10",
    };
  if (score >= 160)
    return { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" };
  if (score >= 140)
    return {
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    };
  return { text: "text-red-500 dark:text-red-400", bg: "bg-red-500/10" };
}

/** Percent of max (0–100) → color classes. Used for custom (non-NMT) scales. */
export function scoreColorPct(pct: number): { text: string; bg: string } {
  if (pct >= 80)
    return {
      text: "text-green-600 dark:text-green-400",
      bg: "bg-green-500/10",
    };
  if (pct >= 60)
    return { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" };
  if (pct >= 40)
    return {
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    };
  return { text: "text-red-500 dark:text-red-400", bg: "bg-red-500/10" };
}

/** Relative time string: "5 хв тому", "щойно", etc. */
export function timeAgo(
  date: Date | { seconds: number } | null | undefined,
): string {
  if (!date) return "—";
  const d =
    date instanceof Date
      ? date
      : new Date((date as { seconds: number }).seconds * 1000);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "щойно";
  if (diff < 3600) return `${Math.floor(diff / 60)} хв тому`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} год тому`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} дн тому`;
  return d.toLocaleDateString("uk");
}

/**
 * Ukrainian plural form: plural(n, ["тест", "тести", "тестів"]).
 * forms = [one (1, 21…), few (2–4, 22–24…), many (0, 5–20, 25…)].
 */
export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = Math.abs(n) % 10;
  const mod100 = Math.abs(n) % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

/** "5 тестів" — number followed by the matching plural form. */
export function pluralize(n: number, forms: [string, string, string]): string {
  return `${n} ${plural(n, forms)}`;
}

export const PLURAL = {
  test: ["тест", "тести", "тестів"],
  question: ["питання", "питання", "питань"],
  task: ["завдання", "завдання", "завдань"],
  point: ["бал", "бали", "балів"],
  student: ["учень", "учні", "учнів"],
} as const satisfies Record<string, [string, string, string]>;
