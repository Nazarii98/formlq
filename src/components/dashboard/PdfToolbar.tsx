import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";

export const PDF_MIN_SCALE = 0.5;
export const PDF_MAX_SCALE = 2;

/** Next zoom level, clamped to [MIN, MAX] and rounded to one decimal. */
export function nextPdfScale(scale: number, delta: number): number {
  return Math.min(PDF_MAX_SCALE, Math.max(PDF_MIN_SCALE, Math.round((scale + delta) * 10) / 10));
}

interface PdfToolbarProps {
  page: number;
  numPages: number;
  scale: number;
  onPageChange: (page: number) => void;
  onScaleChange: (scale: number) => void;
}

/** Page ‹ n / N › and zoom − % + controls (contents only — callers own the container). */
export function PdfToolbar({ page, numPages, scale, onPageChange, onScaleChange }: PdfToolbarProps) {
  return (
    <>
      <IconButton
        size="md"
        label="Попередня сторінка"
        className="disabled:opacity-30"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
      >
        <ChevronLeft size={16} />
      </IconButton>
      <span className="text-sm tabular-nums px-2 min-w-[64px] text-center">
        {page} / {numPages || "—"}
      </span>
      <IconButton
        size="md"
        label="Наступна сторінка"
        className="disabled:opacity-30"
        onClick={() => onPageChange(Math.min(numPages, page + 1))}
        disabled={page >= numPages}
      >
        <ChevronRight size={16} />
      </IconButton>

      <div className="w-px h-5 bg-border/50 mx-1" />

      <IconButton
        size="md"
        label="Зменшити"
        className="disabled:opacity-30"
        onClick={() => onScaleChange(nextPdfScale(scale, -0.1))}
        disabled={scale <= PDF_MIN_SCALE}
      >
        <ZoomOut size={16} />
      </IconButton>
      <span className="text-sm tabular-nums w-12 text-center">{Math.round(scale * 100)}%</span>
      <IconButton
        size="md"
        label="Збільшити"
        className="disabled:opacity-30"
        onClick={() => onScaleChange(nextPdfScale(scale, 0.1))}
        disabled={scale >= PDF_MAX_SCALE}
      >
        <ZoomIn size={16} />
      </IconButton>
    </>
  );
}
