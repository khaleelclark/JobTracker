import {
  MAX_APPLICATIONS_IN_SNAPSHOT,
  MAX_INTERVIEWS_IN_SNAPSHOT,
  SNAPSHOT_EMAIL_SNIPPET_LENGTH,
} from "@job-tracker/shared";
import { prisma } from "@/lib/db";
import { readControlFile } from "@/lib/fileStore";
import { parseGoalsProfile } from "@/lib/goalsProfile";
import { truncateText } from "@/lib/truncate";

export interface WorkerSnapshot {
  now: string;
  control_text: string;
  goals_profile: Record<string, unknown>;
  goals_progress: Record<string, unknown>;
  master_skills: Array<Record<string, unknown>>;
  applications: Array<Record<string, unknown>>;
  interviews: Array<Record<string, unknown>>;
  followups: Array<Record<string, unknown>>;
  recent_events: Array<Record<string, unknown>>;
  existing_cards: Array<Record<string, unknown>>;
}

export async function buildSnapshot(): Promise<WorkerSnapshot> {
  const now = new Date();
  const weekStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysFromMonday = (weekStartUtc.getUTCDay() + 6) % 7;
  weekStartUtc.setUTCDate(weekStartUtc.getUTCDate() - daysFromMonday);
  const nextWeekStartUtc = new Date(weekStartUtc);
  nextWeekStartUtc.setUTCDate(nextWeekStartUtc.getUTCDate() + 7);

  const [
    applications,
    masterSkills,
    interviews,
    followups,
    events,
    cards,
    recentEmails,
    controlText,
    applicationsAppliedThisWeek,
  ] = await Promise.all([
    prisma.application.findMany({
      orderBy: { updatedAt: "desc" },
      take: MAX_APPLICATIONS_IN_SNAPSHOT,
      include: {
        events: { orderBy: { occurredAt: "desc" }, take: 3 },
        followups: {
          orderBy: { sentAt: "desc" },
          take: 2,
          include: { result: true },
        },
      },
    }),
    prisma.masterSkill.findMany({
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      take: 300,
      include: {
        resumeLinks: {
          include: {
            resume: {
              select: { id: true, name: true },
            },
          },
        },
      },
    }),
    prisma.interview.findMany({
      orderBy: { scheduledAt: "desc" },
      take: MAX_INTERVIEWS_IN_SNAPSHOT,
      include: { reflection: true },
    }),
    prisma.followupAttempt.findMany({
      orderBy: { sentAt: "desc" },
      take: 50,
      include: { result: true },
    }),
    prisma.engagementEvent.findMany({
      orderBy: { occurredAt: "desc" },
      take: 100,
    }),
    prisma.uiCard.findMany({
      where: { state: "active" },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    readControlFile(),
    prisma.application.count({
      where: {
        appliedAt: {
          gte: weekStartUtc,
          lt: nextWeekStartUtc,
        },
      },
    }),
  ]);

  const goalsProfile = parseGoalsProfile(controlText);
  const weeklyTarget = goalsProfile?.weeklyApplicationsTarget ?? null;
  const weeklyRemaining =
    weeklyTarget === null
      ? null
      : Math.max(0, weeklyTarget - applicationsAppliedThisWeek);

  const recentEmailByApp = new Map<
    string,
    {
      subject: string;
      direction: string;
      is_human: boolean;
      created_at: string;
      body_excerpt: string;
    }
  >();
  for (const email of recentEmails) {
    if (!recentEmailByApp.has(email.applicationId)) {
      recentEmailByApp.set(email.applicationId, {
        subject: truncateText(email.subject, 120),
        direction: email.direction,
        is_human: email.isHuman,
        created_at: email.createdAt.toISOString(),
        body_excerpt: truncateText(email.body, SNAPSHOT_EMAIL_SNIPPET_LENGTH),
      });
    }
  }

  const applicationFacts = applications.map((app) => ({
    id: app.id,
    company_name: app.companyName,
    role_title: app.roleTitle,
    compensation: app.compensation,
    generic_status: app.genericStatus,
    precise_status: app.preciseStatus,
    role_family: app.roleFamily,
    role_level: app.roleLevel,
    applied_at: app.appliedAt.toISOString(),
    updated_at: app.updatedAt.toISOString(),
    posting_details_present: Boolean(app.postingDetails && app.postingDetails.trim()),
    posting_details_excerpt: app.postingDetails ? truncateText(app.postingDetails, 260) : null,
    notes_present: Boolean(app.notes && app.notes.trim()),
    notes_excerpt: app.notes ? truncateText(app.notes, 260) : null,
    latest_email: recentEmailByApp.get(app.id) ?? null,
    latest_email_excerpt: recentEmailByApp.get(app.id)?.body_excerpt ?? null,
    engagement_flags: app.events.map((event) => event.eventType),
    latest_followups: app.followups.map((f) => ({
      id: f.id,
      channel: f.channel,
      sent_at: f.sentAt.toISOString(),
      result_status: f.result?.resultStatus ?? null,
      response_type: f.result?.responseType ?? null,
    })),
  }));

  const masterSkillFacts = masterSkills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    category: skill.category,
    experience_years: skill.experienceYears,
    notes_excerpt: skill.notes ? truncateText(skill.notes, 260) : null,
    linked_resumes: skill.resumeLinks.map((link) => ({
      resume_id: link.resume.id,
      resume_name: link.resume.name,
    })),
  }));

  const interviewFacts = interviews.map((interview) => ({
    id: interview.id,
    application_id: interview.applicationId,
    round_index: interview.roundIndex,
    round_label: interview.roundLabel,
    scheduled_at: interview.scheduledAt.toISOString(),
    status: interview.status,
    reflection_present: Boolean(interview.reflection),
    reflection_outcome: interview.reflection?.outcome ?? null,
    reflection_summary_excerpt: interview.reflection
      ? truncateText(interview.reflection.summary, SNAPSHOT_EMAIL_SNIPPET_LENGTH)
      : null,
  }));

  const followupFacts = followups.map((f) => ({
    id: f.id,
    application_id: f.applicationId,
    attempt_index: f.attemptIndex,
    channel: f.channel,
    sent_at: f.sentAt.toISOString(),
    result_status: f.result?.resultStatus ?? "pending",
    response_type: f.result?.responseType ?? null,
  }));

  const recentEvents = events.map((event) => ({
    id: event.id,
    application_id: event.applicationId,
    event_type: event.eventType,
    occurred_at: event.occurredAt.toISOString(),
  }));

  const existingCards = cards.map((card) => ({
    id: card.id,
    dedupe_key: card.dedupeKey,
    card_type: card.cardType,
    priority: card.priority,
    created_at: card.createdAt.toISOString(),
    expires_at: card.expiresAt?.toISOString() ?? null,
  }));

  return {
    now: now.toISOString(),
    control_text: controlText,
    goals_profile: goalsProfile
      ? {
          mission_statement: goalsProfile.missionStatement,
          weekly_applications_target: goalsProfile.weeklyApplicationsTarget,
          compensation_preference: goalsProfile.compensationPreference,
          preferred_locations: goalsProfile.preferredLocations,
          employment_types: goalsProfile.employmentTypes,
          workplace_modes: goalsProfile.workplaceModes,
          priority_notes: goalsProfile.priorityNotes,
        }
      : {},
    goals_progress: {
      week_start_utc: weekStartUtc.toISOString(),
      week_end_utc: nextWeekStartUtc.toISOString(),
      applications_applied_this_week: applicationsAppliedThisWeek,
      weekly_applications_target: weeklyTarget,
      weekly_applications_remaining: weeklyRemaining,
    },
    master_skills: masterSkillFacts,
    applications: applicationFacts,
    interviews: interviewFacts,
    followups: followupFacts,
    recent_events: recentEvents,
    existing_cards: existingCards,
  };
}
