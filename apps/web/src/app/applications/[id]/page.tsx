export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { MarkdownContent } from "@/components/MarkdownContent";
import { ApplicationDetailActivityPanel } from "@/components/ApplicationDetailActivityPanel";
import { ApplicationEditDeleteForm } from "@/components/forms/ApplicationEditDeleteForm";
import { toTitleCaseLabel } from "@/lib/format";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";

interface ApplicationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  const { id } = await params;

  const [application, resumes] = await Promise.all([
    prisma.application.findUnique({
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
    }),
    prisma.resume.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!application) {
    notFound();
  }

  const nextFollowupAttemptIndex =
    application.followups.length > 0
      ? Math.max(...application.followups.map(item => item.attemptIndex)) + 1
      : 1;

  return (
    <section className="stack-xl">
      <div>
        <Link
          href="/applications"
          style={{
            display: "inline-block",
            textDecoration: "none",
            border: "1px solid rgba(15, 74, 134, 0.25)",
            background: "linear-gradient(145deg, #ffffff 0%, #e5efff 100%)",
            color: "var(--brand-strong)",
            borderRadius: "10px",
            padding: "0.43rem 0.75rem",
            lineHeight: 1.2,
          }}
        >
          <ArrowBackIosIcon sx={{ fontSize: "0.8rem", mr: 0.5 }} />
          Back to Applications
        </Link>
      </div>

      <div className="card">
        <h1 className="no-margin">{application.companyName}</h1>
        <p>
          {application.roleTitle} -{" "}
          <span className={`pill status-${application.genericStatus}`}>
            {toTitleCaseLabel(application.genericStatus)}
          </span>
        </p>
        {application.compensation ? (
          <p className="muted">Compensation: {application.compensation}</p>
        ) : null}
        <h3>Posting Details</h3>
        {application.postingDetails ? (
          <MarkdownContent markdown={application.postingDetails} />
        ) : (
          <p className="muted">No posting details.</p>
        )}
        <h3>Notes</h3>
        {application.notes ? (
          <MarkdownContent markdown={application.notes} />
        ) : (
          <p className="muted">No notes.</p>
        )}
      </div>

      <ApplicationEditDeleteForm
        application={{
          id: application.id,
          companyName: application.companyName,
          roleTitle: application.roleTitle,
          postingDetails: application.postingDetails,
          compensation: application.compensation,
          genericStatus: application.genericStatus,
          preciseStatus: application.preciseStatus,
          roleFamily: application.roleFamily,
          roleLevel: application.roleLevel,
          appliedAtIso: application.appliedAt.toISOString(),
          notes: application.notes,
          linkedResumeIds: application.resumes.map((entry) => entry.resumeId),
        }}
        resumes={resumes}
      />

      <ApplicationDetailActivityPanel
        application={{
          id: application.id,
          companyName: application.companyName,
          roleTitle: application.roleTitle,
        }}
        interviews={application.interviews.map(interview => ({
          id: interview.id,
          roundLabel: interview.roundLabel,
          scheduledAtIso: interview.scheduledAt.toISOString(),
        }))}
        followups={application.followups.map(followup => ({
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
              {application.followups.map(f => (
                <li key={f.id} className="list-row">
                  <span>
                    Attempt {f.attemptIndex} via {f.channel} on{" "}
                    {f.sentAt.toLocaleDateString()}
                  </span>
                  <span className="pill">
                    {f.result?.resultStatus ?? "pending"}
                  </span>
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
              {application.events.map(event => (
                <li key={event.id} className="list-row">
                  <span>{event.eventType}</span>
                  <span className="muted">
                    {event.occurredAt.toLocaleString()}
                  </span>
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
            {application.emailLogs.map(email => (
              <li key={email.id} className="list-row">
                <span>
                  {email.direction} {email.isHuman ? "human" : "automated"}:{" "}
                  {email.subject}
                </span>
                <span className="muted">
                  {email.createdAt.toLocaleDateString()}
                </span>
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
            {application.resumes.map(entry => (
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
            {application.interviews.map(interview => (
              <li key={interview.id} className="list-row">
                <span>
                  {interview.roundLabel} ({toTitleCaseLabel(interview.status)})
                </span>
                <span className="muted">
                  {interview.scheduledAt.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
