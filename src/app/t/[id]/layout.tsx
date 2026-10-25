import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Тест — formlq",
  // Shared by QR/link only; keep out of search results.
  robots: { index: false, follow: false },
};

export default function PublicTestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
