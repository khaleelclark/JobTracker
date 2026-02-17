interface InterviewItem {
  id: string;
  applicationCompany: string;
  roundLabel: string;
  scheduledAt: Date;
  status: string;
}

interface InterviewListProps {
  interviews: InterviewItem[];
}

export function InterviewList({ interviews }: InterviewListProps) {
  if (interviews.length === 0) {
    return <p className="muted">No upcoming interviews.</p>;
  }

  return (
    <div className="card">
      <ul className="clean-list">
        {interviews.map((interview) => (
          <li key={interview.id} className="list-row">
            <span>
              <strong>{interview.applicationCompany}</strong> - {interview.roundLabel}
            </span>
            <span className="muted">
              {interview.scheduledAt.toLocaleString()} ({interview.status})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
