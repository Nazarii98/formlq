import { collection, getDocs, doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/types";

export async function getAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ ...d.data() } as UserProfile));
}

export async function getUserById(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function updateUserRole(uid: string, role: "student" | "editor"): Promise<void> {
  await updateDoc(doc(db, "users", uid), { role });
}

/**
 * Real-time subscription to all users. First call = N reads (initial snapshot),
 * subsequent updates = 1 read per changed doc. Much cheaper than polling getDocs.
 */
export function subscribeToUsers(cb: (users: UserProfile[]) => void): () => void {
  return onSnapshot(collection(db, "users"), (snap) => {
    cb(snap.docs.map((d) => ({ ...d.data() } as UserProfile)));
  });
}
