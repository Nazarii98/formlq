import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, UserRole } from "@/types";

export async function getAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ ...d.data() }) as UserProfile);
}

export async function getUserById(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function updateUserRole(
  uid: string,
  role: UserRole,
): Promise<void> {
  await updateDoc(doc(db, "users", uid), { role });
}

/** Look up a user by exact email (case-insensitive trim). Returns null if none. */
export async function getUserByEmail(
  email: string,
): Promise<UserProfile | null> {
  const normalized = email.trim().toLowerCase();
  const snap = await getDocs(
    query(collection(db, "users"), where("email", "==", normalized)),
  );
  if (!snap.empty) return snap.docs[0].data() as UserProfile;
  // fallback: emails may be stored with original casing — scan once
  const all = await getDocs(collection(db, "users"));
  const match = all.docs.find(
    (d) => (d.data().email as string)?.toLowerCase() === normalized,
  );
  return match ? (match.data() as UserProfile) : null;
}

/**
 * Real-time subscription to all users. First call = N reads (initial snapshot),
 * subsequent updates = 1 read per changed doc. Much cheaper than polling getDocs.
 */
export function subscribeToUsers(
  cb: (users: UserProfile[]) => void,
): () => void {
  return onSnapshot(collection(db, "users"), (snap) => {
    cb(snap.docs.map((d) => ({ ...d.data() }) as UserProfile));
  });
}
