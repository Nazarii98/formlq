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
  imageUrl?: string;
}

export interface MCQQuestion {
  id: string;
  type: "mcq";
  text: string;
  imageUrl?: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: string;
  explanationImageUrl?: string;
  points: number;
  order: number;
}

export interface OpenQuestion {
  id: string;
  type: "open";
  text: string;
  imageUrl?: string;
  correctAnswer: string;
  explanation: string;
  explanationImageUrl?: string;
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
  imageUrl?: string;
  leftItems: MatchingItem[];
  rightOptions: MatchingItem[];
  correctPairs: Record<string, string>; // leftId → rightId
  explanation: string;
  explanationImageUrl?: string;
  points: number;
  order: number;
}

export type TestQuestion = MCQQuestion | OpenQuestion | MatchingQuestion;

type BankMeta = {
  topicId: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  status?: "draft" | "approved" | "rejected";
  reviewNote?: string;
  dailyOrder?: number;
};

export type BankMCQQuestion = Omit<MCQQuestion, "points" | "order"> & BankMeta;
export type BankOpenQuestion = Omit<OpenQuestion, "points" | "order"> &
  BankMeta;
export type BankMatchingQuestion = Omit<MatchingQuestion, "points" | "order"> &
  BankMeta;
export type BankQuestion =
  | BankMCQQuestion
  | BankOpenQuestion
  | BankMatchingQuestion;

/** Default points per question type (НМТ convention): mcq 1, open 2, matching 3. */
export const DEFAULT_POINTS = { mcq: 1, open: 2, matching: 3 } as const;

/** Convert a bank question into a test question (strips bank meta, adds points + order). */
export function bankToTestQuestion(
  bq: BankQuestion,
  order: number,
): TestQuestion {
  const {
    topicId: _t,
    difficulty: _d,
    status: _s,
    reviewNote: _r,
    dailyOrder: _o,
    ...rest
  } = bq as BankQuestion & { dailyOrder?: number };
  return { ...rest, points: DEFAULT_POINTS[rest.type], order } as TestQuestion;
}

export function makeEmptyBankMCQ(topicId: string): BankMCQQuestion {
  return {
    id: crypto.randomUUID(),
    type: "mcq",
    topicId,
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
    difficulty: 1,
    status: "draft",
  };
}

export function makeEmptyBankOpen(topicId: string): BankOpenQuestion {
  return {
    id: crypto.randomUUID(),
    type: "open",
    topicId,
    text: "",
    correctAnswer: "",
    explanation: "",
    difficulty: 1,
    status: "draft",
  };
}

export function makeEmptyBankMatching(topicId: string): BankMatchingQuestion {
  return {
    id: crypto.randomUUID(),
    type: "matching",
    topicId,
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
    difficulty: 1,
    status: "draft",
  };
}

// raw score → scaled score (NMT 100–200, or a custom scale)
export interface ScoreRow {
  raw: number;
  nmt: number; // scaled score for this raw bracket
}

// "nmt" = official НМТ scale (100–200, ≥5 raw to pass);
// "custom" = teacher-defined scale, any numbers, no minimum
export type ScaleType = "nmt" | "custom";

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
  scaleType?: ScaleType; // defaults to "nmt" when absent
  durationMinutes?: number;
  order?: number;
}

export interface QuestionResult {
  id: string;
  type: TestQuestion["type"];
  text: string;
  imageUrl?: string | null;
  explanationImageUrl?: string | null;
  points: number;
  userAnswer: string;
  isCorrect: boolean;
  partialScore?: number; // earned points for partial matching (0 < partialScore < points)
  explanation?: string;
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
  nmtScore: number; // scaled score
  maxRaw: number;
  answers: Record<string, string>;
  questions: QuestionResult[];
  scoreTable: ScoreRow[];
  scaleType?: ScaleType; // defaults to "nmt" when absent
  // --- Homework extensions (absent on regular self-taken tests) ---
  homeworkId?: string; // set when this result came from a tutor assignment
  answerImages?: Record<string, string>; // questionId → uploaded photo url (open answers)
  flaggedQuestions?: string[]; // questionIds the student flagged with a duck 🦆
  tutorComments?: Record<string, string>; // questionId → tutor's note
  tutorNote?: string; // overall tutor note on the attempt
  reviewedAt?: Timestamp | null; // set when tutor has reviewed
}

