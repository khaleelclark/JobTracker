export function cleanPostingText(raw: string): string {
  let text = raw;
  // Strip markdown headings (# ## ### etc.)
  text = text.replace(/^#{1,6}\s*/gm, "");
  // Strip bold/italic markers (order: triple → double → single)
  text = text.replace(/\*\*\*(.+?)\*\*\*/gs, "$1");
  text = text.replace(/\*\*(.+?)\*\*/gs, "$1");
  text = text.replace(/___(.+?)___/gs, "$1");
  text = text.replace(/__(.+?)__/gs, "$1");
  // Strip horizontal rules (lines of only dashes/asterisks/underscores)
  text = text.replace(/^[-*_]{3,}\s*$/gm, "");
  // Trim trailing whitespace from each line
  text = text.split("\n").map((l) => l.trimEnd()).join("\n");
  // Collapse 3+ consecutive blank lines to 2
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

export function fmtLocalDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  }).format(new Date(iso));
}

export function fmtLocalDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function todayDateInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function nowDateTimeLocalValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

export function toTitleCaseLabel(value: string | null | undefined): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "";
  }

  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
