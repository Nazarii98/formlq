"use client";

import { queryKeys, STALE } from "@/lib/queryKeys";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getAllTests,
  updateTest,
  createTest,
  deleteTest,
  getTestFolders,
  createTestFolder,
  renameTestFolder,
  deleteTestFolder,
  saveTestLayout,
  type TestDoc,
  type TestFolder,
} from "@/lib/tests";
import { SpinnerPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { Plus, FolderPlus, Folder, Inbox } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TestRow } from "@/components/admin/tests/TestRow";
import { TestShareModal } from "@/components/admin/test-editor/TestShareModal";
import { FolderSection } from "@/components/admin/tests/FolderSection";
import { pluralize, PLURAL } from "@/lib/format";
import { FolderNameInput } from "@/components/admin/tests/FolderNameInput";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const UNFILED = "__unfiled__";
const COLLAPSED_KEY = "admin-tests-collapsed-folders";

type Buckets = Record<string, TestDoc[]>;
type DragItem = { kind: "test" | "folder"; id: string };
type DropTarget =
  | { kind: "test"; id: string; after: boolean }
  | { kind: "into"; key: string }
  | { kind: "folder"; id: string; after: boolean };

const byOrder = (a: { order?: number }, b: { order?: number }) =>
  (a.order ?? 0) - (b.order ?? 0);

function sameDrop(a: DropTarget | null, b: DropTarget | null) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function isLowerHalf(e: React.DragEvent) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return e.clientY > r.top + r.height / 2;
}

function loadCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export default function AdminTestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [shareTestId, setShareTestId] = useState<string | null>(null);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<TestFolder | null>(null);
  const [newFolder, setNewFolder] = useState<{ forTestId?: string } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed);
  const [search, setSearch] = useState("");
  const [drag, setDrag] = useState<DragItem | null>(null);
  const [drop, setDrop] = useState<DropTarget | null>(null);

  const { data: tests = [], isLoading: testsLoading } = useQuery({
    queryKey: queryKeys.tests.all,
    queryFn: getAllTests,
    staleTime: STALE.medium,
  });

  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: queryKeys.tests.folders,
    queryFn: getTestFolders,
    staleTime: STALE.medium,
  });

  // folderId → tests in display order; tests pointing at a missing folder fall back to UNFILED
  const buckets = useMemo<Buckets>(() => {
    const map: Buckets = { [UNFILED]: [] };
    folders.forEach((f) => (map[f.id] = []));
    [...tests].sort(byOrder).forEach((t) => {
      const key = t.folderId && map[t.folderId] ? t.folderId : UNFILED;
      map[key].push(t);
    });
    return map;
  }, [tests, folders]);

  const q = search.trim().toLowerCase();
  const searching = q.length > 0;
  const dragEnabled = !searching;

  function visibleTests(key: string, folderName?: string): TestDoc[] {
    const list = buckets[key] ?? [];
    if (!searching || folderName?.toLowerCase().includes(q)) return list;
    return list.filter(
      (t) =>
        (t.title || "").toLowerCase().includes(q) ||
        (t.subtitle || "").toLowerCase().includes(q),
    );
  }

  // ── Layout persistence ─────────────────────────────────────

  /** Normalises order (folders first, then unfiled) and saves only what changed. */
  function commitLayout(nextFolders: TestFolder[], nextBuckets: Buckets) {
    const orderedFolders = nextFolders.map((f, i) => ({ ...f, order: i }));
    const prevFolderOrder = new Map(folders.map((f) => [f.id, f.order]));
    const changedFolders = orderedFolders.filter(
      (f) => prevFolderOrder.get(f.id) !== f.order,
    );

    const flat: TestDoc[] = [];
    [...orderedFolders.map((f) => f.id), UNFILED].forEach((key) =>
      nextBuckets[key]?.forEach((t) =>
        flat.push({
          ...t,
          order: flat.length,
          folderId: key === UNFILED ? null : key,
        }),
      ),
    );
    const prevTests = new Map(tests.map((t) => [t.id, t]));
    const changedTests = flat.filter((t) => {
      const p = prevTests.get(t.id);
      return !p || p.order !== t.order || (p.folderId ?? null) !== t.folderId;
    });

    queryClient.setQueryData(queryKeys.tests.folders, orderedFolders);
    queryClient.setQueryData(queryKeys.tests.all, flat);
    if (!changedFolders.length && !changedTests.length) return;

    saveTestLayout(
      changedFolders.map((f) => ({ id: f.id, order: f.order })),
      changedTests.map((t) => ({
        id: t.id,
        order: t.order!,
        folderId: t.folderId ?? null,
      })),
    )
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.tests.published }))
      .catch(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.tests.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.tests.folders });
      });
  }

  function moveTest(
    testId: string,
    toKey: string,
    anchor: { id: string; after: boolean } | null,
    from: Buckets = buckets,
    nextFolders: TestFolder[] = folders,
  ) {
    const next: Buckets = Object.fromEntries(
      Object.entries(from).map(([k, v]) => [k, [...v]]),
    );
    let moving: TestDoc | undefined;
    for (const list of Object.values(next)) {
      const i = list.findIndex((t) => t.id === testId);
      if (i >= 0) [moving] = list.splice(i, 1);
    }
    const target = next[toKey];
    if (!moving || !target) return;

    let at = target.length;
    if (anchor) {
      const i = target.findIndex((t) => t.id === anchor.id);
      if (i >= 0) at = i + (anchor.after ? 1 : 0);
    }
    target.splice(at, 0, moving);
    commitLayout(nextFolders, next);
  }

  function moveFolder(folderId: string, anchorId: string, after: boolean) {
    const moving = folders.find((f) => f.id === folderId);
    if (!moving) return;
    const next = folders.filter((f) => f.id !== folderId);
    const i = next.findIndex((f) => f.id === anchorId);
    if (i < 0) return;
    next.splice(i + (after ? 1 : 0), 0, moving);
    commitLayout(next, buckets);
  }

  function setFolderExpanded(id: string, expanded: boolean) {
    setCollapsed((prev) => {
      if (prev.has(id) === !expanded) return prev;
      const next = new Set(prev);
      if (expanded) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }

  // ── Mutations ──────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (folderId: string | null) => {
      const order = Math.max(-1, ...tests.map((t) => t.order ?? 0)) + 1;
      return createTest(user!.uid, folderId, order);
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tests.all });
      router.push(`/admin/tests/${id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tests.published });
    },
  });

  /** Saves a field straight away (no draft here), updating the list optimistically. */
  async function patchTest(id: string, patch: Partial<TestDoc>) {
    queryClient.setQueryData<TestDoc[]>(queryKeys.tests.all, (prev) =>
      prev?.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
    await updateTest(id, patch);
    queryClient.invalidateQueries({ queryKey: queryKeys.tests.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.tests.published });
  }

  const shareTest = tests.find((t) => t.id === shareTestId);

  async function handleCreateFolder(name: string) {
    const forTestId = newFolder?.forTestId;
    setNewFolder(null);
    const order = folders.length;
    const id = await createTestFolder(name, order);
    const nextFolders = [...folders, { id, name, order, createdAt: null }];
    queryClient.setQueryData(queryKeys.tests.folders, nextFolders);
    setFolderExpanded(id, true);
    if (forTestId) {
      moveTest(forTestId, id, null, { ...buckets, [id]: [] }, nextFolders);
    }
  }

  async function handleRenameFolder(id: string, name: string) {
    setRenamingId(null);
    queryClient.setQueryData<TestFolder[]>(queryKeys.tests.folders, (prev = []) =>
      prev.map((f) => (f.id === id ? { ...f, name } : f)),
    );
    await renameTestFolder(id, name).catch(() =>
      queryClient.invalidateQueries({ queryKey: queryKeys.tests.folders }),
    );
  }

  async function handleDeleteFolder() {
    const folder = confirmDeleteFolder;
    setConfirmDeleteFolder(null);
    if (!folder) return;
    const ids = (buckets[folder.id] ?? []).map((t) => t.id);
    queryClient.setQueryData<TestFolder[]>(queryKeys.tests.folders, (prev = []) =>
      prev.filter((f) => f.id !== folder.id),
    );
    await deleteTestFolder(folder.id, ids).finally(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tests.folders });
    });
  }

  function confirmDelete() {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    deleteMutation.mutate(id);
  }

  // ── Drag & drop ────────────────────────────────────────────

  function startDrag(e: React.DragEvent, item: DragItem) {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
    setDrag(item);
  }

  function endDrag() {
    setDrag(null);
    setDrop(null);
  }

  function updateDrop(target: DropTarget | null) {
    setDrop((prev) => (sameDrop(prev, target) ? prev : target));
  }

  function onTestDragOver(e: React.DragEvent, testId: string) {
    if (drag?.kind !== "test") return;
    e.preventDefault();
    e.stopPropagation();
    updateDrop(
      drag.id === testId ? null : { kind: "test", id: testId, after: isLowerHalf(e) },
    );
  }

  function onFolderHeaderDragOver(e: React.DragEvent, folderId: string) {
    if (!drag) return;
    e.preventDefault();
    e.stopPropagation();
    if (drag.kind === "test") updateDrop({ kind: "into", key: folderId });
    else
      updateDrop(
        drag.id === folderId
          ? null
          : { kind: "folder", id: folderId, after: isLowerHalf(e) },
      );
  }

  function onAreaDragOver(e: React.DragEvent, key: string) {
    if (!drag) return;
    e.preventDefault();
    if (drag.kind === "test") updateDrop({ kind: "into", key });
    else if (key !== UNFILED && drag.id !== key)
      updateDrop({ kind: "folder", id: key, after: true });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const d = drag;
    const t = drop;
    endDrag();
    if (!d || !t) return;

    if (d.kind === "test") {
      const fromKey =
        Object.keys(buckets).find((k) => buckets[k].some((x) => x.id === d.id)) ?? UNFILED;
      if (t.kind === "test") {
        const toKey =
          Object.keys(buckets).find((k) => buckets[k].some((x) => x.id === t.id)) ?? UNFILED;
        moveTest(d.id, toKey, { id: t.id, after: t.after });
      } else if (t.kind === "into" && t.key !== fromKey) {
        moveTest(d.id, t.key, null);
      }
    } else if (t.kind === "folder") {
      moveFolder(d.id, t.id, t.after);
    }
  }

  // Hovering a test over a collapsed folder opens it after a short pause.
  const hoverIntoKey = drop?.kind === "into" ? drop.key : null;
  useEffect(() => {
    if (!hoverIntoKey || hoverIntoKey === UNFILED || !collapsed.has(hoverIntoKey)) return;
    const timer = setTimeout(() => setFolderExpanded(hoverIntoKey, true), 650);
    return () => clearTimeout(timer);
  }, [hoverIntoKey, collapsed]);

  // ── Render ─────────────────────────────────────────────────

  function renderTests(key: string, list: TestDoc[]) {
    const full = buckets[key] ?? [];
    return list.map((test) => {
      const i = full.findIndex((t) => t.id === test.id);
      const indicator =
        drop?.kind === "test" && drop.id === test.id
          ? drop.after
            ? "after"
            : "before"
          : null;
      return (
        <TestRow
          key={test.id}
          test={test}
          index={i}
          total={full.length}
          folders={folders}
          currentFolderId={key === UNFILED ? null : key}
          draggable={dragEnabled}
          isDragSrc={drag?.kind === "test" && drag.id === test.id}
          dropIndicator={indicator}
          highlight={search}
          deleting={deleteMutation.isPending}
          onDragStart={(e) => startDrag(e, { kind: "test", id: test.id })}
          onDragOver={(e) => onTestDragOver(e, test.id)}
          onDrop={handleDrop}
          onDragEnd={endDrag}
          onMoveUp={() => i > 0 && moveTest(test.id, key, { id: full[i - 1].id, after: false })}
          onMoveDown={() =>
            i < full.length - 1 && moveTest(test.id, key, { id: full[i + 1].id, after: true })
          }
          onTogglePublished={() => patchTest(test.id, { published: !test.published })}
          onShare={() => setShareTestId(test.id)}
          onEdit={() => router.push(`/admin/tests/${test.id}`)}
          onDelete={() => setConfirmDeleteId(test.id)}
          onMoveTo={(folderId) => {
            moveTest(test.id, folderId ?? UNFILED, null);
            if (folderId) setFolderExpanded(folderId, true);
          }}
          onMoveToNewFolder={() => setNewFolder({ forTestId: test.id })}
        />
      );
    });
  }

  const isLoading = testsLoading || foldersLoading;
  const hasFolders = folders.length > 0;
  const unfiled = visibleTests(UNFILED);
  const visibleFolders = folders
    .map((f) => ({ folder: f, list: visibleTests(f.id, f.name) }))
    .filter(({ folder, list }) => !searching || list.length > 0 || folder.name.toLowerCase().includes(q));
  const nothingFound = searching && unfiled.length === 0 && visibleFolders.length === 0;
  const draggingTestFromFolder =
    drag?.kind === "test" && !buckets[UNFILED].some((t) => t.id === drag.id);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Пошук тестів і папок"
          wrapperClassName="flex-1 min-w-48"
          className="h-9"
        />
        <button
          onClick={() => setNewFolder({})}
          className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-border/50 bg-card text-sm font-medium hover:bg-muted transition-all"
        >
          <FolderPlus size={15} />
          Нова папка
        </button>
        <button
          onClick={() => user && createMutation.mutate(null)}
          disabled={createMutation.isPending}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
        >
          <Plus size={15} />
          {createMutation.isPending ? "Створення..." : "Новий тест"}
        </button>
      </div>

      {isLoading ? (
        <SpinnerPage />
      ) : tests.length === 0 && !hasFolders && !newFolder ? (
        <EmptyState emoji="📝" title="Тестів ще немає" description="Створіть перший тест" />
      ) : nothingFound ? (
        <EmptyState emoji="🔍" title="Нічого не знайдено" description={`За запитом «${search.trim()}»`} />
      ) : (
        <div className="space-y-2">
          {visibleFolders.map(({ folder, list }) => {
            const all = buckets[folder.id] ?? [];
            const folderDrop =
              drop?.kind === "folder" && drop.id === folder.id
                ? drop.after
                  ? "after"
                  : "before"
                : null;
            return (
              <FolderSection
                key={folder.id}
                name={folder.name}
                highlight={search}
                count={all.length}
                publishedCount={all.filter((t) => t.published).length}
                expanded={searching || !collapsed.has(folder.id)}
                renaming={renamingId === folder.id}
                draggable={dragEnabled}
                isDragSrc={drag?.kind === "folder" && drag.id === folder.id}
                isDropInto={drop?.kind === "into" && drop.key === folder.id}
                dropIndicator={folderDrop}
                creatingTest={createMutation.isPending}
                onToggle={() => setFolderExpanded(folder.id, collapsed.has(folder.id))}
                onRenameStart={() => setRenamingId(folder.id)}
                onRename={(name) => handleRenameFolder(folder.id, name)}
                onRenameCancel={() => setRenamingId(null)}
                onAddTest={() => user && createMutation.mutate(folder.id)}
                onDelete={() => setConfirmDeleteFolder(folder)}
                onHeaderDragStart={(e) => startDrag(e, { kind: "folder", id: folder.id })}
                onHeaderDragOver={(e) => onFolderHeaderDragOver(e, folder.id)}
                onBodyDragOver={(e) => onAreaDragOver(e, folder.id)}
                onDrop={handleDrop}
                onDragEnd={endDrag}
              >
                {renderTests(folder.id, list)}
              </FolderSection>
            );
          })}

          {newFolder && (
            <div className="rounded-2xl border border-primary/40 bg-card px-4 py-3 flex items-center gap-3 animate-in fade-in-0 slide-in-from-top-1 duration-150">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                <Folder size={16} />
              </div>
              <div className="flex-1 min-w-0 pl-2">
                <FolderNameInput
                  onSubmit={handleCreateFolder}
                  onCancel={() => setNewFolder(null)}
                />
              </div>
              <span className="hidden sm:block text-[11px] text-muted-foreground shrink-0">
                Enter — зберегти · Esc — скасувати
              </span>
            </div>
          )}

          {/* Tests outside any folder */}
          {(unfiled.length > 0 || draggingTestFromFolder) && (
            <div
              className={cn("space-y-2", hasFolders && "pt-3")}
              onDragOver={(e) => onAreaDragOver(e, UNFILED)}
              onDrop={handleDrop}
            >
              {hasFolders && (
                <div className="flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
                  <Inbox size={13} />
                  <span>Без папки</span>
                  <span className="text-muted-foreground/60">· {pluralize(buckets[UNFILED].length, PLURAL.test)}</span>
                  <div className="flex-1 h-px bg-border/50 ml-1" />
                </div>
              )}
              {unfiled.length === 0 ? (
                <div
                  className={cn(
                    "rounded-2xl border border-dashed py-6 text-center text-xs transition-colors",
                    drop?.kind === "into" && drop.key === UNFILED
                      ? "border-primary/60 bg-primary/5 text-primary"
                      : "border-border/50 text-muted-foreground",
                  )}
                >
                  Перетягніть сюди, щоб вийняти тест з папки
                </div>
              ) : (
                renderTests(UNFILED, unfiled)
              )}
            </div>
          )}
        </div>
      )}

      {shareTest && (
        <TestShareModal
          open
          onClose={() => setShareTestId(null)}
          testId={shareTest.id}
          title={shareTest.title}
          published={shareTest.published}
          onPublish={() => patchTest(shareTest.id, { published: true })}
          publicAccess={shareTest.publicAccess ?? false}
          onPublicAccessChange={(v) => patchTest(shareTest.id, { publicAccess: v })}
        />
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Видалити тест?"
        description="Цю дію не можна скасувати. Тест буде видалено назавжди."
        confirmLabel="Видалити"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ConfirmDialog
        open={confirmDeleteFolder !== null}
        title={`Видалити папку «${confirmDeleteFolder?.name ?? ""}»?`}
        description="Тести з цієї папки не видаляться — вони перемістяться в «Без папки»."
        confirmLabel="Видалити папку"
        onConfirm={handleDeleteFolder}
        onCancel={() => setConfirmDeleteFolder(null)}
      />
    </div>
  );
}
