import type { Timestamp } from "firebase/firestore";

export type UserRole = "student" | "editor" | "tutor";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp | null;
  lastActivity: Timestamp | null;
  totalXP: number;
  role: UserRole;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  order: number;
  questionCount: number;
}
