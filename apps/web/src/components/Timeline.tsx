interface TimelineEntry {
  id: string;
  label: string;
  occurredAt: Date;
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
          <li key={entry.id} className="list-row">
            <span>{entry.label}</span>
            <span className="muted">{entry.occurredAt.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
