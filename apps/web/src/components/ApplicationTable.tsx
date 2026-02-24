import Link from "next/link";
import { toTitleCaseLabel } from "@/lib/format";

interface ApplicationRow {
  id: string;
  companyName: string;
  roleTitle: string;
  genericStatus: string;
  appliedAt: Date;
}

interface ApplicationTableProps {
  applications: ApplicationRow[];
}

export function ApplicationTable({ applications }: ApplicationTableProps) {
  if (applications.length === 0) {
    return (
      <div className="card empty-state">
        <h3>No applications logged yet</h3>
        <p className="muted">
          Use the form above to create your first application record.
        </p>
      </div>
    );
  }

  return (
    <div className="card table-shell overflow-x">
      <table>
        <thead>
          <tr>
            <th style={{ textAlign: "center" }}>Company</th>
            <th style={{ textAlign: "center" }}>Role</th>
            <th style={{ textAlign: "center" }}>Status</th>
            <th style={{ textAlign: "center" }}>Applied</th>
            <th style={{ textAlign: "center" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {applications.map(application => (
            <tr key={application.id}>
              <td>{application.companyName}</td>
              <td>
                <Link href={`/applications/${application.id}`}>
                  {application.roleTitle}
                </Link>
              </td>
              <td>
                <span className={`pill status-${application.genericStatus}`}>
                  {toTitleCaseLabel(application.genericStatus)}
                </span>
              </td>
              <td>{application.appliedAt.toLocaleDateString()}</td>
              <td>
                <Link href={`/applications/${application.id}`} className="pill">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
