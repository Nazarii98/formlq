"use client";

import { useState } from "react";
import { Check, ChevronRight, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EXAMPLE = `### 1 | Вибір відповіді | 1
ТЕКСТ: Обчисліть $\\frac{1}{2} + \\frac{1}{3}$.
ЗОБРАЖЕННЯ: q1.png
А) $\\frac{5}{6}$
Б) $\\frac{2}{5}$
В) $1$
Г) $\\frac{1}{6}$
Д) $\\frac{2}{3}$
ПРАВИЛЬНА: А
ПОЯСНЕННЯ: Зводимо до спільного знаменника 6.

### 2 | Відповідність | 3
ТЕКСТ: Установіть відповідність між функцією та її похідною.
ЛІВА КОЛОНКА:
1. $x^2$
2. $\\sin x$
3. $e^x$
ПРАВА КОЛОНКА:
А. $e^x$
Б. $\\cos x$
В. $-\\cos x$
Г. $2x$
Д. $x$
ПРАВИЛЬНІ ПАРИ: 1-Г, 2-Б, 3-А
ПОЯСНЕННЯ: Таблиця похідних.
ЗОБРАЖЕННЯ ДО ПОЯСНЕННЯ: q2-solution.png

### 3 | Вписати відповідь | 2
ТЕКСТ: Розв'яжіть рівняння $2x = 5$.
ПРАВИЛЬНА ВІДПОВІДЬ: 2,5
ПОЯСНЕННЯ: $x = 5 : 2 = 2{,}5$.`;

const AI_PROMPT = `Convert the test below into a plain-text import format for an educational platform.

OUTPUT LANGUAGE: Ukrainian. All question text, options, matching items and explanations must be written in Ukrainian (keep the original wording if the test is already in Ukrainian; translate otherwise). The field labels and type names below are part of the format and must be copied EXACTLY as shown, in Ukrainian.

Output ONLY the file content — no comments before or after it, no markdown code fences.

FORMAT RULES
1. Every question starts with a header line: ### <number> | <type> | <points>
   Allowed types (copy verbatim): "Вибір відповіді" (1 point), "Відповідність" (3 points), "Вписати відповідь" (2 points).
2. Each field starts on a new line with its UPPERCASE label followed by a colon. A value may span several lines.
3. All math must be LaTeX inside $...$ (e.g. $\\sqrt{x}$, $\\frac{a}{b}$, $x^2$). Never use \\( \\) or \\[ \\].
4. Option letters must be CYRILLIC only: А, Б, В, Г, Д (not Latin A, B).
5. If a question has a picture/graph, add the line "ЗОБРАЖЕННЯ: <file-name>.png" with a short Latin file name (e.g. q5.png). List the pictures to be saved under these names at the VERY BEGINNING, before the first ###. If there is no picture, omit the line.
6. If no explanation is given, solve the question and write a short solution in Ukrainian. Double-check that the correct answer matches your solution.

MULTIPLE CHOICE
### 1 | Вибір відповіді | 1
ТЕКСТ: <question text>
ЗОБРАЖЕННЯ: <file>   (only if there is a picture)
А) <option>
Б) <option>
В) <option>
Г) <option>
Д) <option>
ПРАВИЛЬНА: <one letter>
ПОЯСНЕННЯ: <solution>
ЗОБРАЖЕННЯ ДО ПОЯСНЕННЯ: <file>   (only if there is a picture)

MATCHING
### 2 | Відповідність | 3
ТЕКСТ: <question text>
ЛІВА КОЛОНКА:
1. <item>
2. <item>
3. <item>
ПРАВА КОЛОНКА:
А. <option>
Б. <option>
В. <option>
Г. <option>
Д. <option>
ПРАВИЛЬНІ ПАРИ: 1-Г, 2-В, 3-А
ПОЯСНЕННЯ: <solution>

SHORT ANSWER
### 3 | Вписати відповідь | 2
ТЕКСТ: <question text>
ПРАВИЛЬНА ВІДПОВІДЬ: <a number only, no units; use a comma as the decimal separator, e.g. 2,5>
ПОЯСНЕННЯ: <solution>

TEST:
<paste the test here or attach a PDF/photo>`;

/** Field reference per question type: [label as written in the file, what it means]. */
const FIELDS: { title: string; header?: string; rows: [string, string][] }[] = [
  {
    title: "Вибір відповіді",
    header: "### 1 | Вибір відповіді | 1",
    rows: [
      ["ТЕКСТ:", "Умова завдання"],
      ["А) … Д)", "Варіанти, кожен з нового рядка"],
      ["ПРАВИЛЬНА:", "Одна літера, напр. Б"],
    ],
  },
  {
    title: "Відповідність",
    header: "### 2 | Відповідність | 3",
    rows: [
      ["ТЕКСТ:", "Умова завдання"],
      ["ЛІВА КОЛОНКА:", "Далі рядки 1. 2. 3."],
      ["ПРАВА КОЛОНКА:", "Далі рядки А. Б. В. Г. Д."],
      ["ПРАВИЛЬНІ ПАРИ:", "1-Г, 2-В, 3-А"],
    ],
  },
  {
    title: "Вписати відповідь",
    header: "### 3 | Вписати відповідь | 2",
    rows: [
      ["ТЕКСТ:", "Умова завдання"],
      ["ПРАВИЛЬНА ВІДПОВІДЬ:", "Лише число; 2,5 і 2.5 зараховуються однаково"],
    ],
  },
  {
    title: "Необов'язкові поля (будь-який тип)",
    rows: [
      ["ПОЯСНЕННЯ:", "Розв'язок, який учень побачить після тесту"],
      ["ЗОБРАЖЕННЯ:", "Ім'я файлу з папки images, напр. q1.png"],
      ["ЗОБРАЖЕННЯ ДО ПОЯСНЕННЯ:", "Так само, для пояснення"],
    ],
  },
];

const FOLDER_TREE = `Варіант 1/
├─ test.txt
└─ images/
   ├─ q1.png
   └─ q2-solution.png`;

/** Clipboard copy with a short-lived "copied" flag for the button label. */
function useCopy() {
  const [copied, setCopied] = useState(false);
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Не вдалося скопіювати");
    }
  }
  return { copied, copy };
}

