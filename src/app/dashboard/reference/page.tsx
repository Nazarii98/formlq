"use client";

import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { pdfFileProp, getPdfCopyAsync } from "@/lib/pdf-cache";
import { PdfToolbar } from "@/components/dashboard/PdfToolbar";
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
    let cancelled = false;
    Promise.resolve(pdfFileProp()).then((copy) => {
      if (cancelled) return;
      if (typeof copy !== "string") {
        setPdfFile(copy);
      } else {
        getPdfCopyAsync()
          .then((data) => {
            if (!cancelled) setPdfFile({ data });
          })
          .catch(() => {});
      }
    });
    return () => {
      cancelled = true;
    };
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
        <PdfToolbar
          page={page}
          numPages={numPages}
          scale={scale}
          onPageChange={scrollToPage}
          onScaleChange={setScale}
        />
      </div>
    </div>
  );
}
