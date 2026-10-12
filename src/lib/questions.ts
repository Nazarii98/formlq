import { BankQuestion } from "@/lib/tests";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteField,
  addDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  query,
  where,
  limit,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { docsOf, saveOrder } from "@/lib/firestore-helpers";
import { db } from "./firebase";
import {
  DEDUPE_FIELDS,
  DuplicateQuestionError,
  computeDedupeKey,
  type DedupeSource,
} from "@/lib/question-dedupe";

export { DuplicateQuestionError } from "@/lib/question-dedupe";

// ── Daily answer ──────────────────────────────────────────────────────────────

export interface DailyAnswer {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  questionId: string;
  isCorrect: boolean;
  answeredAt: Timestamp | null;
}

export function todayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getDailyQuestion(): Promise<BankQuestion | null> {
  const snap = await getDocs(collection(db, "questions"));
  const approved = docsOf<BankQuestion>(snap)
    .filter((q) => q.status === "approved")
    .sort((a, b) => {
      if (a.dailyOrder != null && b.dailyOrder != null) return a.dailyOrder - b.dailyOrder;
      if (a.dailyOrder != null) return -1;
      if (b.dailyOrder != null) return 1;
      return a.id.localeCompare(b.id);
    });
  if (!approved.length) return null;
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - start.getTime()) / 86_400_000);
  return approved[dayOfYear % approved.length];
}

export async function getTodayDailyAnswer(userId: string): Promise<DailyAnswer | null> {
  const snap = await getDoc(doc(db, "dailyAnswers", `${userId}_${todayDateKey()}`));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as DailyAnswer;
}

export async function saveDailyAnswer(userId: string, questionId: string, isCorrect: boolean): Promise<void> {
  const date = todayDateKey();
  await setDoc(doc(db, "dailyAnswers", `${userId}_${date}`), {
    userId, date, questionId, isCorrect,
    answeredAt: serverTimestamp(),
  });
}

// ── Question bank ────────────────────────────────────────────────────────────

/** Internal field (see question-dedupe.ts); stripped from what the app reads. */
const KEY_FIELD = "dedupeKey";

function withoutKey(data: DocumentData): DocumentData {
  const { [KEY_FIELD]: _key, ...rest } = data;
  return rest;
}

/** Id of another question with the same content key, if any. */
async function findByKey(key: string, excludeId?: string): Promise<string | null> {
  const snap = await getDocs(
    query(collection(db, "questions"), where(KEY_FIELD, "==", key), limit(2)),
  );
  return snap.docs.find((d) => d.id !== excludeId)?.id ?? null;
}

/** Id of an existing bank question with the same content, or null. */
export async function findDuplicateQuestion(
  q: DedupeSource,
  excludeId?: string,
): Promise<string | null> {
  const key = await computeDedupeKey(q);
  return key ? findByKey(key, excludeId) : null;
}

/** @throws DuplicateQuestionError when the bank already has this question. */
export async function createQuestion(data: Omit<BankQuestion, "id">): Promise<string> {
  const key = await computeDedupeKey(data);
  if (key) {
    const dup = await findByKey(key);
    if (dup) throw new DuplicateQuestionError(dup);
  }
  const ref = await addDoc(collection(db, "questions"), {
    ...withoutKey(data),
    [KEY_FIELD]: key,
  });
  return ref.id;
}

export async function getAllQuestions(): Promise<BankQuestion[]> {
  const snap = await getDocs(collection(db, "questions"));
  return snap.docs.map((d) => ({ id: d.id, ...withoutKey(d.data()) }) as BankQuestion);
}

/**
 * Patches a question. `undefined` values clear the field (removed image, dropped review note).
 * When the patch touches content, the dedupe key is recomputed from the merged question.
 * @throws DuplicateQuestionError when the edited content matches another question.
 */
export async function updateQuestion(id: string, data: Partial<BankQuestion>): Promise<void> {
  const patch: Record<string, unknown> = Object.fromEntries(
    Object.entries(withoutKey(data)).map(([k, v]) => [k, v === undefined ? deleteField() : v]),
  );

  // Status / difficulty / review-note patches skip the extra read entirely.
  if (DEDUPE_FIELDS.some((f) => f in data)) {
    const current = (await getDoc(doc(db, "questions", id))).data() ?? {};
    const merged: Record<string, unknown> = { ...current, ...data };
    for (const [k, v] of Object.entries(data)) if (v === undefined) delete merged[k];
    const key = await computeDedupeKey(merged as DedupeSource);
    if (key) {
      const dup = await findByKey(key, id);
      if (dup) throw new DuplicateQuestionError(dup);
    }
    patch[KEY_FIELD] = key ?? deleteField();
  }

  await updateDoc(doc(db, "questions", id), patch);
}

/**
 * One-time migration: writes `dedupeKey` for questions created before duplicate
 * detection existed (or whose key is stale). Editors only. Returns docs updated.
 */
export async function backfillDedupeKeys(): Promise<number> {
  const snap = await getDocs(collection(db, "questions"));
  const stale: { id: string; key: string | null }[] = [];
  for (const d of snap.docs) {
    const data = d.data();
    const key = await computeDedupeKey(data);
    if ((data[KEY_FIELD] ?? null) !== key) stale.push({ id: d.id, key });
  }
  // Firestore batches are capped at 500 writes.
  for (let i = 0; i < stale.length; i += 450) {
    const batch = writeBatch(db);
    stale.slice(i, i + 450).forEach(({ id, key }) =>
      batch.update(doc(db, "questions", id), { [KEY_FIELD]: key ?? deleteField() }),
    );
    await batch.commit();
  }
  return stale.length;
}

/** Saves the daily-question order (only changed positions, one batch). */
export async function saveDailyOrder(questions: BankQuestion[]): Promise<void> {
  await saveOrder("questions", "dailyOrder", questions);
}

export async function deleteQuestion(id: string): Promise<void> {
  await deleteDoc(doc(db, "questions", id));
}
