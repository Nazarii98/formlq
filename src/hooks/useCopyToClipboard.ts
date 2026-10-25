import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

/** Clipboard copy with a short-lived `copied` flag for the button label. */
export function useCopyToClipboard(resetMs = 1500) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), resetMs);
    } catch {
      toast.error("Не вдалося скопіювати");
    }
  }

  return { copied, copy };
}
