"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ReferenceDrawerProvider } from "@/context/ReferenceDrawerContext";
import { getTest, studentTestPath, type TestDoc } from "@/lib/tests";
import { ExamRunner } from "@/components/exam/ExamRunner";
import { Button } from "@/components/ui/button";
import { SpinnerScreen } from "@/components/ui/spinner";
import { withNext } from "@/lib/utils";

const ReferenceDrawer = dynamic(
  () =>
    import("@/components/ReferenceDrawer").then((m) => ({
      default: m.ReferenceDrawer,
    })),
  { ssr: false },
);

/**
 * Account-free attempt opened from a public QR code / link. Nothing is saved:
 * the score and review are shown once and lost on reload.
 */
export default function PublicTestPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [test, setTest] = useState<TestDoc | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    // Firestore rules only allow this read for published tests with publicAccess.
    getTest(id)
      .then((t) => {
        if (cancelled) return;
        if (t?.published && t.publicAccess) {
          setTest(t);
          setState("ready");
        } else setState("unavailable");
      })
      .catch(() => {
        if (!cancelled) setState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state === "loading") return <SpinnerScreen />;

  if (state === "unavailable" || !test)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-4xl">🔒</p>
          <h1 className="text-lg font-semibold">Тест недоступний</h1>
          <p className="text-sm text-muted-foreground">
            Посилання застаріло або вчитель закрив публічний доступ до цього
            тесту.
          </p>
          <Link href={user ? "/dashboard" : "/login"}>
            <Button variant="outline" className="mt-2">
              {user ? "На головну" : "Увійти"}
            </Button>
          </Link>
        </div>
      </div>
    );

  return (
    <ReferenceDrawerProvider>
      <ReferenceDrawer />
      <ExamRunner
        config={{
          id: test.id,
          title: test.title,
          subtitle: test.subtitle,
          questions: test.questions ?? [],
          scoreTable: test.scoreTable ?? [],
          scaleType: test.scaleType ?? "nmt",
          durationMinutes: test.durationMinutes ?? 150,
        }}
        backHref={null}
        introNote="Результат не зберігається — його буде видно лише одразу після завершення."
        // Public attempts are never persisted.
        onSubmit={async () => ""}
        allowRestart
        // Signed-in students can retake it with history; others are invited to sign up.
        resultsHref={
          user
            ? studentTestPath(test.id)
            : withNext("/register", studentTestPath(test.id))
        }
        resultsLabel={user ? "Пройти з акаунтом" : "Зберігати результати"}
        startLabel="Почати тест →"
      />
    </ReferenceDrawerProvider>
  );
}
