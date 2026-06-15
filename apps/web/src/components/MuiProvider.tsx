"use client";

import {
  CssBaseline,
  GlobalStyles,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import { PropsWithChildren, useMemo } from "react";

const FONT_HEADING = '"Sora", "Trebuchet MS", sans-serif';
const FONT_BODY = '"IBM Plex Sans", "Segoe UI", sans-serif';

export function MuiProvider({ children }: PropsWithChildren) {
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          primary: {
            main: "#0f4a86",
            light: "#4f7ab3",
            dark: "#0a3460",
            contrastText: "#ffffff",
          },
          secondary: {
            main: "#0f766e",
            light: "#3d9e96",
            dark: "#0a524c",
            contrastText: "#ffffff",
          },
          error: {
            main: "#b91c1c",
          },
          success: {
            main: "#0f766e",
          },
          warning: {
            main: "#b45309",
          },
          text: {
            primary: "#132130",
            secondary: "#4f667a",
          },
          background: {
            default: "#f8fafc",
            paper: "rgba(255, 255, 255, 0.9)",
          },
          divider: "rgba(19, 33, 48, 0.14)",
        },

        typography: {
          fontFamily: FONT_BODY,
          h1: {
            fontFamily: FONT_HEADING,
            fontSize: "clamp(1.6rem, 1.3rem + 1.2vw, 2.3rem)",
            fontWeight: 700,
            lineHeight: 1.2,
          },
          h2: {
            fontFamily: FONT_HEADING,
            fontSize: "clamp(1.1rem, 1rem + 0.5vw, 1.45rem)",
            fontWeight: 700,
            lineHeight: 1.2,
          },
          h3: {
            fontFamily: FONT_HEADING,
            fontSize: "1.05rem",
            fontWeight: 700,
            lineHeight: 1.2,
          },
          h4: {
            fontFamily: FONT_HEADING,
            fontSize: "0.95rem",
            fontWeight: 600,
            lineHeight: 1.2,
          },
          body1: {
            fontFamily: FONT_BODY,
            fontSize: "1rem",
            lineHeight: 1.5,
          },
          body2: {
            fontFamily: FONT_BODY,
            fontSize: "0.93rem",
            color: "#4f667a",
            lineHeight: 1.5,
          },
          caption: {
            fontFamily: FONT_BODY,
            fontSize: "0.78rem",
            color: "#4f667a",
          },
          button: {
            fontFamily: FONT_BODY,
            textTransform: "none",
            fontWeight: 400,
          },
        },

        shape: {
          borderRadius: 12,
        },

        shadows: [
          "none",
          "0 1px 3px rgba(13, 34, 66, 0.06)",
          "0 2px 6px rgba(13, 34, 66, 0.08)",
          "0 4px 12px rgba(13, 34, 66, 0.09)",
          "0 6px 18px rgba(13, 34, 66, 0.10)",
          "0 18px 48px rgba(13, 34, 66, 0.12)",
          "0 24px 56px rgba(13, 34, 66, 0.15)",
          "0 10px 28px rgba(15, 74, 134, 0.13)",
          "0 22px 50px rgba(13, 34, 66, 0.16)",
          "0 2px 8px rgba(13, 34, 66, 0.08)",
          "0 4px 16px rgba(13, 34, 66, 0.10)",
          "0 6px 20px rgba(13, 34, 66, 0.11)",
          "0 8px 24px rgba(13, 34, 66, 0.11)",
          "0 10px 28px rgba(13, 34, 66, 0.12)",
          "0 12px 32px rgba(13, 34, 66, 0.12)",
          "0 14px 36px rgba(13, 34, 66, 0.12)",
          "0 16px 40px rgba(13, 34, 66, 0.12)",
          "0 18px 44px rgba(13, 34, 66, 0.12)",
          "0 20px 48px rgba(13, 34, 66, 0.12)",
          "0 22px 52px rgba(13, 34, 66, 0.13)",
          "0 24px 56px rgba(13, 34, 66, 0.13)",
          "0 26px 60px rgba(13, 34, 66, 0.13)",
          "0 28px 64px rgba(13, 34, 66, 0.14)",
          "0 30px 68px rgba(13, 34, 66, 0.14)",
          "0 32px 72px rgba(13, 34, 66, 0.15)",
        ],

        components: {
          MuiCssBaseline: {
            styleOverrides: {
              "*, *::before, *::after": { boxSizing: "border-box" },
              "html, body": { margin: 0, minHeight: "100%" },
              a: { color: "inherit" },
              p: { margin: 0 },
            },
          },

          MuiAppBar: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
              root: {
                position: "sticky",
                top: 0,
                zIndex: 100,
                borderBottom: "1px solid rgba(19, 33, 48, 0.14)",
                backdropFilter: "blur(8px)",
                background: "rgba(248, 252, 255, 0.8)",
                color: "#132130",
              },
            },
          },

          MuiToolbar: {
            styleOverrides: {
              root: {
                width: "min(1220px, 100%)",
                margin: "0 auto",
                padding: "0 1.2rem",
                minHeight: "56px !important",
                gap: "1rem",
                justifyContent: "space-between",
              },
            },
          },

          MuiButton: {
            defaultProps: { variant: "outlined" },
            styleOverrides: {
              root: {
                textTransform: "none",
                fontWeight: 400,
                lineHeight: 1.2,
                border: "none",
                background: "transparent",
                color: "#0f4a86",
                borderRadius: "10px",
                padding: "0.43rem 0.75rem",
                minWidth: "auto",
                "&:hover": {
                  background: "rgba(15, 74, 134, 0.06)",
                  border: "none",
                },
                "&:active": {
                  transform: "scale(0.96)",
                  transition: "transform 80ms ease",
                },
                "&.Mui-disabled": {
                  opacity: 0.55,
                  color: "#0f4a86",
                  border: "none",
                },
              },
            },
          },

          MuiIconButton: {
            styleOverrides: {
              root: {
                borderRadius: "10px",
                color: "#132130",
                "&:hover": {
                  background: "rgba(19, 33, 48, 0.06)",
                },
              },
            },
          },

          MuiPaper: {
            defaultProps: { elevation: 5 },
            styleOverrides: {
              root: {
                border: "1px solid rgba(19, 33, 48, 0.14)",
                borderRadius: "16px",
                padding: "1rem",
                background: "rgba(255, 255, 255, 0.9)",
                transition: "box-shadow 220ms ease, transform 220ms ease",
                overflow: "hidden",
                "&:hover": {
                  boxShadow: "0 24px 56px rgba(13, 34, 66, 0.15)",
                  transform: "translateY(-2px)",
                },
              },
            },
          },

          MuiCard: {
            defaultProps: { elevation: 5 },
            styleOverrides: {
              root: {
                border: "1px solid rgba(19, 33, 48, 0.14)",
                borderRadius: "16px",
                background: "rgba(255, 255, 255, 0.9)",
                overflow: "hidden",
              },
            },
          },

          MuiCardActionArea: {
            styleOverrides: {
              root: {
                padding: "0.6rem 0.72rem",
                transition: "transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
                "&:hover": {
                  transform: "translateY(-3px) scale(1.03)",
                },
              },
            },
          },

          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: "999px",
                fontSize: "0.75rem",
                height: "auto",
                padding: "0.23rem 0.1rem",
                border: "1px solid rgba(19, 33, 48, 0.15)",
                background: "rgba(255, 255, 255, 0.82)",
              },
            },
          },

          MuiList: {
            styleOverrides: {
              root: {
                padding: 0,
                display: "grid",
                gap: "0.45rem",
              },
            },
          },

          MuiListItem: {
            styleOverrides: {
              root: {
                padding: 0,
                border: "1px solid rgba(19, 33, 48, 0.08)",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.75)",
                overflow: "hidden",
              },
            },
          },

          MuiListItemButton: {
            styleOverrides: {
              root: {
                padding: "0.7rem 0.6rem",
                transition: "background 0.15s, border-color 0.15s, transform 0.15s",
                "&:hover": {
                  background: "rgba(99, 130, 255, 0.07)",
                  transform: "translateX(3px)",
                },
              },
            },
          },

          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: "12px",
                background: "#ffffff",
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(15, 74, 134, 0.4)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(15, 74, 134, 0.5)",
                  boxShadow: "0 0 0 3px rgba(15, 74, 134, 0.14)",
                },
              },
              notchedOutline: {
                borderColor: "rgba(19, 33, 48, 0.2)",
              },
            },
          },

          MuiInputLabel: {
            styleOverrides: {
              root: {
                fontSize: "0.9rem",
                color: "#4f667a",
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

          MuiFormControlLabel: {
            styleOverrides: {
              root: {
                marginLeft: 0,
                gap: "0.4rem",
              },
              label: {
                fontSize: "0.9rem",
              },
            },
          },

          MuiCheckbox: {
            styleOverrides: {
              root: {
                padding: 0,
                color: "rgba(19, 33, 48, 0.4)",
                "&.Mui-checked": {
                  color: "#0f4a86",
                },
              },
            },
          },

          MuiTab: {
            styleOverrides: {
              root: {
                background: "transparent",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "10px 10px 0 0",
                textTransform: "none",
                fontWeight: 400,
                "&.Mui-selected": {
                  background: "linear-gradient(145deg, #ffffff 0%, #e5efff 100%)",
                  color: "#0f4a86",
                },
              },
            },
          },

          MuiDivider: {
            styleOverrides: {
              root: {
                borderColor: "rgba(19, 33, 48, 0.14)",
              },
            },
          },

          MuiAlert: {
            styleOverrides: {
              root: {
                borderRadius: "10px",
                fontSize: "0.88rem",
                padding: "0.4rem 0.75rem",
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
          "@keyframes riseIn": {
            from: { transform: "translateY(8px)", opacity: 0 },
            to: { transform: "translateY(0)", opacity: 1 },
          },
          "@keyframes gridDrift": {
            from: { backgroundPosition: "0 0" },
            to: { backgroundPosition: "42px 42px" },
          },
          "@media (prefers-reduced-motion: reduce)": {
            ".page-shell, .bg-layer": { animation: "none", transition: "none" },
          },
        }}
      />
      {children}
    </ThemeProvider>
  );
}
