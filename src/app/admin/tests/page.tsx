"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAllTests, createTest, deleteTest, TestDoc } from "@/lib/tests";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AdminTestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState<TestDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    getAllTests().then((t) => {
      setTests(t);
      setLoading(false);
    });
  }, []);

  async function handleCreate() {
    if (!user) return;
    setCreating(true);
    try {
      const id = await createTest(user.uid);
      router.push(`/admin/tests/${id}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Видалити тест? Цю дію не можна скасувати.")) return;
    setDeletingId(id);
    try {
      await deleteTest(id);
      setTests((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Тести</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Адмін-панель</p>
          </div>
          <Button onClick={handleCreate} disabled={creating} size="sm">
            {creating ? "Створення..." : "+ Новий тест"}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Тестів ще немає. Створіть перший.
          </div>
        ) : (
          <div className="space-y-2">
            {tests.map((test) => (
              <div
                key={test.id}
                className="flex items-center justify-between px-5 py-4 rounded-2xl border border-border/50 bg-card"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{test.title || "Без назви"}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs shrink-0",
                        test.published
                          ? "border-green-500/40 text-green-600 bg-green-500/10"
                          : "border-border/50 text-muted-foreground"
                      )}
                    >
                      {test.published ? "Опубліковано" : "Чернетка"}
                    </Badge>
                  </div>
                  {test.subtitle && (
                    <p className="text-sm text-muted-foreground truncate">{test.subtitle}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {test.questions?.length ?? 0} питань
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <Link href={`/admin/tests/${test.id}`}>
                    <Button variant="outline" size="sm">Редагувати</Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={deletingId === test.id}
                    onClick={() => handleDelete(test.id)}
                  >
                    {deletingId === test.id ? "..." : "Видалити"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
