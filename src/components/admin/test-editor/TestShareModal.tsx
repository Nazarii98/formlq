"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Globe,
  Lock,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { cn } from "@/lib/utils";
import {
  effectiveLinkAccess,
  publicTestPath,
  studentTestPath,
  type LinkAccess,
} from "@/lib/tests";

type Option = {
  value: LinkAccess;
  icon: LucideIcon;
  label: string;
  description: string;
  /** Under the QR in the printable PNG. */
  caption: string;
};

const OPTIONS: Option[] = [
  {
    value: "off",
    icon: Lock,
    label: "Вимкнено",
    description: "За посиланням тест не відкривається.",
    caption: "",
  },
  {
    value: "students",
    icon: Users,
    label: "Учні з акаунтом",
    description: "Потрібно увійти. Результат зберігається в історії учня.",
    caption: "Увійдіть в акаунт formlq",
  },
  {
    value: "anyone",
    icon: Globe,
    label: "Будь-хто з посиланням",
    description:
      "Без входу; бал видно одразу, але не зберігається. Учні з акаунтом проходять у звичайному режимі.",
    caption: "Без реєстрації",
  },
];

// QR stays dark-on-white in both themes: scanners need the contrast.
const QR_OPTIONS = {
  margin: 2,
  errorCorrectionLevel: "M" as const,
  color: { dark: "#000000", light: "#ffffff" },
};

/** Printable PNG: the QR code with the test title and access caption underneath. */
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

/**
 * Link sharing for a test, Google Docs style: who can open it by link/QR.
 * Independent of `published`, which only controls the student catalog.
 */
export function TestShareModal({
  open,
  onClose,
  testId,
  title,
  published,
  linkAccess,
  onLinkAccessChange,
  isDirty = false,
  saving = false,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  testId: string;
  title: string;
  published: boolean;
  linkAccess: LinkAccess;
  onLinkAccessChange: (v: LinkAccess) => void;
  /** Editor only: unsaved edits don't reach people using the link until saved. */
  isDirty?: boolean;
  saving?: boolean;
  onSave?: () => void;
}) {
  const [qr, setQr] = useState<{ url: string; image: string } | null>(null);
  const { copied, copy } = useCopyToClipboard();

  const access = effectiveLinkAccess({ published, linkAccess });
  const option = OPTIONS.find((o) => o.value === access)!;
  const path =
    access === "anyone"
      ? publicTestPath(testId)
      : access === "students"
        ? studentTestPath(testId)
        : null;
  const url =
    path && typeof window !== "undefined" ? window.location.origin + path : "";

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
    a.href = await renderPrintable(url, name, option.caption);
    a.download = `QR — ${name}.png`;
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
        <div className="space-y-2">
          <p id="link-access-label" className="text-sm font-medium">
            Хто може відкрити за посиланням
          </p>
          <div
            role="radiogroup"
            aria-labelledby="link-access-label"
            className="rounded-xl border border-border/50 divide-y divide-border/50 overflow-hidden"
          >
            {OPTIONS.map((o) => {
              // A published test is in the catalog anyway, so the link can't be "off".
              const disabled = o.value === "off" && published;
              const checked = access === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  disabled={disabled}
                  onClick={() => onLinkAccessChange(o.value)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors",
                    checked ? "bg-primary/5" : "hover:bg-muted/50",
                    disabled &&
                      "opacity-50 cursor-not-allowed hover:bg-transparent",
                  )}
                >
                  <o.icon
                    size={18}
                    className={cn(
                      "mt-0.5 shrink-0",
                      checked ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium">{o.label}</span>
                    <span className="block text-xs text-muted-foreground leading-relaxed">
                      {disabled
                        ? "Тест опублікований — учні з акаунтом відкривають його з каталогу."
                        : o.description}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 size-4 shrink-0 rounded-full border-2 transition-colors",
                      checked
                        ? "border-primary bg-primary shadow-[inset_0_0_0_2px_var(--background)]"
                        : "border-muted-foreground/40",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {url ? (
          <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-5 items-center">
            <div className="mx-auto w-40 sm:w-full aspect-square rounded-2xl border border-border/50 bg-white p-2">
              {qr?.url === url && (
                // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimise
                <img
                  src={qr.image}
                  alt={`QR-код тесту «${title}»`}
                  className="size-full"
                />
              )}
            </div>
            <div className="space-y-3 min-w-0">
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
              <Button variant="outline" onClick={download}>
                <Download /> Завантажити PNG для друку
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <Lock size={16} className="shrink-0" />
            Оберіть, хто може відкрити тест, щоб отримати посилання і QR-код.
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {published
            ? "Тест опублікований: учні бачать його в каталозі «Тести»."
            : "Тест у чернетці: у каталозі учнів його не видно."}
        </p>

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
