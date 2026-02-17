export const dynamic = "force-dynamic";

import { ApplicationTable } from "@/components/ApplicationTable";
import { ApplicationCreateForm } from "@/components/forms/ApplicationCreateForm";
import { prisma } from "@/lib/db";

export default async function ApplicationsPage() {
  const applications = await prisma.application.findMany({
    orderBy: { appliedAt: "desc" },
  });

  const summary = applications.reduce(
    (acc, item) => {
      acc[item.genericStatus] = (acc[item.genericStatus] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

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
            <span className="metric-label">{status}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>

      <div className="layout-split">
        <ApplicationCreateForm />
        <section className="stack-md">
          <h2>Application Records</h2>
          <ApplicationTable applications={applications} />
        </section>
      </div>
    </section>
  );
}