/** How to prepare an import file: AI-first steps, field reference, full example. */
export function FileImportGuide({
  onGoToImport,
}: {
  onGoToImport: () => void;
}) {
  const prompt = useCopy();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Як отримати файл</h3>
        <ol className="space-y-2">
          <Step n={1} title="Згенеруйте файл за допомогою ШІ">
            <p>
              Скопіюйте промпт, вставте в ChatGPT, Claude чи Gemini і додайте
              тест — текстом, PDF або фото.
            </p>
            <Button
              size="sm"
              className="mt-2"
              onClick={() => prompt.copy(AI_PROMPT)}
            >
              {prompt.copied ? <Check /> : <Copy />}
              {prompt.copied ? "Скопійовано" : "Скопіювати промпт"}
            </Button>
            <Disclosure label="Показати промпт">
              <Pre text={AI_PROMPT} />
            </Disclosure>
          </Step>
          <Step n={2} title="Збережіть усе в одну папку">
            <p>Відповідь ШІ — у файл .txt, малюнки — у папку images поруч.</p>
            <Pre text={FOLDER_TREE} />
          </Step>
          <Step n={3} title="Імпортуйте папку">
            <p>Перевірте попередній перегляд і натисніть «Імпортувати».</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={onGoToImport}
            >
              До імпорту <ChevronRight />
            </Button>
          </Step>
        </ol>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Формат файлу</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Кожне завдання починається із заголовка «### номер | тип | бали».
            Поле — мітка з двокрапкою на початку рядка, значення може займати
            кілька рядків. Формули — LaTeX у $…$.
          </p>
        </div>
        {FIELDS.map((t) => (
          <FieldTable key={t.title} {...t} />
        ))}
        <Disclosure label="Повний приклад файлу">
          <Pre text={EXAMPLE} copyable />
        </Disclosure>
      </section>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 rounded-xl border border-border/50 p-4">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary tabular-nums">
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
          {children}
        </div>
      </div>
    </li>
  );
}

function FieldTable({
  title,
  header,
  rows,
}: {
  title: string;
  header?: string;
  rows: [string, string][];
}) {
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 bg-muted/40 px-4 py-2">
        <span className="text-xs font-semibold shrink-0">{title}</span>
        {header && (
          <code className="text-[11px] text-muted-foreground truncate">
            {header}
          </code>
        )}
      </div>
      <dl className="divide-y divide-border/40">
        {rows.map(([label, meaning]) => (
          <div
            key={label}
            className="grid grid-cols-1 sm:grid-cols-[12rem_1fr] gap-x-4 gap-y-0.5 px-4 py-2 text-xs"
          >
            <dt className="font-mono font-medium">{label}</dt>
            <dd className="text-muted-foreground">{meaning}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Disclosure({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 py-1 text-xs font-medium text-primary hover:underline"
      >
        <ChevronRight
          size={14}
          className={cn("transition-transform", open && "rotate-90")}
        />
        {label}
      </button>
      {open && <div className="pt-1">{children}</div>}
    </div>
  );
}

function Pre({ text, copyable }: { text: string; copyable?: boolean }) {
  const { copied, copy } = useCopy();
  return (
    <div className="relative">
      {copyable && (
        <Button
          variant="outline"
          size="xs"
          className="absolute right-2 top-2"
          onClick={() => copy(text)}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? "Скопійовано" : "Копіювати"}
        </Button>
      )}
      <pre className="max-h-64 overflow-auto rounded-lg bg-muted/50 p-3 text-xs leading-relaxed whitespace-pre-wrap font-mono text-foreground">
        {text}
      </pre>
    </div>
  );
}
