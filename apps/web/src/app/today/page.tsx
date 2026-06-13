export const dynamic = "force-dynamic";

import { InterviewList } from "@/components/InterviewList";
import { Timeline } from "@/components/Timeline";
import { prisma } from "@/lib/db";
import { toTitleCaseLabel } from "@/lib/format";

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default async function TodayPage() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);

  const [
    interviews,
    engagementEvents,
    followups,
    emails,
    recentApplications,
    applicationsAppliedToday,
    followupsSentToday,
    emailsLoggedToday,
    engagementEventsToday,
    interviewsScheduledToday,
    applicationStatusCounts,
  ] = await Promise.all([
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
    prisma.application.count({
      where: {
        appliedAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    }),
    prisma.followupAttempt.count({
      where: {
        sentAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    }),
    prisma.emailLog.count({
      where: {
        createdAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    }),
    prisma.engagementEvent.count({
      where: {
        occurredAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    }),
    prisma.interview.count({
      where: {
        scheduledAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
        status: "scheduled",
      },
    }),
    prisma.application.groupBy({
      by: ["genericStatus"],
      _count: {
        _all: true,
      },
    }),
  ]);

  const todaysFacts = [
    {
      label: "Applied Today",
      value: applicationsAppliedToday,
      detail: pluralize(applicationsAppliedToday, "application"),
    },
    {
      label: "Follow-ups Sent",
      value: followupsSentToday,
      detail: pluralize(followupsSentToday, "attempt"),
    },
    {
      label: "Emails Logged",
      value: emailsLoggedToday,
      detail: pluralize(emailsLoggedToday, "communication"),
    },
    {
      label: "Engagement Events",
      value: engagementEventsToday,
      detail: pluralize(engagementEventsToday, "event"),
    },
    {
      label: "Interviews Today",
      value: interviewsScheduledToday,
      detail: pluralize(interviewsScheduledToday, "scheduled interview"),
    },
  ];

  const statusCounts = applicationStatusCounts
    .map((item) => ({
      status: item.genericStatus,
      count: item._count._all,
    }))
    .sort((a, b) => toTitleCaseLabel(a.status).localeCompare(toTitleCaseLabel(b.status)));

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
          <p className="muted">Review today&apos;s logged activity, current statuses, and recent facts.</p>
        </div>
      </div>

      <section className="stack-md">
        <div className="section-head">
          <h2>At a Glance</h2>
          <span className="muted">{now.toLocaleDateString()}</span>
        </div>
        <div className="dashboard-grid">
          {todaysFacts.map((fact) => (
            <div key={fact.label} className="metric-card dashboard-metric">
              <span className="metric-label">{fact.label}</span>
              <strong>{fact.value}</strong>
              <span className="muted">{fact.detail}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="layout-split">
        <div className="stack-md">
          <section>
            <h2>Upcoming Interviews</h2>
            <InterviewList
              interviews={interviews.map((interview) => ({
                id: interview.id,
                applicationCompany: interview.application.companyName,
                roundLabel: interview.roundLabel,
                scheduledAtIso: interview.scheduledAt.toISOString(),
                status: interview.status,
              }))}
            />
          </section>

          <section>
            <h2>Recent Activity</h2>
            <Timeline entries={timeline} />
          </section>
        </div>

        <aside className="stack-md">
          <section>
            <h2>Application Status</h2>
            <div className="card">
              {statusCounts.length > 0 ? (
                <ul className="clean-list">
                  {statusCounts.map((item) => (
                    <li key={item.status} className="list-row">
                      <span>{toTitleCaseLabel(item.status)}</span>
                      <strong>{item.count}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No applications logged yet.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

