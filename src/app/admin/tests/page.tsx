"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getAllTests, createTest, deleteTest, TestDoc } from "@/lib/tests";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRight, Trash2, Plus, FileText } from "lucide-react";

export default function AdminTestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState<TestDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    getAllTests().then((t) => { setTests(t); setLoading(false); });
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

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
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
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
        >
          <Plus size={15} />
          {creating ? "Створення..." : "Новий тест"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : tests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 py-20 text-center space-y-2">
          <p className="text-3xl">📝</p>
          <p className="font-medium">Тестів ще немає</p>
          <p className="text-sm text-muted-foreground">Створіть перший тест</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tests.map((test) => (
            <Link key={test.id} href={`/admin/tests/${test.id}`} className="block">
              <div className="rounded-2xl border border-border/50 bg-card px-5 py-4 flex items-center gap-4 hover:bg-muted/30 hover:border-border/80 transition-all group">
                {/* Status */}
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0 transition-all",
                  test.published ? "bg-green-500" : "bg-muted-foreground/30"
                )} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{test.title || "Без назви"}</p>
                  {test.subtitle && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{test.subtitle}</p>
                  )}
                </div>

                {/* Meta + actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText size={11} />
                    <span>{test.questions?.length ?? 0} питань</span>
                  </div>

                  <button
                    onClick={(e) => handleDelete(e, test.id)}
                    disabled={deletingId === test.id}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>

                  <ChevronRight
                    size={16}
                    className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
