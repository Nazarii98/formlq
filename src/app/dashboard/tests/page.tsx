"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPublishedTests, TestDoc } from "@/lib/tests";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

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
      <div>
        <h1 className="text-xl font-bold">Тести НМТ</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Пробні варіанти для підготовки</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : tests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 py-20 text-center space-y-2">
          <p className="text-3xl">📝</p>
          <p className="font-medium">Тести ще не додані</p>
          <p className="text-sm text-muted-foreground">Зайдіть пізніше</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden divide-y divide-border/40">
          {tests.map((test, i) => (
            <Link key={test.id} href={`/dashboard/exam/${test.id}`}>
              <div className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition-colors group">
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{test.title}</p>
                    {test.subtitle && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{test.subtitle}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {test.questions?.length ?? 0} питань
                  </span>
                  <ChevronRight size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
