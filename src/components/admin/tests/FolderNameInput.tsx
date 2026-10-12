"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface FolderNameInputProps {
  initial?: string;
  placeholder?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
  className?: string;
}

/** Inline name field: Enter / blur saves, Escape cancels, empty value cancels. */
export function FolderNameInput({
  initial = "",
  placeholder = "Назва папки",
  onSubmit,
  onCancel,
  className,
}: FolderNameInputProps) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  function finish(save: boolean) {
    if (doneRef.current) return;
    doneRef.current = true;
    const name = value.trim();
    if (save && name && name !== initial) onSubmit(name);
    else onCancel();
  }

  return (
    <input
      ref={ref}
      value={value}
      placeholder={placeholder}
      maxLength={80}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") finish(true);
        if (e.key === "Escape") finish(false);
      }}
      onBlur={() => finish(true)}
      className={cn(
        "w-full min-w-0 bg-transparent text-sm font-semibold outline-none",
        "rounded-lg px-2 py-1 -mx-2 ring-1 ring-primary/40 focus:ring-primary",
        "placeholder:text-muted-foreground/60 placeholder:font-normal",
        className,
      )}
    />
  );
}
