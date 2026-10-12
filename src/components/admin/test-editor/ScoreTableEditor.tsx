"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { TextInput } from "@/components/ui/text-field";
import { pluralize, PLURAL } from "@/lib/format";
import { NMT_2025_TABLE, makeLinearTable, type ScaleType, type ScoreRow } from "@/lib/tests";
import { SegmentedControl } from "./primitives";

type Row = ScoreRow & { key: number };

let nextRowKey = 0;
const byRaw = (a: ScoreRow, b: ScoreRow) => a.raw - b.raw;
const toRows = (table: ScoreRow[]): Row[] =>
  [...table].sort(byRaw).map((r) => ({ raw: r.raw, nmt: r.nmt, key: nextRowKey++ }));
const toTable = (rows: Row[]): ScoreRow[] =>
  rows.map(({ raw, nmt }) => ({ raw, nmt })).sort(byRaw);

const SCALE_OPTIONS = [
  { value: "nmt", label: "Шкала НМТ (100–200)" },
  { value: "custom", label: "Звичайна шкала" },
] as const;

const cellInput = "rounded-lg bg-background";

/**
 * Raw → scaled score table. Rows keep a stable key and their on-screen
 * position while being edited (re-sorted on blur), but the table emitted to
 * the parent is always sorted by `raw`.
 */
export function ScoreTableEditor({
  table,
  onChange,
  scaleType,
  onScaleTypeChange,
  maxRaw,
}: {
  table: ScoreRow[];
  onChange: (t: ScoreRow[]) => void;
  scaleType: ScaleType;
  onScaleTypeChange: (t: ScaleType) => void;
  maxRaw: number;
}) {
  const isNmt = scaleType === "nmt";
  const [rows, setRows] = useState(() => toRows(table));
  // Last table we saw from the parent; a different one means an external
  // replacement (reset / scale switch) → rebuild rows.
  const [syncedTable, setSyncedTable] = useState(table);
  if (table !== syncedTable) {
    setSyncedTable(table);
    setRows(toRows(table));
  }

  function commit(next: Row[]) {
    const emitted = toTable(next);
    setRows(next);
    setSyncedTable(emitted);
    onChange(emitted);
  }

  function updateRow(key: number, field: "raw" | "nmt", val: string) {
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    commit(rows.map((r) => (r.key === key ? { ...r, [field]: num } : r)));
  }

  function addRow() {
    const lastRaw = rows.reduce((m, r) => Math.max(m, r.raw), 0);
    commit([
      ...rows,
      { raw: lastRaw + 1, nmt: isNmt ? 100 : lastRaw + 1, key: nextRowKey++ },
    ]);
  }

  const defaultTable = useMemo(
    () => (isNmt ? NMT_2025_TABLE : makeLinearTable(maxRaw)),
    [isNmt, maxRaw],
  );
  const isDefault = useMemo(
    () =>
      JSON.stringify([...table].sort(byRaw)) ===
      JSON.stringify([...defaultTable].sort(byRaw)),
    [table, defaultTable],
  );

  return (
    <div className="space-y-4">
      <SegmentedControl value={scaleType} options={SCALE_OPTIONS} onChange={onScaleTypeChange} />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Таблиця переведення балів</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isNmt
              ? "Тестовий бал → Бал за шкалою 100–200."
              : "Тестовий бал → Власний бал (будь-які числа)."}{" "}
            Максимум тесту: {pluralize(maxRaw, PLURAL.point)}.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => onChange(defaultTable)}
          disabled={isDefault}
        >
          ↺ Скинути
        </Button>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_40px] text-xs text-muted-foreground uppercase tracking-wide font-medium px-4 py-2.5 border-b border-border/50 bg-muted/30">
          <span>Тестовий бал</span>
          <span>{isNmt ? "Бал (100–200)" : "Бал"}</span>
          <span />
        </div>
        <div className="divide-y divide-border/30 max-h-100 overflow-y-auto">
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[1fr_1fr_40px] items-center px-4 py-2 gap-2"
            >
              <TextInput
                size="sm"
                type="number"
                aria-label="Тестовий бал"
                value={row.raw}
                onChange={(e) => updateRow(row.key, "raw", e.target.value)}
                onBlur={() => setRows((prev) => [...prev].sort(byRaw))}
                className={cellInput}
              />
              <TextInput
                size="sm"
                type="number"
                aria-label="Бал"
                value={row.nmt}
                min={isNmt ? 100 : undefined}
                max={isNmt ? 200 : undefined}
                onChange={(e) => updateRow(row.key, "nmt", e.target.value)}
                className={cellInput}
              />
              <IconButton
                label="Видалити рядок"
                size="md"
                tone="danger"
                onClick={() => commit(rows.filter((r) => r.key !== row.key))}
              >
                ✕
              </IconButton>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-border/50">
          <Button variant="outline" size="sm" className="text-xs" onClick={addRow}>
            + Додати рядок
          </Button>
        </div>
      </div>
    </div>
  );
}
