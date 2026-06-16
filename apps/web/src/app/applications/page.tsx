export const dynamic = "force-dynamic";

import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ApplicationTable } from "@/components/ApplicationTable";
import { prisma } from "@/lib/db";
import { toTitleCaseLabel } from "@/lib/format";

async function autoArchiveStaleApplications() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);
  const stale = await prisma.application.findMany({
    where: { genericStatus: "applied", appliedAt: { lt: cutoff } },
    select: { id: true, notes: true },
  });
  if (stale.length === 0) return;
  const archiveDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  await Promise.all(
    stale.map(app =>
      prisma.application.update({
        where: { id: app.id },
        data: {
          genericStatus: "archived",
          notes: [app.notes?.trim(), `Auto-archived on ${archiveDate} — no activity for 60+ days.`]
            .filter(Boolean)
            .join("\n\n"),
        },
      }),
    ),
  );
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: initialStatus } = await searchParams;
  await autoArchiveStaleApplications();

  const [applications, resumes] = await Promise.all([
    prisma.application.findMany({ orderBy: { appliedAt: "desc" } }),
    prisma.resume.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true } }),
  ]);

  const summary = applications.reduce(
    (acc, item) => {
      acc[item.genericStatus] = (acc[item.genericStatus] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const statusSortRank: Record<string, number> = {
    offered: 0, interviewing: 1, under_review: 2, applied: 3, archived: 4, rejected: 5, withdrawn: 6,
  };

  const sortedApplications = [...applications].sort((a, b) => {
    const rankA = statusSortRank[a.genericStatus] ?? Number.MAX_SAFE_INTEGER;
    const rankB = statusSortRank[b.genericStatus] ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    return b.appliedAt.getTime() - a.appliedAt.getTime();
  });

  const uniqueValues = (values: Array<string | null>) =>
    Array.from(new Set(values.map(v => v?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));

  const autocompleteOptions = {
    companies: uniqueValues(applications.map(a => a.companyName)),
    roleTitles: uniqueValues(applications.map(a => a.roleTitle)),
    careersPageUrls: uniqueValues(applications.map(a => a.careersPageUrl)),
    roleFamilies: uniqueValues(applications.map(a => a.roleFamily)),
    roleLevels: uniqueValues(applications.map(a => a.roleLevel)),
    compensations: uniqueValues(applications.map(a => a.compensation)),
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h1">Applications</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Capture each role as a structured fact record.
        </Typography>
      </Box>

      {/* Metric cards */}
      <Box
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
        }}
      >
        <Card
          component={Link}
          href="/applications"
          sx={{
            textDecoration: "none",
            color: "inherit",
            border: "1px solid rgba(15, 74, 134, 0.18)",
            background: "rgba(255, 255, 255, 0.82)",
            cursor: "pointer",
            aspectRatio: "3 / 2",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            transition: "transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
            "&:hover": { transform: "translateY(-3px) scale(1.03)", boxShadow: 7, borderColor: "rgba(15, 74, 134, 0.35)" },
          }}
        >
          <Box sx={{ p: "0.6rem 0.72rem" }}>
            <Typography variant="caption" display="block" color="text.secondary">Total</Typography>
            <Typography sx={{ fontSize: "1.14rem", fontWeight: 700 }}>{applications.length}</Typography>
          </Box>
        </Card>
        {Object.entries(summary).map(([status, count]) => (
          <Card
            key={status}
            component={Link}
            href={`/applications?status=${status}`}
            sx={{
              textDecoration: "none",
              color: "inherit",
              border: "1px solid rgba(15, 74, 134, 0.18)",
              background: "rgba(255, 255, 255, 0.82)",
              cursor: "pointer",
              aspectRatio: "3 / 2",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              transition: "transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
              "&:hover": { transform: "translateY(-3px) scale(1.03)", boxShadow: 7, borderColor: "rgba(15, 74, 134, 0.35)" },
            }}
          >
            <Box sx={{ p: "0.6rem 0.72rem" }}>
              <Typography variant="caption" display="block" color="text.secondary">
                {toTitleCaseLabel(status)}
              </Typography>
              <Typography sx={{ fontSize: "1.14rem", fontWeight: 700 }}>{count}</Typography>
            </Box>
          </Card>
        ))}
      </Box>

      <Paper
        sx={{
          transition: "box-shadow 220ms ease, transform 220ms ease",
          "&:hover": { boxShadow: "0 24px 56px rgba(13, 34, 66, 0.15)", transform: "translateY(-2px)" },
        }}
      >
        <ApplicationTable
          title="Application Records"
          applications={sortedApplications.map(app => ({ ...app, appliedAt: app.appliedAt.toISOString() }))}
          resumes={resumes}
          autocompleteOptions={autocompleteOptions}
          initialStatusFilter={initialStatus}
        />
      </Paper>
    </Stack>
  );
}
