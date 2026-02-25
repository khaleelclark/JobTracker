export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { InterviewCreateForm } from "@/components/forms/InterviewCreateForm";
import { toTitleCaseLabel } from "@/lib/format";

export default async function InterviewsPage() {
  const [interviews, applications] = await Promise.all([
    prisma.interview.findMany({
      orderBy: { scheduledAt: "desc" },
      include: { application: true, reflection: true },
    }),
    prisma.application.findMany({
      where: {
        genericStatus: {
          notIn: ["rejected", "withdrawn", "archived"],
        },
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, companyName: true, roleTitle: true },
    }),
  ]);

  return (
    <section className="stack-xl">
      <header className="page-header">
        <h1>Interviews</h1>
        <p className="muted">Track round details and outcomes as they occur.</p>
      </header>

      <div className="layout-split">
        <InterviewCreateForm applications={applications} />
        <div className="card table-shell">
          <h2 className="no-margin">Interview Log</h2>
        {interviews.length === 0 ? (
          <p className="muted">No interviews yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Round</th>
                <th>Status</th>
                <th>Scheduled</th>
                <th>Reflection</th>
              </tr>
            </thead>
            <tbody>
              {interviews.map((interview) => (
                <tr key={interview.id}>
                  <td>{interview.application.companyName}</td>
                  <td>{interview.roundLabel}</td>
                  <td>{toTitleCaseLabel(interview.status)}</td>
                  <td>{interview.scheduledAt.toLocaleString()}</td>
                  <td>{interview.reflection?.outcome ?? "none"}</td>
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

