"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ dbLabel }: { dbLabel: string | null }) {
  const pathname = usePathname();

  return (
    <nav className="app-nav" aria-label="Main">
      <div className="nav-inner">
        <div className="nav-brand-group">
          <Link className="brand" href="/">
            Job Tracker
          </Link>
          {dbLabel && (
            <span className="db-mode-badge db-mode-badge--test db-mode-badge--nav" title={dbLabel}>
              {dbLabel}
            </span>
          )}
        </div>
        <div className="nav-links">
          {LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={
                isActive(pathname, link.href) ? "nav-link active" : "nav-link"
              }
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
