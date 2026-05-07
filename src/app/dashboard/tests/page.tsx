"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPublishedTests, TestDoc } from "@/lib/tests";
import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { SpinnerPage } from "@/components/ui/spinner";

function TestCard({ test, index }: { test: TestDoc; index: number }) {
  return (
    <Link href={`/dashboard/exam/${test.id}`} className="block">
      <div className="rounded-2xl border border-border/50 bg-card px-5 py-4 flex items-center gap-4 hover:bg-muted/30 hover:border-border/80 transition-all group">
        {/* Index */}
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary tabular-nums">{index + 1}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{test.title}</p>
          {test.subtitle && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{test.subtitle}</p>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText size={11} />
            <span>{test.questions?.length ?? 0} питань</span>
          </div>
          <ChevronRight
            size={16}
            className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
          />
        </div>
      </div>
    </Link>
  );
}

export default function TestsPage() {
  const { user } = useAuth();
  const [tests, setTests] = useState<TestDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getPublishedTests().then((t) => { setTests(t); setLoading(false); });
  }, [user]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {loading ? <SpinnerPage /> : tests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 py-20 text-center space-y-2">
          <p className="text-3xl">📝</p>
          <p className="font-medium">Тести ще не додані</p>
          <p className="text-sm text-muted-foreground">Зайдіть пізніше</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tests.map((test, i) => (
            <TestCard key={test.id} test={test} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
