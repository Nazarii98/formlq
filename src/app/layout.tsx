import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Nunito,
  Roboto,
  Montserrat,
  Unbounded,
  Comfortaa,
  Geologica,
  Fredoka,
} from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ExamGuardProvider } from "@/context/ExamGuardContext";
import { HeaderProvider } from "@/context/HeaderContext";
import { QueryProvider } from "@/components/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
});

const comfortaa = Comfortaa({
  variable: "--font-comfortaa",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
});

const bubbleboddy = localFont({
  src: [
    { path: "../../public/fonts/BubbleboddyNeue-Regular.ttf", weight: "400" },
    { path: "../../public/fonts/BubbleboddyNeue-Bold.ttf", weight: "700" },
  ],
  variable: "--font-bubbleboddy",
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geologica = Geologica({
  variable: "--font-geologica",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "formlq — підготовка до НМТ з математики",
    template: "%s | formlq",
  },
  description:
    "Безкоштовна онлайн-платформа для підготовки до НМТ з математики. Пробні тести, тренувальні завдання, детальний аналіз результатів. НМТ 2025 математика.",
  keywords: [
    "НМТ математика",
    "підготовка до НМТ",
    "НМТ 2025",
    "пробне НМТ",
    "тести НМТ математика",
    "НМТ завдання",
    "онлайн тести НМТ",
    "тренування НМТ",
    "математика НМТ онлайн",
    "formlq",
    "підготовка до іспиту математика",
    "НМТ підготовка безкоштовно",
  ],
  authors: [{ name: "formlq" }],
  creator: "formlq",
  metadataBase: new URL("https://www.formlq.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "uk_UA",
    url: "https://www.formlq.com",
    siteName: "formlq",
    title: "formlq — підготовка до НМТ з математики",
    description:
      "Безкоштовна онлайн-платформа для підготовки до НМТ з математики. Пробні тести, тренувальні завдання, аналіз результатів.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "formlq — підготовка до НМТ з математики",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "formlq — підготовка до НМТ з математики",
    description:
      "Безкоштовна онлайн-платформа для підготовки до НМТ з математики. Пробні тести, аналіз результатів.",
    images: ["/og-image.png"],
  },
  verification: {
    google: "google6e99d53ac0180b1f",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "formlq",
  url: "https://www.formlq.com",
  description:
    "Онлайн-платформа для підготовки до НМТ з математики. Пробні тести, тренувальні завдання, аналіз результатів.",
  inLanguage: "uk",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "UAH",
    description: "Безкоштовна підготовка до НМТ з математики",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uk"
      className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} ${roboto.variable} ${montserrat.variable} ${unbounded.variable} ${comfortaa.variable} ${geologica.variable} ${fredoka.variable} ${bubbleboddy.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>
              <ExamGuardProvider>
                <HeaderProvider>{children}</HeaderProvider>
              </ExamGuardProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
