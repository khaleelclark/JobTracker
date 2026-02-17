import Link from "next/link";

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
        <p className="muted">Use the form above to create your first application record.</p>
      </div>
    );
  }

  return (
    <div className="card table-shell overflow-x">
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Role</th>
            <th>Status</th>
            <th>Applied</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => (
            <tr key={application.id}>
              <td>
                <Link href={`/applications/${application.id}`}>{application.companyName}</Link>
              </td>
              <td>{application.roleTitle}</td>
              <td>
                <span className={`pill status-${application.genericStatus}`}>{application.genericStatus}</span>
              </td>
              <td>{application.appliedAt.toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
