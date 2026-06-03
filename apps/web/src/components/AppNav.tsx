"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
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

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="app-nav" aria-label="Main">
      <div className="nav-inner">
        <Link className="brand" href="/">
          Job Tracker
        </Link>
        <div className="nav-links">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={isActive(pathname, link.href) ? "nav-link active" : "nav-link"}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
