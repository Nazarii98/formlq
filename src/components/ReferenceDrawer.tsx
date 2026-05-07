"use client";

import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReferenceDrawer } from "@/context/ReferenceDrawerContext";
import { pdfFileProp, getPdfCopyAsync } from "@/lib/pdf-cache";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export function ReferenceDrawer() {
  const { open, closeDrawer } = useReferenceDrawer();

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfFile, setPdfFile] = useState<string | { data: Uint8Array }>(pdfFileProp);
  const [scrolled, setScrolled] = useState(false);
  const [atBottom, setAtBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure drawer content width
  useEffect(() => {
    if (!scrollRef.current) return;
    const ro = new ResizeObserver(([e]) => setContainerWidth(e.contentRect.width));
    ro.observe(scrollRef.current);
    return () => ro.disconnect();
  }, []);

  // Track scroll for header/footer shadow
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onScroll() {
      const top = el!.scrollTop;
      const distFromBottom = el!.scrollHeight - el!.scrollTop - el!.clientHeight;
      setScrolled(top > 4);
      setAtBottom(distFromBottom < 4);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [open]);

  // Ensure bytes are loaded when drawer opens
  useEffect(() => {
    if (!open) return;
    const copy = pdfFileProp();
    if (typeof copy !== "string") { setPdfFile(copy); return; }
    getPdfCopyAsync().then((data) => setPdfFile({ data })).catch(() => {});
  }, [open]);

  // Track current page via IntersectionObserver
  useEffect(() => {
    if (!numPages || !open) return;
    const root = scrollRef.current;
    const observers: IntersectionObserver[] = [];
    pageRefs.current.forEach((el, i) => {
      if (!el) return;
      const io = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setPage(i + 1); },
        { root, threshold: 0.4 },
      );
      io.observe(el);
      observers.push(io);
    });
    return () => observers.forEach((io) => io.disconnect());
  }, [numPages, open, scale]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeDrawer(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closeDrawer]);

  function scrollToPage(p: number) {
    if (!scrollRef.current) return;
    if (p === 1) { scrollRef.current.scrollTo({ top: 0, behavior: "smooth" }); return; }
    pageRefs.current[p - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function zoom(delta: number) {
    setScale((s) => Math.min(2, Math.max(0.5, Math.round((s + delta) * 10) / 10)));
  }

  const pageWidth = containerWidth ? Math.min(containerWidth - 48, 860) * scale : undefined;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={closeDrawer}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex flex-col bg-background border-l border-border/50 shadow-2xl transition-transform duration-300 ease-out",
          "w-[min(780px,92vw)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-5 py-3.5 shrink-0 transition-all duration-200",
          "bg-background/85 backdrop-blur-md",
          scrolled
            ? "border-b border-border/40 shadow-[0_1px_16px_color-mix(in_oklch,var(--primary)_8%,transparent)]"
            : "border-b border-transparent",
        )}>
          <div>
            <p className="font-semibold text-sm">Довідкові матеріали</p>
            <p className="text-xs text-muted-foreground">НМТ з математики</p>
          </div>
          <button
            onClick={closeDrawer}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* PDF scroll area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          <Document
            file={pdfFile}
            onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPage(1); }}
            loading={null}
            className="flex flex-col items-center gap-4 py-5 px-6 pb-20"
          >
            {Array.from({ length: numPages }, (_, i) => (
              <div
                key={i}
                ref={(el) => { pageRefs.current[i] = el; }}
                className="scroll-mt-4"
              >
                <Page
                  pageNumber={i + 1}
                  width={pageWidth}
                  renderTextLayer
                  renderAnnotationLayer
                  loading={null}
                  className="rounded-xl overflow-hidden shadow-md"
                />
              </div>
            ))}
          </Document>
        </div>

        {/* Controls */}
        <div className={cn(
          "shrink-0 px-4 py-2.5 flex items-center justify-center gap-1 transition-all duration-200",
          "bg-background/85 backdrop-blur-md",
          atBottom
            ? "border-t border-transparent"
            : "border-t border-border/40 shadow-[0_-1px_16px_color-mix(in_oklch,var(--primary)_8%,transparent)]",
        )}>
          <button
            onClick={() => scrollToPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-sm tabular-nums px-2 min-w-[60px] text-center">
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

          <span className="text-sm tabular-nums w-12 text-center">{Math.round(scale * 100)}%</span>

          <button
            onClick={() => zoom(0.1)}
            disabled={scale >= 2}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all disabled:opacity-30"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
