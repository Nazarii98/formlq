import {
  DEFAULT_POINTS,
  type MatchingItem,
  type QuestionOption,
  type TestQuestion,
} from "@/lib/tests";

/**
 * Parser for the plain-text test format teachers prepare outside the platform.
 *
 *   ### 1 | Вибір відповіді | 1
 *   ТЕКСТ: ...
 *   ЗОБРАЖЕННЯ: pic.png               (optional)
 *   А) ...  Б) ...  В) ...  Г) ...  Д) ...
 *   ПРАВИЛЬНА: Б
 *   ПОЯСНЕННЯ: ...
 *   ЗОБРАЖЕННЯ ДО ПОЯСНЕННЯ: sol.png   (optional)
 *
 * Matching uses ЛІВА КОЛОНКА (1.–3.), ПРАВА КОЛОНКА (А.–Д.), ПРАВИЛЬНІ ПАРИ: 1-Г, 2-В;
 * open uses ПРАВИЛЬНА ВІДПОВІДЬ: <число>. Values may span several lines.
 * Images are referenced by file name and resolved by the caller.
 */

export interface ParsedQuestion {
  /** Number from the "### №" header, for error messages. */
  number: string;
  question: TestQuestion;
  /** File names referenced in the source; uploaded and replaced with URLs by the caller. */
  imageName?: string;
  explanationImageName?: string;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  /** Human-readable problems; questions with errors are skipped. */
  errors: string[];
}

/** Latin look-alikes that sneak in when the file was typed on an English layout. */
const LATIN_TO_CYRILLIC: Record<string, string> = { A: "А", B: "В", a: "А", b: "В" };

function normalizeLetter(s: string): string {
  const c = s.trim().charAt(0);
  return (LATIN_TO_CYRILLIC[c] ?? c).toUpperCase();
}

type Field =
  | "text"
  | "image"
  | "correct"
  | "answer"
  | "pairs"
  | "explanation"
  | "explanationImage"
  | "left"
  | "right";

// Longer labels first so "ЗОБРАЖЕННЯ ДО ПОЯСНЕННЯ" doesn't match as "ЗОБРАЖЕННЯ".
const LABELS: [RegExp, Field][] = [
  [/^ЗОБРАЖЕННЯ\s+ДО\s+ПОЯСНЕННЯ\s*:?/i, "explanationImage"],
  [/^ЗОБРАЖЕННЯ\s*:?/i, "image"],
  [/^ТЕКСТ\s*:?/i, "text"],
  [/^ПРАВИЛЬНА\s+ВІДПОВІДЬ\s*:?/i, "answer"],
  [/^ПРАВИЛЬНІ\s+ПАРИ\s*:?/i, "pairs"],
  [/^ПРАВИЛЬНА\s*:?/i, "correct"],
  [/^ПОЯСНЕННЯ\s*:?/i, "explanation"],
  [/^ЛІВА\s+КОЛОНКА\s*:?/i, "left"],
  [/^ПРАВА\s+КОЛОНКА\s*:?/i, "right"],
];

const HEADER_RE = /^###\s*(.*)$/;
const MCQ_OPTION_RE = /^([АБВГДAB])\s*\)\s*(.*)$/;
const RIGHT_ITEM_RE = /^([АБВГДAB])\s*[.)]\s*(.*)$/;
const LEFT_ITEM_RE = /^(\d+)\s*[.)]\s*(.*)$/;

/** Pushes a list item ("А) …", "1. …") if `line` is one; returns it. */
function matchItem(
  line: string,
  re: RegExp,
  list: { id: string; text: string }[],
  normalizeId: (id: string) => string,
): { id: string; text: string } | null {
  const m = line.match(re);
  if (!m) return null;
  const item = { id: normalizeId(m[1]), text: m[2] };
  list.push(item);
  return item;
}

function detectType(s: string): TestQuestion["type"] | null {
  const t = s.toLowerCase();
  // "Вписати відповідь" also contains "відповід", so check it first.
  if (t.includes("вписати") || t.includes("відкрит")) return "open";
  if (t.includes("відповідність")) return "matching";
  if (t.includes("вибір")) return "mcq";
  return null;
}

/** "images/foo.png" → "foo.png" */
export function imageBaseName(s: string): string {
  return s.trim().split(/[\\/]/).pop() ?? "";
}

interface Block {
  number: string;
  type: TestQuestion["type"] | null;
  points: number | null;
  lines: string[];
}

function splitBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  for (const raw of source.replace(/^﻿/, "").split(/\r?\n/)) {
    const header = raw.trim().match(HEADER_RE);
    if (header) {
      const parts = header[1].split("|").map((p) => p.trim());
      const points = parseInt(parts[2] ?? "", 10);
      current = {
        number: parts[0].replace(/^№\s*/, "") || String(blocks.length + 1),
        type: detectType(parts[1] ?? ""),
        points: Number.isFinite(points) && points > 0 ? points : null,
        lines: [],
      };
      blocks.push(current);
    } else if (current) {
      current.lines.push(raw);
    }
    // Lines before the first header (title, format notes) are ignored.
  }
  return blocks;
}

