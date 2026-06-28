import { Question } from "@/types";
import { BankQuestion } from "@/lib/tests";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  addDoc,
  setDoc,
  deleteDoc,
  limit,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import toast, {Toaster} from 'react-hot-toast'

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
  const approved = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as BankQuestion)
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

export async function getDailyAnswerDates(userId: string): Promise<string[]> {
  const q = query(collection(db, "dailyAnswers"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data().date as string);
}

export async function createQuestion(data: Omit<BankQuestion, "id">): Promise<string> {
  const normalizedText = data.text ? await normalizeQuestionText(data) : undefined;
  const ref = await addDoc(collection(db, "questions"), {
    ...data,
    normalizedText: normalizedText ?? null,
  });
  return ref.id;
}

export async function getAllQuestions(): Promise<BankQuestion[]> {
  const snap = await getDocs(collection(db, "questions"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BankQuestion);
}

export async function updateQuestion(id: string, data: Partial<BankQuestion>): Promise<void> {
  
  const prevData = (await getDoc(doc(db, "questions", id))) as Partial<Question>;
  const prevDataNormalizedText = prevData.normalizedText;

  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  ); 

  const normalizedText = typeof clean.text === "string"
    ? await normalizeQuestionText(clean)
    : undefined;

  const duplicateQuestion = await findDuplicateQuestion(clean, id);
  if (duplicateQuestion) {
    toast.error('Помилка редагування завдання: дуплікати вже наявних завдань не допускаються.');

    await updateDoc(doc(db, "questions", id), {
    ...prevData, //Function updateDoc() called with invalid data. Unsupported field value: a custom Firestore object 
                  //Haven't found any other way to make this behave correctly.
    ...(prevDataNormalizedText !== undefined ? { prevDataNormalizedText } : {}),

  });

  }

  await updateDoc(doc(db, "questions", id), {
    ...clean,
    ...(normalizedText !== undefined ? { normalizedText } : {}),
  });
}

export async function deleteQuestion(id: string): Promise<void> {
  await deleteDoc(doc(db, "questions", id));
}

export async function getQuestionsByTopic(
  topicId: string,
  count = 10,
): Promise<Question[]> {
  const q = query(
    collection(db, "questions"),
    where("topicId", "==", topicId),
    orderBy("difficulty"),
    limit(count),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question);
}

export async function normalizeQuestionText(data: Partial<Question> | string): Promise<string | undefined> {
  const text = typeof data === "string" ? data : data.text;

  if (typeof text !== "string") {
    return undefined;
  }

  const normalizedText = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{Script=Latin}\p{Script=Cyrillic}\p{N}]/gu, "")
    .trim();

  return normalizedText || undefined;
}

export async function backfillQuestionNormalizedText(): Promise<void> {
  const snap = await getDocs(collection(db, "questions"));

  for (const document of snap.docs) {
    const question = document.data() as Partial<Question>;
    const normalizedText = await normalizeQuestionText(question);

    if (!normalizedText) {
      continue;
    }

    await updateDoc(doc(db, "questions", document.id), { normalizedText });
  }
}

export async function findDuplicateQuestion(data: Partial<Question>, excludeId?: string) {
  const normalizedText = await normalizeQuestionText(data);
  if (!normalizedText) {
    return null;
  }

  const q = query(collection(db, "questions"), where("normalizedText", "==", normalizedText));
  const snap = await getDocs(q);

  const match = snap.docs.find((docSnap) => {
    if (excludeId && docSnap.id === excludeId) {
      return false;
    }

    const existingNormalizedText = (docSnap.data() as Partial<Question>).normalizedText;
    return existingNormalizedText === normalizedText;
  });

  if (!match) {
    return null;
  }

  return { id: match.id, ...match.data() } as Question;
}

