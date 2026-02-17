export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { EmailLogCreateForm } from "@/components/forms/EmailLogCreateForm";

export default async function EmailsPage() {
  const [emails, applications] = await Promise.all([
    prisma.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { application: true },
    }),
    prisma.application.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, companyName: true, roleTitle: true },
    }),
  ]);

  return (
    <section className="stack-xl">
      <header className="page-header">
        <h1>Email Logs</h1>
        <p className="muted">Store communication history for context and follow-through.</p>
      </header>

      <div className="layout-split">
        <EmailLogCreateForm applications={applications} />
        <div className="card table-shell">
          <h2 className="no-margin">Recent Emails</h2>
        {emails.length === 0 ? (
          <p className="muted">No emails logged yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Direction</th>
                <th>Human</th>
                <th>Subject</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
                <tr key={email.id}>
                  <td>{email.application.companyName}</td>
                  <td>{email.direction}</td>
                  <td>{email.isHuman ? "yes" : "no"}</td>
                  <td>{email.subject}</td>
                  <td>{email.createdAt.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        </div>
      </div>
    </section>
  );
}

