"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TutorIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/tutor/students");
  }, [router]);
  return null;
}
