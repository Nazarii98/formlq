"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface ExamGuardContextType {
  isGuarded: boolean;
  setGuarded: (v: boolean) => void;
  requestNav: (href: string) => void;
  requestAction: (fn: () => void) => void;
}

const ExamGuardContext = createContext<ExamGuardContextType>({
  isGuarded: false,
  setGuarded: () => {},
  requestNav: () => {},
  requestAction: () => {},
});

export function ExamGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isGuarded, setGuarded] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const requestNav = useCallback((href: string) => {
    if (isGuarded) {
      setPendingAction(() => () => router.push(href));
    } else {
      router.push(href);
    }
  }, [isGuarded, router]);

  const requestAction = useCallback((fn: () => void) => {
    if (isGuarded) {
      setPendingAction(() => fn);
    } else {
      fn();
    }
  }, [isGuarded]);

  function confirm() {
    pendingAction?.();
    setPendingAction(null);
    setGuarded(false);
  }

  function cancel() {
    setPendingAction(null);
  }

  return (
    <ExamGuardContext.Provider value={{ isGuarded, setGuarded, requestNav, requestAction }}>
      {children}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4 space-y-4">
            <div className="space-y-1">
              <p className="font-semibold text-base">Вийти з іспиту?</p>
              <p className="text-sm text-muted-foreground">Прогрес не збережеться. Таймер зупиниться і результат не зарахується.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={cancel}
                className="flex-1 px-4 py-2 rounded-xl border border-border/60 text-sm font-medium hover:bg-muted transition-colors"
              >
                Залишитись
              </button>
              <button
                onClick={confirm}
                className="flex-1 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Вийти
              </button>
            </div>
          </div>
        </div>
      )}
    </ExamGuardContext.Provider>
  );
}

export const useExamGuard = () => useContext(ExamGuardContext);
