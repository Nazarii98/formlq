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
} from "firebase/firestore";
import { docsOf, saveOrder } from "@/lib/firestore-helpers";
import { db } from "./firebase";

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

export async function createQuestion(data: Omit<BankQuestion, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "questions"), data);
  return ref.id;
}

export async function getAllQuestions(): Promise<BankQuestion[]> {
  const snap = await getDocs(collection(db, "questions"));
  return docsOf<BankQuestion>(snap);
}

export async function updateQuestion(id: string, data: Partial<BankQuestion>): Promise<void> {
  // `undefined` means "clear this field" (e.g. removed image, dropped review note).
  const clean = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v === undefined ? deleteField() : v]),
  );
  await updateDoc(doc(db, "questions", id), clean);
}

/** Saves the daily-question order (only changed positions, one batch). */
export async function saveDailyOrder(questions: BankQuestion[]): Promise<void> {
  await saveOrder("questions", "dailyOrder", questions);
}

export async function deleteQuestion(id: string): Promise<void> {
  await deleteDoc(doc(db, "questions", id));
}
