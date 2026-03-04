import type { Metadata } from "next";
import { Sora, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { AppNav } from "@/components/AppNav";
import { MuiProvider } from "@/components/MuiProvider";

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
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>
        <MuiProvider>
          <div className="bg-layer" aria-hidden />
          <AppNav />
          <main className="page-shell">{children}</main>
        </MuiProvider>
      </body>
    </html>
  );
}
