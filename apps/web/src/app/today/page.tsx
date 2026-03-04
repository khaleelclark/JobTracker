export const dynamic = "force-dynamic";

import { InterviewList } from "@/components/InterviewList";
import { Timeline } from "@/components/Timeline";
import { prisma } from "@/lib/db";
import { toTitleCaseLabel } from "@/lib/format";

export default async function TodayPage() {
  const now = new Date();

  const [interviews, engagementEvents, followups, emails, recentApplications] = await Promise.all([
    prisma.interview.findMany({
      where: {
        scheduledAt: { gte: now },
        status: "scheduled",
      },
      include: { application: true },
      orderBy: { scheduledAt: "asc" },
      take: 25,
    }),
    prisma.engagementEvent.findMany({
      orderBy: { occurredAt: "desc" },
      take: 20,
      include: { application: true },
    }),
    prisma.followupAttempt.findMany({
      orderBy: { sentAt: "desc" },
      take: 20,
      include: { application: true },
    }),
    prisma.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { application: true },
    }),
    prisma.application.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        companyName: true,
        roleTitle: true,
        genericStatus: true,
        updatedAt: true,
      },
    }),
  ]);

  const timeline = [
    ...recentApplications.map((application) => ({
      id: `application_${application.id}_${application.updatedAt.toISOString()}`,
      label: `${application.companyName}: application updated (${application.roleTitle}, ${toTitleCaseLabel(application.genericStatus)})`,
      occurredAt: application.updatedAt,
    })),
    ...engagementEvents.map((event) => ({
      id: `event_${event.id}`,
      label: `${event.application.companyName}: ${event.eventType}`,
      occurredAt: event.occurredAt,
    })),
    ...followups.map((followup) => ({
      id: `followup_${followup.id}`,
      label: `${followup.application.companyName}: follow-up via ${followup.channel}`,
      occurredAt: followup.sentAt,
    })),
    ...emails.map((email) => ({
      id: `email_${email.id}`,
      label: `${email.companyName ?? email.application?.companyName ?? "Unknown Company"}: ${email.direction} ${email.channel} communication (${email.subject})`,
      occurredAt: email.createdAt,
    })),
  ]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, 40);

  return (
    <section className="stack-xl">
      <div className="page-header with-action">
        <div>
          <h1>Today</h1>
          <p className="muted">Review upcoming interviews and recent activity.</p>
        </div>
      </div>

      <div className="layout-split">
        <div className="stack-md">
          <section>
            <h2>Upcoming Interviews</h2>
            <InterviewList
              interviews={interviews.map((interview) => ({
                id: interview.id,
                applicationCompany: interview.application.companyName,
                roundLabel: interview.roundLabel,
                scheduledAt: interview.scheduledAt,
                status: interview.status,
              }))}
            />
          </section>

          <section>
            <h2>Recent Activity</h2>
            <Timeline entries={timeline} />
          </section>
        </div>
      </div>
    </section>
  );
}

