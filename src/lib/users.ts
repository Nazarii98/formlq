import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/types";

export async function getAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ ...d.data() } as UserProfile));
}

export async function updateUserRole(uid: string, role: "student" | "editor"): Promise<void> {
  await updateDoc(doc(db, "users", uid), { role });
}
