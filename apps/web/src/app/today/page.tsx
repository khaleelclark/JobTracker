export const dynamic = "force-dynamic";

import Link from "next/link";
import { InterviewList } from "@/components/InterviewList";
import { Timeline } from "@/components/Timeline";
import { prisma } from "@/lib/db";
import { toTitleCaseLabel } from "@/lib/format";
import { GENERIC_APPLICATION_STATUSES } from "@job-tracker/shared";
import { LocalDate } from "@/components/LocalDate";

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
      take: 5,
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
      href: "/applications?status=applied",
    },
    {
      label: "Follow-ups Sent",
      value: followupsSentToday,
      detail: pluralize(followupsSentToday, "attempt"),
      href: "/applications",
    },
    {
      label: "Emails Logged",
      value: emailsLoggedToday,
      detail: pluralize(emailsLoggedToday, "communication"),
      href: "/emails",
    },
    {
      label: "Engagement Events",
      value: engagementEventsToday,
      detail: pluralize(engagementEventsToday, "event"),
      href: "/applications",
    },
    {
      label: "Interviews Today",
      value: interviewsScheduledToday,
      detail: pluralize(interviewsScheduledToday, "scheduled interview"),
      href: "/interviews",
    },
  ];

  const statusCountMap = new Map(
    applicationStatusCounts.map(item => [item.genericStatus, item._count._all]),
  );
  const statusCounts = GENERIC_APPLICATION_STATUSES.map(status => ({
    status,
    count: statusCountMap.get(status) ?? 0,
  })).sort((a, b) =>
    toTitleCaseLabel(a.status).localeCompare(toTitleCaseLabel(b.status)),
  );

  const timeline = [
    ...recentApplications.slice(0, 5).map(application => ({
      id: `application_${application.id}_${application.updatedAt.toISOString()}`,
      label: `${application.companyName}: ${application.roleTitle} — ${toTitleCaseLabel(application.genericStatus)}`,
      occurredAtIso: application.updatedAt.toISOString(),
      applicationId: application.id,
    })),
    ...engagementEvents.map(event => ({
      id: `event_${event.id}`,
      label: `${event.application.companyName}: ${toTitleCaseLabel(event.eventType)}`,
      occurredAtIso: event.occurredAt.toISOString(),
      applicationId: event.applicationId,
    })),
    ...followups.map(followup => ({
      id: `followup_${followup.id}`,
      label: `${followup.application.companyName}: Follow-up via ${toTitleCaseLabel(followup.channel)}`,
      occurredAtIso: followup.sentAt.toISOString(),
      applicationId: followup.applicationId,
      dateOnly: true,
    })),
    ...emails.map(email => ({
      id: `email_${email.id}`,
      label: `${email.companyName ?? email.application?.companyName ?? "Unknown Company"}: ${toTitleCaseLabel(email.direction)} ${toTitleCaseLabel(email.channel)} (${email.subject})`,
      occurredAtIso: email.createdAt.toISOString(),
      applicationId: email.applicationId ?? undefined,
    })),
  ]
    .sort((a, b) => new Date(b.occurredAtIso).getTime() - new Date(a.occurredAtIso).getTime())
    .slice(0, 10);

  return (
    <section className="stack-xl">
      <div className="page-header">
        <h1>
          Today{" "}
          <span className="today-date">
            <LocalDate />
          </span>
        </h1>
        <p className="muted">
          Review today&apos;s logged activity, current statuses, and recent
          facts.
        </p>
      </div>

      <section className="stack-md">
        <h2>At a Glance</h2>
        <div className="dashboard-grid">
          {todaysFacts.map(fact => (
            <Link key={fact.label} href={fact.href} className="metric-card dashboard-metric metric-card-link">
              <span className="metric-label">{fact.label}</span>
              <strong>{fact.value}</strong>
              <span className="muted">{fact.detail}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="card stack-md">
        <h2 className="no-margin">Upcoming Interviews</h2>
        <div style={{ maxHeight: "220px", overflowY: "auto" }}>
          <InterviewList
            interviews={interviews.map(interview => ({
              id: interview.id,
              applicationId: interview.applicationId,
              applicationCompany: interview.application.companyName,
              roundLabel: interview.roundLabel,
              scheduledAtIso: interview.scheduledAt.toISOString(),
              status: interview.status,
            }))}
          />
        </div>
      </div>

      <div className="layout-split" style={{ alignItems: "stretch" }}>
        <div className="card stack-md">
          <h2 className="no-margin">Recent Activity</h2>
          <div className="scroll-hidden" style={{ maxHeight: "412px", overflowY: "auto" }}>
            <Timeline entries={timeline} />
          </div>
        </div>

        <aside>
          <div className="card stack-md">
            <h2 className="no-margin">Application Status</h2>
            <ul className="clean-list">
              {statusCounts.map(item => (
                <li
                  key={item.status}
                  className="list-row list-row-link list-row-lg"
                >
                  <Link
                    href={`/applications?status=${item.status}`}
                    className="list-row-inner"
                  >
                    <span>{toTitleCaseLabel(item.status)}</span>
                    <strong>{item.count}</strong>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
