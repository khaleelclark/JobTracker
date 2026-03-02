export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { EmailLogCreateForm } from "@/components/forms/EmailLogCreateForm";
import { EmailLogsCrudTable } from "@/components/EmailLogsCrudTable";

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
        <h1>Communication Logs</h1>
        <p className="muted">Store communication history for context and follow-through.</p>
      </header>

      <div className="layout-split">
        <EmailLogCreateForm applications={applications} />
        <div className="card table-shell">
          <h2 className="no-margin">Recent Communication</h2>
          <EmailLogsCrudTable
            applications={applications}
            emails={emails.map((email) => ({
              id: email.id,
              applicationId: email.applicationId,
              companyName: email.companyName ?? email.application?.companyName ?? "Unknown Company",
              channel: email.channel,
              direction: email.direction,
              isHuman: email.isHuman,
              subject: email.subject,
              body: email.body,
              notes: email.notes,
              createdAtIso: email.createdAt.toISOString(),
            }))}
          />
        </div>
      </div>
    </section>
  );
}

