"use client";

import { CssBaseline, GlobalStyles, ThemeProvider, createTheme } from "@mui/material";
import { PropsWithChildren, useMemo } from "react";

export function MuiProvider({ children }: PropsWithChildren) {
  const theme = useMemo(
    () =>
      createTheme({
        typography: {
          fontFamily: "var(--font-body)",
          h1: { fontFamily: "var(--font-heading)" },
          h2: { fontFamily: "var(--font-heading)" },
          h3: { fontFamily: "var(--font-heading)" },
        },
        shape: {
          borderRadius: 12,
        },
        components: {
          MuiButton: {
            defaultProps: {
              variant: "outlined",
            },
            styleOverrides: {
              root: {
                textTransform: "none",
                fontWeight: 400,
                lineHeight: 1.2,
                border: "1px solid rgba(15, 74, 134, 0.25)",
                background: "linear-gradient(145deg, #ffffff 0%, #e5efff 100%)",
                color: "var(--brand-strong)",
                borderRadius: "10px",
                padding: "0.43rem 0.75rem",
                minWidth: "auto",
              },
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: 14,
              },
            },
          },
          MuiSelect: {
            styleOverrides: {
              select: {
                minHeight: "1.2em",
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                borderColor: "var(--line)",
              },
            },
          },
        },
      }),
    [],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles
        styles={{
          ".MuiButton-root.Mui-disabled": {
            opacity: 0.55,
            color: "var(--brand-strong)",
          },
        }}
      />
      {children}
    </ThemeProvider>
  );
}