function parseBlock(block: Block, order: number): ParsedQuestion | string {
  const where = `Завдання ${block.number}`;
  if (!block.type) return `${where}: невідомий тип завдання`;

  const fields: Partial<Record<Field, string>> = {};
  const options: QuestionOption[] = [];
  const leftItems: MatchingItem[] = [];
  const rightOptions: MatchingItem[] = [];
  // Where continuation lines go: a labelled field or the last list item.
  let target: { field: Field } | { item: { text: string } } | null = null;
  // Which matching column numbered/lettered lines belong to.
  let column: "left" | "right" | null = null;

  const append = (prev: string | undefined, line: string) =>
    prev ? `${prev}\n${line}` : line;

  for (const raw of block.lines) {
    const line = raw.trim();
    // Code fences left over from AI chat output.
    if (line.startsWith("```")) continue;
    if (!line) {
      // Blank lines are kept inside multi-line text, dropped elsewhere.
      if (target && "field" in target && fields[target.field])
        fields[target.field] += "\n";
      continue;
    }

    const label = LABELS.find(([re]) => re.test(line));
    if (label) {
      const [re, field] = label;
      const rest = line.replace(re, "").trim();
      column = field === "left" || field === "right" ? field : null;
      target = { field };
      if (rest) fields[field] = append(fields[field], rest);
      continue;
    }

    const item =
      block.type === "mcq"
        ? matchItem(line, MCQ_OPTION_RE, options, normalizeLetter)
        : column === "left"
          ? matchItem(line, LEFT_ITEM_RE, leftItems, (id) => id)
          : column === "right"
            ? matchItem(line, RIGHT_ITEM_RE, rightOptions, normalizeLetter)
            : null;
    if (item) {
      target = { item };
      continue;
    }

    // Text without the ТЕКСТ label still counts as the question text.
    target ??= { field: "text" };
    if ("field" in target) fields[target.field] = append(fields[target.field], line);
    else target.item.text = append(target.item.text, line);
  }

  const text = fields.text?.trim() ?? "";
  const explanation = fields.explanation?.trim() ?? "";
  if (!text) return `${where}: відсутній ТЕКСТ`;

  const base = {
    id: crypto.randomUUID(),
    text,
    explanation,
    points: block.points ?? DEFAULT_POINTS[block.type],
    order,
  };

  let question: TestQuestion;
  if (block.type === "mcq") {
    if (options.length < 2) return `${where}: потрібно щонайменше 2 варіанти А)–Д)`;
    const correct = normalizeLetter(fields.correct ?? "");
    if (!options.some((o) => o.id === correct))
      return `${where}: ПРАВИЛЬНА має бути однією з літер ${options.map((o) => o.id).join(", ")}`;
    question = { ...base, type: "mcq", options, correctOptionId: correct };
  } else if (block.type === "matching") {
    if (!leftItems.length || !rightOptions.length)
      return `${where}: потрібні ЛІВА КОЛОНКА (1., 2., …) і ПРАВА КОЛОНКА (А., Б., …)`;
    const correctPairs: Record<string, string> = {};
    for (const pair of (fields.pairs ?? "").split(/[,;\s]+/).filter(Boolean)) {
      const m = pair.match(/^(\d+)\s*[-–—:]\s*(\S)$/);
      if (!m) return `${where}: не вдалося розібрати пару «${pair}»`;
      correctPairs[m[1]] = normalizeLetter(m[2]);
    }
    const missing = leftItems.filter((l) => !correctPairs[l.id]);
    if (missing.length)
      return `${where}: немає правильної пари для ${missing.map((l) => l.id).join(", ")}`;
    const unknown = Object.values(correctPairs).filter(
      (r) => !rightOptions.some((o) => o.id === r),
    );
    if (unknown.length)
      return `${where}: у ПРАВІЙ КОЛОНЦІ немає варіанта ${unknown.join(", ")}`;
    question = { ...base, type: "matching", leftItems, rightOptions, correctPairs };
  } else {
    // Kept as written: "," and "." are treated as equal when scoring (normalizeOpenAnswer).
    const answer = (fields.answer ?? "").trim();
    if (!answer) return `${where}: відсутня ПРАВИЛЬНА ВІДПОВІДЬ`;
    question = { ...base, type: "open", correctAnswer: answer };
  }

  return {
    number: block.number,
    question,
    imageName: fields.image ? imageBaseName(fields.image) : undefined,
    explanationImageName: fields.explanationImage
      ? imageBaseName(fields.explanationImage)
      : undefined,
  };
}

/** Parse a whole test file. `startOrder` = number of questions already in the test. */
export function parseTestFile(source: string, startOrder = 0): ParseResult {
  const blocks = splitBlocks(source);
  if (!blocks.length)
    return {
      questions: [],
      errors: ["Не знайдено жодного завдання (рядків «### № | Тип | Бали»)"],
    };

  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];
  for (const block of blocks) {
    const r = parseBlock(block, startOrder + questions.length);
    if (typeof r === "string") errors.push(r);
    else questions.push(r);
  }
  return { questions, errors };
}
