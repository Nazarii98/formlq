import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito, Roboto, Montserrat, Unbounded, Comfortaa, Geologica, Fredoka } from "next/font/google";
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
    { path: "../../public/fonts/BubbleboddyNeue-Bold.ttf",    weight: "700" },
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
  title: "formlq — підготовка до НМТ з математики",
  description: "Платформа для підготовки до НМТ з математики. Тренування, пробні тести, прогрес.",
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
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('color-theme');if(t)document.documentElement.setAttribute('data-theme',t);var f=localStorage.getItem('font-theme');if(f)document.documentElement.setAttribute('data-font',f);}catch(e){}})()`,
          }}
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
