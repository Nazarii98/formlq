import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { docsOf, saveOrder } from "@/lib/firestore-helpers";
import { db } from "@/lib/firebase";

export interface Tip {
  id: string;
  emoji: string;
  text: string;
  active: boolean;
  order?: number;
  createdAt?: Timestamp | null;
}

export async function getTips(): Promise<Tip[]> {
  const snap = await getDocs(collection(db, "tips"));
  const tips = docsOf<Tip>(snap);
  return tips.sort((a, b) => {
    if (a.order != null && b.order != null) return a.order - b.order;
    if (a.order != null) return -1;
    if (b.order != null) return 1;
    const ta = a.createdAt?.seconds ?? 0;
    const tb = b.createdAt?.seconds ?? 0;
    return ta - tb;
  });
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

/** Saves the new tip order (only changed positions, one batch). */
export async function saveTipsOrder(tips: Tip[]): Promise<void> {
  await saveOrder("tips", "order", tips);
}
