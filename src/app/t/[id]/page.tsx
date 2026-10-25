"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ReferenceDrawerProvider } from "@/context/ReferenceDrawerContext";
import {
  getTest,
  getLinkAccess,
  studentTestPath,
  type TestDoc,
} from "@/lib/tests";
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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [test, setTest] = useState<TestDoc | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">(
    "loading",
  );

  // Signed-in visitors take it in account mode, so their result is saved. One QR serves both.
  useEffect(() => {
    if (!authLoading && user) router.replace(studentTestPath(id));
  }, [authLoading, user, id, router]);

  useEffect(() => {
    if (authLoading || user) return;
    let cancelled = false;
    // Firestore rules only allow this read for tests with link access "anyone".
    getTest(id)
      .then((t) => {
        if (cancelled) return;
        if (t && getLinkAccess(t) === "anyone") {
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
  }, [id, authLoading, user]);

  if (state === "loading" || authLoading || user) return <SpinnerScreen />;

  if (state === "unavailable" || !test)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-4xl">🔒</p>
          <h1 className="text-lg font-semibold">Тест недоступний</h1>
          <p className="text-sm text-muted-foreground">
            Вчитель закрив доступ без акаунта. Якщо ви учень — увійдіть, щоб
            відкрити тест.
          </p>
          <Link href={withNext("/login", studentTestPath(id))}>
            <Button variant="outline" className="mt-2">
              Увійти
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
        // Invite to sign up and come back to this test with results saved.
        resultsHref={withNext("/register", studentTestPath(test.id))}
        resultsLabel="Зберігати результати"
        startLabel="Почати тест →"
      />
    </ReferenceDrawerProvider>
  );
}
