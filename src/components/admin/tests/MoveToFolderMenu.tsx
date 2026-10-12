"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, Folder, FolderInput, FolderMinus, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TestFolder } from "@/lib/tests";

interface MoveToFolderMenuProps {
  folders: TestFolder[];
  currentFolderId: string | null;
  onMove: (folderId: string | null) => void;
  onMoveToNewFolder: () => void;
  triggerClassName?: string;
}

const itemCls = cn(
  "flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm cursor-pointer outline-none select-none",
  "data-[highlighted]:bg-muted data-[disabled]:opacity-40 data-[disabled]:cursor-default",
);

export function MoveToFolderMenu({
  folders,
  currentFolderId,
  onMove,
  onMoveToNewFolder,
  triggerClassName,
}: MoveToFolderMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger
        title="Перемістити в папку"
        onClick={(e) => e.stopPropagation()}
        className={triggerClassName}
      >
        <FolderInput size={13} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-50 outline-none">
          <Menu.Popup
            className={cn(
              "min-w-52 max-w-72 max-h-80 overflow-y-auto rounded-xl border border-border/60 bg-card p-1 shadow-xl outline-none",
              "origin-[var(--transform-origin)] transition-[transform,opacity] duration-150",
              "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
              "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            )}
          >
            <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium text-muted-foreground">
              Перемістити в…
            </p>
            {folders.map((f) => {
              const current = f.id === currentFolderId;
              return (
                <Menu.Item
                  key={f.id}
                  disabled={current}
                  onClick={() => onMove(f.id)}
                  className={itemCls}
                >
                  <Folder size={14} className="shrink-0 text-primary" />
                  <span className="truncate flex-1">{f.name}</span>
                  {current && <Check size={14} className="shrink-0 text-muted-foreground" />}
                </Menu.Item>
              );
            })}
            {currentFolderId !== null && (
              <Menu.Item onClick={() => onMove(null)} className={itemCls}>
                <FolderMinus size={14} className="shrink-0 text-muted-foreground" />
                <span className="truncate flex-1">Без папки</span>
              </Menu.Item>
            )}
            <div className="my-1 h-px bg-border/60" />
            <Menu.Item onClick={onMoveToNewFolder} className={itemCls}>
              <FolderPlus size={14} className="shrink-0 text-muted-foreground" />
              <span>Нова папка…</span>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
