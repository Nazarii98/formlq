"use client";

import { cn } from "@/lib/utils";
import {
  Pencil,
  Trash2,
  FileText,
  GripVertical,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  QrCode,
} from "lucide-react";
import type { TestDoc, TestFolder } from "@/lib/tests";
import { MoveToFolderMenu } from "./MoveToFolderMenu";
import { Highlight } from "@/components/ui/highlight";
import { IconButton } from "@/components/ui/icon-button";

/** Matches IconButton (sm, neutral) — the menu trigger can't be an IconButton. */
const menuTriggerCls =
  "w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all data-[popup-open]:bg-muted data-[popup-open]:text-foreground";

interface TestRowProps {
  test: TestDoc;
  index: number;
  total: number;
  folders: TestFolder[];
  currentFolderId: string | null;
  draggable: boolean;
  isDragSrc: boolean;
  dropIndicator: "before" | "after" | null;
  /** Search query to mark in title/subtitle. */
  highlight?: string;
  deleting: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onTogglePublished: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveTo: (folderId: string | null) => void;
  onMoveToNewFolder: () => void;
}

export function TestRow({
  test,
  index,
  total,
  folders,
  currentFolderId,
  draggable,
  isDragSrc,
  dropIndicator,
  highlight = "",
  deleting,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMoveUp,
  onMoveDown,
  onTogglePublished,
  onShare,
  onEdit,
  onDelete,
  onMoveTo,
  onMoveToNewFolder,
}: TestRowProps) {
  return (
    <div
      className="relative"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {dropIndicator && (
        <div
          className={cn(
            "absolute left-3 right-3 h-0.5 rounded-full bg-primary pointer-events-none z-10",
            dropIndicator === "before" ? "-top-1.25" : "-bottom-1.25",
          )}
        />
      )}
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className={cn(
          "rounded-2xl border bg-card px-4 py-3 flex items-center gap-3 group transition-all select-none relative overflow-hidden",
          !test.published && "border-border/30 opacity-60",
          test.published && "border-border/50",
          isDragSrc && "opacity-40",
        )}
      >
        {draggable && (
          <>
            <div className="hidden [@media(hover:hover)]:flex shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors cursor-grab active:cursor-grabbing">
              <GripVertical size={16} />
            </div>
            <div className="flex [@media(hover:hover)]:hidden flex-col shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
                disabled={index === 0}
                aria-label="Вгору"
                className="text-muted-foreground disabled:opacity-20 p-0.5"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                disabled={index === total - 1}
                aria-label="Вниз"
                className="text-muted-foreground disabled:opacity-20 p-0.5"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </>
        )}

        <div
          className={cn(
            "w-2 h-2 rounded-full shrink-0",
            test.published ? "bg-green-500" : "bg-muted-foreground/30",
          )}
        />

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">
            <Highlight text={test.title || "Без назви"} query={highlight} />
          </p>
          {test.subtitle && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              <Highlight text={test.subtitle} query={highlight} />
            </p>
          )}
        </div>

        <div
          className="relative shrink-0 ml-auto flex items-center"
          style={{ minWidth: "fit-content" }}
        >
          <span
            className={cn(
              "text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-all duration-150",
              "group-hover:opacity-0 group-hover:scale-90 group-hover:pointer-events-none",
              "group-has-[[data-popup-open]]:opacity-0",
              "[@media(hover:none)]:hidden",
              "bg-muted text-muted-foreground",
            )}
          >
            #{index + 1}
          </span>

          <div
            className={cn(
              "flex items-center gap-1 transition-all duration-150",
              "absolute right-0 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100",
              "group-has-[[data-popup-open]]:opacity-100 group-has-[[data-popup-open]]:scale-100",
              "[@media(hover:none)]:static [@media(hover:none)]:opacity-100 [@media(hover:none)]:scale-100",
            )}
          >
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground mr-1">
              <FileText size={11} />
              <span>{test.questions?.length ?? 0}</span>
            </div>

            <IconButton
              label={test.published ? "Деактивувати" : "Активувати"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePublished();
              }}
            >
              {test.published ? <Eye size={13} /> : <EyeOff size={13} />}
            </IconButton>

            <IconButton
              label="Поділитися"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShare();
              }}
            >
              <QrCode size={13} />
            </IconButton>

            <MoveToFolderMenu
              folders={folders}
              currentFolderId={currentFolderId}
              onMove={onMoveTo}
              onMoveToNewFolder={onMoveToNewFolder}
              triggerClassName={menuTriggerCls}
            />

            <IconButton
              label="Редагувати"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil size={13} />
            </IconButton>

            <IconButton
              label="Видалити"
              tone="danger"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 size={13} />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}
