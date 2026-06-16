import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getUserByEmail } from "@/lib/users";
import type { TestQuestion, ScoreRow, ScaleType } from "@/lib/tests";

// --- Tutor ↔ Student link ---------------------------------------------------

export interface TutorStudent {
  id: string; // `${tutorId}_${studentId}`
  tutorId: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
  createdAt: Timestamp | null;
}

/**
 * Link a student to a tutor by email. Returns the created (or existing) link.
 * Throws a user-facing message if no user with that email exists.
 */
export async function addStudentByEmail(
  tutorId: string,
  email: string,
): Promise<TutorStudent> {
  const student = await getUserByEmail(email);
  if (!student) throw new Error("Користувача з таким email не знайдено");
  if (student.uid === tutorId) throw new Error("Не можна додати себе як учня");

  const id = `${tutorId}_${student.uid}`;
  const ref = doc(db, "tutorStudents", id);
  const existing = await getDoc(ref);
  if (existing.exists()) throw new Error("Цей учень вже доданий");

  const data = {
    tutorId,
    studentId: student.uid,
    studentEmail: student.email,
    studentName: student.displayName || student.email,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, data);
  return { id, ...data, createdAt: null } as TutorStudent;
}

export async function removeStudent(linkId: string): Promise<void> {
  await deleteDoc(doc(db, "tutorStudents", linkId));
}

export async function getTutorStudents(
  tutorId: string,
): Promise<TutorStudent[]> {
  const snap = await getDocs(
    query(collection(db, "tutorStudents"), where("tutorId", "==", tutorId)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TutorStudent);
}

/** Links where this user is the student — i.e. the tutors they belong to. */
export async function getStudentTutorLinks(
  studentId: string,
): Promise<TutorStudent[]> {
  const snap = await getDocs(
    query(collection(db, "tutorStudents"), where("studentId", "==", studentId)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TutorStudent));
}

export function subscribeTutorStudents(
  tutorId: string,
  cb: (list: TutorStudent[]) => void,
): () => void {
  return onSnapshot(
    query(collection(db, "tutorStudents"), where("tutorId", "==", tutorId)),
    (snap) =>
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TutorStudent)),
  );
}

// --- Homework ---------------------------------------------------------------

export type HomeworkSource = "test" | "custom";
export type HomeworkStatus = "assigned" | "in_progress" | "completed";

export interface Homework {
  id: string;
  tutorId: string;
  tutorName?: string;
  studentId: string;
  studentName?: string;
  title: string;
  note?: string;
  pdfUrl?: string; // optional конспект (PDF) shown to the student like reference materials
  source: HomeworkSource;
  testId?: string; // source === "test"
  questions?: TestQuestion[]; // source === "custom" — snapshot from bank/tests
  scoreTable: ScoreRow[];
  scaleType: ScaleType;
  durationMinutes: number;
  assignedAt: Timestamp | null;
  dueAt?: Timestamp | null;
  status: HomeworkStatus;
  resultId?: string;
  // Saved while the student is mid-attempt — lets them resume later.
  progress?: {
    answers: Record<string, string>;
    answerImages?: Record<string, string>;
  };
}

export type NewHomework = Omit<
  Homework,
  "id" | "assignedAt" | "status" | "resultId"
>;

export async function assignHomework(data: NewHomework): Promise<string> {
  const ref = await addDoc(collection(db, "homework"), {
    ...data,
    status: "assigned" as HomeworkStatus,
    assignedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getHomework(id: string): Promise<Homework | null> {
  const snap = await getDoc(doc(db, "homework", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Homework;
}

export async function updateHomework(
  id: string,
  patch: Partial<Homework>,
): Promise<void> {
  await updateDoc(doc(db, "homework", id), patch);
}

export async function deleteHomework(id: string): Promise<void> {
  await deleteDoc(doc(db, "homework", id));
}

function sortByAssigned(list: Homework[]): Homework[] {
  return [...list].sort(
    (a, b) => (b.assignedAt?.toMillis() ?? 0) - (a.assignedAt?.toMillis() ?? 0),
  );
}

export async function getTutorHomework(tutorId: string): Promise<Homework[]> {
  const snap = await getDocs(
    query(collection(db, "homework"), where("tutorId", "==", tutorId)),
  );
  return sortByAssigned(
    snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Homework),
  );
}

export function subscribeTutorHomework(
  tutorId: string,
  cb: (list: Homework[]) => void,
): () => void {
  return onSnapshot(
    query(collection(db, "homework"), where("tutorId", "==", tutorId)),
    (snap) =>
      cb(
        sortByAssigned(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Homework),
        ),
      ),
  );
}

export async function getStudentHomework(
  studentId: string,
): Promise<Homework[]> {
  const snap = await getDocs(
    query(collection(db, "homework"), where("studentId", "==", studentId)),
  );
  return sortByAssigned(
    snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Homework),
  );
}

export function subscribeStudentHomework(
  studentId: string,
  cb: (list: Homework[]) => void,
): () => void {
  return onSnapshot(
    query(collection(db, "homework"), where("studentId", "==", studentId)),
    (snap) =>
      cb(
        sortByAssigned(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Homework),
        ),
      ),
  );
}
