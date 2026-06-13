export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { MarkdownContent } from "@/components/MarkdownContent";
import { ApplicationCommunicationSection } from "@/components/ApplicationCommunicationSection";
import { ApplicationEditDeleteForm } from "@/components/forms/ApplicationEditDeleteForm";
import { ActivitySection } from "@/components/ActivitySection";
import { InterviewsSection } from "@/components/InterviewsSection";
import { ApplicationResumeLinksManager } from "@/components/ApplicationResumeLinksManager";
import { ApplicationStatusPill } from "@/components/ApplicationStatusPill";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";

interface ApplicationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  const { id } = await params;

  const [application, resumes, applicationOptions] = await Promise.all([
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
    prisma.application.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        companyName: true,
        roleTitle: true,
        careersPageUrl: true,
        roleFamily: true,
        roleLevel: true,
        compensation: true,
      },
    }),
  ]);

  if (!application) {
    notFound();
  }

  const nextFollowupAttemptIndex =
    application.followups.length > 0
      ? Math.max(...application.followups.map(item => item.attemptIndex)) + 1
      : 1;

  const uniqueValues = (values: Array<string | null>) =>
    Array.from(
      new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]),
    ).sort((a, b) => a.localeCompare(b));

  const autocompleteOptions = {
    companies: uniqueValues(applicationOptions.map((item) => item.companyName)),
    roleTitles: uniqueValues(applicationOptions.map((item) => item.roleTitle)),
    careersPageUrls: uniqueValues(applicationOptions.map((item) => item.careersPageUrl)),
    roleFamilies: uniqueValues(applicationOptions.map((item) => item.roleFamily)),
    roleLevels: uniqueValues(applicationOptions.map((item) => item.roleLevel)),
    compensations: uniqueValues(applicationOptions.map((item) => item.compensation)),
  };

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

      <div className="card stack-md">
        <h1 className="no-margin">{application.companyName}</h1>
        <p>
          {application.roleTitle} -{" "}
          <ApplicationStatusPill applicationId={application.id} initialStatus={application.genericStatus} />
        </p>
        {application.compensation ? (
          <p className="muted">Compensation: {application.compensation}</p>
        ) : null}
        {application.careersPageUrl ? (
          <p>
            <a
              href={application.careersPageUrl}
              target="_blank"
              rel="noopener noreferrer"
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
              Open Careers Page
            </a>
          </p>
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
          careersPageUrl: application.careersPageUrl,
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
        autocompleteOptions={autocompleteOptions}
      />

      <ActivitySection
        applicationId={application.id}
        followups={application.followups.map((followup) => ({
          id: followup.id,
          applicationId: followup.applicationId,
          attemptIndex: followup.attemptIndex,
          channel: followup.channel,
          sentAtIso: followup.sentAt.toISOString(),
          resultStatus: followup.result?.resultStatus ?? "pending",
          responseType: followup.result?.responseType ?? null,
          resolvedAtIso: followup.result?.resolvedAt?.toISOString() ?? null,
        }))}
        events={application.events.map((event) => ({
          id: event.id,
          applicationId: event.applicationId,
          eventType: event.eventType,
          occurredAtIso: event.occurredAt.toISOString(),
        }))}
        nextFollowupAttemptIndex={nextFollowupAttemptIndex}
      />

      <ApplicationCommunicationSection
        applications={[
          {
            id: application.id,
            companyName: application.companyName,
            roleTitle: application.roleTitle,
          },
        ]}
        defaultApplicationId={application.id}
        communicationLogs={application.emailLogs.map((email) => ({
          id: email.id,
          applicationId: email.applicationId,
          companyName: application.companyName,
          channel: email.channel,
          direction: email.direction,
          isHuman: email.isHuman,
          subject: email.subject,
          body: email.body,
          notes: email.notes,
          createdAtIso: email.createdAt.toISOString(),
        }))}
      />

      <div className="card">
        <h2>Resumes</h2>
        <ApplicationResumeLinksManager
          applicationId={application.id}
          linkedResumes={application.resumes.map((entry) => ({
            resumeId: entry.resumeId,
            name: entry.resume.name,
          }))}
          allResumes={resumes}
        />
      </div>

      <InterviewsSection
        applications={[{ id: application.id, companyName: application.companyName, roleTitle: application.roleTitle }]}
        defaultApplicationId={application.id}
        interviews={application.interviews.map((interview) => ({
          id: interview.id,
          applicationId: interview.applicationId,
          companyName: application.companyName,
          roundIndex: interview.roundIndex,
          roundLabel: interview.roundLabel,
          status: interview.status,
          scheduledAtIso: interview.scheduledAt.toISOString(),
        }))}
      />
    </section>
  );
}
