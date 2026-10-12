"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePageHeader } from "@/context/HeaderContext";
import { subscribeTutorHomework, Homework } from "@/lib/tutor";
import { SpinnerPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { HomeworkDue, HomeworkListItem } from "@/components/homework/HomeworkListItem";

export default function TutorHomeworkPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [list, setList] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  usePageHeader("Домашні завдання", "Призначені учням");

  useEffect(() => {
    if (!user) return;
    return subscribeTutorHomework(user.uid, (l) => {
      setList(l);
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex justify-end">
        <Button size="lg" className="gap-1.5" onClick={() => router.push("/tutor/homework/new")}>
          <Plus size={16} />
          Нове завдання
        </Button>
      </div>

      {loading ? (
        <SpinnerPage />
      ) : list.length === 0 ? (
        <EmptyState
          emoji="📚"
          title="Немає завдань"
          description="Призначте перше домашнє завдання своєму учневі."
        />
      ) : (
        <div className="space-y-2">
          {list.map((hw) => (
            <HomeworkListItem
              key={hw.id}
              hw={hw}
              href={`/tutor/homework/${hw.id}`}
              audience="tutor"
              subtitle={
                <>
                  {hw.studentName ?? "Учень"}
                  <HomeworkDue hw={hw} className="ml-2" />
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
