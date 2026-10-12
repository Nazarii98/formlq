"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePageHeader } from "@/context/HeaderContext";
import { subscribeStudentHomework, Homework } from "@/lib/tutor";
import { isHomeworkOverdue } from "@/lib/homework-status";
import { cn } from "@/lib/utils";
import { SpinnerPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { HomeworkDue, HomeworkListItem } from "@/components/homework/HomeworkListItem";

export default function StudentHomeworkPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [now] = useState(() => Date.now());

  usePageHeader("Домашні завдання", "Завдання від вашого вчителя");

  useEffect(() => {
    if (!user) return;
    return subscribeStudentHomework(user.uid, (l) => {
      setList(l);
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {loading ? (
        <SpinnerPage />
      ) : list.length === 0 ? (
        <EmptyState
          emoji="📭"
          title="Немає домашніх завдань"
          description="Коли вчитель призначить завдання, воно зʼявиться тут."
        />
      ) : (
        <div className="space-y-2">
          {list.map((hw) => {
            const overdue = isHomeworkOverdue(hw, now);
            return (
              <HomeworkListItem
                key={hw.id}
                hw={hw}
                href={`/dashboard/homework/${hw.id}`}
                audience="student"
                overdue={overdue}
                subtitle={
                  hw.dueAt ? (
                    <HomeworkDue hw={hw} withTime className={cn(overdue && "text-red-500")} />
                  ) : (
                    "Без дедлайну"
                  )
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
