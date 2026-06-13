import Link from "next/link";

interface TimelineEntry {
  id: string;
  label: string;
  occurredAt: Date;
  applicationId?: string;
}

interface TimelineProps {
  entries: TimelineEntry[];
}

export function Timeline({ entries }: TimelineProps) {
  if (entries.length === 0) {
    return <p className="muted">No recent activity.</p>;
  }

  return (
    <div className="card">
      <ul className="clean-list">
        {entries.map((entry) => (
          <li key={entry.id} className={entry.applicationId ? "list-row list-row-link" : "list-row"}>
            {entry.applicationId ? (
              <Link href={`/applications/${entry.applicationId}`} className="list-row-inner">
                <span>{entry.label}</span>
                <span className="muted">{entry.occurredAt.toLocaleString()}</span>
              </Link>
            ) : (
              <>
                <span>{entry.label}</span>
                <span className="muted">{entry.occurredAt.toLocaleString()}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
