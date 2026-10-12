"use client";

import { cn } from "@/lib/utils";
import { pluralize, PLURAL } from "@/lib/format";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { FolderNameInput } from "./FolderNameInput";
import { Highlight } from "@/components/ui/highlight";
import { IconButton } from "@/components/ui/icon-button";

interface FolderSectionProps {
  name: string;
  /** Search query to mark in the folder name. */
  highlight?: string;
  count: number;
  publishedCount: number;
  expanded: boolean;
  renaming: boolean;
  draggable: boolean;
  isDragSrc: boolean;
  /** A test is being dragged over this folder — it will land inside. */
  isDropInto: boolean;
  /** A folder is being dragged over this one — reorder indicator. */
  dropIndicator: "before" | "after" | null;
  creatingTest: boolean;
  onToggle: () => void;
  onRenameStart: () => void;
  onRename: (name: string) => void;
  onRenameCancel: () => void;
  onAddTest: () => void;
  onDelete: () => void;
  onHeaderDragStart: (e: React.DragEvent) => void;
  onHeaderDragOver: (e: React.DragEvent) => void;
  onBodyDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
}

export function FolderSection({
  name,
  highlight = "",
  count,
  publishedCount,
  expanded,
  renaming,
  draggable,
  isDragSrc,
  isDropInto,
  dropIndicator,
  creatingTest,
  onToggle,
  onRenameStart,
  onRename,
  onRenameCancel,
  onAddTest,
  onDelete,
  onHeaderDragStart,
  onHeaderDragOver,
  onBodyDragOver,
  onDrop,
  onDragEnd,
  children,
}: FolderSectionProps) {
  const Icon = expanded ? FolderOpen : Folder;

  return (
    <div className="relative" onDrop={onDrop}>
      {dropIndicator && (
        <div
          className={cn(
            "absolute left-3 right-3 h-0.5 rounded-full bg-primary pointer-events-none z-10",
            dropIndicator === "before" ? "-top-1.25" : "-bottom-1.25",
          )}
        />
      )}
      <div
        className={cn(
          "rounded-2xl border bg-card/60 transition-all",
          isDropInto
            ? "border-primary/60 bg-primary/5 ring-2 ring-primary/15"
            : "border-border/50",
          isDragSrc && "opacity-40",
        )}
      >
        {/* Header */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          draggable={draggable && !renaming}
          onDragStart={onHeaderDragStart}
          onDragOver={onHeaderDragOver}
          onDragEnd={onDragEnd}
          onClick={() => !renaming && onToggle()}
          onKeyDown={(e) => {
            if (renaming || e.target !== e.currentTarget) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
            if (e.key === "F2") onRenameStart();
          }}
          className="group flex items-center gap-3 px-4 py-3 cursor-pointer select-none rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {draggable && (
            <div className="hidden [@media(hover:hover)]:flex shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors cursor-grab active:cursor-grabbing -ml-0.5">
              <GripVertical size={16} />
            </div>
          )}

          <ChevronRight
            size={14}
            className={cn(
              "shrink-0 text-muted-foreground transition-transform duration-200",
              expanded && "rotate-90",
            )}
          />

          <div
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors",
              isDropInto ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
            )}
          >
            <Icon size={16} />
          </div>

          <div className="flex-1 min-w-0">
            {renaming ? (
              <FolderNameInput
                initial={name}
                onSubmit={onRename}
                onCancel={onRenameCancel}
              />
            ) : (
              <>
                <p
                  className="font-semibold text-sm truncate"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onRenameStart();
                  }}
                >
                  <Highlight text={name} query={highlight} />
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {count === 0
                    ? "Порожня папка"
                    : `${pluralize(count, PLURAL.test)} · активних: ${publishedCount}`}
                </p>
              </>
            )}
          </div>

          {!renaming && (
            <div
              className={cn(
                "flex items-center gap-1 shrink-0 transition-all duration-150",
                "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100",
                "[@media(hover:none)]:opacity-100 [@media(hover:none)]:scale-100",
              )}
            >
              <IconButton
                label="Новий тест у цій папці"
                disabled={creatingTest}
                // Keep pointer events so a click on the disabled button doesn't toggle the folder.
                className="disabled:pointer-events-auto disabled:cursor-default"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddTest();
                }}
              >
                <Plus size={14} />
              </IconButton>
              <IconButton
                label="Перейменувати"
                onClick={(e) => {
                  e.stopPropagation();
                  onRenameStart();
                }}
              >
                <Pencil size={13} />
              </IconButton>
              <IconButton
                label="Видалити папку"
                tone="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 size={13} />
              </IconButton>
            </div>
          )}
        </div>

        {/* Body (animated collapse via grid-rows trick) */}
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden" onDragOver={onBodyDragOver}>
            <div className="px-2 pb-2 space-y-2">
              {count === 0 ? (
                <div
                  className={cn(
                    "rounded-xl border border-dashed py-6 text-center text-xs text-muted-foreground transition-colors",
                    isDropInto ? "border-primary/50 text-primary" : "border-border/50",
                  )}
                >
                  Перетягніть сюди тести або{" "}
                  <button
                    onClick={onAddTest}
                    disabled={creatingTest}
                    className="text-primary font-medium hover:underline disabled:opacity-50"
                  >
                    створіть новий
                  </button>
                </div>
              ) : (
                children
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
