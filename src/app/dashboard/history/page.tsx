"use client";

import { useAuth } from "@/context/AuthContext";
import { getUserResults } from "@/lib/tests";
import { SpinnerPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ResultListItem } from "@/components/exam/ResultListItem";
import { useQuery } from "@tanstack/react-query";

export default function HistoryPage() {
  const { user } = useAuth();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["results", user?.uid],
    queryFn: () => getUserResults(user!.uid),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {isLoading ? (
        <SpinnerPage />
      ) : results.length === 0 ? (
        <EmptyState
          emoji="📋"
          title="Ще немає результатів"
          description="Пройдіть перший тест і він з'явиться тут"
        />
      ) : (
        <div className="space-y-2">
          {results.map((r) => (
            <ResultListItem
              key={r.id}
              result={r}
              href={`/dashboard/results/${r.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
