"use client";

import { toTitleCaseLabel } from "@/lib/format";

interface InterviewItem {
  id: string;
  applicationCompany: string;
  roundLabel: string;
  scheduledAtIso: string;
  status: string;
}

interface InterviewListProps {
  interviews: InterviewItem[];
}

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
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
              {fmtTime(interview.scheduledAtIso)} ({toTitleCaseLabel(interview.status)})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
