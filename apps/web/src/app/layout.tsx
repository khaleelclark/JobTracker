import type { Metadata } from "next";
import { Sora, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import path from "node:path";
import { AppNav } from "@/components/AppNav";
import { MuiProvider } from "@/components/MuiProvider";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";

const headingFont = Sora({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
});

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Job Tracker",
  description: "Passive local-first job search tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dbUrl = process.env.DATABASE_URL ?? "";
  const dbFile = path.basename(dbUrl.replace(/^file:/, ""));
  const dbLabel = dbFile && dbFile !== "job-tracker.sqlite" ? dbFile : null;

  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>
        <AppRouterCacheProvider>
          <MuiProvider>
            <div className="bg-layer" aria-hidden />
            <AppNav dbLabel={dbLabel} />
            <main className="page-shell">{children}</main>
          </MuiProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
