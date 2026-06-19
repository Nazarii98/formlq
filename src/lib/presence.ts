import {
  ref,
  onValue,
  onDisconnect,
  set,
  serverTimestamp,
  type DatabaseReference,
} from "firebase/database";
import { rtdb } from "@/lib/firebase";

export type PresenceState = "online" | "offline";

export interface PresenceEntry {
  state: PresenceState;
  /** ms since epoch (RTDB server timestamp) */
  lastChanged: number;
  displayName?: string;
}

export type PresenceMap = Record<string, PresenceEntry>;

/**
 * Check whether entry represents a currently-online user.
 * Relies on `onDisconnect` (RTDB server-side) to flip state to "offline"
 * when the user closes the tab or loses connection — no heartbeat needed.
 */
export function isOnline(entry: PresenceEntry | undefined): boolean {
  return entry?.state === "online";
}

/**
 * Marks the user online in RTDB and schedules an offline write via onDisconnect
 * (fires server-side even if the tab is closed/crashes). Returns a cleanup that
 * marks the user offline immediately (e.g. on logout).
 */
export function connectPresence(uid: string, displayName?: string): () => void {
  const statusRef: DatabaseReference = ref(rtdb, `status/${uid}`);
  const connectedRef = ref(rtdb, ".info/connected");

  // RTDB rejects `undefined` values (throws synchronously), so only include
  // displayName when we actually have one — it's still unset right after signup.
  const base = displayName ? { displayName } : {};
  const offline = {
    state: "offline" as const,
    lastChanged: serverTimestamp(),
    ...base,
  };
  const online = {
    state: "online" as const,
    lastChanged: serverTimestamp(),
    ...base,
  };

  const unsub = onValue(connectedRef, (snap) => {
    if (snap.val() === false) return;
    // Register the disconnect handler first, then flip to online.
    // Wrapped in try/catch — set()/onDisconnect().set() can throw synchronously.
    try {
      onDisconnect(statusRef)
        .set(offline)
        .then(() => set(statusRef, online))
        .catch(() => {});
    } catch {
      // presence is best-effort; never let it break auth/render
    }
  });

  return () => {
    unsub();
    try {
      set(statusRef, offline).catch(() => {});
    } catch {
      // ignore
    }
  };
}

/** Subscribes to every user's presence. Returns an unsubscribe fn. */
export function subscribeToPresence(
  cb: (map: PresenceMap) => void,
): () => void {
  const statusRef = ref(rtdb, "status");
  return onValue(statusRef, (snap) => {
    cb((snap.val() as PresenceMap) ?? {});
  });
}
