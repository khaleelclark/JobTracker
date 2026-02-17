export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ApplicationDetailActivityPanel } from "@/components/ApplicationDetailActivityPanel";

interface ApplicationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const { id } = await params;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      interviews: {
        orderBy: { scheduledAt: "asc" },
        include: { reflection: true },
      },
      emailLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      followups: {
        orderBy: { sentAt: "desc" },
        include: { result: true },
      },
      events: { orderBy: { occurredAt: "desc" } },
      resumes: { include: { resume: true } },
    },
  });

  if (!application) {
    notFound();
  }

  const nextFollowupAttemptIndex =
    application.followups.length > 0
      ? Math.max(...application.followups.map((item) => item.attemptIndex)) + 1
      : 1;

  return (
    <section className="stack-xl">
      <div className="card">
        <h1 className="no-margin">{application.companyName}</h1>
        <p>
          {application.roleTitle} - <span className="pill">{application.genericStatus}</span>
        </p>
        {application.notes ? <p>{application.notes}</p> : <p className="muted">No notes.</p>}
      </div>

      <ApplicationDetailActivityPanel
        application={{
          id: application.id,
          companyName: application.companyName,
          roleTitle: application.roleTitle,
        }}
        interviews={application.interviews.map((interview) => ({
          id: interview.id,
          roundLabel: interview.roundLabel,
          scheduledAtIso: interview.scheduledAt.toISOString(),
        }))}
        followups={application.followups.map((followup) => ({
          id: followup.id,
          attemptIndex: followup.attemptIndex,
          sentAtIso: followup.sentAt.toISOString(),
        }))}
        nextFollowupAttemptIndex={nextFollowupAttemptIndex}
      />

      <div className="grid grid-2">
        <div className="card">
          <h2>Follow-ups</h2>
          {application.followups.length === 0 ? (
            <p className="muted">No follow-up attempts.</p>
          ) : (
            <ul className="clean-list">
              {application.followups.map((f) => (
                <li key={f.id} className="list-row">
                  <span>
                    Attempt {f.attemptIndex} via {f.channel} on {f.sentAt.toLocaleDateString()}
                  </span>
                  <span className="pill">{f.result?.resultStatus ?? "pending"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2>Engagement Events</h2>
          {application.events.length === 0 ? (
            <p className="muted">No events.</p>
          ) : (
            <ul className="clean-list">
              {application.events.map((event) => (
                <li key={event.id} className="list-row">
                  <span>{event.eventType}</span>
                  <span className="muted">{event.occurredAt.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Recent Emails</h2>
        {application.emailLogs.length === 0 ? (
          <p className="muted">No emails logged.</p>
        ) : (
          <ul className="clean-list">
            {application.emailLogs.map((email) => (
              <li key={email.id} className="list-row">
                <span>
                  {email.direction} {email.isHuman ? "human" : "automated"}: {email.subject}
                </span>
                <span className="muted">{email.createdAt.toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Resumes</h2>
        {application.resumes.length === 0 ? (
          <p className="muted">No linked resumes.</p>
        ) : (
          <ul className="clean-list">
            {application.resumes.map((entry) => (
              <li key={entry.resumeId} className="list-row">
                <span>{entry.resume.name}</span>
                <span className="muted">{entry.resume.filePath}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Interviews</h2>
        {application.interviews.length === 0 ? (
          <p className="muted">No interviews logged.</p>
        ) : (
          <ul className="clean-list">
            {application.interviews.map((interview) => (
              <li key={interview.id} className="list-row">
                <span>
                  {interview.roundLabel} ({interview.status})
                </span>
                <span className="muted">{interview.scheduledAt.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

