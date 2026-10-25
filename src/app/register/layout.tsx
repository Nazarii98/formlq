import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Реєстрація — formlq",
  description:
    "Зареєструйтесь на formlq безкоштовно та почніть підготовку до НМТ з математики вже сьогодні.",
  alternates: {
    canonical: "/register",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The page reads ?next= via useSearchParams, which needs a Suspense boundary.
  return <Suspense>{children}</Suspense>;
}
