"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useHeader } from "@/context/HeaderContext";
import { getTutorStudents, assignHomework, NewHomework } from "@/lib/tutor";
import {
  getPublishedTests,
  bankToTestQuestion,
  makeLinearTable,
  maxRawScore,
  TestQuestion,
  BankQuestion,
} from "@/lib/tests";
import { getAllQuestions } from "@/lib/questions";
import { uploadPdf } from "@/lib/storage";
import { TOPICS } from "@/lib/topics";
import { MathText } from "@/components/MathText";
import { SelectNative } from "@/components/ui/select-native";
import { Button } from "@/components/ui/button";
import { SpinnerPage } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { FileText, Library, Check, Loader2, FileUp, X } from "lucide-react";

const TYPE_LABEL: Record<TestQuestion["type"], string> = {
  mcq: "Тест",
  open: "Відкрите",
  matching: "Відповідність",
};

export default function NewHomeworkPage() {
  const { user } = useAuth();
  const { setHeader } = useHeader();
  const router = useRouter();
  const params = useSearchParams();

  const [studentId, setStudentId] = useState(params.get("student") ?? "");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [due, setDue] = useState(""); // datetime-local string
  const [source, setSource] = useState<"test" | "custom">("test");
  const [testId, setTestId] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfUploading, setPdfUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handlePdf(file: File) {
    setPdfUploading(true);
    try {
      const url = await uploadPdf(file);
      setPdfUrl(url);
      setPdfName(file.name);
    } finally {
      setPdfUploading(false);
    }
  }

  // bank picker
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bankSearch, setBankSearch] = useState("");
  const [bankTopic, setBankTopic] = useState("all");
  const [bankType, setBankType] = useState<"all" | "mcq" | "open" | "matching">(
    "all",
  );

  useEffect(() => {
    setHeader("Нове домашнє завдання", "");
    return () => setHeader("", "");
  }, [setHeader]);

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["tutor-students", user?.uid],
    queryFn: () => getTutorStudents(user!.uid),
    enabled: !!user,
  });

  const { data: tests = [] } = useQuery({
    queryKey: ["published-tests"],
    queryFn: getPublishedTests,
    staleTime: 5 * 60 * 1000,
  });

  const { data: bank = [] } = useQuery({
    queryKey: ["bank-questions"],
    queryFn: getAllQuestions,
    staleTime: 5 * 60 * 1000,
    select: (qs) => qs.filter((q) => q.status === "approved"),
  });

  const selectedTest = tests.find((t) => t.id === testId);

  const filteredBank = useMemo(() => {
    const s = bankSearch.toLowerCase();
    return bank.filter((q) => {
      if (bankTopic !== "all" && q.topicId !== bankTopic) return false;
      if (bankType !== "all" && q.type !== bankType) return false;
      if (s && !q.text.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [bank, bankSearch, bankTopic, bankType]);

  const customQuestions: TestQuestion[] = useMemo(() => {
    const chosen = bank.filter((q) => picked.has(q.id));
    return chosen.map((q, i) => bankToTestQuestion(q as BankQuestion, i));
  }, [bank, picked]);

  const customMaxRaw = maxRawScore(customQuestions);

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canSubmit =
    !!user &&
    !!studentId &&
    title.trim().length > 0 &&
    (source === "test" ? !!testId : customQuestions.length > 0);

  async function handleAssign() {
    if (!canSubmit || !user) return;
    setSaving(true);
    try {
      const student = students.find((s) => s.studentId === studentId);
      const base = {
        tutorId: user.uid,
        tutorName: user.displayName ?? undefined,
        studentId,
        studentName: student?.studentName,
        title: title.trim(),
        note: note.trim() || undefined,
        pdfUrl: pdfUrl || undefined,
        dueAt: due ? Timestamp.fromDate(new Date(due)) : null,
      };

      let payload: NewHomework;
      if (source === "test" && selectedTest) {
        payload = {
          ...base,
          source: "test",
          testId: selectedTest.id,
          scoreTable: selectedTest.scoreTable,
          scaleType: selectedTest.scaleType ?? "nmt",
          durationMinutes: selectedTest.durationMinutes ?? 150,
        };
      } else {
        payload = {
          ...base,
          source: "custom",
          questions: customQuestions,
          scoreTable: makeLinearTable(customMaxRaw),
          scaleType: "custom",
          durationMinutes: 0, // homework is untimed
        };
      }
      await assignHomework(payload);
      router.push("/tutor/homework");
    } finally {
      setSaving(false);
    }
  }

  if (studentsLoading) return <SpinnerPage />;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      {/* Student */}
      <Field label="Учень">
        <SelectNative
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        >
          <option value="">Оберіть учня...</option>
          {students.map((s) => (
            <option key={s.studentId} value={s.studentId}>
              {s.studentName} ({s.studentEmail})
            </option>
          ))}
        </SelectNative>
        {students.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Немає учнів. Додайте учня на сторінці «Мої учні».
          </p>
        )}
      </Field>

      {/* Title + note + due */}
      <Field label="Назва завдання">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Напр. Домашня №3 — Похідна"
          className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Дедлайн (необовʼязково)">
          <input
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </Field>
        <Field label="Коментар для учня (необовʼязково)">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Напр. Зверни увагу на №5"
            className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </Field>
      </div>

      {/* Конспект PDF */}
      <Field label="Конспект (PDF, необовʼязково)">
        {pdfUrl ? (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/50 bg-card text-sm">
            <FileText size={16} className="text-primary shrink-0" />
            <span className="flex-1 min-w-0 truncate">{pdfName || "Конспект.pdf"}</span>
            <button
              onClick={() => { setPdfUrl(""); setPdfName(""); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 shrink-0"
              title="Прибрати"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <label
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:text-foreground transition-all",
              pdfUploading && "pointer-events-none opacity-60",
            )}
          >
            {pdfUploading ? <><Loader2 size={15} className="animate-spin" /> Завантаження...</> : <><FileUp size={15} /> Прикріпити PDF</>}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdf(f); e.target.value = ""; }}
            />
          </label>
        )}
      </Field>

      {/* Source switch */}
      <div className="flex gap-2 p-1 rounded-2xl bg-muted/50 border border-border/40">
        <SourceTab
          active={source === "test"}
          onClick={() => setSource("test")}
          Icon={FileText}
          label="Готовий тест"
        />
        <SourceTab
          active={source === "custom"}
          onClick={() => setSource("custom")}
          Icon={Library}
          label="З банку завдань"
        />
      </div>

      {source === "test" ? (
        <Field label="Тест (включно з імітаціями НМТ)">
          <SelectNative
            value={testId}
            onChange={(e) => {
              setTestId(e.target.value);
              const t = tests.find((x) => x.id === e.target.value);
              if (t && !title.trim()) setTitle(t.title);
            }}
          >
            <option value="">Оберіть тест...</option>
            {tests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
                {t.subtitle ? ` — ${t.subtitle}` : ""}
              </option>
            ))}
          </SelectNative>
          {selectedTest && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {selectedTest.questions.length} питань ·{" "}
              {maxRawScore(selectedTest.questions)} балів ·{" "}
              {(selectedTest.scaleType ?? "nmt") === "nmt"
                ? "шкала НМТ 100–200"
                : "власна шкала"}
            </p>
          )}
        </Field>
      ) : (
        <div className="space-y-3">
          {/* Bank filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              value={bankSearch}
              onChange={(e) => setBankSearch(e.target.value)}
              placeholder="Пошук..."
              className="px-3 py-2 rounded-xl border border-border/50 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <SelectNative
              value={bankTopic}
              onChange={(e) => setBankTopic(e.target.value)}
            >
              <option value="all">Усі теми</option>
              {TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </SelectNative>
            <SelectNative
              value={bankType}
              onChange={(e) => setBankType(e.target.value as typeof bankType)}
            >
              <option value="all">Усі типи</option>
              <option value="mcq">Тест</option>
              <option value="open">Відкрите</option>
              <option value="matching">Відповідність</option>
            </SelectNative>
          </div>

          <p className="text-xs text-muted-foreground px-1">
            Обрано: {picked.size} · {customMaxRaw} балів
          </p>

          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {filteredBank.map((q) => {
              const isPicked = picked.has(q.id);
              return (
                <button
                  key={q.id}
                  onClick={() => togglePick(q.id)}
                  className={cn(
                    "w-full text-left rounded-xl border px-3 py-2.5 flex items-start gap-3 transition-all",
                    isPicked
                      ? "border-primary bg-primary/5"
                      : "border-border/50 bg-card hover:border-border/80",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0",
                      isPicked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {isPicked && <Check size={13} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm line-clamp-2">
                      <MathText text={q.text || "—"} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {TYPE_LABEL[q.type]}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Складність {q.difficulty}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredBank.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Немає завдань за фільтром
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="lg" onClick={() => router.back()}>
          Скасувати
        </Button>
        <Button
          size="lg"
          disabled={!canSubmit || saving}
          onClick={handleAssign}
          className="gap-1.5"
        >
          <Check size={16} />
          {saving ? "Призначення..." : "Призначити"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground px-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function SourceTab({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  Icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all",
        active
          ? "bg-card text-foreground shadow-sm border border-border/50"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}
