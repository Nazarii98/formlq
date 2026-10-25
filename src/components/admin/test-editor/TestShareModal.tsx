"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { AlertTriangle, Check, Copy, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { Switch } from "@/components/ui/switch";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { cn } from "@/lib/utils";
import { publicTestPath, studentTestPath } from "@/lib/tests";
import { SegmentedControl } from "./primitives";

type Mode = "student" | "public";

const MODE_INFO: Record<
  Mode,
  { label: string; caption: string; description: string }
> = {
  student: {
    label: "Для учнів",
    caption: "Вхід в акаунт",
    description:
      "Учень входить в акаунт і проходить тест. Результат зберігається в його історії, ви бачите його в профілі учня.",
  },
  public: {
    label: "Публічний",
    caption: "Без акаунта",
    description:
      "Будь-хто з посиланням проходить тест без входу. Бал і розбір видно одразу, але результат ніде не зберігається.",
  },
};

// QR stays dark-on-white in both themes: scanners need the contrast.
const QR_OPTIONS = {
  margin: 2,
  errorCorrectionLevel: "M" as const,
  color: { dark: "#000000", light: "#ffffff" },
};

/** Printable PNG: the QR code with the test title and mode caption underneath. */
async function renderPrintable(
  url: string,
  title: string,
  caption: string,
): Promise<string> {
  const size = 720;
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, url, { ...QR_OPTIONS, width: size });

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size + 130;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(qr, 0, 0);
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.font = "600 36px system-ui, -apple-system, sans-serif";
  ctx.fillText(title, size / 2, size + 40, size - 60);
  ctx.fillStyle = "#555555";
  ctx.font = "28px system-ui, -apple-system, sans-serif";
  ctx.fillText(caption, size / 2, size + 90, size - 60);
  return canvas.toDataURL("image/png");
}

/** QR code + link for a test, in student (signed-in) or public (no account) mode. */
export function TestShareModal({
  open,
  onClose,
  testId,
  title,
  published,
  onPublish,
  publicAccess,
  onPublicAccessChange,
  isDirty = false,
  saving = false,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  testId: string;
  title: string;
  published: boolean;
  onPublish: () => void;
  publicAccess: boolean;
  onPublicAccessChange: (v: boolean) => void;
  /** Editor only: unsaved edits don't reach people using the link until saved. */
  isDirty?: boolean;
  saving?: boolean;
  onSave?: () => void;
}) {
  const [mode, setMode] = useState<Mode>("student");
  const [qr, setQr] = useState<{ url: string; image: string } | null>(null);
  const { copied, copy } = useCopyToClipboard();

  const url =
    typeof window === "undefined"
      ? ""
      : window.location.origin +
        (mode === "student" ? studentTestPath(testId) : publicTestPath(testId));
  const info = MODE_INFO[mode];
  const inactive = !published || (mode === "public" && !publicAccess);

  useEffect(() => {
    if (!open || !url) return;
    let cancelled = false;
    QRCode.toDataURL(url, { ...QR_OPTIONS, width: 480 }).then((image) => {
      if (!cancelled) setQr({ url, image });
    });
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  async function download() {
    const name = title.trim() || "Тест";
    const a = document.createElement("a");
    a.href = await renderPrintable(url, name, info.caption);
    a.download = `QR — ${name} (${info.label.toLowerCase()}).png`;
    a.click();
  }

  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <span className="font-semibold">Поділитися тестом</span>
        <IconButton label="Закрити" onClick={onClose}>
          <X size={15} />
        </IconButton>
      </div>

      <div className="px-5 pb-5 space-y-5">
        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { value: "student", label: MODE_INFO.student.label },
            { value: "public", label: MODE_INFO.public.label },
          ]}
        />

        <div className="grid grid-cols-1 sm:grid-cols-[13rem_1fr] gap-5 items-start">
          <div className="relative mx-auto w-52 sm:w-full aspect-square rounded-2xl border border-border/50 bg-white p-2">
            {qr?.url === url && (
              // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimise
              <img
                src={qr.image}
                alt={`QR-код: ${info.label.toLowerCase()} — ${title}`}
                className={cn(
                  "size-full transition-opacity",
                  inactive && "opacity-15",
                )}
              />
            )}
            {inactive && (
              <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs font-medium text-neutral-700">
                Посилання поки не працює
              </div>
            )}
          </div>

          <div className="space-y-4 min-w-0">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {info.description}
            </p>

            {mode === "public" && (
              <label className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-4 py-3 cursor-pointer">
                <span className="text-sm">
                  Дозволити проходження без акаунта
                </span>
                <Switch
                  checked={publicAccess}
                  onChange={onPublicAccessChange}
                />
              </label>
            )}

            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                aria-label="Посилання на тест"
                onFocus={(e) => e.target.select()}
                className="min-w-0 flex-1 h-8 rounded-lg border border-border/50 bg-muted/40 px-3 text-xs font-mono text-muted-foreground"
              />
              <Button variant="outline" onClick={() => copy(url)}>
                {copied ? <Check /> : <Copy />}
                {copied ? "Скопійовано" : "Копіювати"}
              </Button>
            </div>

            <Button variant="outline" onClick={download} disabled={!url}>
              <Download /> Завантажити PNG для друку
            </Button>
          </div>
        </div>

        {!published ? (
          <Banner
            text="Тест — чернетка. За посиланням його поки ніхто не відкриє."
            action="Опублікувати"
            onAction={onPublish}
          />
        ) : mode === "public" && !publicAccess ? (
          <Banner text="Публічний доступ вимкнено. Увімкніть перемикач вище." />
        ) : null}
        {isDirty && (
          <Banner
            text="Є незбережені зміни — за посиланням діє остання збережена версія."
            action={saving ? "Збереження…" : "Зберегти"}
            onAction={onSave}
            disabled={saving}
          />
        )}
      </div>
    </Dialog>
  );
}

function Banner({
  text,
  action,
  onAction,
  disabled,
}: {
  text: string;
  action?: string;
  onAction?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-orange-400/40 bg-orange-500/5 px-4 py-2.5 text-xs text-orange-700 dark:text-orange-400">
      <AlertTriangle size={14} className="shrink-0" />
      <span className="flex-1">{text}</span>
      {action && (
        <Button
          size="sm"
          variant="outline"
          onClick={onAction}
          disabled={disabled}
        >
          {action}
        </Button>
      )}
    </div>
  );
}
