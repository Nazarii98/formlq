import type { UserRole } from "@/types";

type MaybeRole = UserRole | null | undefined;

export const ROLE_META: Record<UserRole, { label: string }> = {
  student: { label: "Учень" },
  tutor: { label: "Вчитель" },
  editor: { label: "Редактор" },
};

/** Editors (admins) have full access to the admin area. */
export function isEditor(role: MaybeRole): role is "editor" {
  return role === "editor";
}

/** Tutors and editors may enter the tutor area. */
export function canTutor(role: MaybeRole): role is "tutor" | "editor" {
  return role === "tutor" || role === "editor";
}
