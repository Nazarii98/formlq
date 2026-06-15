import type { Timestamp } from "firebase/firestore";

export type UserRole = "student" | "editor" | "tutor";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp | null;
  streak: number;
  lastActivity: Timestamp | null;
  totalXP: number;
  role: UserRole;
}

export interface TopicProgress {
  userId: string;
  topicId: string;
  topicName: string;
  solved: number;
  correct: number;
  masteryLevel: number;
  lastActivity: Date;
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

export interface QuestionOption {
  id: string;
  text: string;
  imageUrl?: string;
}

export interface Question {
  id: string;
  topicId: string;
  text: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  hint?: string;
  status?: "draft" | "approved" | "rejected";
  reviewNote?: string;
}

// --- Exam question types ---

export interface MCQExamQuestion {
  id: string;
  type: "mcq";
  topicId: string;
  text: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: string;
}

export interface MatchingLeftItem {
  id: string;
  text: string;
}

export interface MatchingRightOption {
  id: string;
  text: string;
}

export interface MatchingExamQuestion {
  id: string;
  type: "matching";
  topicId: string;
  text: string;
  leftItems: MatchingLeftItem[];
  rightOptions: MatchingRightOption[];
  correctPairs: Record<string, string>;
  explanation: string;
}

export interface OpenExamQuestion {
  id: string;
  type: "open";
  topicId: string;
  text: string;
  correctAnswer: string;
  explanation: string;
}

export type ExamQuestion =
  | MCQExamQuestion
  | MatchingExamQuestion
  | OpenExamQuestion;
