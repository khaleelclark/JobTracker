export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { InterviewsSection } from "@/components/InterviewsSection";

export default async function InterviewsPage() {
  const [interviews, applications] = await Promise.all([
    prisma.interview.findMany({
      orderBy: { scheduledAt: "desc" },
      include: { application: true },
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

      <InterviewsSection
        applications={applications}
        interviews={interviews.map((interview) => ({
          id: interview.id,
          applicationId: interview.applicationId,
          companyName: interview.application.companyName,
          roundIndex: interview.roundIndex,
          roundLabel: interview.roundLabel,
          scheduledAtIso: interview.scheduledAt.toISOString(),
          status: interview.status as "scheduled" | "completed" | "cancelled",
          notes: interview.notes ?? null,
        }))}
      />
    </section>
  );
}
