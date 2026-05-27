"use client";

import { useEffect, useState } from "react";
import {
  subscribeToPresence,
  isOnline,
  type PresenceMap,
} from "@/lib/presence";

interface OnlineUsers {
  /** uid → presence entry */
  presence: PresenceMap;
  /** Set of uids currently online (recent heartbeat). */
  onlineUids: Set<string>;
  count: number;
}

/** Live online-presence map from Realtime Database. */
export function useOnlineUsers(): OnlineUsers {
  const [presence, setPresence] = useState<PresenceMap>({});

  useEffect(() => subscribeToPresence(setPresence), []);

  const onlineUids = new Set(
    Object.entries(presence)
      .filter(([, entry]) => isOnline(entry))
      .map(([uid]) => uid),
  );

  return { presence, onlineUids, count: onlineUids.size };
}
