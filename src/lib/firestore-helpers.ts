import {
  doc,
  getDocs,
  writeBatch,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Snapshot → typed object with its document id. */
export function fromSnap<T extends { id: string }>(
  d: QueryDocumentSnapshot<DocumentData>,
): T {
  return { id: d.id, ...d.data() } as T;
}

/** All docs of a query snapshot as typed objects. */
export function docsOf<T extends { id: string }>(
  snap: QuerySnapshot<DocumentData>,
): T[] {
  return snap.docs.map((d) => fromSnap<T>(d));
}

/** Runs a query (or reads a whole collection) and returns typed docs. */
export async function getAll<T extends { id: string }>(
  q: Query<DocumentData>,
): Promise<T[]> {
  return docsOf<T>(await getDocs(q));
}

/**
 * Persists a numeric order field for a reordered list in one batch,
 * writing only the docs whose position actually changed.
 */
export async function saveOrder<K extends string>(
  collectionName: string,
  field: K,
  items: ({ id: string } & Partial<Record<K, number>>)[],
): Promise<void> {
  const batch = writeBatch(db);
  let writes = 0;
  items.forEach((item, i) => {
    if (item[field] === i) return;
    batch.update(doc(db, collectionName, item.id), { [field]: i });
    writes++;
  });
  if (writes) await batch.commit();
}
