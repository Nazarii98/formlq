"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

interface DialogProps {
  open: boolean;
  onClose: () => void;
  size?: keyof typeof sizes;
  /** Classes for the panel (padding, height, layout). */
  className?: string;
  /** Set false for dialogs that must not close on backdrop click (e.g. unsaved forms). */
  closeOnBackdrop?: boolean;
  /** Set false for forms where Escape would silently discard typed input. */
  closeOnEscape?: boolean;
  children: React.ReactNode;
}

/** Modal shell: backdrop, Escape to close, body scroll lock. */
export function Dialog({
  open,
  onClose,
  size = "md",
  className,
  closeOnBackdrop = true,
  closeOnEscape = true,
  children,
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, closeOnEscape]);

  if (!open) return null;

  return (
    <div
      // Above the sticky app header/sidebar (z-50), below the reference drawer (z-95+).
      className="fixed inset-0 z-80 flex items-center justify-center p-4"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-150" />
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative z-10 w-full rounded-2xl border border-border/60 bg-card shadow-xl",
          "animate-in fade-in-0 zoom-in-95 duration-150",
          sizes[size],
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
