import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** `?next=` target after sign-in: only same-origin paths, else the dashboard. */
export function safeNextPath(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

/** Auth page link that returns to `next` after sign-in, e.g. withNext("/login", "/t/abc"). */
export function withNext(authPath: "/login" | "/register", next: string | null): string {
  return next ? `${authPath}?next=${encodeURIComponent(next)}` : authPath;
}
