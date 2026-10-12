"use client";

import { AppShell, SectionGreeting } from "@/components/AppShell";
import { canTutor } from "@/lib/roles";

export default function TutorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      // Editors may also enter the tutor area (admins manage everything).
      allow={({ userProfile }) => canTutor(userProfile?.role)}
      redirectTo="/dashboard"
      homePath="/tutor"
      fallbackName="Вчитель"
      greetWhenUntitled
      greeting={(name) => <SectionGreeting label="Кабінет вчителя" name={name} />}
    >
      {children}
    </AppShell>
  );
}
