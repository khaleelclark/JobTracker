"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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

export function AppNav({ dbLabel: _dbLabel }: { dbLabel: string | null }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="app-nav" aria-label="Main">
      <div className="nav-inner">
        <div className="nav-brand-row">
          <div className="nav-brand-group">
            <Link className="brand" href="/">
              Job Tracker
            </Link>
          </div>
          <button
            className="nav-hamburger"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className={`hamburger-icon ${menuOpen ? "open" : ""}`}>
              <span /><span /><span />
            </span>
          </button>
        </div>
        <div className={`nav-links ${menuOpen ? "nav-links--open" : ""}`}>
          {LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={isActive(pathname, link.href) ? "nav-link active" : "nav-link"}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
