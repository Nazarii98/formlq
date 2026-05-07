"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPublishedTests, TestDoc } from "@/lib/tests";
import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";

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
        <div className="space-y-2">
          {tests.map((test) => (
            <Link key={test.id} href={`/exam/${test.id}`}>
              <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-border/40 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{test.title}</p>
                  {test.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{test.subtitle}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {test.questions?.length ?? 0} питань
                  </p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
