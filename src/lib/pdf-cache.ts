// Shared PDF byte cache — singleton per session.
// pdfjs transfers the ArrayBuffer to its worker (detaching it), so callers
// must always use getCopy() and never hold onto the returned buffer.

let cachedBytes: Uint8Array | null = null;
let fetchPromise: Promise<Uint8Array> | null = null;

export function preloadPdf(): Promise<Uint8Array> {
  if (!fetchPromise) {
    fetchPromise = fetch("/dovidka.pdf")
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        cachedBytes = new Uint8Array(buf);
        return cachedBytes;
      })
      .catch(() => {
        fetchPromise = null;
        return Promise.reject(new Error("PDF load failed"));
      });
  }
  return fetchPromise;
}

/** Returns a fresh copy of cached bytes (safe to pass to pdfjs). */
export function getPdfCopy(): Uint8Array | null {
  return cachedBytes ? cachedBytes.slice() : null;
}

/** Resolves to a copy, fetching first if not yet loaded. */
export async function getPdfCopyAsync(): Promise<Uint8Array> {
  if (cachedBytes) return cachedBytes.slice();
  await preloadPdf();
  return cachedBytes!.slice();
}

/** react-pdf `file` prop value — string URL until bytes are ready, then cached copy. */
export function pdfFileProp(): string | { data: Uint8Array } {
  const copy = getPdfCopy();
  return copy ? { data: copy } : "/dovidka.pdf";
}
