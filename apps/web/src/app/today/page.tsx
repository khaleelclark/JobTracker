export const dynamic = "force-dynamic";

import { InterviewList } from "@/components/InterviewList";
import { RefreshInsightsButton } from "@/components/RefreshInsightsButton";
import { Timeline } from "@/components/Timeline";
import { UiCardList } from "@/components/UiCardList";
import { prisma } from "@/lib/db";

export default async function TodayPage() {
  const now = new Date();

  const [cards, interviews, engagementEvents, followups, emails] = await Promise.all([
    prisma.uiCard.findMany({
      where: {
        state: "active",
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
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
  ]);

  const timeline = [
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
      label: `${email.application.companyName}: ${email.direction} email (${email.subject})`,
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
          <p className="muted">Review current insights and recent activity.</p>
        </div>
        <RefreshInsightsButton />
      </div>

      <div className="layout-split">
        <div className="stack-md">
          <h2>Active Cards</h2>
          <UiCardList
            cards={cards.map((card) => ({
              id: card.id,
              title: card.title,
              body: card.body,
              priority: card.priority,
              cardType: card.cardType,
              prompt: card.suggestedGptPrompt,
            }))}
          />
        </div>

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

