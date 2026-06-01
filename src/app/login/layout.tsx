import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Вхід — formlq",
  description:
    "Увійдіть до formlq — платформи для підготовки до НМТ з математики. Тренувальні тести, прогрес, аналіз результатів.",
  alternates: {
    canonical: "/login",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