export async function saveTestResult(
  data: Omit<TestResult, "id" | "completedAt">,
): Promise<string> {
  const ref = await addDoc(collection(db, "testResults"), {
    ...data,
    completedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Recompute a user's daily activity streak from their test results and persist it.
 * Shared by the exam and homework runners. Caller should refreshProfile() after.
 */
export async function recalcStreak(userId: string): Promise<number> {
  const allResults = await getUserResults(userId);
  const activeDays = new Set(
    allResults
      .filter((r) => r.completedAt)
      .map((r) => {
        const d = r.completedAt!.toDate();
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }),
  );
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (activeDays.has(key)) streak++;
    else break;
  }
  await updateDoc(doc(db, "users", userId), { streak });
  return streak;
}

export async function getResult(id: string): Promise<TestResult | null> {
  const snap = await getDoc(doc(db, "testResults", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as TestResult;
}

export async function updateResult(
  id: string,
  patch: Partial<TestResult>,
): Promise<void> {
  await updateDoc(doc(db, "testResults", id), patch);
}

export async function getUserResults(userId: string): Promise<TestResult[]> {
  const q = query(collection(db, "testResults"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as TestResult)
    .sort((a, b) => {
      const ta = a.completedAt?.toMillis() ?? 0;
      const tb = b.completedAt?.toMillis() ?? 0;
      return tb - ta;
    });
}

export function calcRawScore(
  questions: TestQuestion[],
  answers: Record<string, string>,
): number {
  return questions.reduce((sum, q) => {
    const answer = answers[q.id];
    if (!answer) return sum;
    if (q.type === "mcq" && answer === q.correctOptionId) return sum + q.points;
    if (q.type === "open" && answer.trim() === q.correctAnswer.trim())
      return sum + q.points;
    if (q.type === "matching") {
      try {
        const parsed = JSON.parse(answer) as Record<string, string>;
        const totalPairs = Object.keys(q.correctPairs).length;
        if (totalPairs === 0) return sum;
        const correctCount = Object.entries(q.correctPairs).filter(
          ([k, v]) => parsed[k] === v,
        ).length;
        return sum + Math.round(correctCount * (q.points / totalPairs));
      } catch {
        /* invalid json */
      }
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

/** Top scaled score in a table (denominator for the result, e.g. 200 for НМТ). */
export function maxScaledScore(scoreTable: ScoreRow[]): number {
  if (!scoreTable.length) return 0;
  return Math.max(...scoreTable.map((r) => r.nmt));
}

/** Identity scale: each raw point maps to itself (0..maxRaw). Default for custom. */
export function makeLinearTable(maxRaw: number): ScoreRow[] {
  const top = Math.max(0, maxRaw);
  return Array.from({ length: top + 1 }, (_, r) => ({ raw: r, nmt: r }));
}

/** НМТ counts a test as failed below 5 raw points; custom scales have no minimum. */
export function isExamFailed(
  rawScore: number,
  scaleType: ScaleType = "nmt",
): boolean {
  return scaleType === "nmt" && rawScore < 5;
}

export async function getPublishedTests(): Promise<TestDoc[]> {
  const snap = await getDocs(collection(db, "tests"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as TestDoc)
    .filter((t) => t.published)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function getAllTests(): Promise<TestDoc[]> {
  const snap = await getDocs(collection(db, "tests"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TestDoc);
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
    scaleType: "nmt",
  });
  return ref.id;
}

export async function updateTest(
  id: string,
  data: Partial<Omit<TestDoc, "id" | "createdAt">>,
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
