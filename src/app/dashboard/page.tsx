"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getPublishedTests, TestDoc } from "@/lib/tests";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState<TestDoc[]>([]);
  const [testsLoading, setTestsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    getPublishedTests().then((t) => {
      setTests(t);
      setTestsLoading(false);
    });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📝</span>
          <h1 className="text-xl font-bold">Тести НМТ</h1>
        </div>

        {testsLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Тести ще не додані. Зайдіть пізніше.
          </div>
        ) : (
          <div className="space-y-3">
            {tests.map((test, i) => (
              <Link key={test.id} href={`/exam/${test.id}`}>
                <div className="flex items-center justify-between px-5 py-4 rounded-2xl border border-primary/30 bg-card hover:bg-primary/5 transition-colors cursor-pointer group">
                  <div>
                    <p className="font-semibold">{test.title}</p>
                    {test.subtitle && (
                      <p className="text-sm text-muted-foreground">{test.subtitle}</p>
                    )}
                  </div>
                  <span className="text-muted-foreground group-hover:text-primary transition-colors text-lg">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
