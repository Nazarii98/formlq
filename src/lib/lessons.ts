import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Lesson {
  id: string;
  tutorId: string;
  tutorName?: string;
  studentId: string;
  studentName?: string;
  title: string;
  start: Timestamp;
  durationMin: number;
  note?: string;
}

export type NewLesson = Omit<Lesson, "id">;

export async function createLesson(data: NewLesson): Promise<string> {
  const ref = await addDoc(collection(db, "lessons"), data);
  return ref.id;
}

export async function updateLesson(
  id: string,
  patch: Partial<Lesson>,
): Promise<void> {
  await updateDoc(doc(db, "lessons", id), patch);
}

export async function deleteLesson(id: string): Promise<void> {
  await deleteDoc(doc(db, "lessons", id));
}

function sortByStart(list: Lesson[]): Lesson[] {
  return [...list].sort((a, b) => a.start.toMillis() - b.start.toMillis());
}

export function subscribeTutorLessons(
  tutorId: string,
  cb: (list: Lesson[]) => void,
): () => void {
  return onSnapshot(
    query(collection(db, "lessons"), where("tutorId", "==", tutorId)),
    (snap) =>
      cb(
        sortByStart(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Lesson),
        ),
      ),
  );
}

export function subscribeStudentLessons(
  studentId: string,
  cb: (list: Lesson[]) => void,
): () => void {
  return onSnapshot(
    query(collection(db, "lessons"), where("studentId", "==", studentId)),
    (snap) =>
      cb(
        sortByStart(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Lesson),
        ),
      ),
  );
}
