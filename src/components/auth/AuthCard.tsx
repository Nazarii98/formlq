import Link from "next/link";

interface AuthCardProps {
  title: string;
  footerText: string;
  footerLinkHref: string;
  footerLinkLabel: string;
  children: React.ReactNode;
}

export function AuthCard({ title, footerText, footerLinkHref, footerLinkLabel, children }: AuthCardProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full opacity-[0.12] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-primary), transparent 70%)", animation: "orb1 18s ease-in-out infinite alternate" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 w-[480px] h-[480px] rounded-full opacity-[0.08] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-accent), transparent 70%)", animation: "orb2 22s ease-in-out infinite alternate" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "radial-gradient(circle, var(--color-foreground) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      />

      <style>{`
        @keyframes orb1 { from { transform: translate(0,0) scale(1); } to { transform: translate(60px,40px) scale(1.12); } }
        @keyframes orb2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-50px,-30px) scale(1.08); } }
      `}</style>

      <div className="relative w-full max-w-[400px] flex flex-col gap-7">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1
            className="text-4xl font-bold tracking-tight bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(135deg, var(--color-primary) 30%, var(--color-accent))",
              fontFamily: "var(--font-bubbleboddy)",
            }}
          >
            FORMLQ
          </h1>
          <p className="text-sm text-muted-foreground">Підготовка до НМТ з математики</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-xl overflow-hidden">
          <div className="p-7 flex flex-col gap-5">
            <h2 className="text-xl font-semibold">{title}</h2>
            {children}
          </div>

          <div className="px-7 py-4 border-t border-border/50 bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">
              {footerText}{" "}
              <Link href={footerLinkHref} className="text-primary font-medium hover:underline underline-offset-4">
                {footerLinkLabel}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
