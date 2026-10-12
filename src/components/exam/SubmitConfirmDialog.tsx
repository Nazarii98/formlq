"use client";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { plural } from "@/lib/format";

interface SubmitConfirmDialogProps {
  open: boolean;
  unanswered: number;
  onCancel: () => void;
  onConfirm: () => void;
}

const UNANSWERED_FORMS: [string, string, string] = [
  "незаповнене питання",
  "незаповнені питання",
  "незаповнених питань",
];

/** "Finish with unanswered questions?" confirmation. */
export function SubmitConfirmDialog({
  open,
  unanswered,
  onCancel,
  onConfirm,
}: SubmitConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} size="sm" className="p-6 space-y-4">
      <div className="space-y-1">
        <p className="font-semibold text-base">Завершити тест?</p>
        <p className="text-sm text-muted-foreground">
          У вас залишилось{" "}
          <span className="font-semibold text-foreground">{unanswered}</span>{" "}
          {plural(unanswered, UNANSWERED_FORMS)}. Пропущені питання будуть
          зараховані як неправильні.
        </p>
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Продовжити
        </Button>
        <Button size="sm" onClick={onConfirm}>
          Завершити
        </Button>
      </div>
    </Dialog>
  );
}
