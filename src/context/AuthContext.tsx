"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserProfile } from "@/types";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const ref = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setUserProfile(snap.data() as UserProfile);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function createUserDoc(user: User, name?: string) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const profile: Omit<UserProfile, "createdAt" | "lastActivity"> & {
        createdAt: ReturnType<typeof serverTimestamp>;
        lastActivity: ReturnType<typeof serverTimestamp>;
      } = {
        uid: user.uid,
        email: user.email ?? "",
        displayName: name || user.displayName || "Учень",
        photoURL: user.photoURL ?? undefined,
        streak: 0,
        totalXP: 0,
        role: "student",
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
      };
      await setDoc(ref, profile);
      setUserProfile(profile as unknown as UserProfile);
    }
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUp(email: string, password: string, name: string) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: name });
    await createUserDoc(user, name);
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    const { user } = await signInWithPopup(auth, provider);
    await createUserDoc(user);
  }

  async function logOut() {
    await signOut(auth);
  }

  async function refreshProfile() {
    if (!auth.currentUser) return;
    const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (snap.exists()) setUserProfile(snap.data() as UserProfile);
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signIn, signUp, signInWithGoogle, logOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
