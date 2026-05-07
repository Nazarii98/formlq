"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Видалити",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className={cn(
          "relative z-10 w-full max-w-sm rounded-2xl border border-border/60 bg-card shadow-xl",
          "animate-in fade-in-0 zoom-in-95 duration-150"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
              <Trash2 size={16} className="text-red-500" />
            </div>
            <div className="space-y-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">{title}</p>
              {description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              ref={cancelRef}
              size="sm"
              variant="ghost"
              onClick={onCancel}
            >
              Скасувати
            </Button>
            <Button
              size="sm"
              onClick={onConfirm}
              className="bg-red-500 hover:bg-red-600 text-white gap-1.5"
            >
              <Trash2 size={13} />
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
