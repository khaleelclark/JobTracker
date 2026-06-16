import type { Metadata } from "next";
import { Sora, IBM_Plex_Sans } from "next/font/google";
import path from "node:path";
import { AppNav } from "@/components/AppNav";
import { MuiProvider } from "@/components/MuiProvider";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import Box from "@mui/material/Box";

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
            <Box
              aria-hidden
              sx={{
                position: "fixed",
                inset: 0,
                pointerEvents: "none",
                backgroundImage: "linear-gradient(to right, rgba(15, 118, 110, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 118, 110, 0.03) 1px, transparent 1px)",
                backgroundSize: "42px 42px",
                opacity: 0.65,
                zIndex: -1,
                animation: "gridDrift 30s linear infinite",
                "@media (prefers-reduced-motion: reduce)": { animation: "none" },
              }}
            />
            <AppNav dbLabel={dbLabel} />
            <Box
              component="main"
              sx={{
                width: "min(1220px, 100%)",
                mx: "auto",
                px: { xs: "0.8rem", sm: "1.2rem" },
                py: { xs: "1rem", sm: "2rem" },
                pb: { xs: "2rem", sm: "3rem" },
                animation: "riseIn 300ms ease both",
              }}
            >
              {children}
            </Box>
          </MuiProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
