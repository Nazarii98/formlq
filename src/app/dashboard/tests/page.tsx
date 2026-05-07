"use client";

import { useAuth } from "@/context/AuthContext";
import { getPublishedTests } from "@/lib/tests";
import { SpinnerPage } from "@/components/ui/spinner";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { TestDoc } from "@/lib/tests";

function TestCard({ test, index }: { test: TestDoc; index: number }) {
  return (
    <Link href={`/dashboard/exam/${test.id}`} className="block">
      <div className="rounded-2xl border border-border/50 bg-card px-5 py-4 flex items-center gap-4 hover:bg-muted/30 hover:border-border/80 transition-all group">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary tabular-nums">{index + 1}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{test.title}</p>
          {test.subtitle && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{test.subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText size={11} />
            <span>{test.questions?.length ?? 0} питань</span>
          </div>
          <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  );
}

export default function TestsPage() {
  const { user } = useAuth();

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ["published-tests"],
    queryFn: getPublishedTests,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {isLoading ? <SpinnerPage /> : tests.length === 0 ? (
        <EmptyState emoji="📝" title="Тести ще не додані" description="Зайдіть пізніше" />
      ) : (
        <div className="space-y-2">
          {tests.map((test, i) => <TestCard key={test.id} test={test} index={i} />)}
        </div>
      )}
    </div>
  );
}
