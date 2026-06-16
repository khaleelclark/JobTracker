export const dynamic = "force-dynamic";

import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { InterviewList } from "@/components/InterviewList";
import { Timeline } from "@/components/Timeline";
import { prisma } from "@/lib/db";
import { toTitleCaseLabel } from "@/lib/format";
import { GENERIC_APPLICATION_STATUSES } from "@job-tracker/shared";
import { LocalDate } from "@/components/LocalDate";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return toTitleCaseLabel(count === 1 ? singular : plural);
}

const CARD_HOVER_SX = {
  transition: "box-shadow 220ms ease, transform 220ms ease",
  "&:hover": {
    boxShadow: "0 24px 56px rgba(13, 34, 66, 0.15)",
    transform: "translateY(-2px)",
  },
};

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
      where: { scheduledAt: { gte: now }, status: "scheduled" },
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
      where: { appliedAt: { gte: todayStart, lt: tomorrowStart } },
    }),
    prisma.followupAttempt.count({
      where: { sentAt: { gte: todayStart, lt: tomorrowStart } },
    }),
    prisma.emailLog.count({
      where: { createdAt: { gte: todayStart, lt: tomorrowStart } },
    }),
    prisma.engagementEvent.count({
      where: { occurredAt: { gte: todayStart, lt: tomorrowStart } },
    }),
    prisma.interview.count({
      where: {
        scheduledAt: { gte: todayStart, lt: tomorrowStart },
        status: "scheduled",
      },
    }),
    prisma.application.groupBy({
      by: ["genericStatus"],
      _count: { _all: true },
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
    ...recentApplications.slice(0, 5).map(app => ({
      id: `application_${app.id}_${app.updatedAt.toISOString()}`,
      label: `${app.companyName}: ${app.roleTitle} — ${toTitleCaseLabel(app.genericStatus)}`,
      occurredAtIso: app.updatedAt.toISOString(),
      applicationId: app.id,
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
    .sort(
      (a, b) =>
        new Date(b.occurredAtIso).getTime() -
        new Date(a.occurredAtIso).getTime(),
    )
    .slice(0, 10);

  return (
    <Stack spacing={3}>
      {/* Page header */}
      <Box>
        <Typography variant="h1">
          Today{" "}
          <Typography
            component="span"
            sx={{
              fontSize: "0.55em",
              fontWeight: 400,
              color: "text.secondary",
              letterSpacing: "0.01em",
              ml: 1,
              verticalAlign: "middle",
            }}
          >
            <LocalDate />
          </Typography>
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Review today&apos;s logged activity, current statuses, and recent
          facts.
        </Typography>
      </Box>

      {/* At a Glance */}
      <Stack spacing={1.5}>
        <Typography variant="h2">At a Glance</Typography>
        <Box
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(3, 1fr)",
              md: "repeat(5, 1fr)",
            },
          }}
        >
          {todaysFacts.map(fact => (
            <Card
              key={fact.label}
              component={Link}
              href={fact.href}
              sx={{
                textDecoration: "none",
                color: "inherit",
                minHeight: 106,
                display: "flex",
                alignItems: "center",
                border: "1px solid rgba(15, 74, 134, 0.18)",
                background: "rgba(255, 255, 255, 0.82)",
                cursor: "pointer",
                transition:
                  "transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
                "&:hover": {
                  transform: "translateY(-3px) scale(1.03)",
                  boxShadow: 7,
                  borderColor: "rgba(15, 74, 134, 0.35)",
                },
              }}
            >
              <Box sx={{ p: "0.6rem 0.72rem", width: "100%" }}>
                <Typography
                  variant="caption"
                  display="block"
                  color="text.secondary"
                >
                  {fact.label}
                </Typography>
                <Typography
                  sx={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.2 }}
                >
                  {fact.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {fact.detail}
                </Typography>
              </Box>
            </Card>
          ))}
        </Box>
      </Stack>

      {/* Upcoming Interviews */}
      <Paper sx={CARD_HOVER_SX}>
        <Stack spacing={1.5}>
          <Typography variant="h2">Upcoming Interviews</Typography>
          <Box sx={{ maxHeight: 220, overflowY: "auto" }}>
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
          </Box>
        </Stack>
      </Paper>

      {/* Recent Activity + Application Status split */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.85fr 1fr" },
          gap: 1.5,
          alignItems: "start",
        }}
      >
        <Paper sx={CARD_HOVER_SX}>
          <Stack spacing={1.5}>
            <Typography variant="h2">Recent Activity</Typography>
            <Box
              sx={{
                maxHeight: 447,
                overflowY: "auto",
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": { display: "none" },
              }}
            >
              <Timeline entries={timeline} />
            </Box>
          </Stack>
        </Paper>

        <Paper sx={CARD_HOVER_SX}>
          <Stack spacing={1.5}>
            <Typography variant="h2">Application Status</Typography>
            <List>
              {statusCounts.map(item => (
                <ListItem key={item.status} disablePadding>
                  <ListItemButton
                    component={Link}
                    href={`/applications?status=${item.status}`}
                  >
                    <ListItemText
                      primary={toTitleCaseLabel(item.status)}
                      slotProps={{ primary: { fontSize: "1.05rem" } }}
                    />
                    <Typography fontWeight={700} fontSize="1.05rem">
                      {item.count}
                    </Typography>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Stack>
        </Paper>
      </Box>
    </Stack>
  );
}
