"use client";

import { useEffect } from "react";

export function TimezoneSync() {
  useEffect(() => {
    const offset = new Date().getTimezoneOffset();
    document.cookie = `tz_offset=${offset}; path=/; SameSite=Strict; Max-Age=86400`;
  }, []);
  return null;
}
