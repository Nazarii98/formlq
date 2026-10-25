"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Upload,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { MathText } from "@/components/MathText";
import { uploadQuestionImage } from "@/lib/storage";
import { pluralize, PLURAL } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  imageBaseName,
  parseTestFile,
  type ParsedQuestion,
} from "@/lib/test-import";
import type { TestQuestion } from "@/lib/tests";
import { TYPE_LABELS } from "./constants";
import { FileImportGuide } from "./FileImportGuide";
import { SegmentedControl } from "./primitives";

const TEXT_EXT = /\.(txt|md)$/i;

interface Parsed {
  fileName: string;
  questions: ParsedQuestion[];
  errors: string[];
  /** Lower-cased file name → image file from the picked folder/files. */
  images: Map<string, File>;
}

/** Image names referenced in the file that weren't among the picked files. */
function missingImages(p: Parsed): string[] {
  return p.questions
    .flatMap((q) => [q.imageName, q.explanationImageName])
    .filter((n): n is string => !!n && !p.images.has(n.toLowerCase()));
}

/**
 * Import questions from a text file in the teacher format (see lib/test-import).
 * Pick the test folder (file + images/) or the files directly; images are
 * uploaded on import and matched by name.
 */
export function FileImportModal({
  open,
  onClose,
  contextId,
  startOrder,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  /** Storage folder for uploaded images (the test id). */
  contextId: string;
  /** Questions already in the test; imported ones are ordered after them. */
  startOrder: number;
  onImport: (questions: TestQuestion[]) => void;
}) {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [tab, setTab] = useState<"import" | "guide">("import");
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  function close() {
    if (importing) return;
    setParsed(null);
    setTab("import");
    onClose();
  }

  async function handleFiles(list: FileList | File[]) {
    const files = Array.from(list);
    const textFiles = files.filter((f) => TEXT_EXT.test(f.name));
    if (textFiles.length === 0) {
      toast.error("Не знайдено файл тесту (.txt або .md)");
      return;
    }
    if (textFiles.length > 1) {
      toast.error("Оберіть лише один файл тесту — один файл = один тест");
      return;
    }
    const images = new Map(
      files
        .filter((f) => f.type.startsWith("image/"))
        .map((f) => [imageBaseName(f.name).toLowerCase(), f]),
    );
    const source = await textFiles[0].text();
    setParsed({
      fileName: textFiles[0].name,
      images,
      ...parseTestFile(source, startOrder),
    });
  }

  async function submit() {
    if (!parsed?.questions.length) return;
    setImporting(true);
    try {
      const upload = async (name: string | undefined, slot: string) => {
        const file = name && parsed.images.get(name.toLowerCase());
        return file ? uploadQuestionImage(contextId, slot, file) : undefined;
      };
      const questions = await Promise.all(
        parsed.questions.map(
          async ({ question, imageName, explanationImageName }) => {
            const [imageUrl, explanationImageUrl] = await Promise.all([
              upload(imageName, question.id),
              upload(explanationImageName, `${question.id}-explanation`),
            ]);
            return {
              ...question,
              ...(imageUrl && { imageUrl }),
              ...(explanationImageUrl && { explanationImageUrl }),
            };
          },
        ),
      );
      onImport(questions);
      toast.success(
        `Імпортовано ${questions.length} ${pluralize(questions.length, PLURAL.task)}`,
      );
      setParsed(null);
      setTab("import");
      onClose();
    } catch {
      toast.error("Не вдалося завантажити зображення. Спробуйте ще раз");
    } finally {
      setImporting(false);
    }
  }

  const missing = parsed ? missingImages(parsed) : [];
  const count = parsed?.questions.length ?? 0;

  return (
    <Dialog
      open={open}
      onClose={close}
      size="lg"
      closeOnBackdrop={!importing}
      closeOnEscape={!importing}
      // Fixed height: switching tabs or expanding help must not resize/re-center the dialog.
      className="flex flex-col h-[min(720px,88vh)]"
    >
      <div className="px-5 pt-4 pb-3 border-b border-border/50 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Імпорт тесту з файлу</span>
          <IconButton label="Закрити" onClick={close} disabled={importing}>
            <X size={15} />
          </IconButton>
        </div>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: "import", label: "Імпорт" },
            { value: "guide", label: "Як підготувати файл" },
          ]}
        />
      </div>

      <input
        ref={filesRef}
        type="file"
        multiple
        accept=".txt,.md,image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={folderRef}
        type="file"
        // Non-standard but supported by all major browsers: pick a whole folder.
        {...({ webkitdirectory: "" } as object)}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="overflow-y-auto flex-1 min-h-0 p-5">
        {tab === "guide" ? (
          <FileImportGuide onGoToImport={() => setTab("import")} />
        ) : !parsed ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={cn(
              "h-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-5 p-8 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border/50",
            )}
          >
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Upload size={24} />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Оберіть папку з тестом</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Файл .txt і папка images із малюнками. Або перетягніть файли
                сюди.
              </p>
            </div>
            <div className="flex justify-center gap-2 flex-wrap">
              <Button onClick={() => folderRef.current?.click()}>
                <FolderOpen /> Обрати папку
              </Button>
              <Button
                variant="outline"
                onClick={() => filesRef.current?.click()}
              >
                <FileText /> Обрати файли
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setTab("guide")}
              className="text-xs text-primary hover:underline"
            >
              Ще немає файлу? Як його підготувати
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
              <FileText size={18} className="text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {parsed.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {count} {pluralize(count, PLURAL.task)}
                  {parsed.errors.length > 0 &&
                    ` · ${parsed.errors.length} з помилками`}
                  {parsed.images.size > 0 &&
                    ` · зображень: ${parsed.images.size}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setParsed(null)}
                disabled={importing}
              >
                Змінити
              </Button>
            </div>

            {parsed.errors.length > 0 && (
              <Notice
                title="Ці завдання буде пропущено — виправте файл і оберіть його знову"
                tone="error"
              >
                {parsed.errors}
              </Notice>
            )}
            {missing.length > 0 && (
              <Notice
                title="Не знайдено зображень — завдання імпортуються без них"
                tone="warn"
              >
                {missing}
              </Notice>
            )}

            {count > 0 && (
              <div className="divide-y divide-border/40 rounded-xl border border-border/50">
                {parsed.questions.map((pq) => (
                  <PreviewRow
                    key={pq.question.id}
                    item={pq}
                    images={parsed.images}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border/50 shrink-0">
        {importing && (
          <span className="mr-auto text-xs text-muted-foreground">
            Завантаження зображень…
          </span>
        )}
        <Button variant="ghost" onClick={close} disabled={importing}>
          Скасувати
        </Button>
        <Button disabled={count === 0 || importing} onClick={submit}>
          {importing && <Spinner size="sm" />}
          {count > 0
            ? `Імпортувати ${count} ${pluralize(count, PLURAL.task)}`
            : "Імпортувати"}
        </Button>
      </div>
    </Dialog>
  );
}

function Notice({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "error" | "warn";
  children: string[];
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-xs space-y-1",
        tone === "error"
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : "border-orange-400/40 bg-orange-500/5 text-orange-700 dark:text-orange-400",
      )}
    >
      <p className="font-semibold flex items-center gap-1.5">
        <AlertTriangle size={13} /> {title}
      </p>
      <ul className="list-disc pl-5 space-y-0.5">
        {children.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function PreviewRow({
  item: { number, question: q, imageName, explanationImageName },
  images,
}: {
  item: ParsedQuestion;
  images: Map<string, File>;
}) {
  const answer =
    q.type === "mcq"
      ? q.correctOptionId
      : q.type === "open"
        ? q.correctAnswer
        : Object.entries(q.correctPairs)
            .map(([l, r]) => `${l}-${r}`)
            .join(", ");
  // Icon + text, not color alone, so the missing state reads without color.
  const imageTag = (name: string | undefined, label: string) => {
    if (!name) return null;
    const found = images.has(name.toLowerCase());
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1",
          found
            ? "text-muted-foreground"
            : "text-orange-600 dark:text-orange-400",
        )}
      >
        {found ? <ImageIcon size={12} /> : <AlertTriangle size={12} />}
        {found ? label : `${label}: не знайдено`}
      </span>
    );
  };

  return (
    <div className="px-4 py-3 space-y-1.5">
      <div className="flex items-center gap-x-3 gap-y-1 text-xs text-muted-foreground flex-wrap">
        <span className="font-medium text-foreground tabular-nums">
          №{number}
        </span>
        <span>{TYPE_LABELS[q.type]}</span>
        <span className="tabular-nums">{q.points} б</span>
        <span className="inline-flex items-center gap-1">
          <Check size={12} className="text-green-600" />
          <span className="font-mono text-foreground">{answer}</span>
        </span>
        {imageTag(imageName, "зображення")}
        {imageTag(explanationImageName, "до пояснення")}
      </div>
      <p className="text-sm leading-snug line-clamp-2">
        <MathText text={q.text} />
      </p>
    </div>
  );
}
