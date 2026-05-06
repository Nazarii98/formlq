import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
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
  order: number;
}

export interface OpenQuestion {
  id: string;
  type: "open";
  text: string;
  correctAnswer: string;
  explanation: string;
  order: number;
}

export type TestQuestion = MCQQuestion | OpenQuestion;

export interface TestDoc {
  id: string;
  title: string;
  subtitle: string;
  published: boolean;
  createdBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  questions: TestQuestion[];
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
    order,
  };
}
