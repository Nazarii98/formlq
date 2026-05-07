import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface QuestionOption {
  id: string;
  text: string;
}

export interface MCQQuestion {
  id: string;
  type: "mcq";
  text: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: string;
  points: number;
  order: number;
}

export interface OpenQuestion {
  id: string;
  type: "open";
  text: string;
  correctAnswer: string;
  explanation: string;
  points: number;
  order: number;
}

export interface MatchingItem {
  id: string;
  text: string;
}

export interface MatchingQuestion {
  id: string;
  type: "matching";
  text: string;
  leftItems: MatchingItem[];
  rightOptions: MatchingItem[];
  correctPairs: Record<string, string>; // leftId → rightId
  explanation: string;
  points: number;
  order: number;
}

export type TestQuestion = MCQQuestion | OpenQuestion | MatchingQuestion;

// raw score → NMT score (100–200)
export interface ScoreRow {
  raw: number;
  nmt: number;
}

export interface TestDoc {
  id: string;
  title: string;
  subtitle: string;
  published: boolean;
  createdBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  questions: TestQuestion[];
  scoreTable: ScoreRow[];
  order?: number;
}

export interface QuestionResult {
  id: string;
  type: TestQuestion["type"];
  text: string;
  points: number;
  userAnswer: string;
  isCorrect: boolean;
  // MCQ
  options?: QuestionOption[];
  correctOptionId?: string;
  // Open
  correctAnswer?: string;
  // Matching
  leftItems?: MatchingItem[];
  rightOptions?: MatchingItem[];
  correctPairs?: Record<string, string>;
}

export interface TestResult {
  id: string;
  userId: string;
  testId: string;
  testTitle: string;
  testSubtitle: string;
  completedAt: Timestamp | null;
  timeSpent: number;
  rawScore: number;
  nmtScore: number;
  maxRaw: number;
  answers: Record<string, string>;
  questions: QuestionResult[];
  scoreTable: ScoreRow[];
}

export async function saveTestResult(data: Omit<TestResult, "id" | "completedAt">): Promise<string> {
  const ref = await addDoc(collection(db, "testResults"), {
    ...data,
    completedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getResult(id: string): Promise<TestResult | null> {
  const snap = await getDoc(doc(db, "testResults", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as TestResult;
}

export async function getUserResults(userId: string): Promise<TestResult[]> {
  const q = query(collection(db, "testResults"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as TestResult))
    .sort((a, b) => {
      const ta = a.completedAt?.toMillis() ?? 0;
      const tb = b.completedAt?.toMillis() ?? 0;
      return tb - ta;
    });
}

export function calcRawScore(questions: TestQuestion[], answers: Record<string, string>): number {
  return questions.reduce((sum, q) => {
    const answer = answers[q.id];
    if (!answer) return sum;
    if (q.type === "mcq" && answer === q.correctOptionId) return sum + q.points;
    if (q.type === "open" && answer.trim() === q.correctAnswer.trim()) return sum + q.points;
    if (q.type === "matching") {
      try {
        const parsed = JSON.parse(answer) as Record<string, string>;
        const allCorrect = Object.entries(q.correctPairs).every(([k, v]) => parsed[k] === v);
        if (allCorrect) return sum + q.points;
      } catch { /* invalid json */ }
    }
    return sum;
  }, 0);
}

export function rawToNMT(raw: number, scoreTable: ScoreRow[]): number {
  if (!scoreTable.length) return 100;
  const sorted = [...scoreTable].sort((a, b) => a.raw - b.raw);
  const match = sorted.findLast((r) => r.raw <= raw);
  return match?.nmt ?? sorted[0].nmt;
}

export function maxRawScore(questions: TestQuestion[]): number {
  return questions.reduce((s, q) => s + q.points, 0);
}

export async function getPublishedTests(): Promise<TestDoc[]> {
  const snap = await getDocs(collection(db, "tests"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as TestDoc))
    .filter((t) => t.published);
}

export async function getAllTests(): Promise<TestDoc[]> {
  const snap = await getDocs(collection(db, "tests"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TestDoc));
}

export async function getTest(id: string): Promise<TestDoc | null> {
  const snap = await getDoc(doc(db, "tests", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as TestDoc;
}

export async function createTest(createdBy: string): Promise<string> {
  const ref = await addDoc(collection(db, "tests"), {
    title: "Новий тест",
    subtitle: "",
    published: false,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    questions: [],
    scoreTable: NMT_2025_TABLE,
  });
  return ref.id;
}

export async function updateTest(
  id: string,
  data: Partial<Omit<TestDoc, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "tests", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTest(id: string): Promise<void> {
  await deleteDoc(doc(db, "tests", id));
}

export function makeEmptyMCQ(order: number): MCQQuestion {
  return {
    id: crypto.randomUUID(),
    type: "mcq",
    text: "",
    options: [
      { id: "А", text: "" },
      { id: "Б", text: "" },
      { id: "В", text: "" },
      { id: "Г", text: "" },
      { id: "Д", text: "" },
    ],
    correctOptionId: "А",
    explanation: "",
    points: 1,
    order,
  };
}

export function makeEmptyMatching(order: number): MatchingQuestion {
  return {
    id: crypto.randomUUID(),
    type: "matching",
    text: "",
    leftItems: [
      { id: "1", text: "" },
      { id: "2", text: "" },
      { id: "3", text: "" },
    ],
    rightOptions: [
      { id: "А", text: "" },
      { id: "Б", text: "" },
      { id: "В", text: "" },
      { id: "Г", text: "" },
      { id: "Д", text: "" },
    ],
    correctPairs: { "1": "А", "2": "Б", "3": "В" },
    explanation: "",
    points: 3,
    order,
  };
}

export function makeEmptyOpen(order: number): OpenQuestion {
  return {
    id: crypto.randomUUID(),
    type: "open",
    text: "",
    correctAnswer: "",
    explanation: "",
    points: 2,
    order,
  };
}

// НМТ-2025 default table (raw 0–4 → 100, 5 → 100, ..., 32 → 200)
export const NMT_2025_TABLE: ScoreRow[] = [
  { raw: 0, nmt: 100 },
  { raw: 5, nmt: 100 },
  { raw: 6, nmt: 108 },
  { raw: 7, nmt: 115 },
  { raw: 8, nmt: 123 },
  { raw: 9, nmt: 131 },
  { raw: 10, nmt: 134 },
  { raw: 11, nmt: 137 },
  { raw: 12, nmt: 140 },
  { raw: 13, nmt: 143 },
  { raw: 14, nmt: 145 },
  { raw: 15, nmt: 147 },
  { raw: 16, nmt: 148 },
  { raw: 17, nmt: 149 },
  { raw: 18, nmt: 150 },
  { raw: 19, nmt: 151 },
  { raw: 20, nmt: 152 },
  { raw: 21, nmt: 155 },
  { raw: 22, nmt: 159 },
  { raw: 23, nmt: 163 },
  { raw: 24, nmt: 167 },
  { raw: 25, nmt: 170 },
  { raw: 26, nmt: 173 },
  { raw: 27, nmt: 176 },
  { raw: 28, nmt: 180 },
  { raw: 29, nmt: 184 },
  { raw: 30, nmt: 189 },
  { raw: 31, nmt: 194 },
  { raw: 32, nmt: 200 },
];
