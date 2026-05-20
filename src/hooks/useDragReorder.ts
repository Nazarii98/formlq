import { useRef, useState } from "react";

export function useDragReorder(onReorder: (from: number, to: number) => void) {
  const srcRef = useRef<number | null>(null);
  const overRef = useRef<number | null>(null);
  const [dragSrcIdx, setDragSrcIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  function handleDragStart(i: number) {
    srcRef.current = i;
    setDragSrcIdx(i);
  }

  function handleDragEnter(i: number, e: React.DragEvent) {
    if ((e.currentTarget as Node).contains(e.relatedTarget as Node)) return;
    if (overRef.current !== i) {
      overRef.current = i;
      setDragOverIdx(i);
    }
  }

  function handleDrop(i: number) {
    const src = srcRef.current;
    srcRef.current = null;
    overRef.current = null;
    setDragSrcIdx(null);
    setDragOverIdx(null);
    if (src !== null && src !== i) onReorder(src, i);
  }

  function handleDragEnd() {
    srcRef.current = null;
    overRef.current = null;
    setDragSrcIdx(null);
    setDragOverIdx(null);
  }

  return {
    dragSrcIdx,
    dragOverIdx,
    isSrc: (i: number) => dragSrcIdx === i,
    isOver: (i: number) => dragOverIdx === i && dragSrcIdx !== i,
    handleDragStart,
    handleDragEnter,
    handleDrop,
    handleDragEnd,
  };
}
