"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TestDoc, TestFolder } from "@/lib/tests";
import { Highlight } from "@/components/ui/highlight";
import { SearchInput } from "@/components/ui/search-input";

const UNFILED = "__unfiled__";

interface Group {
  key: string;
  name: string;
  tests: TestDoc[];
}

interface TestPickerProps {
  tests: TestDoc[];
  folders: TestFolder[];
  value: string;
  onChange: (testId: string) => void;
  placeholder?: string;
}

/** Searchable test selector grouped by admin folders. */
export function TestPicker({
  tests,
  folders,
  value,
  onChange,
  placeholder = "Оберіть тест...",
}: TestPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const groups = useMemo<Group[]>(() => {
    const ids = new Set(folders.map((f) => f.id));
    const byFolder: Group[] = folders.map((f) => ({
      key: f.id,
      name: f.name,
      tests: tests.filter((t) => t.folderId === f.id),
    }));
    const unfiled = tests.filter((t) => !t.folderId || !ids.has(t.folderId));
    return [...byFolder, { key: UNFILED, name: "Без папки", tests: unfiled }];
  }, [tests, folders]);

  const selected = tests.find((t) => t.id === value);
  const selectedGroup = groups.find((g) => g.tests.some((t) => t.id === value));

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const visibleGroups = useMemo(
    () =>
      groups
        .map((g) => {
          if (!searching || g.name.toLowerCase().includes(q)) return g;
          return {
            ...g,
            tests: g.tests.filter(
              (t) =>
                (t.title || "").toLowerCase().includes(q) ||
                (t.subtitle || "").toLowerCase().includes(q),
            ),
          };
        })
        .filter((g) => g.tests.length > 0),
    [groups, searching, q],
  );

  // Folders collapse to keep the list short; search, "Без папки" and a single group are always open.
  const isGroupOpen = (g: Group) =>
    searching || g.key === UNFILED || visibleGroups.length === 1 || expanded.has(g.key);

  const flat = visibleGroups.flatMap((g) => (isGroupOpen(g) ? g.tests : []));

  function openPicker() {
    setOpen(true);
    setQuery("");
    setActiveId(value || null);
    if (selectedGroup) setExpanded((prev) => new Set(prev).add(selectedGroup.key));
  }

  function choose(id: string) {
    onChange(id);
    setOpen(false);
  }

  function toggleGroup(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open || !activeId) return;
    listRef.current
      ?.querySelector(`[data-test-id="${activeId}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeId]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      if (query) setQuery("");
      else setOpen(false);
      return;
    }
    if (e.target !== inputRef.current) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!flat.length) return;
      const i = flat.findIndex((t) => t.id === activeId);
      const step = e.key === "ArrowDown" ? 1 : -1;
      const next = i < 0 ? (step > 0 ? 0 : flat.length - 1) : (i + step + flat.length) % flat.length;
      setActiveId(flat[next].id);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const target = flat.find((t) => t.id === activeId) ?? (flat.length === 1 ? flat[0] : null);
      if (target) choose(target.id);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-card text-sm text-left transition-colors outline-none",
          open ? "border-primary" : "border-border/50 hover:border-border focus-visible:border-primary",
        )}
      >
        {selected ? (
          <span className="flex-1 min-w-0 flex items-center gap-1.5">
            {selectedGroup && selectedGroup.key !== UNFILED && (
              <>
                <span className="text-muted-foreground truncate max-w-[40%]">
                  {selectedGroup.name}
                </span>
                <ChevronRight size={12} className="shrink-0 text-muted-foreground/60" />
              </>
            )}
            <span className="truncate font-medium">{selected.title || "Без назви"}</span>
            {!selected.published && <DraftBadge />}
          </span>
        ) : (
          <span className="flex-1 text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          onKeyDown={onKeyDown}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-xl border border-border/50 bg-popover shadow-xl animate-in fade-in-0 zoom-in-95 duration-100 overflow-hidden"
        >
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={(v) => {
              setQuery(v);
              setActiveId(null);
            }}
            placeholder="Пошук тесту або папки"
            wrapperClassName="border-b border-border/50"
            // Borderless variant: the popover itself is the frame.
            className="h-10 rounded-none border-0 bg-transparent pr-9"
          />

          <div ref={listRef} className="max-h-80 overflow-y-auto overscroll-contain p-1">
            {visibleGroups.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {searching ? "Нічого не знайдено" : "Тестів немає"}
              </p>
            ) : (
              visibleGroups.map((g) => {
                const groupOpen = isGroupOpen(g);
                const showHeader = folders.length > 0;
                const FolderIcon = g.key === UNFILED ? Inbox : groupOpen ? FolderOpen : Folder;
                const hasSelected = g.tests.some((t) => t.id === value);
                return (
                  <div key={g.key} className="pb-0.5">
                    {showHeader && (
                      <button
                        type="button"
                        onClick={() => !searching && g.key !== UNFILED && toggleGroup(g.key)}
                        className={cn(
                          "sticky top-0 z-10 w-full flex items-center gap-2 px-2 py-2 rounded-lg bg-popover text-left",
                          g.key !== UNFILED && !searching && "hover:bg-muted cursor-pointer",
                          (g.key === UNFILED || searching) && "cursor-default",
                        )}
                      >
                        {g.key !== UNFILED && (
                          <ChevronRight
                            size={13}
                            className={cn(
                              "shrink-0 text-muted-foreground transition-transform duration-150",
                              groupOpen && "rotate-90",
                            )}
                          />
                        )}
                        <FolderIcon
                          size={14}
                          className={cn(
                            "shrink-0",
                            g.key === UNFILED ? "text-muted-foreground" : "text-primary",
                          )}
                        />
                        <span
                          className={cn(
                            "flex-1 truncate text-xs font-semibold",
                            g.key === UNFILED && "text-muted-foreground",
                          )}
                        >
                          {g.key === UNFILED ? g.name : <Highlight text={g.name} query={query} />}
                        </span>
                        {hasSelected && !groupOpen && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        )}
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                          {g.tests.length}
                        </span>
                      </button>
                    )}

                    {groupOpen &&
                      g.tests.map((t) => {
                        const isSelected = t.id === value;
                        const isActive = t.id === activeId;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            data-test-id={t.id}
                            onClick={() => choose(t.id)}
                            onMouseMove={() => activeId !== t.id && setActiveId(t.id)}
                            className={cn(
                              "w-full flex items-center gap-2.5 rounded-lg py-2 pr-2.5 text-left transition-colors",
                              showHeader ? "pl-8" : "pl-2.5",
                              isActive && "bg-muted",
                            )}
                          >
                            <span className="w-3.5 shrink-0 flex justify-center">
                              {isSelected && <Check size={13} className="text-primary" />}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span
                                className={cn(
                                  "block text-sm truncate",
                                  isSelected && "font-medium text-primary",
                                )}
                              >
                                <Highlight text={t.title || "Без назви"} query={query} />
                              </span>
                              {t.subtitle && (
                                <span className="block text-xs text-muted-foreground truncate mt-0.5">
                                  <Highlight text={t.subtitle} query={query} />
                                </span>
                              )}
                            </span>
                            {!t.published && <DraftBadge />}
                            <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                              {t.questions?.length ?? 0} пит.
                            </span>
                          </button>
                        );
                      })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DraftBadge() {
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
      Чернетка
    </span>
  );
}
