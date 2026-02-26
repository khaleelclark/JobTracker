export const dynamic = "force-dynamic";

import { ApplicationTable } from "@/components/ApplicationTable";
import { prisma } from "@/lib/db";
import { toTitleCaseLabel } from "@/lib/format";

export default async function ApplicationsPage() {
  const [applications, resumes] = await Promise.all([
    prisma.application.findMany({
      orderBy: { appliedAt: "desc" },
    }),
    prisma.resume.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
  ]);

  const summary = applications.reduce(
    (acc, item) => {
      acc[item.genericStatus] = (acc[item.genericStatus] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const statusSortRank: Record<string, number> = {
    archived: 1,
    rejected: 2,
    withdrawn: 3,
  };

  const sortedApplications = [...applications].sort((a, b) => {
    const rankA = statusSortRank[a.genericStatus] ?? 0;
    const rankB = statusSortRank[b.genericStatus] ?? 0;
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    return b.appliedAt.getTime() - a.appliedAt.getTime();
  });

  return (
    <section className="stack-xl">
      <header className="page-header">
        <h1>Applications</h1>
        <p className="muted">Capture each role as a structured fact record.</p>
      </header>

      <div className="stats-row">
        <div className="metric-card">
          <span className="metric-label">Total</span>
          <strong>{applications.length}</strong>
        </div>
        {Object.entries(summary).map(([status, count]) => (
          <div key={status} className="metric-card">
            <span className="metric-label">{toTitleCaseLabel(status)}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>

      <div className="card stack-md">
        <ApplicationTable
          title="Application Records"
          applications={sortedApplications.map((application) => ({
            ...application,
            appliedAt: application.appliedAt.toISOString(),
          }))}
          resumes={resumes}
        />
      </div>
    </section>
  );
}

