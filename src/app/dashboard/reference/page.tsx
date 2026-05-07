"use client";

import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { pdfFileProp, getPdfCopyAsync } from "@/lib/pdf-cache";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function ReferencePage() {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pdfFile, setPdfFile] = useState<string | { data: Uint8Array }>(
    pdfFileProp,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) =>
      setContainerWidth(entry.contentRect.width),
    );
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const copy = pdfFileProp();
    if (typeof copy !== "string") {
      setPdfFile(copy);
      return;
    }
    getPdfCopyAsync()
      .then((data) => setPdfFile({ data }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!numPages) return;
    const observers: IntersectionObserver[] = [];
    pageRefs.current.forEach((el, i) => {
      if (!el) return;
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setPage(i + 1);
        },
        { threshold: 0.5 },
      );
      io.observe(el);
      observers.push(io);
    });
    return () => observers.forEach((io) => io.disconnect());
  }, [numPages, scale]);

  function scrollToPage(p: number) {
    if (p === 1) window.scrollTo({ top: 0, behavior: "smooth" });
    else
      pageRefs.current[p - 1]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  function zoom(delta: number) {
    setScale((s) =>
      Math.min(2, Math.max(0.5, Math.round((s + delta) * 10) / 10)),
    );
  }

  const pageWidth = containerWidth
    ? Math.min(containerWidth, 900) * scale
    : undefined;

  return (
    <div ref={containerRef} className="-mx-6 -mb-6 relative overflow-x-auto">
      <Document
        file={pdfFile}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={null}
        className="flex flex-col items-center gap-4 py-6 px-6 pb-24"
      >
        {Array.from({ length: numPages }, (_, i) => (
          <div
            key={i}
            ref={(el) => {
              pageRefs.current[i] = el;
            }}
            className="scroll-mt-20"
          >
            <Page
              pageNumber={i + 1}
              width={pageWidth}
              renderTextLayer
              renderAnnotationLayer
              loading={null}
              className="rounded-xl overflow-hidden shadow-lg"
            />
          </div>
        ))}
      </Document>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-2 rounded-2xl border border-border/50 bg-background/90 backdrop-blur-md shadow-lg">
        <button
          onClick={() => scrollToPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm tabular-nums px-2 min-w-[64px] text-center">
          {page} / {numPages || "—"}
        </span>
        <button
          onClick={() => scrollToPage(Math.min(numPages, page + 1))}
          disabled={page >= numPages}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
        <div className="w-px h-5 bg-border/50 mx-1" />
        <button
          onClick={() => zoom(-0.1)}
          disabled={scale <= 0.5}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all disabled:opacity-30"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-sm tabular-nums w-12 text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => zoom(0.1)}
          disabled={scale >= 2}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all disabled:opacity-30"
        >
          <ZoomIn size={16} />
        </button>
      </div>
    </div>
  );
}
