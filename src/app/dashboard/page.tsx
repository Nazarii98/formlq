"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { getTips } from "@/lib/tips";
import { DailyTip } from "@/components/dashboard/DailyTip";
import { DailyQuestion } from "@/components/dashboard/DailyQuestion";
import { UpcomingHomework } from "@/components/dashboard/UpcomingHomework";
import { CalendarWidget } from "@/components/dashboard/CalendarWidget";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: tips = [] } = useQuery({
    queryKey: queryKeys.tips,
    queryFn: getTips,
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
      <div className="space-y-6">
        <DailyTip tips={tips} />
        {user && <DailyQuestion userId={user.uid} />}
        {user && <UpcomingHomework userId={user.uid} />}
      </div>

      <div className="space-y-6">{user && <CalendarWidget userId={user.uid} />}</div>
    </div>
  );
}
