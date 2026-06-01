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
  return children;
}
