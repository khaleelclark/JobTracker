"use client";

import Link from "next/link";
import { fmtLocalDate, fmtLocalDateTime } from "@/lib/format";

interface TimelineEntry {
  id: string;
  label: string;
  occurredAtIso: string;
  applicationId?: string;
  dateOnly?: boolean;
}

interface TimelineProps {
  entries: TimelineEntry[];
}

const labelStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const dateStyle: React.CSSProperties = {
  whiteSpace: "nowrap",
  flexShrink: 0,
};

export function Timeline({ entries }: TimelineProps) {
  if (entries.length === 0) {
    return <p className="muted">No recent activity.</p>;
  }

  return (
    <ul className="clean-list">
      {entries.map((entry) => {
        const dateStr = entry.dateOnly
          ? fmtLocalDate(entry.occurredAtIso)
          : fmtLocalDateTime(entry.occurredAtIso);
        const inner = (
          <>
            <span style={labelStyle} title={entry.label}>{entry.label}</span>
            <span className="muted" style={dateStyle}>{dateStr}</span>
          </>
        );
        return (
          <li key={entry.id} className={entry.applicationId ? "list-row list-row-link list-row-lg" : "list-row list-row-lg"} style={{ minWidth: 0, overflow: "hidden" }}>
            {entry.applicationId ? (
              <Link href={`/applications/${entry.applicationId}`} className="list-row-inner">
                {inner}
              </Link>
            ) : (
              <div className="list-row-inner">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
