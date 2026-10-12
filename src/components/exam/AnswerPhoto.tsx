"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnswerPhotoProps {
  url?: string;
  uploading: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
}

/** Photo of the written solution attached to an open question (homework). */
export function AnswerPhoto({
  url,
  uploading,
  onSelect,
  onRemove,
}: AnswerPhotoProps) {
  return (
    <div className="space-y-2">
      {url ? (
        <div className="relative inline-block">
          <Image
            src={url}
            alt="Фото відповіді"
            width={300}
            height={200}
            className="rounded-xl border border-border/50 object-contain max-h-48"
          />
          <button
            type="button"
            onClick={onRemove}
            aria-label="Видалити фото"
            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-black/60 text-white flex items-center justify-center text-xs hover:bg-black/80"
          >
            ✕
          </button>
        </div>
      ) : (
        <label
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:text-foreground transition-all",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          {uploading ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Завантаження...
            </>
          ) : (
            <>📷 Прикріпити фото розвʼязку</>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onSelect(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}
