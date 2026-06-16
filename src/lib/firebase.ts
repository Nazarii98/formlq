import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // Realtime Database — used for online presence. Falls back to the default
  // instance URL derived from the project id when the env var is absent.
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    (projectId
      ? `https://${projectId}-default-rtdb.firebaseio.com`
      : undefined),
};

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
// ignoreUndefinedProperties: optional fields set to `undefined` are skipped
// instead of throwing (e.g. lesson/homework `note`, `dueAt`).
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
});
export const rtdb = getDatabase(app);
export default app;
