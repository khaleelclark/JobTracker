"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

const LINKS = [
  { href: "/today", label: "Today" },
  { href: "/applications", label: "Applications" },
  { href: "/interviews", label: "Interviews" },
  { href: "/emails", label: "Communication" },
  { href: "/goals", label: "Goals" },
  { href: "/resumes", label: "Resumes" },
  { href: "/settings", label: "Settings" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ dbLabel: _dbLabel }: { dbLabel: string | null }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <AppBar>
        <Toolbar>
          {/* Brand */}
          <Typography
            component={Link}
            href="/"
            variant="h3"
            sx={{
              textDecoration: "none",
              color: "text.primary",
              fontWeight: 700,
              letterSpacing: "0.02em",
              flexShrink: 0,
            }}
          >
            Job Tracker
          </Typography>

          {/* Desktop links */}
          <Box
            component="nav"
            aria-label="Main"
            sx={{
              display: { xs: "none", md: "flex" },
              gap: 0.5,
              flexWrap: "nowrap",
            }}
          >
            {LINKS.map(link => {
              const active = isActive(pathname, link.href);
              return (
                <Button
                  key={link.href}
                  component={Link}
                  href={link.href}
                  sx={{
                    color: active ? "primary.main" : "text.secondary",
                    border: "1px solid",
                    borderColor: active
                      ? "rgba(15, 74, 134, 0.25)"
                      : "transparent",
                    borderRadius: "999px",
                    px: 1.5,
                    py: 0.5,
                    background: active
                      ? "rgba(15, 74, 134, 0.1)"
                      : "transparent",
                    "&:hover": {
                      background: active
                        ? "rgba(15, 74, 134, 0.13)"
                        : "transparent",
                      borderColor: "divider",
                      color: "text.primary",
                      transform: "translateY(-1px)",
                    },
                    transition:
                      "background-color 180ms ease, color 180ms ease, border-color 180ms ease, transform 180ms ease",
                  }}
                >
                  {link.label}
                </Button>
              );
            })}
          </Box>

          {/* Mobile hamburger */}
          <IconButton
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            onClick={() => setDrawerOpen(v => !v)}
            sx={{ display: { xs: "flex", md: "none" }, ml: "auto" }}
          >
            {drawerOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        anchor="top"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            top: "56px",
            background: "rgba(248, 252, 255, 0.97)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid",
            borderColor: "divider",
            boxShadow: 5,
          },
        }}
        ModalProps={{ keepMounted: true }}
      >
        <List sx={{ p: 1, gap: "0.25rem" }}>
          {LINKS.map(link => {
            const active = isActive(pathname, link.href);
            return (
              <ListItem key={link.href} disablePadding sx={{ borderRadius: "10px", border: "none", background: "transparent" }}>
                <ListItemButton
                  component={Link}
                  href={link.href}
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    borderRadius: "10px",
                    color: active ? "primary.main" : "text.primary",
                    background: active
                      ? "rgba(15, 74, 134, 0.08)"
                      : "transparent",
                    fontWeight: active ? 600 : 400,
                    "&:hover": {
                      background: "rgba(15, 74, 134, 0.06)",
                      transform: "none",
                    },
                  }}
                >
                  <ListItemText primary={link.label} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Drawer>
    </>
  );
}
