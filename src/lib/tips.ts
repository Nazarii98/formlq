import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Tip {
  id: string;
  emoji: string;
  text: string;
  active: boolean;
  order?: number;
  createdAt?: ReturnType<typeof serverTimestamp>;
}

export async function getTips(): Promise<Tip[]> {
  const snap = await getDocs(collection(db, "tips"));
  const tips = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tip));
  return tips.sort((a, b) => {
    if (a.order != null && b.order != null) return a.order - b.order;
    if (a.order != null) return -1;
    if (b.order != null) return 1;
    const ta = (a.createdAt as unknown as { seconds: number })?.seconds ?? 0;
    const tb = (b.createdAt as unknown as { seconds: number })?.seconds ?? 0;
    return ta - tb;
  });
}

export async function getActiveTips(): Promise<Tip[]> {
  const all = await getTips();
  return all.filter((t) => t.active);
}

export async function createTip(data: Omit<Tip, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "tips"), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateTip(id: string, data: Partial<Omit<Tip, "id">>): Promise<void> {
  await updateDoc(doc(db, "tips", id), data);
}

export async function deleteTip(id: string): Promise<void> {
  await deleteDoc(doc(db, "tips", id));
}
