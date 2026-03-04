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
    offered: 0,
    interviewing: 1,
    under_review: 2,
    applied: 3,
    archived: 4,
    rejected: 5,
    withdrawn: 6,
  };

  const sortedApplications = [...applications].sort((a, b) => {
    const rankA = statusSortRank[a.genericStatus] ?? Number.MAX_SAFE_INTEGER;
    const rankB = statusSortRank[b.genericStatus] ?? Number.MAX_SAFE_INTEGER;
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

